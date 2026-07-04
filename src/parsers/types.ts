export interface NormalizedTrade {
  id: string;
  tradeGroupId: string;
  platform: 'Topstep' | 'Lucid' | string;
  accountName: string;
  symbol: string;
  side: 'Long' | 'Short';
  qty: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  entryTime: Date;
  exitTime: Date;
  duration: string;
  tradeDay: string; // YYYY-MM-DD
  orderType: string;
  exitReason: string;
}

export type RawRow = Record<string, string>;

export interface ParseResult {
  trades: NormalizedTrade[];
  newTradeCount: number;
  duplicateCount: number;
}
