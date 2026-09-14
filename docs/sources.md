# OneAquaHealth rules and evidence research

Verified 14 September 2026. Primary sources only. No registration, organizer contact, or submission performed. This is research for the Catchment build, not confirmation that the entrant is eligible.

## Rules that affect the build

The user supplied the overview text. Direct retrieval confirms that overview, but the official pages conflict. Treat the conflicts as unresolved; do not silently choose the more convenient version.

| Issue | Official evidence | Consequence |
|---|---|---|
| Development dates | [Rules](https://oneaquahealth-ieee-hackathon.devpost.com/rules) and [organizer site](https://www.oneaquahealth.eu/oneaquahealth-ieee-global-hackathon/) specify September 16–30. The overview displays September 14–30. | Code written September 14 may precede the stated development window. Preserve accurate creation history; never backdate work. Eligibility needs organizer clarification. |
| Registration | Rules and organizer site list August 31 as the closing date; the Devpost overview still has a join link. | Shivam's existing registration is unknown. An active link alone does not settle eligibility. |
| Entrant/team | [Overview](https://oneaquahealth-ieee-hackathon.devpost.com/) says students only and team required; rules and organizer instructions allow individuals or teams. | Age, student status and real human team membership remain unverified. An AI agent is not a human teammate. |
| Originality/IP | Rules require original work during the event, respect for third-party rights, a public source repository, and one team per participant. | Credit dependencies, assets and sources; retain a build log. |

The [schedule](https://oneaquahealth-ieee-hackathon.devpost.com/details/dates) lists submission opening **September 14, 09:00 PDT**, and closing **September 30, 21:00 PDT**. Converted: opening September 14, 21:30 IST; cutoff **October 1, 09:30 IST / 04:00 UTC**. Judging is October 1–15; results October 24. Submit early; do not depend on the cutoff resolving the separate development-date discrepancy.

The [overview](https://oneaquahealth-ieee-hackathon.devpost.com/) requests a chosen track, project explanation, working prototype/proof of concept, public documented code, and **3–5 minute demo video**. Its current cash prizes total $3,500, matching the supplied text. A separate [citizen-science activity](https://www.oneaquahealth.eu/citizen-science-project/) requests an under-10-minute emailed video; that is a different activity, not the hackathon video rule.

No explicit AI-authorship disclosure requirement, ban on coding assistants, detailed entrant IP assignment, or open-source licence requirement was present in the inspected hackathon rules. Absence is not assurance. The [organizer](https://www.oneaquahealth.eu/oneaquahealth-ieee-global-hackathon/) encourages AI as solution technology. Keep truthful credits: “Project led by Shivam Gupta; developed with AI assistance.” Do not claim Shivam personally coded or tested specific changes unless he did. No need to foreground an assistant as the project owner.

## Exact weighted judging rubric

All criteria receive 1–10 scores; [rules](https://oneaquahealth-ieee-hackathon.devpost.com/rules) provide these weights:

| Dimension, paraphrased | Weight | Evidence Catchment should show |
|---|---:|---|
| Mission impact | 30% | A citizen report changes a coordinator's defensible next action and connects wildlife, ecosystem conditions and human exposure context. |
| Originality | 20% | Scarce sampling resources allocated transparently; uncertainty becomes a concrete follow-up task. |
| Technical execution | 20% | Real end-to-end persistence, validation, constrained allocation, human review, exports and failure handling. |
| Usability/accessibility | 15% | Understandable labels, keyboard access, mobile field flow, visible uncertainties and clear next steps. |
| Practical adoption/scale | 15% | Named buyer, realistic pilot, explicit costs, interoperable export and honest integration status. |

Suggested judge formula: `0.30*impact + 0.20*innovation + 0.20*technical + 0.15*ux + 0.15*feasibility`. Internal judge scores are estimates, not independent validation or organizer scores.

The [project gallery](https://oneaquahealth-ieee-hackathon.devpost.com/project-gallery) was unpublished at retrieval. No entrant examples were available to review. The user did not supply example projects beyond the hackathon description.

## Existing OneAquaHealth tools and data

The project already provides a Citizen Science App, city dashboards, a resilience map combining multiple indicator categories, GEOSSIP and a restoration decision-support tool. The latter already links impairment/stressors to measures and retains expert judgment. **Product inference:** another map with a health score is weak differentiation. A traceable report-to-review-to-budgeted-follow-up workflow is a clearer complementary role. [Official solutions](https://www.oneaquahealth.eu/project-solutions/)

The [Citizen Science App](https://apps.oneaquahealth.eu/login) redirects to login. [GEOSSIP](https://www.oneaquahealth.eu/geossip/) is intended for scientists and authorized stakeholders. [City dashboards](https://www.oneaquahealth.eu/city_dashboards/) embed `app.enora-oah.eu`; the [resilience map](https://apps.oneaquahealth.eu/resmap/) is publicly linked and described as allowing data export, but no documented anonymous raw observation API or clear reuse licence for those observations was verified. Do not scrape or claim native integration. Offer documented CSV import with an explicit mapping and user-supplied authorized data. Simulated observations/sites must remain clearly labelled.

## Five ecological sources suitable for triage

These support observation prompts and human follow-up; they do **not** validate a numeric Catchment priority score, predict illness, establish causation, or certify water safety. Any scoring thresholds are product policy, disclosed and editable, until evaluated by qualified partners.

1. **EPA visual stream assessment.** Repeated observations of the same reach help establish baseline conditions; location, photographs, changes, odor, sheen/foam, turbidity and bank vegetation are appropriate fields. Observations go to a coordinator for further action. Use this to justify longitudinal reports and human review, not diagnosis. [EPA methods chapter](https://archive.epa.gov/water/archive/web/html/vms32.html)

2. **OneAquaHealth field protocols.** Record site identity, date/time, coordinates, measured water temperature, dissolved oxygen, conductivity, pH and habitat/flow context. The research protocol separates measured chemistry, biological sampling and laboratory methods. Only trained personnel should use its specialized collection methods; the citizen flow should remain bank-side observation. Cite the protocol as schema inspiration, without presenting Catchment's score as an OAH index. [Official PDF](https://www.oneaquahealth.eu/app/uploads/2026/07/Field-Sampling-protocols-OAH_zenodo_final_mjf.pdf)

3. **Environment Agency incident reporting.** Dead/gasping fish and pollution incidents warrant prompt appropriate reporting. Catchment can flag this as “urgent review/report suspected pollution,” with jurisdiction-specific official action links; it should not defer an incident report until a lab budget is available. [Government reporting guidance](https://www.gov.uk/report-environmental-problem)

4. **EPA cyanobacteria methods.** Discoloration, mats and fish mortality can support initial detection, but confirmation requires appropriate sampling/analytical methods. Label “suspected bloom”; a photograph cannot establish toxin production or concentration. [EPA HAB methods](https://www.epa.gov/habs/hab-methods)

5. **Defra water monitoring limitations.** General environmental sample frequency is insufficient to reliably characterize current conditions for wild swimming. This directly supports never issuing swimming/drinking clearance from historical chemistry or citizen appearance reports. [Water Quality Explorer: wild swimming](https://environment.data.gov.uk/support/faqs/275879249/275879383)

Additional indicator vocabulary: [OAH factsheets](https://zenodo.org/records/20345207), DOI `10.5281/zenodo.20345207`, describe biodiversity, microbiological and physical/chemical indicator categories. Its rendered rights field was blank, so do not assume a specific redistribution licence for illustrations. Link and paraphrase rather than copying their graphics.

## Verified live rainfall connector: Bristol/Bath

Primary reference: [Environment Agency rainfall API](https://environment.data.gov.uk/flood-monitoring/doc/rainfall). No registration/key required; OGL v3. Rain gauges report 15-minute totals; transmission can occur only once or twice daily, despite frequent API updates. Coordinates are rounded to a 100 m grid. Never equate fetch time with observation time.

Required attribution:

> this uses Environment Agency rainfall data from the real-time data API (Beta)

Direct HTTP checks at **2026-09-14T15:38:00Z** succeeded:

| Gauge | API coordinates | Latest returned timestamp | Sum of 96 returned intervals |
|---|---|---|---:|
| 531179 (Bristol vicinity) | 51.460233, -2.609517 | 2026-09-14T15:00:00Z | 2.20 mm |
| 53108 (Bath vicinity) | 51.383140, -2.325412 | 2026-09-14T15:15:00Z | 0.83 mm |
| 52203 (southwest of Bristol) | 51.408672, -2.666341 | 2026-09-14T15:00:00Z | 2.20 mm |

The agency labels these simply “Rainfall station”; the vicinity descriptions above are geographic orientation, not official station names.

Working metadata: [Bristol gauge 531179](https://environment.data.gov.uk/flood-monitoring/id/stations/531179).

Working readings: [Bristol recent rainfall](https://environment.data.gov.uk/flood-monitoring/id/stations/531179/readings?parameter=rainfall&_sorted&_limit=96); [Bath recent rainfall](https://environment.data.gov.uk/flood-monitoring/id/stations/53108/readings?parameter=rainfall&_sorted&_limit=96).

Example response fields: `items[].dateTime`, `items[].value`, `items[].measure`; `meta.publisher`, `meta.licence`, `meta.version` (0.9 returned). Values may be absent: do not coerce missing values to zero. Choose a known rainfall measure rather than summing mixed station parameters.

**Engineering policy recommendations (our design, not agency thresholds):** timeout, explicit error/empty/stale states, cached snapshot with timestamp, deduplicate and sort timestamps, reject missing/non-finite/negative values, count gaps, and check 96 contiguous 15-minute intervals before calling the sum a 24-hour total. Show an exact coverage interval. A fetched historical window is not necessarily the last 24 hours. Keep live context separate from simulated reports and never alter demo priority from stale context. Point rainfall is context, not proof of catchment runoff or contamination.

## Other dataset options

| Option | Use | Limits/licensing |
|---|---|---|
| [EEA Waterbase ICM 2024](https://sdi.eea.europa.eu/catalogue/datahub/api/records/77976729-1aeb-4b61-a673-83db6c6a2ab2/formatters/xsl-view?approved=true&language=eng&output=pdf) | European chemistry baselines, station metadata, past nutrients/organic matter | Annual, not live; individual samples and aggregates are separate tables. CSV/SQLite and Discodata. Preserve original identifiers and measurement dates. Check exact licence in downloaded metadata. |
| [EA Water Quality Explorer API](https://environment.data.gov.uk/water-quality/api-docs) | England historical laboratory observations | OGL v3 except stated exceptions. The [legacy API was retired](https://environment.data.gov.uk/support/faqs/275879249/1156874241); use new `/data/sampling-point` and `/data/observation`, `pointNotation`, `dateFrom/dateTo`, `limit/skip`. Observation pages max 250. Do not implement obsolete `/id/.../measurements` examples found online. |
| [Water Quality Portal](https://www.waterqualitydata.us/webservices_documentation/) | US measured chemistry/biology and station metadata | REST station/result endpoints; formats include CSV and GeoJSON. Characteristic names are case-sensitive. Geographic mismatch for an England story unless explicitly framed as expansion. Preserve provider QA/qualification fields. |
| [Open-Meteo](https://open-meteo.com/en/pricing) | Optional model weather context outside England | Free endpoint is noncommercial, max 10,000/day, without uptime guarantee. Commercial deployment needs a subscription or a separately assessed self-hosted route; do not promise permanently free commercial use. Data attribution also required. EA rainfall is the cleaner MVP choice here. |

## Remaining human/organizer dependencies

1. Verify registration, age/student status, human team conditions and whether September 14 work is permitted despite the September 16 rule text.
2. A real participant records the supplied 3–5 minute script, reviews project claims and completes Devpost entry under their account.
3. Before claims of real-world readiness: agency/river-trust pilot, ecological review of prioritization policy, authorized datasets and prospective operational evaluation. These are future validation steps, not completed partnerships.

No sponsor affiliation, water-safety accuracy, predicted disease reduction, paying customer, pilot, or external ecological validation should be implied by a polished demo.
