import { v4 as uuidv4 } from 'uuid';
import type { NormalizedTrade, RawRow } from './types';
import { fifoMatch } from '../matching/fifo';

interface TopstepRow {
  Id: string;
  AccountName: string;
  ContractName: string;
  Status: string;
  Type: string;
  Size: string;
  Side: string;
  FilledAt: string;
  TradeDay: string;
  ExecutePrice: string;
  PositionDisposition: string;
  CreationDisposition: string;
  StopPrice: string;
  LimitPrice: string;
}

function parseDate(s: string): Date {
  return new Date(s);
}

function mapOrderType(row: TopstepRow): string {
  const t = row.Type?.toLowerCase() ?? '';
  if (t.includes('market')) return 'Market';
  if (t.includes('limit')) return 'Limit';
  if (t.includes('stop')) return 'Stop';
  return row.Type ?? 'Market';
}

function mapExitReason(row: TopstepRow): string {
  const cd = row.CreationDisposition?.toLowerCase() ?? '';
  if (cd.includes('stop')) return 'StopLoss';
  if (cd.includes('target') || cd.includes('limit')) return 'TakeProfit';
  return 'Manual';
}

type GroupKey = string; // `${AccountName}|${ContractName}|${TradeDay}`

export function parseTopstep(rows: RawRow[]): { trades: NormalizedTrade[]; seenIds: Set<string> } {
  console.group('[Topstep] Parser started');

  const totalRows = rows.length;
  const filled = rows.filter(r => r['Status'] === 'Filled') as unknown as TopstepRow[];
  const skipped = totalRows - filled.length;
  console.log(`  Total rows: ${totalRows} | Filled: ${filled.length} | Skipped (non-Filled): ${skipped}`);

  // Group by Account + Contract + TradeDay
  const groups = new Map<GroupKey, TopstepRow[]>();
  for (const row of filled) {
    const key = `${row.AccountName}|${row.ContractName}|${row.TradeDay}`;
    const arr = groups.get(key) ?? [];
    arr.push(row);
    groups.set(key, arr);
  }
  console.log(`  Trade groups (Account+Symbol+Day): ${groups.size}`);

  const trades: NormalizedTrade[] = [];
  const seenIds = new Set<string>(filled.map(r => r.Id));

  for (const [key, groupRows] of groups) {
    const [accountName, symbol] = key.split('|');

    const openings = groupRows
      .filter(r => r.PositionDisposition === 'Opening')
      .sort((a, b) => parseDate(a.FilledAt).getTime() - parseDate(b.FilledAt).getTime());

    const closings = groupRows
      .filter(r => r.PositionDisposition === 'Closing')
      .sort((a, b) => parseDate(a.FilledAt).getTime() - parseDate(b.FilledAt).getTime());

    if (openings.length === 0 || closings.length === 0) {
      console.warn(`  [Topstep] Skipping group "${key}" — openings: ${openings.length}, closings: ${closings.length} (unpaired fills)`);
      continue;
    }

    const firstOpening = openings[0];
    const side = firstOpening.Side === 'Bid' ? 'Long' : 'Short';
    const tradeGroupId = uuidv4();

    console.group(`  Group: ${key}`);
    console.log(`    Side: ${side} | Openings: ${openings.length} | Closings: ${closings.length}`);
    console.log(`    Opening fills:`, openings.map(r => `qty=${r.Size} @${r.ExecutePrice}`).join(', '));
    console.log(`    Closing fills:`, closings.map(r => `qty=${r.Size} @${r.ExecutePrice}`).join(', '));

    const matched = fifoMatch(
      'Topstep',
      accountName,
      symbol,
      side,
      openings.map(r => ({
        price: parseFloat(r.ExecutePrice),
        filledAt: parseDate(r.FilledAt),
        qty: parseInt(r.Size, 10),
      })),
      closings.map(r => ({
        price: parseFloat(r.ExecutePrice),
        filledAt: parseDate(r.FilledAt),
        qty: parseInt(r.Size, 10),
        orderType: mapOrderType(r),
        exitReason: mapExitReason(r),
      })),
      tradeGroupId,
    );

    console.log(`    FIFO matched → ${matched.length} trade(s)`);
    matched.forEach((t, i) => {
      console.log(`      [${i + 1}] qty=${t.qty} entry=${t.entryPrice} exit=${t.exitPrice} pnl=$${t.pnl.toFixed(2)} reason=${t.exitReason}`);
    });
    console.groupEnd();

    trades.push(...matched);
  }

  console.log(`  ✓ Topstep total matched trades: ${trades.length}`);
  console.groupEnd();
  return { trades, seenIds };
}

export function topstepHeaders(): string[] {
  return ['Id', 'AccountName', 'ContractName', 'Status', 'PositionDisposition'];
}
