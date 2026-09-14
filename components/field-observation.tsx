"use client";
import { useEffect, useState } from "react";
import {
  Check,
  ShieldCheck,
  AlertTriangle,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SITES,
  siteById,
  type ObservationInput,
  type SiteId,
} from "@/lib/catchment/model";
import { qualityFlags, validateObservation } from "@/lib/catchment/engine";
import { Choice, type Action } from "./catchment-common";
const localNow = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export function FieldObservation({
  act,
  busy,
  initialSite,
  missionId,
  onSaved,
}: {
  act: Action;
  busy: boolean;
  initialSite: SiteId;
  missionId?: string;
  onSaved: (id: SiteId) => void;
}) {
  const [siteId, setSite] = useState<SiteId>(initialSite);
  const [date, setDate] = useState("");
  const [appearance, setAppearance] = useState("clear");
  const [odour, setOdour] = useState("none");
  const [wildlife, setWildlife] = useState("none_seen");
  const [notes, setNotes] = useState("");
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [calibrated, setCalibrated] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setDate(localNow());
    setSite(initialSite);
  }, [initialSite]);
  function value() {
    return {
      siteId,
      ...(missionId ? { missionId } : {}),
      observedAt: date ? new Date(date).toISOString() : "",
      appearance,
      odour,
      wildlife,
      notes,
      calibrated,
      ...Object.fromEntries(
        Object.entries(measurements)
          .filter(([, v]) => v !== "")
          .map(([k, v]) => [k, Number(v)]),
      ),
    } as ObservationInput;
  }
  let flags: string[] = [];
  try {
    flags = qualityFlags(value());
  } catch {}
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const input = validateObservation(value());
      if (await act({ action: "observe", observation: input })) {
        setNotes("");
        setMeasurements({});
        onSaved(siteId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check the form.");
    }
  }
  return (
    <div className="field-layout">
      <form className="panel observation-form" onSubmit={submit}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">A TWO-MINUTE BANK-SIDE CHECK</p>
            <h2>What did you notice?</h2>
          </div>
          <ClipboardList />
        </div>
        <div className="form-body">
          {missionId && (
            <p className="followup-banner">
              Follow-up linked to the completed field mission. Keep the same
              site.
            </p>
          )}
          <div className="form-grid">
            <Choice
              id="site"
              disabled={!!missionId}
              label="Monitoring site"
              value={siteId}
              onChange={(v) => {
                if (!missionId) setSite(v as SiteId);
              }}
              options={SITES.map((s) => ({
                value: s.id,
                label: `${s.id} · ${s.name}`,
              }))}
            />
            <div className="form-field">
              <label htmlFor="observedAt">When did you observe it?</label>
              <Input
                id="observedAt"
                type="datetime-local"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <small>Your device’s local time</small>
            </div>
          </div>
          <div className="section-label">
            <span>01</span>Describe what you can see
          </div>
          <div className="form-grid">
            <Choice
              id="appearance"
              label="Water appearance"
              value={appearance}
              onChange={setAppearance}
              options={[
                { value: "clear", label: "Clear · I can see into the water" },
                {
                  value: "cloudy",
                  label: "Cloudy · particles obscure the water",
                },
                {
                  value: "scum",
                  label: "Surface scum · film or floating material",
                },
                { value: "unusual", label: "Unusual colour · explain below" },
              ]}
            />
            <Choice
              id="odour"
              label="Odour noticed from the bank"
              value={odour}
              onChange={setOdour}
              options={[
                { value: "none", label: "No unusual odour" },
                { value: "earthy", label: "Earthy / vegetation" },
                { value: "sewage", label: "Sewage-like" },
                { value: "chemical", label: "Chemical-like" },
              ]}
            />
          </div>
          <Choice
            id="wildlife"
            label="Visible wildlife"
            value={wildlife}
            onChange={setWildlife}
            options={[
              { value: "none_seen", label: "I did not see wildlife" },
              { value: "normal", label: "Wildlife seen, no obvious distress" },
              {
                value: "distressed",
                label: "Dead or visibly distressed wildlife",
              },
            ]}
          />
          <div className="form-field">
            <label htmlFor="notes">Describe the observation</label>
            <Textarea
              id="notes"
              required
              minLength={8}
              maxLength={1500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="For example: a thin green film near the shaded bank; no cause confirmed."
            />
            <small>
              Record facts. Avoid names, contact details, or guesses about the
              cause.
            </small>
          </div>
          <div className="section-label">
            <span>02</span>Add readings if you have them <small>Optional</small>
          </div>
          <p className="field-help">
            Use readings you already collected safely with appropriate
            equipment. Leave unknown values blank.
          </p>
          <div className="form-grid four">
            {[
              {
                key: "oxygen",
                label: "Dissolved oxygen",
                unit: "mg/L",
                min: 0,
                max: 25,
              },
              { key: "ph", label: "pH", unit: "0–14", min: 0, max: 14 },
              {
                key: "turbidity",
                label: "Turbidity",
                unit: "NTU",
                min: 0,
                max: 4000,
              },
              {
                key: "temperature",
                label: "Temperature",
                unit: "°C",
                min: -2,
                max: 50,
              },
            ].map((m) => (
              <div className="form-field" key={m.key}>
                <label htmlFor={m.key}>
                  {m.label} <span>{m.unit}</span>
                </label>
                <Input
                  id={m.key}
                  type="number"
                  step="any"
                  min={m.min}
                  max={m.max}
                  placeholder="Unknown"
                  value={measurements[m.key] ?? ""}
                  onChange={(e) =>
                    setMeasurements({
                      ...measurements,
                      [m.key]: e.target.value,
                    })
                  }
                />
              </div>
            ))}
          </div>
          <label className="check-label">
            <Checkbox
              checked={calibrated}
              onCheckedChange={(v) => setCalibrated(v === true)}
            />
            I checked instrument calibration for these readings
          </label>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <Button disabled={busy} type="submit" className="primary-btn">
            <Check size={17} />
            {busy ? "Saving observation…" : "Save for human review"}
            <ArrowRight size={17} />
          </Button>
        </div>
      </form>
      <aside>
        <div className="dark-panel">
          <ShieldCheck size={28} />
          <p className="eyebrow">SAFE OBSERVATION</p>
          <h2>
            Stay on the bank.
            <br />
            Let the evidence travel.
          </h2>
          <p>{siteById(siteId).access}</p>
          <p>
            Do not touch, taste, or deliberately smell water. This demonstration
            cannot tell you whether water is safe for swimming or drinking.
          </p>
        </div>
        <div className="panel quality-panel">
          <h3>Quality check</h3>
          <p>Checks update as you enter evidence.</p>
          {flags.map((flag) => (
            <div className="quality-flag" key={flag}>
              <AlertTriangle size={16} />
              {flag}
            </div>
          ))}
          {wildlife === "distressed" && (
            <a
              className="text-link"
              href="https://www.gov.uk/report-environmental-problem"
              target="_blank"
              rel="noreferrer"
            >
              Report a suspected incident in England <ArrowRight size={15} />
            </a>
          )}
        </div>
        <p className="fineprint">
          Saved on the server in your own demonstration workspace. No other
          visitor sees your entries. This is a simulated catchment; enter
          demonstration data only.
        </p>
      </aside>
    </div>
  );
}
