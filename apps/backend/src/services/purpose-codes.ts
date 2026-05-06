export const PURPOSE_CODES = {
  S1007: 'Software services - licensing, SaaS subscriptions',
  S0802: 'Software consulting and development services',
  S0899: 'Other miscellaneous software exports',
  S1102: 'IT-enabled services (ITES)',
  S1301: 'Management consulting services',
} as const;

export type PurposeCode = keyof typeof PURPOSE_CODES;

export function getPurposeCode(serviceType?: string): PurposeCode {
  const map: Record<string, PurposeCode> = {
    saas: 'S1007',
    consulting: 'S0802',
    ites: 'S1102',
    other: 'S0899',
  };

  if (!serviceType) {
    return 'S0899';
  }

  return map[serviceType.toLowerCase()] ?? 'S0899';
}
