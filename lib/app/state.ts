export type TrackedCompany = {
  id: string;
  name: string;
  website: string;
};

export type OnboardingData = {
  companyName: string;
  companyWebsite: string;
  goals: string[];
  keywords: string[];
  description: string;
  trackedCompanies: TrackedCompany[];
  competitors: string[];
};

export const STORAGE_KEYS = {
  onboarding: "onboardingData",
  onboarded: "onboarded",
  user: "user",
  login: "temp_logged_in",
  radarCache: "ceorader_agentic_radar",
  vault: "ceorader_vault",
  analysis: "ceorader_analysis",
  analysisSources: "ceorader_analysis_sources",
  analysisTopic: "ceorader_analysis_topic",
  analysisTime: "ceorader_analysis_time",
  analysisHistory: "ceorader_analysis_history",
  competitorScan: "ceorader_competitor_scan",
} as const;

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "tracked";
}

export function createTrackedCompany(name = "", website = ""): TrackedCompany {
  return {
    id: `${toSlug(name || website || String(Date.now()))}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    website,
  };
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function normalizeTrackedCompanies(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item, index) => {
      const name = typeof item.name === "string" ? item.name.trim() : "";
      const website = typeof item.website === "string" ? item.website.trim() : "";
      const id =
        typeof item.id === "string" && item.id.trim().length > 0
          ? item.id.trim()
          : `${toSlug(name || `tracked-${index + 1}`)}-${index + 1}`;

      return {
        id,
        name,
        website,
      };
    })
    .filter((item) => item.name.length > 0 || item.website.length > 0);
}

export function normalizeOnboardingData(raw: unknown): OnboardingData {
  const object = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const trackedCompanies = normalizeTrackedCompanies(object.trackedCompanies);
  const legacyCompetitors = normalizeStringArray(object.competitors);
  const mergedTrackedCompanies =
    trackedCompanies.length > 0
      ? trackedCompanies
      : legacyCompetitors.map((name, index) => ({
          id: `${toSlug(name)}-${index + 1}`,
          name,
          website: "",
        }));

  return {
    companyName: typeof object.companyName === "string" ? object.companyName.trim() : "",
    companyWebsite: typeof object.companyWebsite === "string" ? object.companyWebsite.trim() : "",
    goals: normalizeStringArray(object.goals),
    keywords: normalizeStringArray(object.keywords),
    description: typeof object.description === "string" ? object.description.trim() : "",
    trackedCompanies: mergedTrackedCompanies,
    competitors: mergedTrackedCompanies.map((item) => item.name).filter(Boolean),
  };
}

export function serializeOnboardingData(data: OnboardingData) {
  return {
    ...data,
    trackedCompanies: data.trackedCompanies
      .map((item) => ({
        id: item.id,
        name: item.name.trim(),
        website: item.website.trim(),
      }))
      .filter((item) => item.name.length > 0 || item.website.length > 0),
    competitors: data.trackedCompanies.map((item) => item.name.trim()).filter(Boolean),
  };
}

export function joinValues(values: string[]) {
  return values.join(", ");
}

export function splitValues(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function hasConfiguredTrackedCompanies(data: OnboardingData) {
  return data.trackedCompanies.some(
    (item) => item.name.trim().length > 0 && item.website.trim().length > 0
  );
}
