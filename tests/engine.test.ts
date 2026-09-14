import test from "node:test";
import assert from "node:assert/strict";
import {
  assess,
  allocate,
  seedWorkspace,
  validateObservation,
  qualityFlags,
  fingerprint,
} from "../lib/catchment/engine.ts";
import { parseRainfall } from "../lib/catchment/rainfall.ts";
import { csvExport, parseCSV, fhirExport } from "../lib/catchment/exports.ts";
import { SITES, type ObservationInput } from "../lib/catchment/model.ts";
const now = Date.parse("2026-09-18T12:00:00Z");
const valid: ObservationInput = {
  siteId: "B02",
  observedAt: new Date(now - 3600000).toISOString(),
  appearance: "cloudy",
  odour: "none",
  wildlife: "none_seen",
  notes: "Cloudy water from the public footbridge.",
  calibrated: true,
  oxygen: 7.1,
  ph: 7.4,
  turbidity: 25,
};
test("fresh seed has a reproducible priority order and bounded scores", () => {
  const a = assess(seedWorkspace(now), now);
  assert.deepEqual(
    a.map((x) => [x.siteId, x.score]),
    [
      ["B03", 76],
      ["B04", 48],
      ["B02", 36],
      ["B05", 8],
      ["B01", 3],
    ],
  );
  assert.ok(a.every((x) => x.score >= 0 && x.score <= 100));
});
test("accepts zero readings and preserves unknown measurements", () => {
  assert.equal(validateObservation({ ...valid, oxygen: 0 }, now).oxygen, 0);
  assert.equal(
    validateObservation({ ...valid, oxygen: undefined }, now).oxygen,
    undefined,
  );
});
test("rejects impossible units, missing fields, invalid dates and unknown sites", () => {
  for (const patch of [
    { oxygen: NaN },
    { ph: 15 },
    { oxygen: -1 },
    { turbidity: Infinity },
    { temperature: 60 },
    { siteId: "other" },
    { notes: "short" },
    { calibrated: "yes" },
    { appearance: "safe" },
    { observedAt: "yesterday" },
    { observedAt: new Date(now + 3600000).toISOString() },
  ])
    assert.throws(() => validateObservation({ ...valid, ...patch }, now));
});
test("review changes priority; rejection removes signal without calling site healthy", () => {
  const w = seedWorkspace(now);
  w.observations[0].status = "confirmed";
  assert.equal(assess(w, now).find((a) => a.siteId === "B03")?.score, 88);
  w.observations[0].status = "rejected";
  assert.equal(assess(w, now).find((a) => a.siteId === "B03")?.score, 22);
});
test("repeated reports cannot inflate the strongest signal", () => {
  const w = seedWorkspace(now);
  const before = assess(w, now)[0].score;
  w.observations.push({ ...w.observations[0], id: "duplicate" });
  assert.equal(assess(w, now)[0].score, before);
});
test("old observations decay and expired signals are excluded", () => {
  const w = seedWorkspace(now);
  assert.ok(assess(w, now + 4 * 86400000)[0].score < assess(w, now)[0].score);
  assert.ok(
    assess(w, now + 8 * 86400000).every((a) =>
      a.contributions.every(
        (c) => !["Appearance", "Dissolved oxygen"].includes(c.label),
      ),
    ),
  );
});
test("uncalibrated measurements receive less weight; visual conflict prompts recheck", () => {
  const w = seedWorkspace(now);
  const before = assess(w, now)[0].score;
  w.observations[0].calibrated = false;
  assert.ok(assess(w, now)[0].score < before);
  assert.ok(
    qualityFlags(
      { ...valid, appearance: "clear", turbidity: 90, calibrated: false },
      now,
    ).some((f) => f.includes("disagree")),
  );
});
test("distressed wildlife stays urgent even with no budget", () => {
  const w = seedWorkspace(now);
  w.observations[1].wildlife = "distressed";
  const a = assess(w, now);
  assert.equal(a.find((a) => a.siteId === "B02")?.urgent, true);
  assert.equal(allocate(a, w, 0, 0).selected.length, 0);
  assert.equal(a.find((a) => a.siteId === "B02")?.urgent, true);
});
test("budget 80 and two visits chooses Foundry + School; one visit chooses Foundry", () => {
  const w = seedWorkspace(now),
    a = assess(w, now);
  assert.deepEqual(
    allocate(a, w, 80, 2).selected.map((a) => a.siteId),
    ["B03", "B04"],
  );
  assert.deepEqual(
    allocate(a, w, 80, 1).selected.map((a) => a.siteId),
    ["B03"],
  );
  assert.equal(allocate(a, w, 24, 5).selected.length, 0);
});
test("exact allocation is never worse than any feasible subset over the budget grid", () => {
  const w = seedWorkspace(now),
    a = assess(w, now);
  for (let budget = 0; budget <= 200; budget += 5)
    for (let cap = 0; cap <= 5; cap++) {
      const p = allocate(a, w, budget, cap);
      assert.ok(p.totalCost <= budget && p.selected.length <= cap);
      for (let mask = 0; mask < 32; mask++) {
        const subset = a.filter((_, i) => mask & (1 << i));
        const cost = subset.reduce(
          (s, x) => s + SITES.find((y) => y.id === x.siteId)!.cost,
          0,
        );
        if (subset.length <= cap && cost <= budget)
          assert.ok(subset.reduce((s, x) => s + x.score, 0) <= p.totalUtility);
      }
    }
});
test("open missions cannot be dispatched twice; invalid constraints rejected", () => {
  const w = seedWorkspace(now);
  w.missions.push({
    id: "m",
    siteId: "B03",
    status: "planned",
    createdAt: new Date(now).toISOString(),
    cost: 45,
    priorityAtDispatch: 76,
    policyVersion: "test",
    evidenceIds: [],
    assessmentSnapshot: assess(w, now)[0],
    evidenceSnapshot: [],
    budgetAtDispatch: 80,
    capacityAtDispatch: 2,
  });
  assert.ok(
    allocate(assess(w, now), w, 80, 2).selected.every(
      (a) => a.siteId !== "B03",
    ),
  );
  for (const [b, c] of [
    [-1, 2],
    [80.5, 2],
    [80, 6],
    [NaN, 1],
  ])
    assert.throws(() => allocate(assess(w, now), w, b, c));
});
test("fingerprint normalises note spacing/case but retains measurement distinctions", () => {
  assert.equal(
    fingerprint(valid),
    fingerprint({ ...valid, notes: " " + valid.notes.toUpperCase() + " " }),
  );
  assert.notEqual(fingerprint(valid), fingerprint({ ...valid, oxygen: 0 }));
});
test("CSV roundtrip handles commas, quotes, multiline notes and prevents spreadsheet formulas", () => {
  const w = seedWorkspace(now);
  w.observations = [
    {
      ...w.observations[0],
      ...valid,
      notes: 'A "grey", cloudy\nstream observed safely.',
    },
  ];
  const parsed = parseCSV(csvExport(w), now);
  assert.equal(parsed[0].notes, w.observations[0].notes);
  w.observations[0].notes = '=HYPERLINK("https://example.com")';
  assert.ok(csvExport(w).includes("'=HYPERLINK"));
});
test("CSV rejects invalid rows atomically and malformed quotes", () => {
  const w = seedWorkspace(now);
  assert.throws(() => parseCSV(csvExport(w) + "\nB01,bad", now));
  assert.throws(() => parseCSV('"unclosed', now));
});
const rain = (offset = 0) => ({
  items: Array.from({ length: 96 }, (_, i) => ({
    measure:
      "http://environment.data.gov.uk/flood-monitoring/id/measures/531179-rainfall-tipping_bucket_raingauge-t-15_min-mm",
    dateTime: new Date(now - offset - i * 900000).toISOString(),
    value: 0.1,
  })),
});
test("rainfall complete 96-interval window has actual times and a 24-hour sum", () => {
  const r = parseRainfall(rain(), now);
  assert.equal(r.status, "current");
  assert.equal(r.totalMm, 9.6);
  assert.equal(Date.parse(r.latest!) - Date.parse(r.earliest!), 86400000);
});
test("rainfall gaps, duplicates, invalid values and mixed gauges never masquerade as complete", () => {
  for (const patch of ["missing", "duplicate", "null", "wrong-gauge"]) {
    const p = rain();
    if (patch === "missing") p.items.pop();
    if (patch === "duplicate") p.items[1] = p.items[0];
    if (patch === "null") (p.items[1] as { value: unknown }).value = null;
    if (patch === "wrong-gauge") p.items[1].measure = "other";
    const r = parseRainfall(p, now);
    assert.equal(r.status, "partial");
    assert.equal(r.totalMm, null);
  }
});
test("stale rainfall is visibly stale and preserves historical window", () => {
  const r = parseRainfall(rain(8 * 3600000), now);
  assert.equal(r.status, "stale");
  assert.equal(r.ageHours, 8);
  assert.equal(r.totalMm, 9.6);
});
test("FHIR exports local Locations, correct statuses and explicit measurements without Patients", () => {
  const w = seedWorkspace(now);
  const b = fhirExport(w);
  assert.equal(b.resourceType, "Bundle");
  assert.equal(b.type, "collection");
  assert.equal(b.entry.length, 10);
  const resources = b.entry.map((e) => e.resource as Record<string, unknown>);
  assert.ok(resources.every((r) => r.resourceType !== "Patient"));
  assert.equal(resources.find((r) => r.id === "seed-1")?.status, "preliminary");
  const ids = new Set(b.entry.map((e) => e.fullUrl));
  for (const r of resources.filter((r) => r.resourceType === "Observation"))
    assert.ok(ids.has((r.subject as { reference: string }).reference));
});

