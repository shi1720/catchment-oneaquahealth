# Prioritisation policy and scientific limits

Version: `catchment-triage-1.0`.

The score is an operational ordering policy for a fictional demonstration, **not** pollution probability, biodiversity condition, disease risk, regulatory compliance or suitability for swimming/drinking. No model has been trained and no ecological accuracy is claimed.

| Signal | Raw points |
|---|---:|
| Cloudy / unusual colour / surface scum | 12 / 16 / 20 |
| Sewage-like or chemical-like odour | 18 |
| Dead or visibly distressed wildlife | 50 plus independent incident-review prompt |
| Dissolved oxygen below 6 / below 4 mg/L | 12 / 25 |
| pH below 6 or above 9 | 15 |
| Turbidity above 20 / above 50 NTU | 8 / 15 |

For each signal, take the maximum weighted value from non-rejected reports. Report status: confirmed ×1, pending ×0.65. Instrument calibration unconfirmed: measurement signals ×0.5. Age: up to 24h ×1; 24–72h ×0.65; 72h–7d ×0.3; older or future signals ×0. Round each contribution to an integer, then sum and cap at 100.

Context: fictional site settings add 3–15 points; no confirmed report in the last 7d adds 12; scenario rainfall adds 8 only when there is another signal. Live EA rainfall is never mixed into this fictional scenario. Thresholds are prototype policy, not thresholds endorsed by ecological sources. Temperature is preserved as context, not assigned a one-size-fits-all thermal threshold.

Bands: 60+ investigate, 30–59 review, 0–29 routine. These labels describe queue priority only. Evidence labels count active confirmed reports (limited0/developing1/reviewed2+); they are not probability, observer independence, expertise or laboratory confirmation. Duplicate detection blocks identical submissions; strongest-signal aggregation prevents repeated reports adding signal points, but adversarial corroboration is not solved.

A wildlife distress prompt exists independently of budget allocation. Appropriate incident reporting must not wait for a kit. This prototype links England's guidance; other jurisdictions need local channels. Surface scum does not establish a toxic bloom. No pathogenic organisms are inferred from clarity, smell or chemistry.

For real deployment, first define the monitoring objective with a river programme, establish local baselines, review species/season/flow context, calibrate instruments and policy, evaluate false alarms/missed events prospectively and document reviewer edits. Do not train or tune solely against the synthetic demo and present that as environmental accuracy.
