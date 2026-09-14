import {
  POLICY_VERSION,
  SITES,
  siteById,
  type Assessment,
  type Contribution,
  type Observation,
  type ObservationInput,
  type Plan,
  type Workspace,
} from "./model.ts";

export function validateObservation(
  value: unknown,
  now = Date.now(),
): ObservationInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("An observation object is required.");
  const v = value as Record<string, unknown>;
  if (!SITES.some((s) => s.id === v.siteId))
    throw new Error("Choose a known monitoring site.");
  const time =
    typeof v.observedAt === "string" ? Date.parse(v.observedAt) : NaN;
  if (
    !Number.isFinite(time) ||
    time > now + 5 * 60e3 ||
    time < now - 30 * 864e5
  )
    throw new Error(
      "Observation time must be within the past 30 days and not in the future.",
    );
  for (const [key, options] of Object.entries({
    appearance: ["clear", "cloudy", "scum", "unusual"],
    odour: ["none", "earthy", "sewage", "chemical"],
    wildlife: ["normal", "none_seen", "distressed"],
  }))
    if (typeof v[key] !== "string" || !options.includes(v[key] as string))
      throw new Error(`Choose a valid ${key} observation.`);
  if (
    typeof v.notes !== "string" ||
    v.notes.trim().length < 8 ||
    v.notes.length > 1500
  )
    throw new Error("Add a factual note between 8 and 1,500 characters.");
  if (typeof v.calibrated !== "boolean")
    throw new Error("Confirm whether instruments were calibrated.");
  const output: Record<string, unknown> = {
    siteId: v.siteId,
    observedAt: new Date(time).toISOString(),
    appearance: v.appearance,
    odour: v.odour,
    wildlife: v.wildlife,
    notes: v.notes.trim(),
    calibrated: v.calibrated,
  };
  for (const [key, [min, max]] of Object.entries({
    oxygen: [0, 25],
    ph: [0, 14],
    turbidity: [0, 4000],
    temperature: [-2, 50],
  })) {
    if (v[key] === undefined || v[key] === null || v[key] === "") continue;
    if (
      typeof v[key] !== "number" ||
      !Number.isFinite(v[key]) ||
      v[key] < min ||
      v[key] > max
    )
      throw new Error(
        `${key} must be a number between ${min} and ${max}. Check the unit or leave it blank.`,
      );
    output[key] = v[key];
  }
  if (v.missionId !== undefined) {
    if (typeof v.missionId !== "string" || !/^[a-f0-9-]{36}$/.test(v.missionId))
      throw new Error("Invalid follow-up mission reference.");
    output.missionId = v.missionId;
  }
  return output as ObservationInput;
}
export function fingerprint(v: ObservationInput) {
  return JSON.stringify([
    v.siteId,
    v.observedAt,
    v.appearance,
    v.odour,
    v.wildlife,
    v.notes.trim().toLowerCase(),
    v.oxygen ?? null,
    v.ph ?? null,
    v.turbidity ?? null,
    v.temperature ?? null,
    v.calibrated,
    v.missionId ?? null,
  ]);
}
export function qualityFlags(o: ObservationInput, now = Date.now()): string[] {
  const f: string[] = [];
  if (now - Date.parse(o.observedAt) > 72 * 36e5)
    f.push("Older than 72 hours; the signal has less weight.");
  if (
    [o.oxygen, o.ph, o.turbidity, o.temperature].some((x) => x !== undefined) &&
    !o.calibrated
  )
    f.push(
      "Instrument calibration is unconfirmed; measurements have half weight.",
    );
  if (o.appearance === "clear" && (o.turbidity ?? 0) > 50)
    f.push("Clear appearance and high turbidity disagree. Recheck the entry.");
  if (o.wildlife === "distressed")
    f.push(
      "Distressed or dead wildlife: review promptly and use official incident reporting. Do not wait for a sampling plan.",
    );
  if (o.appearance === "scum")
    f.push(
      "Surface scum has several possible causes. Appearance cannot confirm a toxic bloom.",
    );
  if (o.oxygen === undefined && o.ph === undefined && o.turbidity === undefined)
    f.push("Visual evidence only; chemistry and microbiology are unknown.");
  return f;
}
function ageWeight(observedAt: string, now: number) {
  const age = (now - Date.parse(observedAt)) / 36e5;
  return age < 0 ? 0 : age <= 24 ? 1 : age <= 72 ? 0.65 : age <= 168 ? 0.3 : 0;
}
export function assess(workspace: Workspace, now = Date.now()): Assessment[] {
  return SITES.map((site): Assessment => {
    const reports = workspace.observations.filter(
      (o) => o.siteId === site.id && o.status !== "rejected",
    );
    const active = reports.filter((o) => ageWeight(o.observedAt, now) > 0);
    const contributions: Contribution[] = [];
    const add = (label: string, points: number, explanation: string) => {
      if (points > 0)
        contributions.push({ label, points: Math.round(points), explanation });
    };
    const weight = (o: Observation) =>
      ageWeight(o.observedAt, now) * (o.status === "confirmed" ? 1 : 0.65);
    const max = (f: (o: Observation) => number) =>
      Math.max(0, ...active.map((o) => f(o) * weight(o)));
    add(
      "Appearance",
      max((o) =>
        o.appearance === "scum"
          ? 20
          : o.appearance === "unusual"
            ? 16
            : o.appearance === "cloudy"
              ? 12
              : 0,
      ),
      "Strongest current visual signal; repeated reports do not add points.",
    );
    add(
      "Unusual odour",
      max((o) => (["sewage", "chemical"].includes(o.odour) ? 18 : 0)),
      "A reason to investigate, not proof of a pollutant.",
    );
    add(
      "Wildlife distress",
      max((o) => (o.wildlife === "distressed" ? 50 : 0)),
      "Prompt incident review takes precedence over the sampling budget.",
    );
    add(
      "Dissolved oxygen",
      max(
        (o) =>
          (o.oxygen !== undefined
            ? o.oxygen < 4
              ? 25
              : o.oxygen < 6
                ? 12
                : 0
            : 0) * (o.calibrated ? 1 : 0.5),
      ),
      "Policy trigger below 6 mg/L; stronger below 4 mg/L. Species and conditions vary.",
    );
    add(
      "pH",
      max(
        (o) =>
          (o.ph !== undefined && (o.ph < 6 || o.ph > 9) ? 15 : 0) *
          (o.calibrated ? 1 : 0.5),
      ),
      "Policy screening range 6–9, not a legal or ecological standard.",
    );
    add(
      "Turbidity",
      max(
        (o) =>
          (o.turbidity !== undefined
            ? o.turbidity > 50
              ? 15
              : o.turbidity > 20
                ? 8
                : 0
            : 0) * (o.calibrated ? 1 : 0.5),
      ),
      "Illustrative screening cutoffs in NTU; locally validate before field use.",
    );
    const hasSignal = contributions.some((c) => c.points > 0);
    if (hasSignal)
      add(
        "Scenario rainfall context",
        8,
        "18 mm simulated rainfall is context only. Live rainfall is excluded from this scenario score.",
      );
    add(
      "Shared ecosystem & community setting",
      site.exposure,
      site.context + ". This is exposure context, not measured human illness.",
    );
    if (!active.some((o) => o.status === "confirmed"))
      add(
        "Unresolved evidence gap",
        12,
        "No reviewed observation in the last 7 days. A site with little evidence is not assumed healthy.",
      );
    const score = Math.min(
      100,
      contributions.reduce((n, c) => n + c.points, 0),
    );
    const urgent = active.some((o) => o.wildlife === "distressed");
    const confirmed = active.filter((o) => o.status === "confirmed");
    return {
      siteId: site.id,
      score,
      band: score >= 60 ? "Investigate" : score >= 30 ? "Review" : "Routine",
      evidence:
        confirmed.length >= 2
          ? "Reviewed"
          : confirmed.length
            ? "Developing"
            : "Limited",
      urgent,
      contributions,
      reportIds: active.map((o) => o.id),
      pending: reports.filter((o) => o.status === "pending").length,
      summary: urgent
        ? "Wildlife distress needs prompt incident review."
        : hasSignal
          ? contributions
              .filter(
                (c) =>
                  ![
                    "Shared ecosystem & community setting",
                    "Scenario rainfall context",
                    "Unresolved evidence gap",
                  ].includes(c.label),
              )
              .slice(0, 2)
              .map((c) => c.label)
              .join(" · ")
          : "Baseline observation or unresolved evidence gap.",
    };
  }).sort((a, b) => b.score - a.score || a.siteId.localeCompare(b.siteId));
}

