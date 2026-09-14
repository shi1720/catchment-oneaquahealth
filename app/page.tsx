"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Waves,
  Plus,
  CloudRain,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { RiverOverview } from "@/components/river-overview";
import { FieldObservation } from "@/components/field-observation";
import { FieldMissions } from "@/components/field-missions";
import { MethodsEvidence } from "@/components/methods-evidence";
import { allocate } from "@/lib/catchment/engine";
import { siteById, type Snapshot, type SiteId } from "@/lib/catchment/model";
async function readResult(response: Response): Promise<Snapshot> {
  let value;
  try {
    value = (await response.json()) as Snapshot & { error?: string };
  } catch {
    throw new Error(
      "The service returned an unavailable response. Your input is still here. Please retry.",
    );
  }
  if (!response.ok)
    throw new Error(
      value.error ?? "The service could not complete this request.",
    );
  if (
    !value.workspace ||
    !Array.isArray(value.assessments) ||
    !Number.isInteger(value.revision)
  )
    throw new Error("The workspace response was incomplete. Please retry.");
  return value;
}
export default function Home() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState("overview");
  const [selected, setSelected] = useState<SiteId>("B03");
  const [followup, setFollowup] = useState<string | undefined>();
  const [budget, setBudget] = useState(80);
  const [capacity, setCapacity] = useState(2);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/workspace");
      const body = await readResult(response);
      setData(body);
      if (
        body.workspace.planning?.date === new Date().toISOString().slice(0, 10)
      ) {
        setBudget(body.workspace.planning.budget);
        setCapacity(body.workspace.planning.capacity);
      }
      setNotice(null);
    } catch (e) {
      setNotice({
        text:
          e instanceof TypeError
            ? "Connection lost. Your input is still here. Retry when connected."
            : e instanceof Error
              ? e.message
              : "Unable to connect. Please try again.",
        error: true,
      });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const act = useCallback(
    async (body: Record<string, unknown>) => {
      if (!data || busy) return false;
      setBusy(true);
      setNotice(null);
      try {
        const response = await fetch("/api/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...body,
            revision: data.revision,
            requestId: crypto.randomUUID(),
          }),
        });
        const result = await readResult(response);
        setData(result);
        setNotice({
          text:
            body.action === "observe"
              ? "Observation saved. It is now in the human review queue."
              : body.action === "review"
                ? "Review saved. The priority and sampling plan now reflect your decision."
                : body.action === "dispatch"
                  ? "Field missions created. Each visit keeps its evidence and priority at dispatch."
                  : body.action === "complete"
                    ? "Visit completed. Your follow-up is preserved in the decision record."
                    : body.action === "import"
                      ? "Import saved. All observations are awaiting review."
                      : "Your demonstration has been reset.",
          error: false,
        });
        return true;
      } catch (e) {
        setNotice({
          text:
            e instanceof TypeError
              ? "Connection lost. Your input is still here. Retry when connected."
              : e instanceof Error
                ? e.message
                : "Connection lost. Your input is still here; please try again.",
          error: true,
        });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [data, busy],
  );
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool || !data) return;
    const lifecycle = new AbortController();
    const tools = [
      {
        name: "read_catchment_priorities",
        title: "Read catchment priorities",
        description:
          "Read current operational priorities and evidence labels. Synthetic scenario; not water safety.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: (input: unknown) => {
          if (
            input === null ||
            typeof input !== "object" ||
            Object.keys(input).length
          )
            throw new Error("No arguments are accepted.");
          return { revision: data.revision, priorities: data.assessments };
        },
      },
      {
        name: "stage_sampling_plan",
        title: "Stage sampling plan",
        description:
          "Set budget and visit capacity and open the visible plan. Does not create or dispatch missions.",
        inputSchema: {
          type: "object",
          properties: {
            budget: { type: "integer", minimum: 0, maximum: 500 },
            capacity: { type: "integer", minimum: 0, maximum: 5 },
          },
          required: ["budget", "capacity"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async (input: unknown) => {
          if (!input || typeof input !== "object" || Array.isArray(input))
            throw new Error("Budget and capacity are required.");
          const v = input as Record<string, unknown>;
          if (Object.keys(v).some((k) => !["budget", "capacity"].includes(k)))
            throw new Error("Unexpected argument.");
          const plan = allocate(
            data.assessments,
            data.workspace,
            v.budget as number,
            v.capacity as number,
          );
          setBudget(v.budget as number);
          setCapacity(v.capacity as number);
          setTab("missions");
          await new Promise(requestAnimationFrame);
          return plan;
        },
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => lifecycle.abort();
  }, [data]);
  function observe(id: SiteId = selected, missionId?: string) {
    setFollowup(missionId);
    setSelected(id);
    setTab("observe");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const props = data ? { data, act, busy } : null;
  return (
    <main>
      <a className="skip-link" href="#main-workspace">
        Skip to workspace
      </a>
      <header className="masthead">
        <a className="brand" href="/" aria-label="Catchment home">
          <span className="brand-icon">
            <Waves />
          </span>
          catchment<span className="brand-dot">.</span>
        </a>
        <span className="mast-sub">FIELD INTELLIGENCE / ONE HEALTH</span>
        <div className="demo-badge">Your private demo workspace</div>
      </header>
      <Tabs value={tab} onValueChange={setTab} className="app-tabs">
        <div className="nav-shell">
          <TabsList variant="line" className="topnav">
            <TabsTrigger value="overview">Catchment overview</TabsTrigger>
            <TabsTrigger value="observe">Record observation</TabsTrigger>
            <TabsTrigger value="missions">
              Field missions
              {data &&
              data.workspace.missions.some((m) => m.status === "planned") ? (
                <span className="nav-count">
                  {
                    data.workspace.missions.filter(
                      (m) => m.status === "planned",
                    ).length
                  }
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="methods">Methods & evidence</TabsTrigger>
          </TabsList>
        </div>
        <div className="workspace" id="main-workspace">
          <div className="page-heading">
            <div>
              <p className="eyebrow">BROOKFIELD / DEMONSTRATION CATCHMENT</p>
              <h1>
                {tab === "overview"
                  ? "Make the next sample count."
                  : tab === "observe"
                    ? "Small observations. Useful evidence."
                    : tab === "missions"
                      ? "The right visit, with a clear reason."
                      : "Evidence you can inspect."}
              </h1>
              <p className="lead">
                {tab === "overview"
                  ? "Citizen evidence. Clear priorities. Better decisions at the water’s edge."
                  : tab === "observe"
                    ? "A guided observation becomes a reviewable record, not a diagnosis."
                    : tab === "missions"
                      ? "Turn limited field capacity into a plan you can explain."
                      : "Every assumption, source and decision stays visible."}
              </p>
            </div>
            {tab === "overview" && (
              <Button
                className="primary-btn"
                onClick={() => observe()}
                disabled={!data}
              >
                <Plus size={18} />
                Record observation
              </Button>
            )}
          </div>
          <div className="context-strip">
            <CloudRain size={20} />
            <b>After the rain</b>
            <span>18 mm in the scenario’s last 24 hours</span>
            <span className="context-note">
              Simulated sites & readings · no water-safety assessment
            </span>
          </div>
          {notice && (
            <div
              className={`notice ${notice.error ? "error" : "success"}`}
              role={notice.error ? "alert" : "status"}
            >
              {notice.error ? (
                <AlertTriangle size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}
              <span>{notice.text}</span>
              {notice.error && (
                <Button variant="outline" size="sm" onClick={load}>
                  <RefreshCw size={14} />
                  Reload data
                </Button>
              )}
            </div>
          )}
          {data?.assessments.some((a) => a.urgent) && (
            <div className="urgent-alert" role="alert">
              <AlertTriangle />
              <div>
                <b>Wildlife distress needs prompt incident review.</b>
                <p>
                  Do not wait for the sampling budget. Stay on the bank and use
                  the appropriate official reporting channel.{" "}
                  <a
                    href="https://www.gov.uk/report-environmental-problem"
                    target="_blank"
                    rel="noreferrer"
                  >
                    England incident guidance ↗
                  </a>
                </p>
              </div>
            </div>
          )}
          {!data ? (
            <section className="panel loading-panel">
              {loading ? (
                <>
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-64 w-full" />
                  <p role="status">
                    Preparing your own demonstration workspace…
                  </p>
                </>
              ) : (
                <>
                  <h2>Your workspace could not load.</h2>
                  <p>Check your connection and try again.</p>
                  <Button onClick={load}>Retry connection</Button>
                </>
              )}
            </section>
          ) : (
            <>
              <TabsContent value="overview">
                <div className="stats">
                  <div>
                    <span>Sites in this catchment</span>
                    <strong>
                      05<small>connected reaches</small>
                    </strong>
                  </div>
                  <div>
                    <span>Reports needing review</span>
                    <strong>
                      {String(
                        data.workspace.observations.filter(
                          (o) => o.status === "pending",
                        ).length,
                      ).padStart(2, "0")}
                      <small>human judgment first</small>
                    </strong>
                  </div>
                  <div>
                    <span>Sampling budget</span>
                    <strong>
                      £{budget}
                      <small>{capacity} daily visit limit</small>
                    </strong>
                  </div>
                  <div className="stat-accent">
                    <span>Highest unresolved priority</span>
                    <strong className="stat-name">
                      {siteById(data.assessments[0].siteId).name}
                    </strong>
                    <small>
                      {data.assessments[0].evidence} evidence ·{" "}
                      {data.assessments[0].score} / 100 policy priority
                    </small>
                  </div>
                </div>
                <RiverOverview
                  {...props!}
                  selected={selected}
                  onSelect={setSelected}
                  onPlan={() => setTab("missions")}
                />
              </TabsContent>
              <TabsContent value="observe">
                <FieldObservation
                  act={act}
                  busy={busy}
                  initialSite={selected}
                  missionId={followup}
                  onSaved={(id) => {
                    setSelected(id);
                    setTab("overview");
                  }}
                />
              </TabsContent>
              <TabsContent value="missions">
                <FieldMissions
                  {...props!}
                  budget={budget}
                  setBudget={setBudget}
                  capacity={capacity}
                  setCapacity={setCapacity}
                  onObserve={observe}
                />
              </TabsContent>
              <TabsContent value="methods">
                <MethodsEvidence {...props!} />
              </TabsContent>
            </>
          )}
          <footer>
            <span>
              Project creator: Shivam Gupta · Developed with AI assistance
            </span>
            <span>
              OneAquaHealth 2026 prototype · Observe → review → sample → learn
            </span>
          </footer>
        </div>
      </Tabs>
    </main>
  );
}
