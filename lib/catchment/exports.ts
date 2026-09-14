import {
  POLICY_VERSION,
  SITES,
  type ObservationInput,
  type Workspace,
} from "./model.ts";
import { assess, validateObservation } from "./engine.ts";
export const CSV_COLUMNS = [
  "siteId",
  "observedAt",
  "appearance",
  "odour",
  "wildlife",
  "notes",
  "oxygen",
  "ph",
  "turbidity",
  "temperature",
  "calibrated",
] as const;
export function escapeCSV(value: unknown) {
  let text = String(value ?? "");
  if (typeof value !== "number" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function csvExport(w: Workspace) {
  const columns = [
    ...CSV_COLUMNS,
    "id",
    "status",
    "source",
    "reviewNote",
    "missionId",
  ] as const;
  return [
    columns.join(","),
    ...w.observations.map((o) => columns.map((c) => escapeCSV(o[c])).join(",")),
  ].join("\r\n");
}
export function parseCSV(text: string, now = Date.now()): ObservationInput[] {
  if (text.length > 60000) throw new Error("CSV must be smaller than 60 KB.");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quote = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quote && source[i + 1] === '"') {
        field += '"';
        i++;
      } else quote = !quote;
    } else if (c === "," && !quote) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quote) {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quote) throw new Error("CSV contains an unclosed quoted field.");
  row.push(field);
  if (row.some((x) => x.trim())) rows.push(row);
  const header = rows.shift()?.map((x) => x.trim());
  if (!header || CSV_COLUMNS.some((c) => !header.includes(c)))
    throw new Error("CSV columns must match the downloadable template.");
  if (new Set(header).size !== header.length)
    throw new Error("CSV has duplicate column names.");
  if (!rows.length || rows.length > 50)
    throw new Error("Import 1–50 observations at a time.");
  return rows.map((r, i) => {
    try {
      if (r.length !== header.length)
        throw new Error("Column count does not match the header.");
      const v: Record<string, unknown> = {};
      header.forEach((h, j) => (v[h] = r[j]));
      for (const k of ["oxygen", "ph", "turbidity", "temperature"])
        v[k] = String(v[k]).trim() === "" ? undefined : Number(v[k]);
      if (v.missionId === "") v.missionId = undefined;
      if (v.calibrated !== "true" && v.calibrated !== "false")
        throw new Error("calibrated must be true or false.");
      v.calibrated = v.calibrated === "true";
      return validateObservation(v, now);
    } catch (e) {
      throw new Error(
        `Row ${i + 2}: ${e instanceof Error ? e.message : "Invalid observation"}`,
      );
    }
  });
}
export function evidenceExport(w: Workspace) {
  return {
    format: "catchment-evidence-1.0",
    exportedAt: new Date().toISOString(),
    policyVersion: POLICY_VERSION,
    disclaimer:
      "Synthetic demonstration catchment. Operational priority is not a water-safety assessment. Participant entries are unverified unless reviewed.",
    sites: SITES,
    assessments: assess(w),
    ...w,
  };
}
/** Experimental R4 collection. No standard terminology or profile conformance is asserted. */
export function fhirExport(w: Workspace) {
  const base = "https://catchment.example/fhir";
  const tag = {
    system: "https://catchment.example/tags",
    code: "demonstration",
    display: "Synthetic demonstration; not clinical data",
  };
  const entry: Record<string, unknown>[] = SITES.map((s) => ({
    fullUrl: `${base}/Location/${s.id}`,
    resource: {
      resourceType: "Location",
      id: s.id,
      meta: { tag: [tag] },
      status: "active",
      name: s.name,
      description: `Fictional demonstration stream reach. ${s.context}`,
      mode: "instance",
    },
  }));
  for (const o of w.observations) {
    const component: Record<string, unknown>[] = [
      { code: { text: "Water appearance" }, valueString: o.appearance },
      { code: { text: "Odour observed from safe bank" }, valueString: o.odour },
      { code: { text: "Wildlife observation" }, valueString: o.wildlife },
    ];
    for (const [key, label, unit, code] of [
      ["oxygen", "Dissolved oxygen", "mg/L", "mg/L"],
      ["ph", "pH", "pH", "[pH]"],
      ["turbidity", "Turbidity", "NTU", null],
      ["temperature", "Water temperature", "°C", "Cel"],
    ] as const) {
      const value = o[key];
      if (value !== undefined)
        component.push({
          code: { text: label },
          valueQuantity: {
            value,
            unit,
            ...(code ? { system: "http://unitsofmeasure.org", code } : {}),
          },
        });
    }
    entry.push({
      fullUrl: `${base}/Observation/${o.id}`,
      resource: {
        resourceType: "Observation",
        id: o.id,
        meta: { tag: [tag] },
        status:
          o.status === "confirmed"
            ? "final"
            : o.status === "rejected"
              ? "entered-in-error"
              : "preliminary",
        code: {
          text: "Citizen stream assessment (experimental environmental mapping)",
        },
        subject: { reference: `${base}/Location/${o.siteId}` },
        effectiveDateTime: o.observedAt,
        issued: o.createdAt,
        note: [
          {
            text: `${o.notes}\nSource: ${o.source}. Calibration confirmed: ${o.calibrated}. Review: ${o.reviewNote ?? "Unreviewed"}. No pathogen or health inference.`,
          },
        ],
        component,
      },
    });
  }
  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    meta: { tag: [tag] },
    entry,
  };
}
