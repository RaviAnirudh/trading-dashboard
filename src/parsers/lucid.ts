import { v4 as uuidv4 } from 'uuid';
import type { NormalizedTrade, RawRow } from './types';
import { formatDuration, toSessionDay } from '../utils/formatters';
import { calcCommission } from '../utils/commissions';

interface LucidRow {
  symbol: string;
  _tickSize: string;
  buyFillId: string;
  sellFillId: string;
  qty: string;
  buyPrice: string;
  sellPrice: string;
  pnl: string;
  boughtTimestamp: string;
  soldTimestamp: string;
  duration: string;
}

function parsePnl(s: string): number {
  // Handles: "$102.50", "$(29.50)", "-$30.00"
  const isNegative = s.includes('(') || s.startsWith('-');
  const cleaned = s.replace(/[$,()\- ]/g, '');
  const value = parseFloat(cleaned);
  return isNegative ? -value : value;
}

function parseDate(s: string): Date {
  return new Date(s);
}

export function parseLucid(rows: RawRow[]): { trades: NormalizedTrade[]; seenIds: Set<string> } {
  console.group('[Lucid] Parser started');
  console.log(`  Input rows: ${rows.length}`);

  const trades: NormalizedTrade[] = [];
  const seenIds = new Set<string>();

  const buyGroups = new Map<string, string>();
  const sellGroups = new Map<string, string>();

  for (const raw of rows as unknown as LucidRow[]) {
    const dedupeKey = `${raw.buyFillId}|${raw.sellFillId}`;
    seenIds.add(dedupeKey);

    const boughtAt = parseDate(raw.boughtTimestamp);
    const soldAt = parseDate(raw.soldTimestamp);
    const side: 'Long' | 'Short' = boughtAt <= soldAt ? 'Long' : 'Short';

    let tradeGroupId: string | undefined;
    const isScaleOut = buyGroups.has(raw.buyFillId);
    const isScaleIn = sellGroups.has(raw.sellFillId);

    if (isScaleOut) {
      tradeGroupId = buyGroups.get(raw.buyFillId)!;
    } else if (isScaleIn) {
      tradeGroupId = sellGroups.get(raw.sellFillId)!;
    } else {
      tradeGroupId = uuidv4();
    }
    buyGroups.set(raw.buyFillId, tradeGroupId);
    sellGroups.set(raw.sellFillId, tradeGroupId);

    const entryTime = side === 'Long' ? boughtAt : soldAt;
    const exitTime = side === 'Long' ? soldAt : boughtAt;
    const entryPrice = side === 'Long' ? parseFloat(raw.buyPrice) : parseFloat(raw.sellPrice);
    const exitPrice = side === 'Long' ? parseFloat(raw.sellPrice) : parseFloat(raw.buyPrice);
    const durationMs = Math.abs(exitTime.getTime() - entryTime.getTime());
    const qty = parseInt(raw.qty, 10);
    const grossPnl = parsePnl(raw.pnl);
    const commission = calcCommission('Lucid', raw.symbol, qty);
    const pnl = grossPnl - commission;

    console.log(
      `  Row: ${raw.symbol} | ${side} | qty=${qty} | entry=${entryPrice} exit=${exitPrice} | gross=$${grossPnl.toFixed(2)} comm=-$${commission.toFixed(2)} net=$${pnl.toFixed(2)}` +
      (isScaleOut ? ' [scale-out, shared buyFillId]' : isScaleIn ? ' [scale-in, shared sellFillId]' : ' [new group]')
    );

    trades.push({
      id: uuidv4(),
      tradeGroupId,
      platform: 'Lucid',
      accountName: 'Lucid',
      symbol: raw.symbol,
      side,
      qty,
      entryPrice,
      exitPrice,
      pnl,
      entryTime,
      exitTime,
      duration: raw.duration || formatDuration(durationMs),
      tradeDay: toSessionDay(entryTime),
      orderType: 'Market',
      exitReason: 'Manual',
    });
  }

  console.log(`  ✓ Lucid total trades: ${trades.length} | Unique fill pairs: ${seenIds.size}`);
  console.groupEnd();
  return { trades, seenIds };
}

export function lucidHeaders(): string[] {
  return ['buyFillId', 'sellFillId', 'boughtTimestamp', 'soldTimestamp'];
}
