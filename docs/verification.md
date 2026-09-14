# Verification record

Last local verification: 14 September 2026. All data generated during tests is synthetic. Production status is recorded in the release handoff; local tests alone do not prove hosted availability. The built Worker also passed the API and browser journey checks.

## Checks completed

- **22 unit tests**: deterministic seed, strict enums (including array/object rejection), numeric bounds and zero/unknown distinction, stale evidence, review/rejection, duplicate signal handling, urgent wildlife independent of budget, exact allocation, cumulative daily commitments, CSV escaping and negative-temperature roundtrip, experimental FHIR reference/status structure, rainfall completeness/staleness and a genuine EA response fixture.
- The allocation check considers every one of the 32 possible subsets at 246 budget/capacity combinations. This proves optimality for that fixture and objective, not ecological usefulness or large-scale performance.
- **17 API scenarios** against the running local Worker environment: origin rejection, validation, persistence, duplicate handling, version conflict, idempotency, approval requirement and exact-plan comparison, frozen dispatch provenance, cumulative budget, follow-up linkage, atomic import, second-visitor isolation, exports and session checks, concurrent write conflict and reset.
- **Browser journey**: record, show and correct a quality conflict, confirm with rationale, compare 2/1 visits, dispatch, reload, complete visit, export 3 formats, import CSV, confirm isolated second visitor. No browser page errors.
- Four tabs checked at 390 px and 768 px for horizontal page overflow; representative desktop/mobile screenshots visually inspected. Additional checks cover approval invalidation, preserving input after network failure, and 200% root-font enlargement on desktop. This is not a comprehensive WCAG audit or assistive-technology/user study.
- **WebMCP**: native browser support was unavailable. Registration plus valid/invalid read/staging semantics were exercised with an explicit browser shim. Native conformance was not verified; no mission is dispatched by the staging tool.
- Strict TypeScript checking and a production Worker build pass.

## Reproduce

```bash
npm ci
npm test
npm run typecheck
npm run build
# Apply the documented initial local D1 migration once, then start a server.
npm run dev
# In a second terminal:
npm run test:api
npx playwright install chromium
npm run test:browser
```

If Chromium is already installed as Chrome, `CATCHMENT_BROWSER_CHANNEL=chrome npm run test:browser` uses it. Set `CATCHMENT_TEST_URL` to the local built Worker URL for server integration checks. Browser screenshots/downloads go to ignored `test-results/`.

## Review and repairs

A separate AI judge reviewed code and screenshots using the official weighted rubric. Its initial 71.4/100 estimate was a pre-fix internal critique, not an organiser score. It identified real issues: an incorrect EA measure identifier, loose enum type coercion, repeated allocations exceeding a daily limit, negative numeric CSV escaping, missing dispatch snapshots and unlinked follow-ups. These were corrected and covered with regression checks. The report is evidence of iterative review, not proof of winning or external domain validation.

## Not verified

Real river-trust/citizen usability, prospective environmental accuracy, independent security audit, authenticated organisation roles, operational uptime/SLA, full FHIR terminology/profile conformance, institutional procurement or customer willingness to pay. Those remain pilot work. The system is a tested demonstration and field-trial MVP, not an operational water-safety product.
