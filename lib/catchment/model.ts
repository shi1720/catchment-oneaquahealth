export const POLICY_VERSION = "catchment-triage-1.0";
export const SITES = [
  {
    id: "B01",
    name: "Willow headwaters",
    x: 110,
    y: 65,
    cost: 25,
    exposure: 3,
    context: "Shaded upstream reference reach",
    habitat: "Riparian habitat",
    access: "Observe from the public footpath.",
  },
  {
    id: "B02",
    name: "Meadow footbridge",
    x: 215,
    y: 140,
    cost: 30,
    exposure: 8,
    context: "Dog walking and riverside recreation",
    habitat: "Vegetated banks",
    access: "Use the footbridge. Do not enter the water.",
  },
  {
    id: "B03",
    name: "Foundry outfall",
    x: 330,
    y: 245,
    cost: 45,
    exposure: 10,
    context: "Urban runoff and downstream wildlife",
    habitat: "Fish habitat",
    access: "Stay on the public bank. Never approach an outfall.",
  },
  {
    id: "B04",
    name: "School reach",
    x: 475,
    y: 330,
    cost: 35,
    exposure: 15,
    context: "Public path beside a school",
    habitat: "Shallow marginal habitat",
    access: "Observe from the path; keep children away from unknown water.",
  },
  {
    id: "B05",
    name: "Estuary gate",
    x: 555,
    y: 430,
    cost: 40,
    exposure: 8,
    context: "Downstream receiving reach",
    habitat: "Wetland connection",
    access: "Stay above the tidal bank and respect closures.",
  },
] as const;
export type SiteId = (typeof SITES)[number]["id"];
export type ObservationInput = {
  siteId: SiteId;
  observedAt: string;
  appearance: "clear" | "cloudy" | "scum" | "unusual";
  odour: "none" | "earthy" | "sewage" | "chemical";
  wildlife: "normal" | "none_seen" | "distressed";
  notes: string;
  missionId?: string;
  oxygen?: number;
  ph?: number;
  turbidity?: number;
  temperature?: number;
  calibrated: boolean;
};
export type Observation = ObservationInput & {
  id: string;
  createdAt: string;
  status: "pending" | "confirmed" | "rejected";
  source: "scenario" | "participant";
  reviewNote?: string;
  reviewedAt?: string;
  fingerprint: string;
};
export type Mission = {
  id: string;
  siteId: SiteId;
  createdAt: string;
  status: "planned" | "complete";
  cost: number;
  priorityAtDispatch: number;
  policyVersion: string;
  evidenceIds: string[];
  assessmentSnapshot: Assessment;
  evidenceSnapshot: Observation[];
  budgetAtDispatch: number;
  capacityAtDispatch: number;
  completedAt?: string;
  outcome?: string;
};
export type Audit = {
  id: string;
  at: string;
  action: string;
  detail: string;
  observationIds?: string[];
  missionIds?: string[];
};
export type Workspace = {
  schemaVersion: 1;
  scenarioStartedAt: string;
  rainfallMm: 18;
  observations: Observation[];
  missions: Mission[];
  audit: Audit[];
  processed: string[];
  planning?: { date: string; budget: number; capacity: number };
};
export type Contribution = {
  label: string;
  points: number;
  explanation: string;
};
export type Assessment = {
  siteId: SiteId;
  score: number;
  band: "Investigate" | "Review" | "Routine";
  evidence: "Limited" | "Developing" | "Reviewed";
  urgent: boolean;
  contributions: Contribution[];
  reportIds: string[];
  pending: number;
  summary: string;
};
export type Plan = {
  selected: Assessment[];
  excluded: { siteId: SiteId; reason: string }[];
  totalCost: number;
  totalUtility: number;
  budget: number;
  capacity: number;
  committedCost: number;
  committedVisits: number;
  remainingBudget: number;
  remainingCapacity: number;
  windowDate: string;
};
export type Snapshot = {
  workspace: Workspace;
  revision: number;
  assessments: Assessment[];
};
export function siteById(id: string) {
  return SITES.find((s) => s.id === id)!;
}
