import type { NormalizedTrade } from '../parsers/types';
import { formatDuration } from './formatters';

export interface KPIStats {
  totalPnl: number;
  todayPnl: number;
  winRate: number;
  totalTrades: number;
  avgWinner: number;
  avgLoser: number;
  rewardToRisk: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
  avgWinDuration: string;
  avgLossDuration: string;
  totalWins: number;
  totalLosses: number;
}

export function computeKPIs(trades: NormalizedTrade[]): KPIStats {
  const today = new Date().toISOString().slice(0, 10);
  const winners = trades.filter(t => t.pnl > 0);
  const losers = trades.filter(t => t.pnl < 0);

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const todayPnl = trades.filter(t => t.tradeDay === today).reduce((s, t) => s + t.pnl, 0);
  const winRate = trades.length ? (winners.length / trades.length) * 100 : 0;
  const avgWinner = winners.length ? winners.reduce((s, t) => s + t.pnl, 0) / winners.length : 0;
  const avgLoser = losers.length ? losers.reduce((s, t) => s + t.pnl, 0) / losers.length : 0;
  const rewardToRisk = Math.abs(avgLoser) > 0 ? avgWinner / Math.abs(avgLoser) : 0;
  const bestTrade = trades.length ? Math.max(...trades.map(t => t.pnl)) : 0;
  const worstTrade = trades.length ? Math.min(...trades.map(t => t.pnl)) : 0;
  const grossProfit = winners.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losers.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const durationMs = (t: NormalizedTrade) => t.exitTime.getTime() - t.entryTime.getTime();
  const avgWinMs = winners.length ? winners.reduce((s, t) => s + durationMs(t), 0) / winners.length : 0;
  const avgLossMs = losers.length ? losers.reduce((s, t) => s + durationMs(t), 0) / losers.length : 0;

  return {
    totalPnl,
    todayPnl,
    winRate,
    totalTrades: trades.length,
    avgWinner,
    avgLoser,
    rewardToRisk,
    bestTrade,
    worstTrade,
    profitFactor,
    avgWinDuration: formatDuration(avgWinMs),
    avgLossDuration: formatDuration(avgLossMs),
    totalWins: winners.length,
    totalLosses: losers.length,
  };
}

export interface DailyStat {
  tradeDay: string;
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
}

export function computeDailyStats(trades: NormalizedTrade[]): DailyStat[] {
  const map = new Map<string, NormalizedTrade[]>();
  for (const t of trades) {
    const arr = map.get(t.tradeDay) ?? [];
    arr.push(t);
    map.set(t.tradeDay, arr);
  }
  return Array.from(map.entries())
    .map(([day, dayTrades]) => {
      const wins = dayTrades.filter(t => t.pnl > 0).length;
      const losses = dayTrades.filter(t => t.pnl < 0).length;
      return {
        tradeDay: day,
        pnl: dayTrades.reduce((s, t) => s + t.pnl, 0),
        trades: dayTrades.length,
        wins,
        losses,
        winRate: dayTrades.length ? (wins / dayTrades.length) * 100 : 0,
      };
    })
    .sort((a, b) => a.tradeDay.localeCompare(b.tradeDay));
}

export function computeEquityCurve(trades: NormalizedTrade[]): { date: string; cumPnl: number }[] {
  const sorted = [...trades].sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime());
  let cum = 0;
  return sorted.map(t => {
    cum += t.pnl;
    return { date: t.tradeDay, cumPnl: cum };
  });
}

export interface HourlyStat {
  hour: number;
  pnl: number;
  trades: number;
}

export function computeHourlyStats(trades: NormalizedTrade[]): HourlyStat[] {
  const map = new Map<number, { pnl: number; trades: number }>();
  for (const t of trades) {
    const h = t.entryTime.getHours();
    const entry = map.get(h) ?? { pnl: 0, trades: 0 };
    entry.pnl += t.pnl;
    entry.trades += 1;
    map.set(h, entry);
  }
  return Array.from(map.entries())
    .map(([hour, v]) => ({ hour, ...v }))
    .sort((a, b) => a.hour - b.hour);
}

export interface DowStat {
  dow: number; // 0=Sun … 6=Sat
  label: string;
  pnl: number;
  trades: number;
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function computeDowStats(trades: NormalizedTrade[]): DowStat[] {
  const map = new Map<number, { pnl: number; trades: number }>();
  for (const t of trades) {
    const d = t.entryTime.getDay();
    const entry = map.get(d) ?? { pnl: 0, trades: 0 };
    entry.pnl += t.pnl;
    entry.trades += 1;
    map.set(d, entry);
  }
  return Array.from(map.entries())
    .map(([dow, v]) => ({ dow, label: DOW_LABELS[dow], ...v }))
    .sort((a, b) => a.dow - b.dow);
}

export interface SymbolStat {
  symbol: string;
  pnl: number;
  trades: number;
  wins: number;
  winRate: number;
}

export function computeSymbolStats(trades: NormalizedTrade[]): SymbolStat[] {
  const map = new Map<string, NormalizedTrade[]>();
  for (const t of trades) {
    const arr = map.get(t.symbol) ?? [];
    arr.push(t);
    map.set(t.symbol, arr);
  }
  return Array.from(map.entries())
    .map(([symbol, ts]) => {
      const wins = ts.filter(t => t.pnl > 0).length;
      return {
        symbol,
        pnl: ts.reduce((s, t) => s + t.pnl, 0),
        trades: ts.length,
        wins,
        winRate: ts.length ? (wins / ts.length) * 100 : 0,
      };
    })
    .sort((a, b) => b.pnl - a.pnl);
}

export interface PlatformStat {
  platform: string;
  pnl: number;
  trades: number;
}

export function computePlatformStats(trades: NormalizedTrade[]): PlatformStat[] {
  const map = new Map<string, { pnl: number; trades: number }>();
  for (const t of trades) {
    const entry = map.get(t.platform) ?? { pnl: 0, trades: 0 };
    entry.pnl += t.pnl;
    entry.trades += 1;
    map.set(t.platform, entry);
  }
  return Array.from(map.entries())
    .map(([platform, v]) => ({ platform, ...v }))
    .sort((a, b) => b.pnl - a.pnl);
}
