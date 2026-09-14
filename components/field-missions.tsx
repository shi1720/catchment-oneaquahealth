"use client";
import { useEffect, useState } from "react";
import {
  FlaskConical,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { allocate, planApprovalKey } from "@/lib/catchment/engine";
import { siteById, type SiteId } from "@/lib/catchment/model";
import { when, type Props } from "./catchment-common";
export function FieldMissions({
  data,
  act,
  busy,
  budget,
  setBudget,
  capacity,
  setCapacity,
  onObserve,
}: {
  budget: number;
  setBudget: (v: number) => void;
  capacity: number;
  setCapacity: (v: number) => void;
  onObserve: (id: SiteId, missionId?: string) => void;
} & Props) {
  const [approvedKey, setApprovedKey] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, string>>({});
  const plan = allocate(data.assessments, data.workspace, budget, capacity);
  const missions = data.workspace.missions;
  const planKey = JSON.stringify([
    budget,
    capacity,
    data.revision,
    plan.selected.map((a) => a.siteId),
  ]);
  const ack = approvedKey === planKey;
  const setAck = (value: boolean) => setApprovedKey(value ? planKey : null);
  useEffect(() => {
    setApprovedKey(null);
  }, [planKey]);
  return (
    <>
      <div className="mission-layout">
        <section className="dark-panel planner">
          <p className="eyebrow">TODAY’S FIELD CAPACITY / UTC</p>
          <h2>
            One team.
            <br />A finite number of visits.
          </h2>
          <p>
            Set today’s total limits. Earlier visits, including completed ones,
            count against them. Catchment checks every combination of these five
            sites to find the greatest total operational priority within them.
          </p>
          <label htmlFor="budget">
            Daily budget <span>GBP</span>
          </label>
          <div className="budget-input">
            <span>£</span>
            <Input
              id="budget"
              type="number"
              min={0}
              max={500}
              step={1}
              value={budget}
              onChange={(e) =>
                setBudget(
                  Math.max(
                    0,
                    Math.min(500, Math.round(Number(e.target.value) || 0)),
                  ),
                )
              }
            />
          </div>
          <label htmlFor="capacity">
            Visit capacity{" "}
            <b>
              {capacity} {capacity === 1 ? "visit" : "visits"}
            </b>
          </label>
          <Slider
            id="capacity"
            aria-label="Visit capacity"
            min={0}
            max={5}
            step={1}
            value={[capacity]}
            onValueChange={(v) => setCapacity(v[0])}
          />
          <div className="capacity-buttons">
            {[1, 2, 3].map((n) => (
              <Button
                key={n}
                variant="outline"
                aria-pressed={capacity === n}
                onClick={() => setCapacity(n)}
              >
                {n} {n === 1 ? "visit" : "visits"}
              </Button>
            ))}
          </div>
          <div className="daily-commitment">
            Already committed today:{" "}
            <b>
              £{plan.committedCost} · {plan.committedVisits} visits
            </b>
            <br />
            Still available: £{plan.remainingBudget} · {plan.remainingCapacity}{" "}
            visits
          </div>
          <small>
            Illustrative visit costs include consumables and travel. They are
            assumptions, not supplier quotes.
          </small>
        </section>
        <section className="panel plan-result">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">YOUR RECOMMENDED ALLOCATION</p>
              <h2>
                {plan.selected.length
                  ? `${plan.selected.length} sites. £${plan.totalCost} committed.`
                  : "No visits fit these limits."}
              </h2>
            </div>
            <FlaskConical />
          </div>
          <div className="plan-body">
            {plan.selected.map((a, i) => (
              <div className="plan-site" key={a.siteId}>
                <span className="step-circle">{i + 1}</span>
                <div>
                  <h3>{siteById(a.siteId).name}</h3>
                  <p>
                    Priority {a.score} · {a.evidence.toLowerCase()} evidence
                  </p>
                  <small>{siteById(a.siteId).access}</small>
                </div>
                <b>£{siteById(a.siteId).cost}</b>
              </div>
            ))}
            <div className="plan-metrics">
              <div>
                <small>Priority covered</small>
                <strong>
                  {plan.totalUtility}
                  <span>points</span>
                </strong>
              </div>
              <div>
                <small>Budget remaining</small>
                <strong>
                  £{Math.max(0, plan.remainingBudget - plan.totalCost)}
                </strong>
              </div>
              <div>
                <small>Visits used</small>
                <strong>
                  {plan.selected.length + plan.committedVisits}
                  <span>/ {capacity}</span>
                </strong>
              </div>
            </div>
            <p className="fineprint">
              Maximises the sum of policy priorities, with lower cost breaking
              ties. This is not predicted environmental benefit or a travel
              route.
            </p>
            <label className="check-label">
              <Checkbox
                checked={ack}
                onCheckedChange={(v) => setAck(v === true)}
              />
              I reviewed the evidence and access guidance. I approve these
              demonstration visits.
            </label>
            <Button
              disabled={busy || !ack || !plan.selected.length}
              className="primary-btn"
              onClick={async () => {
                if (
                  await act({
                    action: "dispatch",
                    budget,
                    capacity,
                    acknowledged: ack,
                    approvedPlan: planApprovalKey(plan, data.revision),
                  })
                )
                  setAck(false);
              }}
            >
              Create field missions <ArrowRight size={17} />
            </Button>
            <div className="excluded">
              <h3>Why other sites wait</h3>
              {plan.excluded.map((e) => (
                <p key={e.siteId}>
                  <b>{siteById(e.siteId).name}</b>
                  <span>{e.reason}</span>
                </p>
              ))}
            </div>
          </div>
        </section>
      </div>
      <section className="panel missions-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">CLOSE THE LOOP</p>
            <h2>Field missions</h2>
          </div>
          <span className="pill">
            {missions.filter((m) => m.status === "planned").length} open ·{" "}
            {missions.filter((m) => m.status === "complete").length} complete
          </span>
        </div>
        {!missions.length ? (
          <div className="empty-state">
            <ClipboardCheck />
            <h3>Your first field plan starts here.</h3>
            <p>
              Approve a sampling allocation above. Each mission preserves the
              evidence and priority used at dispatch.
            </p>
          </div>
        ) : (
          <div className="mission-cards">
            {missions.map((m) => (
              <article key={m.id} className="mission-card">
                <div className="report-top">
                  <span
                    className={`status-tag ${m.status === "complete" ? "confirmed" : "pending"}`}
                  >
                    {m.status === "complete" ? "Complete" : "Planned"}
                  </span>
                  <small>{when(m.createdAt)}</small>
                </div>
                <h3>{siteById(m.siteId).name}</h3>
                <p>
                  £{m.cost} · priority {m.priorityAtDispatch} at dispatch ·{" "}
                  {m.evidenceIds.length} source reports
                </p>
                <details className="dispatch-details">
                  <summary>Evidence preserved at dispatch</summary>
                  {m.assessmentSnapshot?.contributions.map((c) => (
                    <p key={c.label}>
                      {c.label}: +{c.points}
                    </p>
                  ))}
                  <small>
                    {m.evidenceSnapshot
                      ?.map((o) => `${o.status}: ${o.notes}`)
                      .join(" / ") ??
                      "Snapshot unavailable for this earlier prototype record."}
                  </small>
                </details>
                {m.status === "planned" ? (
                  <>
                    <label htmlFor={`outcome-${m.id}`}>Field follow-up</label>
                    <Textarea
                      id={`outcome-${m.id}`}
                      placeholder="Describe the visit, sample reference, and next step. A completed visit does not mean the water is safe."
                      maxLength={1500}
                      value={outcomes[m.id] ?? ""}
                      onChange={(e) =>
                        setOutcomes({ ...outcomes, [m.id]: e.target.value })
                      }
                    />
                    <Button
                      disabled={
                        busy || (outcomes[m.id] ?? "").trim().length < 15
                      }
                      onClick={() =>
                        act({
                          action: "complete",
                          id: m.id,
                          outcome: outcomes[m.id],
                        })
                      }
                    >
                      <CheckCircle2 size={16} />
                      Complete field visit
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="outcome">{m.outcome}</p>
                    <small>Completed {when(m.completedAt!)}</small>
                    <Button
                      variant="outline"
                      onClick={() => onObserve(m.siteId, m.id)}
                    >
                      Add follow-up observation <ArrowRight size={16} />
                    </Button>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
