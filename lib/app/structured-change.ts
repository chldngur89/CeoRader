export interface StructuredPricingChange {
  plan?: string;
  before?: string;
  after?: string;
  currency?: string;
}

export interface StructuredMessagingChange {
  before: string;
  after: string;
}

export interface StructuredHiringChange {
  addedRoles: string[];
  removedRoles: string[];
}

export interface StructuredPartnershipChange {
  addedPartners: string[];
  removedPartners: string[];
}

export interface StructuredChangeSet {
  pricing: StructuredPricingChange[];
  messaging: StructuredMessagingChange[];
  hiring: StructuredHiringChange[];
  partnership: StructuredPartnershipChange[];
}

export function createEmptyStructuredChangeSet(): StructuredChangeSet {
  return {
    pricing: [],
    messaging: [],
    hiring: [],
    partnership: [],
  };
}

export function hasStructuredChanges(structured?: StructuredChangeSet | null) {
  if (!structured) {
    return false;
  }

  return (
    structured.pricing.length > 0 ||
    structured.messaging.length > 0 ||
    structured.hiring.length > 0 ||
    structured.partnership.length > 0
  );
}

export function formatStructuredHighlights(structured?: StructuredChangeSet | null, limit = 3) {
  if (!structured) {
    return [];
  }

  const highlights: string[] = [];

  for (const item of structured.pricing) {
    if (item.before && item.after) {
      highlights.push(
        `${item.plan ? `${item.plan} ` : ""}가격 ${item.before} -> ${item.after}`.trim()
      );
    } else if (item.after) {
      highlights.push(`${item.plan ? `${item.plan} ` : ""}가격 ${item.after}`.trim());
    }
  }

  for (const item of structured.messaging) {
    highlights.push(`메시지 "${item.before}" -> "${item.after}"`);
  }

  for (const item of structured.hiring) {
    for (const role of item.addedRoles) {
      highlights.push(`채용 ${role} 추가`);
    }
    for (const role of item.removedRoles) {
      highlights.push(`채용 ${role} 제거`);
    }
  }

  for (const item of structured.partnership) {
    for (const partner of item.addedPartners) {
      highlights.push(`제휴/통합 ${partner} 추가`);
    }
    for (const partner of item.removedPartners) {
      highlights.push(`제휴/통합 ${partner} 제거`);
    }
  }

  return highlights.slice(0, limit);
}