/** Exact enumeration is deliberate: all 32 subsets of the five-site pilot. */
export function allocate(
  assessments: Assessment[],
  workspace: Workspace,
  budget: number,
  capacity: number,
  now = Date.now(),
): Plan {
  if (!Number.isInteger(budget) || budget < 0 || budget > 500)
    throw new Error("Budget must be a whole number from £0 to £500.");
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 5)
    throw new Error("Visit capacity must be a whole number from 0 to 5.");
  const windowDate = new Date(now).toISOString().slice(0, 10);
  const committed = workspace.missions.filter(
    (m) => m.createdAt.slice(0, 10) === windowDate,
  );
  const committedCost = committed.reduce((n, m) => n + m.cost, 0),
    committedVisits = committed.length;
  const remainingBudget = Math.max(0, budget - committedCost),
    remainingCapacity = Math.max(0, capacity - committedVisits);
  const busy = new Set(
    workspace.missions
      .filter((m) => m.status === "planned")
      .map((m) => m.siteId),
  );
  const candidates = assessments.filter((a) => !busy.has(a.siteId));
  let selected: Assessment[] = [];
  let totalCost = 0;
  let totalUtility = 0;
  for (let mask = 1; mask < 1 << candidates.length; mask++) {
    const subset = candidates.filter((_, i) => mask & (1 << i));
    if (subset.length > remainingCapacity) continue;
    const cost = subset.reduce((n, a) => n + siteById(a.siteId).cost, 0);
    if (cost > remainingBudget) continue;
    const utility = subset.reduce((n, a) => n + a.score, 0);
    if (
      utility > totalUtility ||
      (utility === totalUtility && cost < totalCost)
    ) {
      selected = subset;
      totalCost = cost;
      totalUtility = utility;
    }
  }
  const selectedIds = new Set(selected.map((a) => a.siteId));
  const excluded = assessments
    .filter((a) => !selectedIds.has(a.siteId))
    .map((a) => ({
      siteId: a.siteId,
      reason: busy.has(a.siteId)
        ? "An open field mission already covers this site."
        : remainingCapacity === 0
          ? "Today’s visit capacity is already committed or set to zero."
          : siteById(a.siteId).cost > remainingBudget
            ? "This visit exceeds the remaining daily budget."
            : "Another combination covers more priority within the budget and visit limit.",
    }));
  return {
    selected,
    excluded,
    totalCost,
    totalUtility,
    budget,
    capacity,
    committedCost,
    committedVisits,
    remainingBudget,
    remainingCapacity,
    windowDate,
  };
}
export function seedWorkspace(now = Date.now()): Workspace {
  const ago = (h: number) => new Date(now - h * 36e5).toISOString();
  const seed: Partial<ObservationInput>[] = [
    {
      siteId: "B03",
      appearance: "cloudy",
      odour: "sewage",
      oxygen: 3.2,
      turbidity: 62,
      notes:
        "Water looks grey beside the outfall. Unusual smell noted from the public path.",
      calibrated: true,
    },
    {
      siteId: "B02",
      appearance: "cloudy",
      turbidity: 38,
      notes:
        "Water became cloudy after the scenario rainfall. Bank vegetation intact.",
      calibrated: true,
    },
    {
      siteId: "B04",
      appearance: "scum",
      notes: "Thin green surface material near the margin. Cause is unknown.",
    },
    {
      siteId: "B01",
      appearance: "clear",
      oxygen: 8.1,
      ph: 7.3,
      notes:
        "Clear water and normal visible wildlife at the upstream reference reach.",
      calibrated: true,
    },
    {
      siteId: "B05",
      appearance: "clear",
      notes: "No unusual colour seen. No chemical measurements collected.",
    },
  ];
  const observations = seed.map((s, i) => {
    const input = {
      appearance: "clear",
      odour: "none",
      wildlife: "normal",
      calibrated: false,
      ...s,
      observedAt: ago(i === 4 ? 96 : 2 + i),
    } as ObservationInput;
    return {
      ...input,
      id: `seed-${i + 1}`,
      createdAt: ago(1),
      status: i === 0 || i === 2 ? "pending" : "confirmed",
      source: "scenario",
      fingerprint: fingerprint(input),
    } as Observation;
  });
  return {
    schemaVersion: 1,
    scenarioStartedAt: new Date(now).toISOString(),
    rainfallMm: 18,
    observations,
    missions: [],
    processed: [],
    audit: [
      {
        id: "seed-audit",
        at: new Date(now).toISOString(),
        action: "Demonstration created",
        detail:
          "Five synthetic monitoring sites and observations. No real pollution incident is represented.",
      },
    ],
  };
}
export function addAudit(
  workspace: Workspace,
  action: string,
  detail: string,
  refs: { observationIds?: string[]; missionIds?: string[] } = {},
) {
  workspace.audit.unshift({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    action,
    detail,
    ...refs,
  });
  workspace.audit = workspace.audit.slice(0, 250);
}
export { POLICY_VERSION };

/** Binds a human approval to the exact displayed reasoning and daily window. */
export function planApprovalKey(plan: Plan, revision: number): string {
  return JSON.stringify({
    policy: POLICY_VERSION,
    revision,
    day: plan.windowDate,
    budget: plan.budget,
    capacity: plan.capacity,
    selection: plan.selected.map((a) => ({
      siteId: a.siteId,
      score: a.score,
      reportIds: a.reportIds,
      contributions: a.contributions,
    })),
  });
}
