export const RAINFALL_URL =
  "https://environment.data.gov.uk/flood-monitoring/id/stations/531179/readings?parameter=rainfall&_sorted&_limit=96";
export type RainfallContext = {
  status: "current" | "stale" | "partial" | "unavailable";
  totalMm: number | null;
  count: number;
  expected: number;
  latest: string | null;
  earliest: string | null;
  fetchedAt: string;
  ageHours: number | null;
  message: string;
  sourceUrl: string;
};
export function parseRainfall(
  payload: unknown,
  now = Date.now(),
): RainfallContext {
  const base = {
    expected: 96,
    fetchedAt: new Date(now).toISOString(),
    sourceUrl: RAINFALL_URL,
  };
  const items = (payload as { items?: unknown[] })?.items;
  if (!Array.isArray(items)) throw new Error("Invalid rainfall response.");
  const samples = new Map<number, number>();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const measure = typeof r.measure === "string" ? r.measure : "";
    if (
      !/\/531179-rainfall-tipping_bucket_raingauge-t-15_min-mm$/.test(measure)
    )
      continue;
    const t = typeof r.dateTime === "string" ? Date.parse(r.dateTime) : NaN;
    if (
      Number.isFinite(t) &&
      t <= now + 5 * 60e3 &&
      typeof r.value === "number" &&
      Number.isFinite(r.value) &&
      r.value >= 0 &&
      r.value <= 300
    )
      samples.set(t, r.value);
  }
  const rows = [...samples].sort((a, b) => a[0] - b[0]).slice(-96);
  const last = rows.at(-1)?.[0];
  if (last === undefined)
    return {
      ...base,
      status: "unavailable",
      count: 0,
      totalMm: null,
      latest: null,
      earliest: null,
      ageHours: null,
      message: "No usable readings returned. The scenario remains available.",
    };
  const contiguous =
    rows.length === 96 &&
    rows.every((r, i) => i === 0 || r[0] - rows[i - 1][0] === 15 * 60e3);
  const ageHours = (now - last) / 36e5;
  const status = !contiguous ? "partial" : ageHours > 6 ? "stale" : "current";
  return {
    ...base,
    status,
    count: rows.length,
    totalMm: contiguous
      ? Math.round(rows.reduce((n, r) => n + r[1], 0) * 100) / 100
      : null,
    latest: new Date(last).toISOString(),
    earliest: new Date(rows[0][0] - 15 * 60e3).toISOString(),
    ageHours: Math.round(ageHours * 10) / 10,
    message:
      status === "partial"
        ? "Incomplete or irregular readings; no 24-hour total is shown."
        : status === "stale"
          ? "The latest reading is more than 6 hours old. This is a historical window."
          : "Complete 24-hour observation window. This point gauge is context, not proof of runoff or contamination.",
  };
}
