export interface ControlRoomSourceStatus {
  id: string;
  label: string;
  type: string;
  url: string;
  isActive: boolean;
  tags: string[];
  hasSnapshot: boolean;
  snapshotAt: string | null;
  finalUrl: string | null;
  lastStatus: "changed" | "initial" | "unchanged" | "error" | "pending";
  lastSummary: string;
  attemptedUrls: string[];
  error: string | null;
}

export interface ControlRoomLatestRun {
  runId: string;
  company: string;
  timestamp: string;
  summary: {
    visited: number;
    changed: number;
    unchanged: number;
    initial: number;
    errors: number;
    changeTypes: string[];
  };
  changedSources: Array<{
    sourceId: string;
    label: string;
    type: string;
    summary: string;
    changeTypes: string[];
  }>;
}

export interface ControlRoomCompanyStatus {
  company: string;
  website: string;
  entityId: string;
  registryUpdatedAt: string | null;
  stats: {
    totalSources: number;
    activeSources: number;
    sourcesWithSnapshots: number;
    changedSources: number;
    initialSources: number;
    errorSources: number;
  };
  latestRun: ControlRoomLatestRun | null;
  sources: ControlRoomSourceStatus[];
}

export interface ControlRoomOverview {
  trackedCompanies: number;
  activeCompanies: number;
  activeSources: number;
  sourcesWithSnapshots: number;
  changedCompanies: number;
  companiesWithErrors: number;
  recentRuns: number;
}

export interface ControlRoomResponse {
  success: boolean;
  generatedAt: string;
  overview: ControlRoomOverview;
  companies: ControlRoomCompanyStatus[];
  recentRuns: ControlRoomLatestRun[];
}
