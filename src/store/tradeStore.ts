import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { NormalizedTrade } from '../parsers/types';

interface StoredTrade extends NormalizedTrade {
  entryTime: Date;
  exitTime: Date;
}

interface SeenId {
  id: string;
}

interface SessionNote {
  tradeDay: string;
  note: string;
}

class TradeDatabase extends Dexie {
  trades!: Table<StoredTrade, string>;
  seenIds!: Table<SeenId, string>;
  sessionNotes!: Table<SessionNote, string>;

  constructor() {
    super('TradingDashboard');
    this.version(1).stores({
      trades: 'id, tradeGroupId, platform, symbol, tradeDay, side, pnl',
      seenIds: 'id',
      sessionNotes: 'tradeDay',
    });
    console.log('[DB] TradingDashboard IndexedDB initialized');
  }
}

export const db = new TradeDatabase();

export async function getAllTrades(): Promise<NormalizedTrade[]> {
  console.log('[DB] Loading all trades from IndexedDB...');
  const rows = await db.trades.toArray();
  const trades = rows.map(deserializeTrade);
  console.log(`[DB] Loaded ${trades.length} trades from IndexedDB`);
  return trades;
}

export async function addTrades(
  trades: NormalizedTrade[],
  newSeenIds: Set<string>,
  platform: string,
): Promise<{ added: number; duplicates: number }> {
  console.group(`[DB] addTrades — platform: ${platform} | incoming trades: ${trades.length} | fill IDs: ${newSeenIds.size}`);

  const platformPrefix = `${platform}|`;
  const existingKeys = (await db.seenIds.where('id').startsWith(platformPrefix).toArray()).map(r => r.id);
  const existingSet = new Set(existingKeys);
  console.log(`  Existing fill IDs in DB for ${platform}: ${existingSet.size}`);

  const newIds: SeenId[] = [];
  let duplicates = 0;

  for (const rawId of newSeenIds) {
    const key = `${platform}|${rawId}`;
    if (existingSet.has(key)) {
      duplicates++;
    } else {
      newIds.push({ id: key });
    }
  }

  console.log(`  New fill IDs: ${newIds.length} | Duplicate fill IDs: ${duplicates}`);

  if (newIds.length === 0) {
    console.warn('  All fill IDs already exist — skipping insert entirely');
    console.groupEnd();
    return { added: 0, duplicates: newSeenIds.size };
  }

  const existingTradeIds = new Set((await db.trades.where('platform').equals(platform).primaryKeys()) as string[]);
  const newTrades = trades.filter(t => !existingTradeIds.has(t.id));
  console.log(`  New trade rows to insert: ${newTrades.length} (filtered from ${trades.length})`);

  await db.transaction('rw', db.trades, db.seenIds, async () => {
    await db.trades.bulkAdd(newTrades.map(serializeTrade));
    await db.seenIds.bulkAdd(newIds);
  });

  console.log(`  ✓ Inserted ${newTrades.length} trades and ${newIds.length} fill IDs`);
  console.groupEnd();
  return { added: newTrades.length, duplicates };
}

export async function clearAllTrades(): Promise<void> {
  console.warn('[DB] Clearing ALL trades and seen IDs from IndexedDB');
  await db.transaction('rw', db.trades, db.seenIds, async () => {
    await db.trades.clear();
    await db.seenIds.clear();
  });
  console.log('[DB] ✓ All data cleared');
}

export async function getSessionNote(tradeDay: string): Promise<string> {
  const row = await db.sessionNotes.get(tradeDay);
  return row?.note ?? '';
}

export async function setSessionNote(tradeDay: string, note: string): Promise<void> {
  console.log(`[DB] Saving note for ${tradeDay}: "${note}"`);
  await db.sessionNotes.put({ tradeDay, note });
}

function serializeTrade(t: NormalizedTrade): StoredTrade {
  return { ...t, entryTime: t.entryTime, exitTime: t.exitTime };
}

function deserializeTrade(t: StoredTrade): NormalizedTrade {
  return {
    ...t,
    entryTime: new Date(t.entryTime),
    exitTime: new Date(t.exitTime),
  };
}
