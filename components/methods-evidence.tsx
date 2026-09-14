"use client";
import { useEffect, useState } from "react";
import {
  Download,
  Upload,
  CloudRain,
  ExternalLink,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CSV_COLUMNS, parseCSV } from "@/lib/catchment/exports";
import { POLICY_VERSION } from "@/lib/catchment/model";
import { when, type Props } from "./catchment-common";
type Rain = {
  status: string;
  totalMm?: number | null;
  count?: number;
  latest?: string | null;
  earliest?: string | null;
  fetchedAt: string;
  message: string;
  sourceUrl: string;
};
export function MethodsEvidence({ data, act, busy }: Props) {
  const [rain, setRain] = useState<Rain | null>(null);
  const [loading, setLoading] = useState(false);
  const [csv, setCsv] = useState("");
  const [importError, setImportError] = useState("");
  const [reset, setReset] = useState("");
  async function loadRain() {
    setLoading(true);
    try {
      const r = await fetch("/api/rainfall");
      if (!r.ok) throw new Error();
      setRain(await r.json());
    } catch {
      setRain({
        status: "unavailable",
        message:
          "The rainfall service is unavailable. Your demonstration remains fully usable.",
        sourceUrl:
          "https://environment.data.gov.uk/flood-monitoring/doc/rainfall",
        fetchedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadRain();
  }, []);
  function template() {
    const date = new Date().toISOString();
    const text =
      CSV_COLUMNS.join(",") +
      `\nB02,${date},cloudy,none,none_seen,Cloudy water observed from the footbridge after rain.,7.1,7.4,25,,true\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "catchment-import-template.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importRows() {
    setImportError("");
    try {
      const observations = parseCSV(csv);
      if (await act({ action: "import", observations })) setCsv("");
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Could not import CSV.");
    }
  }
  const sourceLinks = [
    {
      name: "EPA · Visual stream assessment",
      url: "https://archive.epa.gov/water/archive/web/html/vms32.html",
      text: "Observation vocabulary and repeated site checks.",
    },
    {
      name: "OneAquaHealth · Field sampling protocol",
      url: "https://www.oneaquahealth.eu/app/uploads/2026/07/Field-Sampling-protocols-OAH_zenodo_final_mjf.pdf",
      text: "Environmental measurement context; specialist sampling requires training.",
    },
    {
      name: "Environment Agency · Report an incident",
      url: "https://www.gov.uk/report-environmental-problem",
      text: "Distressed wildlife and suspected pollution warrant prompt official review.",
    },
    {
      name: "EPA · Harmful algal bloom methods",
      url: "https://www.epa.gov/habs/hab-methods",
      text: "Appearance alone cannot confirm toxins.",
    },
    {
      name: "Defra · Limits of water monitoring for swimming",
      url: "https://environment.data.gov.uk/support/faqs/275879249/275879383",
      text: "Environmental readings cannot establish current swimming safety.",
    },
    {
      name: "HL7 · FHIR R4 Observation",
      url: "https://hl7.org/fhir/R4/observation.html",
      text: "Experimental Location and Observation collection; no claimed implementation guide conformance.",
    },
  ];
  return (
    <>
      <div className="methods-grid">
        <section className="panel method-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">OPEN BY DESIGN</p>
              <h2>The reasoning is part of the result.</h2>
            </div>
            <BookOpen />
          </div>
          <div className="padded">
            <p>
              Catchment uses a deterministic, inspectable prioritisation policy.
              It has no trained prediction model and makes no diagnosis. A
              higher score means a stronger reason for a coordinator to
              investigate.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy component</TableHead>
                  <TableHead>Weight or rule</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ["Visual signal", "Cloudy 12; unusual colour 16; scum 20"],
                  [
                    "Odour / wildlife",
                    "Unusual odour 18; distressed wildlife 50",
                  ],
                  [
                    "Instrument readings",
                    "Oxygen <6: 12, <4: 25; pH outside 6–9: 15; turbidity >20: 8, >50: 15",
                  ],
                  [
                    "Evidence weighting",
                    "Pending ×0.65; uncalibrated instruments ×0.5",
                  ],
                  [
                    "Age of evidence",
                    "≤24 h ×1; ≤72 h ×0.65; ≤7 days ×0.3; older signals excluded",
                  ],
                  [
                    "Context",
                    "Scenario rain +8 only when a signal exists; site setting +3–15; no recent reviewed evidence +12",
                  ],
                  [
                    "Aggregation",
                    "Strongest evidence per signal; sum and cap at 100",
                  ],
                  [
                    "Allocation",
                    "Exact best subset under remaining daily budget and visit limit; earlier visits count; lower cost breaks ties",
                  ],
                ].map((row) => (
                  <TableRow key={row[0]}>
                    <TableCell>{row[0]}</TableCell>
                    <TableCell>{row[1]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="fineprint">
              {POLICY_VERSION} · These numeric choices are prototype policy, not
              thresholds endorsed by the cited sources. Local experts must
              calibrate and evaluate them before real operational use.
            </p>
            <div className="method-callout">
              <b>What “reviewed” means</b>
              <p>
                Evidence labels reflect the number of active confirmed reports:
                zero = limited, one = developing, two or more = reviewed. They
                are not statistical confidence, independence, or laboratory
                verification.
              </p>
            </div>
          </div>
        </section>
        <section className="panel method-panel rainfall-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">REAL OPEN DATA / SEPARATE CONTEXT</p>
              <h2>Bristol rainfall gauge</h2>
            </div>
            <CloudRain />
          </div>
          <div className="padded">
            <p>
              Environment Agency station 531179. A real gauge near Bristol,
              separate from the fictional Brookfield network.
            </p>
            {loading ? (
              <p role="status">Loading rainfall observations…</p>
            ) : rain ? (
              <>
                <span
                  className={`status-tag ${rain.status === "current" ? "confirmed" : "pending"}`}
                >
                  {rain.status === "current"
                    ? "Complete recent window"
                    : rain.status}
                </span>
                <div className="rain-total">
                  {rain.totalMm != null ? rain.totalMm : "—"}
                  <span>mm / observed 24 h</span>
                </div>
                <p>{rain.message}</p>
                {rain.latest && (
                  <dl className="rain-dates">
                    <div>
                      <dt>Observed window ends</dt>
                      <dd>{when(rain.latest)}</dd>
                    </div>
                    {rain.earliest && (
                      <div>
                        <dt>Observed window starts</dt>
                        <dd>{when(rain.earliest)}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Valid intervals</dt>
                      <dd>{rain.count} / 96</dd>
                    </div>
                  </dl>
                )}
                <p className="fineprint">
                  Fetched {when(rain.fetchedAt)}. Times use your device’s local
                  timezone. Gauge transmission can be delayed. Live context
                  never changes the simulated priorities.
                </p>
              </>
            ) : null}
            <Button variant="outline" onClick={loadRain} disabled={loading}>
              <RefreshCw size={16} />
              Refresh live context
            </Button>
            <p className="attribution">
              This uses Environment Agency rainfall data from the real-time data
              API (Beta).{" "}
              <a
                href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
                target="_blank"
                rel="noreferrer"
              >
                Open Government Licence v3
              </a>
              .
            </p>
          </div>
        </section>
      </div>
      <section className="panel transfer-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">TAKE YOUR EVIDENCE WITH YOU</p>
            <h2>Import & export</h2>
          </div>
          <Download />
        </div>
        <div className="transfer-grid">
          <div>
            <h3>Export this workspace</h3>
            <p>
              The evidence packet includes reports, reviewer decisions, score
              explanations, missions and the audit trail.
            </p>
            <div className="button-row export-buttons">
              {[
                { format: "json", label: "Evidence JSON" },
                { format: "csv", label: "Observations CSV" },
                { format: "fhir", label: "Experimental FHIR R4" },
              ].map((f) => (
                <Button key={f.format} asChild variant="outline">
                  <a href={`/api/export?format=${f.format}`}>
                    <Download size={15} />
                    {f.label}
                  </a>
                </Button>
              ))}
            </div>
            <p className="fineprint">
              FHIR is a collection of Locations and Observations with explicit
              units and local text concepts. No Patient records, medical claims,
              validated profile, live clinical integration or OneAquaHealth API
              connection is implied.
            </p>
            <Button variant="outline" onClick={() => window.print()}>
              Print evidence summary / save PDF
            </Button>
          </div>
          <div>
            <h3>Import authorised observations</h3>
            <p>
              Use the template for up to 50 observations. All rows validate
              before any are saved. Imported entries start pending review.
            </p>
            <Button variant="outline" onClick={template}>
              <Download size={15} />
              Download CSV template
            </Button>
            <div className="form-field">
              <label htmlFor="csvfile">Choose a CSV file</label>
              <Input
                id="csvfile"
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  setImportError("");
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 60000) {
                    setImportError("Choose a CSV smaller than 60 KB.");
                    return;
                  }
                  setCsv(await file.text());
                }}
              />
            </div>
            {csv && (
              <p className="fineprint">
                {csv.length.toLocaleString()} characters ready to validate
              </p>
            )}
            {importError && (
              <p className="notice error" role="alert">
                {importError}
              </p>
            )}
            <Button onClick={importRows} disabled={busy || !csv}>
              <Upload size={15} />
              Validate & import
            </Button>
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">EVIDENCE BEHIND THE DESIGN</p>
            <h2>Source notes</h2>
          </div>
        </div>
        <div className="sources-grid">
          {sourceLinks.map((s) => (
            <a href={s.url} target="_blank" rel="noreferrer" key={s.url}>
              <b>
                {s.name}
                <ExternalLink size={14} />
              </b>
              <p>{s.text}</p>
            </a>
          ))}
        </div>
      </section>
      <section className="panel audit-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">THE DECISION RECORD</p>
            <h2>Workspace activity</h2>
          </div>
          <span className="pill">Revision {data.revision}</span>
        </div>
        <ol>
          {data.workspace.audit.slice(0, 30).map((a) => (
            <li key={a.id}>
              <time>{when(a.at)}</time>
              <div>
                <b>{a.action}</b>
                <p>{a.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="fineprint padded">
          Export includes the most recent 250 activity entries. This prototype
          audit log is not a tamper-proof compliance ledger.
        </p>
      </section>
      <section className="panel privacy-panel">
        <div>
          <h3>Your demonstration workspace</h3>
          <p>
            An unguessable, HttpOnly cookie keeps this browser’s server data
            separate from other visitors. Access expires after 30 days. Expired
            records are removed during bounded cleanup on new-session creation.
            No names, photos, health records or real incident data are needed.
          </p>
          <p>
            For a field pilot, add organisation accounts and roles, scheduled
            deletion, abuse protection, monitoring and local ecological review.
            This release is a field-trial MVP.
          </p>
        </div>
        <div>
          <label htmlFor="reset">
            Type RESET to replace only your demo data
          </label>
          <Input
            id="reset"
            value={reset}
            onChange={(e) => setReset(e.target.value)}
            placeholder="RESET"
          />
          <Button
            variant="outline"
            disabled={busy || reset !== "RESET"}
            onClick={async () => {
              if (await act({ action: "reset", confirmation: reset }))
                setReset("");
            }}
          >
            Reset my demonstration
          </Button>
        </div>
      </section>
    </>
  );
}
