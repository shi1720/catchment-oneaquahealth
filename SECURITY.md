# Security scope

Use this deployment with demonstration data only. It is not an organisation identity system or an emergency reporting service.

Implemented: separate server session per visitor; HttpOnly/SameSite=Strict cookie with Secure on HTTPS; same-origin JSON writes; prepared SQL; optimistic concurrency; bounded request/workspace/import sizes; strict enums and numeric ranges; duplicate detection; short-window request idempotency; no-store evidence responses; escaped React text; spreadsheet formula neutralisation; no general-purpose external URL fetcher; fixed EA endpoint and timeout.

Do not put personal names, exact sensitive locations, photographs, credentials, health data or genuine emergency reports into the demo. Exports contain everything entered in that visitor's workspace. Reset overwrites that workspace's document; provider backups/logs may have their own retention, so this is not a certified erasure system.

Not implemented: authenticated organisation roles, account recovery, workspace sharing, ingress abuse/rate controls, scheduled deletion, operational monitoring and alerting, backups/restore drills, penetration testing, tamper-proof audit or an SLA. Anonymous browser isolation does not provide identity assurance. D1 documents and global creation volume need stronger controls before a public real-data service. Provider platform protections are supplementary, not proof of security.

Please avoid posting exploitable details or sensitive data in public issues. Contact the repository owner using a private channel available on their profile for a security concern.
