/** Documents refreshed in this session; later visits show cached fields immediately. */
export const fetchedThisSession = new Set<string>();

export const FETCH_STEPS = (issuer: string) => [
  `Connecting to ${issuer}`,
  'Fetching latest record',
  'Verifying issuer signature',
];
