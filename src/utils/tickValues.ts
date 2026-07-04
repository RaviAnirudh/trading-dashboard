interface TickSpec {
  tickSize: number;
  tickValue: number;
}

const TICK_SPECS: Array<{ prefix: string; exact?: boolean } & TickSpec> = [
  { prefix: 'MGC', tickSize: 0.10, tickValue: 1.00 },   // Micro Gold (10 troy oz)
  { prefix: 'MNQ', tickSize: 0.25, tickValue: 0.50 },
  { prefix: 'MES', tickSize: 0.25, tickValue: 1.25 },
  { prefix: 'MYM', tickSize: 1.00, tickValue: 0.50 },
  { prefix: 'NQ',  tickSize: 0.25, tickValue: 5.00 },
  { prefix: 'ES',  tickSize: 0.25, tickValue: 12.50 },
  { prefix: 'YM',  tickSize: 1.00, tickValue: 5.00 },
];

export function getTickSpec(symbol: string): TickSpec {
  const upper = symbol.toUpperCase();
  // Longer prefixes first (MNQ before NQ, MES before ES, MYM before YM)
  for (const spec of TICK_SPECS) {
    if (upper.startsWith(spec.prefix)) {
      return { tickSize: spec.tickSize, tickValue: spec.tickValue };
    }
  }
  // Default fallback
  return { tickSize: 0.25, tickValue: 1.00 };
}

export function calcPnl(
  symbol: string,
  side: 'Long' | 'Short',
  entryPrice: number,
  exitPrice: number,
  qty: number,
): number {
  const { tickSize, tickValue } = getTickSpec(symbol);
  const priceDiff = side === 'Long' ? exitPrice - entryPrice : entryPrice - exitPrice;
  return (priceDiff / tickSize) * tickValue * qty;
}