test("genuine Environment Agency fixture is accepted with the provider's actual measure identifier", async () => {
  const { readFile } = await import("node:fs/promises");
  const fixture = JSON.parse(
    await readFile(
      new URL("./fixtures/ea-bristol-2026-09-14.json", import.meta.url),
      "utf8",
    ),
  );
  const latest = Math.max(
    ...fixture.items.map((i: { dateTime: string }) => Date.parse(i.dateTime)),
  );
  const result = parseRainfall(fixture, latest + 60000);
  assert.equal(result.status, "current");
  assert.equal(result.count, 96);
  assert.ok(result.totalMm !== null);
});

test("enum arrays and objects are rejected before triage", () => {
  for (const k of ["appearance", "odour", "wildlife"])
    for (const value of [["distressed"], { toString: () => "distressed" }])
      assert.throws(() => validateObservation({ ...valid, [k]: value }, now));
});
test("daily commitments including completed visits are deducted from remaining capacity", () => {
  const w = seedWorkspace(now);
  const a = assess(w, now);
  const first = allocate(a, w, 80, 2, now);
  for (const x of first.selected)
    w.missions.push({
      id: crypto.randomUUID(),
      siteId: x.siteId,
      createdAt: new Date(now).toISOString(),
      status: "complete",
      cost: SITES.find((s) => s.id === x.siteId)!.cost,
      priorityAtDispatch: x.score,
      policyVersion: "test",
      evidenceIds: [],
      assessmentSnapshot: x,
      evidenceSnapshot: [],
      budgetAtDispatch: 80,
      capacityAtDispatch: 2,
    });
  const second = allocate(a, w, 80, 2, now);
  assert.equal(second.selected.length, 0);
  assert.equal(second.committedCost, 80);
  assert.equal(second.committedVisits, 2);
  assert.equal(second.remainingBudget, 0);
  assert.equal(second.remainingCapacity, 0);
});
test("numeric negative temperature roundtrips without spreadsheet formula escaping", () => {
  const w = seedWorkspace(now);
  w.observations = [{ ...w.observations[0], ...valid, temperature: -1 }];
  assert.equal(parseCSV(csvExport(w), now)[0].temperature, -1);
});
