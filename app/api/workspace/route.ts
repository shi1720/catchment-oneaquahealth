import {
  ApiError,
  errorResponse,
  json,
  persist,
  readSession,
  snapshot,
  verifyOrigin,
} from "@/lib/catchment/store";
import {
  addAudit,
  allocate,
  planApprovalKey,
  assess,
  fingerprint,
  POLICY_VERSION,
  seedWorkspace,
  validateObservation,
} from "@/lib/catchment/engine";
import { siteById, type Observation } from "@/lib/catchment/model";
export async function GET(req: Request) {
  try {
    const s = await readSession(req, true);
    return json(snapshot(s.workspace, s.revision), 200, s.cookie);
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: Request) {
  try {
    verifyOrigin(req);
    if (!req.headers.get("content-type")?.includes("application/json"))
      throw new ApiError(415, "Send JSON data.");
    if (Number(req.headers.get("content-length")) > 65536)
      throw new ApiError(413, "Request exceeds 64 KB.");
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 65536)
      throw new ApiError(413, "Request exceeds 64 KB.");
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new ApiError(400, "Request contains invalid JSON.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new ApiError(400, "An action object is required.");
    if (
      typeof body.requestId !== "string" ||
      !/^[a-f0-9-]{36}$/.test(body.requestId)
    )
      throw new ApiError(400, "A valid request identifier is required.");
    const s = await readSession(req);
    let w = s.workspace;
    if (w.processed.includes(body.requestId))
      return json(snapshot(w, s.revision));
    if (body.revision !== s.revision)
      throw new ApiError(
        409,
        "The workspace changed. Reload the latest evidence and try again.",
      );
    try {
      if (body.action === "observe" || body.action === "import") {
        const inputs =
          body.action === "import" ? body.observations : [body.observation];
        if (!Array.isArray(inputs) || !inputs.length || inputs.length > 50)
          throw new Error("Import between 1 and 50 observations at a time.");
        if (w.observations.length + inputs.length > 200)
          throw new Error(
            "This demo supports 200 observations. Export evidence before resetting.",
          );
        const seen = new Set(w.observations.map((o) => o.fingerprint));
        const added: Observation[] = [];
        for (const input of inputs) {
          const value = validateObservation(input);
          if (
            value.missionId &&
            !w.missions.some(
              (m) =>
                m.id === value.missionId &&
                m.siteId === value.siteId &&
                m.status === "complete",
            )
          )
            throw new Error(
              "Follow-up must refer to a completed mission at the same site.",
            );
          const key = fingerprint(value);
          if (seen.has(key))
            throw new Error(
              "Duplicate observation detected. No rows were added.",
            );
          seen.add(key);
          added.push({
            ...value,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            source: "participant",
            status: "pending",
            fingerprint: key,
          });
        }
        w.observations.unshift(...added);
        addAudit(
          w,
          body.action === "import"
            ? "Observations imported"
            : "Observation recorded",
          `${added.length} report(s) added for human review.`,
          {
            observationIds: added.map((o) => o.id),
            missionIds: added.flatMap((o) =>
              o.missionId ? [o.missionId] : [],
            ),
          },
        );
      } else if (body.action === "review") {
        const o = w.observations.find((o) => o.id === body.id);
        if (!o) throw new ApiError(404, "Observation not found.");
        if (!["confirmed", "rejected"].includes(body.status))
          throw new Error("Choose confirm or reject.");
        if (
          typeof body.note !== "string" ||
          body.note.trim().length < 8 ||
          body.note.length > 500
        )
          throw new Error("Add a review rationale of 8–500 characters.");
        o.status = body.status;
        o.reviewNote = body.note.trim();
        o.reviewedAt = new Date().toISOString();
        addAudit(
          w,
          "Evidence reviewed",
          `${siteById(o.siteId).name}: ${body.status}. ${o.reviewNote}`,
          { observationIds: [o.id] },
        );
      } else if (body.action === "dispatch") {
        if (body.acknowledged !== true)
          throw new Error("Confirm coordinator review before dispatch.");
        const plan = allocate(assess(w), w, body.budget, body.capacity);
        if (body.approvedPlan !== planApprovalKey(plan, s.revision))
          throw new ApiError(
            409,
            "The displayed plan changed with the evidence or daily window. Reload and approve the current plan.",
          );
        if (!plan.selected.length)
          throw new Error(
            "No sites fit this plan. Increase the budget or capacity.",
          );
        if (w.missions.length + plan.selected.length > 50)
          throw new Error(
            "This demonstration supports 50 missions. Export before resetting.",
          );
        const at = new Date().toISOString();
        w.planning = {
          date: at.slice(0, 10),
          budget: body.budget,
          capacity: body.capacity,
        };
        const missionStart = w.missions.length;
        for (const a of plan.selected)
          w.missions.unshift({
            id: crypto.randomUUID(),
            siteId: a.siteId,
            status: "planned",
            createdAt: at,
            cost: siteById(a.siteId).cost,
            priorityAtDispatch: a.score,
            policyVersion: POLICY_VERSION,
            evidenceIds: a.reportIds,
            assessmentSnapshot: structuredClone(a),
            evidenceSnapshot: structuredClone(
              w.observations.filter((o) => a.reportIds.includes(o.id)),
            ),
            budgetAtDispatch: body.budget,
            capacityAtDispatch: body.capacity,
          });
        addAudit(
          w,
          "Sampling plan dispatched",
          `${plan.selected.map((a) => siteById(a.siteId).name).join(" + ")}; £${plan.totalCost} of £${body.budget}; ${plan.selected.length + plan.committedVisits} of ${body.capacity} daily visits.`,
          {
            missionIds: w.missions
              .slice(0, w.missions.length - missionStart)
              .map((m) => m.id),
          },
        );
      } else if (body.action === "complete") {
        const m = w.missions.find((m) => m.id === body.id);
        if (!m) throw new ApiError(404, "Mission not found.");
        if (m.status !== "planned")
          throw new Error("This mission is already complete.");
        if (
          typeof body.outcome !== "string" ||
          body.outcome.trim().length < 15 ||
          body.outcome.length > 1500
        )
          throw new Error("Add a follow-up of 15–1,500 characters.");
        m.status = "complete";
        m.completedAt = new Date().toISOString();
        m.outcome = body.outcome.trim();
        addAudit(
          w,
          "Field visit completed",
          `${siteById(m.siteId).name}: ${m.outcome}`,
          { missionIds: [m.id] },
        );
      } else if (body.action === "reset") {
        if (body.confirmation !== "RESET")
          throw new Error("Type RESET to replace your demonstration data.");
        w = seedWorkspace();
      } else throw new Error("Unknown workspace action.");
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(
        400,
        e instanceof Error ? e.message : "Invalid action.",
      );
    }
    w.processed = [...w.processed, body.requestId].slice(-100);
    const revision = await persist(s.id, w, s.revision);
    return json(snapshot(w, revision));
  } catch (e) {
    return errorResponse(e);
  }
}
