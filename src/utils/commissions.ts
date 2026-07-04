// Commission rates per contract per SIDE (multiply × 2 for round-trip).
// Add new platforms or symbols here — no other file needs to change.

export type KnownPlatform = 'Lucid' | 'Topstep';

interface SymbolRate {
  /** Symbol prefix to match (longest match wins). Case-insensitive. */
  prefix: string;
  /** USD per contract per side */
  perSide: number;
}

export const COMMISSION_SCHEDULE: Record<KnownPlatform, SymbolRate[]> = {
  Lucid: [
    { prefix: 'MGC', perSide: 0.80 },
    { prefix: 'MNQ', perSide: 0.50 },
    { prefix: 'MES', perSide: 0.50 },
    { prefix: 'MYM', perSide: 0.50 },
    { prefix: 'NQ',  perSide: 1.75 },
    { prefix: 'ES',  perSide: 1.75 },
    { prefix: 'YM',  perSide: 1.75 },
  ],
  Topstep: [
    { prefix: 'MGC', perSide: 0.50 },
    { prefix: 'MNQ', perSide: 0.25 },
    { prefix: 'MES', perSide: 0.25 },
    { prefix: 'MYM', perSide: 0.25 },
    { prefix: 'NQ',  perSide: 0.50 },
    { prefix: 'ES',  perSide: 0.50 },
    { prefix: 'YM',  perSide: 0.50 },
  ],
};

const DEFAULT_PER_SIDE = 0.50;

/**
 * Returns total round-trip commission (entry + exit) for a given fill.
 * perSide × 2 × qty
 */
export function calcCommission(platform: string, symbol: string, qty: number): number {
  const rates = COMMISSION_SCHEDULE[platform as KnownPlatform];
  const upper = symbol.toUpperCase();

  if (rates) {
    for (const rate of rates) {
      if (upper.startsWith(rate.prefix.toUpperCase())) {
        const roundTrip = rate.perSide * 2 * qty;
        return roundTrip;
      }
    }
  }

  // Unknown platform or symbol — fall back to $0.50/side
  return DEFAULT_PER_SIDE * 2 * qty;
}
