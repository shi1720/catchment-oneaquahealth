# Import and interoperability

## CSV

Template columns: `siteId,observedAt,appearance,odour,wildlife,notes,oxygen,ph,turbidity,temperature,calibrated`.

Sites B01–B05; time ISO8601 within 30 days; appearance clear/cloudy/scum/unusual; odour none/earthy/sewage/chemical; wildlife normal/none_seen/distressed; calibration true/false. Optional numeric fields blank for unknown (never use zero as unknown). Units: oxygen mg/L, pH0–14, turbidity NTU, water temperature°C. Notes8–1500 characters. Import1–50 rows, max60KB; all rows must pass before any are saved. Every imported row starts pending review, regardless of an imported status column.

CSV exports include review status, source, note and optional mission link. Text cells beginning with spreadsheet-formula characters are prefixed with an apostrophe; genuine numeric negatives remain numbers. CSV cannot express the complete mission/audit structure: use JSON for full-fidelity evidence packets.

## Evidence JSON

`catchment-evidence-1.0` includes export timestamp, policy version, fictional site catalogue, current assessments, reports, mission snapshots, linked follow-ups and bounded activity history. Scenario and participant sources are explicit. Participant entry does not mean independently verified real-world data.

## Experimental FHIR R4

FHIR R4 permits Location as an Observation subject. The exporter creates one fictional Location per site and one Observation per report, in a collection Bundle with fullUrl references resolving inside the bundle. It includes code.text, component values, explicit units, effectiveDateTime, issued time, review/source notes and a demonstration tag.

Pending→preliminary; confirmed→final; rejected→entered-in-error is an **illustrative mapping**, not a claim that coordinator confirmation is laboratory validation. Quantity units use UCUM mg/L, [pH] and Cel where applicable; turbidity is labelled NTU without claiming a UCUM code. Concepts are local text; no invented LOINC codes or equivalence mappings are provided. The example namespace `catchment.example` is intentionally not a deployed terminology service.

The export is not a clinical transaction, not a FHIR server, not an approved OneAquaHealth profile and not terminology/profile-validated by a clinical receiver. No Patient, Condition or disease inference is created. Structural/reference tests are narrower than full HL7 validation. Partner work should consider environmental-first standards such as OGC SensorThings/STAplus, define profiles and vocabularies, and test a real receiving system before promising integration.

Sources: https://hl7.org/fhir/R4/observation.html ; https://hl7.org/fhir/R4/location.html ; https://hl7.org/fhir/R4/bundle.html
