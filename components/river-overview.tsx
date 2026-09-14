"use client";
import { useState } from "react";
import {
  ArrowRight,
  FlaskConical,
  ShieldCheck,
  ArrowUpRight,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SITES, siteById, type SiteId } from "@/lib/catchment/model";
import { qualityFlags } from "@/lib/catchment/engine";
import { NumberScore, when, type Props } from "./catchment-common";

export function RiverOverview({
  data,
  selected,
  onSelect,
  onPlan,
  act,
  busy,
}: {
  selected: SiteId;
  onSelect: (id: SiteId) => void;
  onPlan: () => void;
} & Props) {
  const [rationale, setRationale] = useState<Record<string, string>>({});
  const assessments = data.assessments;
  const chosen = assessments.find((a) => a.siteId === selected)!;
  const site = siteById(selected);
  const reports = data.workspace.observations.filter(
    (o) => o.siteId === selected,
  );
  return (
    <>
      <section className="overview-grid">
        <div className="panel map-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">THE CONNECTED PICTURE</p>
              <h2>Five reaches. One living system.</h2>
            </div>
            <span className="pill">Schematic</span>
          </div>
          <div className="river-map">
            <svg
              viewBox="0 0 700 495"
              role="img"
              aria-label="Fictional Brookfield stream, ordered upstream to downstream: Willow, Meadow, Foundry, School, Estuary. All sites are also available in the accessible list alongside."
            >
              <defs>
                <pattern
                  id="grid"
                  width="34"
                  height="34"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 34 0 L 0 0 0 34"
                    fill="none"
                    stroke="#c9dee4"
                    strokeWidth=".6"
                  />
                </pattern>
              </defs>
              <rect width="700" height="495" fill="url(#grid)" />
              <path
                d="M110 65 C110 140 235 55 215 140 S345 150 330 245 S470 215 475 330 S565 350 555 430"
                fill="none"
                stroke="#d2eaf0"
                strokeWidth="30"
              />
              <path
                d="M110 65 C110 140 235 55 215 140 S345 150 330 245 S470 215 475 330 S565 350 555 430"
                fill="none"
                stroke="#2797a8"
                strokeWidth="4"
                strokeDasharray="7 5"
              />
              <text x="415" y="68" className="map-annotation">
                BROOKFIELD STREAM
              </text>
              <text x="415" y="90" className="map-annotation small">
                Flow → downstream
              </text>
              {SITES.map((s) => {
                const a = assessments.find((a) => a.siteId === s.id)!;
                return (
                  <g
                    key={s.id}
                    onClick={() => onSelect(s.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <circle
                      cx={s.x}
                      cy={s.y}
                      r={s.id === selected ? 24 : 17}
                      fill={
                        a.score >= 60
                          ? "#fc875c"
                          : a.score >= 30
                            ? "#f9c869"
                            : "#ffffff"
                      }
                      stroke={s.id === selected ? "#123842" : "#297687"}
                      strokeWidth={s.id === selected ? 3 : 2}
                    />
                    <text
                      x={s.x}
                      y={s.y + 5}
                      textAnchor="middle"
                      fill="#102f38"
                      fontWeight="700"
                      fontSize="12"
                    >
                      {s.id.slice(1)}
                    </text>
                    <text
                      x={s.x + (s.id === "B05" ? -125 : 30)}
                      y={s.y - 5}
                      className="map-label"
                    >
                      {s.name}
                    </text>
                    <text
                      x={s.x + 30}
                      y={s.y + 15}
                      className="map-annotation small"
                    >
                      {s.id} · {a.score}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="map-legend">
              <span>
                <i className="legend-high" />
                Investigate 60+
              </span>
              <span>
                <i className="legend-mid" />
                Review 30–59
              </span>
              <span>
                <i />
                Routine 0–29
              </span>
              <span>
                Operational priority, not pollution probability · fictional
                network
              </span>
            </div>
          </div>
        </div>
        <div className="panel queue-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">WHERE TO LOOK NEXT</p>
              <h2>Evidence → action</h2>
            </div>
            <FlaskConical size={22} />
          </div>
          <div className="queue">
            {assessments.map((a, i) => {
              const s = siteById(a.siteId);
              return (
                <button
                  key={s.id}
                  aria-pressed={selected === s.id}
                  aria-label={`Inspect ${s.name}, priority ${a.score}`}
                  className={`site-row ${selected === s.id ? "selected" : ""}`}
                  onClick={() => onSelect(s.id)}
                >
                  <span className="site-rank">0{i + 1}</span>
                  <span className="site-copy">
                    <b>{s.name}</b>
                    <small>{a.summary}</small>
                    <span className="site-meta">
                      {s.id} · £{s.cost} / visit · {a.evidence.toLowerCase()}{" "}
                      evidence
                    </span>
                  </span>
                  <NumberScore score={a.score} />
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            onClick={onPlan}
            className="full-btn plan-from-queue"
          >
            Build a sampling plan <ArrowRight size={16} />
          </Button>
        </div>
      </section>
      <section className="panel evidence-panel" id="site-evidence">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">WHY THIS SITE / {site.id}</p>
            <h2>{site.name}</h2>
          </div>
          <span className="pill">{chosen.evidence} evidence</span>
          <NumberScore score={chosen.score} />
        </div>
        <div className="evidence-grid">
          <div>
            <div className="onehealth-note">
              <ShieldCheck size={20} />
              <p>
                <b>{site.habitat} ↔ community setting</b>
                <br />
                {site.context}. Microbiology and human health outcomes are
                unknown.
              </p>
            </div>
            <h3>What contributes to this priority</h3>
            <div className="contributions">
              {chosen.contributions.map((c) => (
                <div key={c.label}>
                  <div>
                    <b>{c.label}</b>
                    <span>+{c.points}</span>
                  </div>
                  <div className="contribution-bar">
                    <i style={{ width: `${Math.min(100, c.points * 2)}%` }} />
                  </div>
                  <p>{c.explanation}</p>
                </div>
              ))}
            </div>
            <p className="fineprint">
              Policy score capped at 100. Unreviewed signals ×0.65; stale
              signals decay. These weights need local ecological validation.
            </p>
          </div>
          <div className="reports">
            <h3>
              Observations & review <span>{reports.length}</span>
            </h3>
            {reports.length === 0 ? (
              <p>
                No reports yet. Missing evidence does not mean healthy water.
              </p>
            ) : (
              reports.map((o) => (
                <article className="report" key={o.id}>
                  <div className="report-top">
                    <span className={`status-tag ${o.status}`}>{o.status}</span>
                    <small>
                      {o.source === "scenario"
                        ? "Simulated report"
                        : "Participant entry"}{" "}
                      · {when(o.observedAt)}
                    </small>
                  </div>
                  {o.missionId && (
                    <p className="followup-banner">
                      Linked follow-up to a completed field mission
                    </p>
                  )}
                  <p>{o.notes}</p>
                  <dl className="measurements">
                    {o.oxygen !== undefined && (
                      <div>
                        <dt>Oxygen</dt>
                        <dd>{o.oxygen} mg/L</dd>
                      </div>
                    )}
                    {o.ph !== undefined && (
                      <div>
                        <dt>pH</dt>
                        <dd>{o.ph}</dd>
                      </div>
                    )}
                    {o.turbidity !== undefined && (
                      <div>
                        <dt>Turbidity</dt>
                        <dd>{o.turbidity} NTU</dd>
                      </div>
                    )}
                    {o.temperature !== undefined && (
                      <div>
                        <dt>Temperature</dt>
                        <dd>{o.temperature} °C</dd>
                      </div>
                    )}
                  </dl>
                  {qualityFlags(o).map((flag) => (
                    <p className="quality-flag" key={flag}>
                      <AlertTriangle size={14} />
                      {flag}
                    </p>
                  ))}
                  {o.reviewNote && (
                    <p className="review-note">
                      <ClipboardCheck size={15} />
                      {o.reviewNote}
                    </p>
                  )}
                  <label htmlFor={`review-${o.id}`}>Review rationale</label>
                  <Textarea
                    id={`review-${o.id}`}
                    placeholder="What did you check? What remains uncertain?"
                    maxLength={500}
                    value={rationale[o.id] ?? ""}
                    onChange={(e) =>
                      setRationale({ ...rationale, [o.id]: e.target.value })
                    }
                  />
                  <div className="button-row">
                    <Button
                      disabled={
                        busy || (rationale[o.id] ?? "").trim().length < 8
                      }
                      onClick={() =>
                        act({
                          action: "review",
                          id: o.id,
                          status: "confirmed",
                          note: rationale[o.id],
                        })
                      }
                    >
                      Confirm evidence
                    </Button>
                    <Button
                      variant="outline"
                      disabled={
                        busy || (rationale[o.id] ?? "").trim().length < 8
                      }
                      onClick={() =>
                        act({
                          action: "review",
                          id: o.id,
                          status: "rejected",
                          note: rationale[o.id],
                        })
                      }
                    >
                      Reject evidence
                    </Button>
                  </div>
                  <small className="fineprint">
                    Confirming validates this report for triage; it does not
                    certify water safety.
                  </small>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
      <div className="next-action bottom-note">
        <ShieldCheck />
        <div>
          <b>A signal is a reason to look closer.</b>
          <p>
            Keep the observation, the interpretation, and the decision visible.
            A coordinator makes the call.
          </p>
        </div>
        <ArrowUpRight size={18} />
      </div>
    </>
  );
}
