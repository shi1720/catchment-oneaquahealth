# Architecture and API

## Data flow

Citizen input → strict server validation → pending observation → human review → fresh policy assessment → exact constrained allocation → coordinator acknowledgement → persisted mission snapshot → completed visit → optional linked follow-up → evidence export.

The complete workspace is a bounded JSON document in one D1 row. This is an intentional five-site pilot design: the full document updates atomically with `WHERE revision = ?`, avoiding partial multi-table state transitions. The maximum is 512 KB. It does not claim indefinite catchment-scale storage; a production programme should normalise observations and append-only events and paginate queries.

The session identifier is 2 cryptographically random UUIDs. It is held in an HttpOnly cookie, not returned in application JSON or export. The server reads only the row associated with that cookie, and no workspace ID is accepted from a request body. The cookie acts as a bearer capability; do not share it. Roles in the demo are workflow steps performed by one visitor, not independently authenticated citizen/coordinator accounts.

## Routes

| Route | Behaviour |
|---|---|
| GET `/api/workspace` | Read own state; create a synthetic workspace if no valid session. Returns workspace, revision, assessments. No-store. |
| POST `/api/workspace` | Requires same origin, JSON, current revision, UUID requestId and an action. Returns the new snapshot only after D1 persistence succeeds. |
| GET `/api/rainfall` | Fetch fixed EA gauge with a 7-second timeout. Cache successful response 5 minutes; no cache for upstream failure. Does not affect scenario scores. |
| GET `/api/export?format=json\|csv\|fhir` | Requires valid session; returns attachment with no-store. Only JSON contains the entire decision trail. |

Actions: `observe {observation}`, `import {observations}`, `review {id,status,note}`, `dispatch {budget,capacity,acknowledged:true,approvedPlan}`, `complete {id,outcome}`, `reset {confirmation:"RESET"}`. Every mutation also needs `revision` and `requestId`.

- 400: invalid action/data/transition; input preserved in client.
- 401: missing or expired session; reload to start again.
- 403: cross-origin mutation.
- 409: optimistic revision conflict; reload current state and review before retrying.
- 413: request/workspace bound exceeded.
- 415: unsupported content type.
- 503: storage unavailable; no success message is displayed.

A repeated requestId already in the workspace returns the current snapshot without repeating its side effect. The last 100 IDs are retained, so callers must not treat old keys as permanent idempotency guarantees.

## Dispatch consistency

The client supplies an exact approval key covering the displayed policy, revision, UTC date, limits, selected sites, scores, report IDs and explanations. The server compares it with the current recomputation and returns 409 if it changed. The UI invalidates approval when the plan changes.

The server recomputes the plan from stored evidence; it does not trust a client-supplied selected-site list or priority. It deducts every mission created during the current UTC date, including completed missions, from the total day limits. All open missions remain excluded from new allocations. New limits become persisted at successful dispatch. Budgets are illustrative GBP integers; costs are fictional consumables/travel estimates.

Mission snapshots include source observation objects, the full assessment contributions, policy version, priority, budget and capacity. Reviews can change the current report but not those snapshots. Follow-up observations reference a completed mission at the same site. Structured activity references make JSON exports traceable. The bounded audit is not tamper-proof or independently signed.

## Deployment

The app builds to a Cloudflare-compatible Worker using Vinext. `.openai/hosting.json` declares logical `DB`; Sites owns deployed resource IDs. Public GitHub source is separate from the platform source remote. Do not commit credentials or `.wrangler`, `.env`, `.sites-runtime`, local databases or build output. Clone users should configure their own hosting project/resources instead of attempting to publish to the original project ID.
