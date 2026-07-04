import React, { useState, useMemo } from 'react';
import type { NormalizedTrade } from '../parsers/types';
import { formatCurrency, formatTime } from '../utils/formatters';

interface Props {
  trades: NormalizedTrade[];
  filterDay?: string;
}

type SortKey = keyof NormalizedTrade | '';
type SortDir = 'asc' | 'desc';

interface GroupedTrade {
  tradeGroupId: string;
  trades: NormalizedTrade[];
  symbol: string;
  platform: string;
  accountName: string;
  side: 'Long' | 'Short';
  totalQty: number;
  avgEntry: number;
  avgExit: number;
  totalPnl: number;
  entryTime: Date;
  exitTime: Date;
  tradeDay: string;
}

function groupTrades(trades: NormalizedTrade[]): GroupedTrade[] {
  const map = new Map<string, NormalizedTrade[]>();
  for (const t of trades) {
    const arr = map.get(t.tradeGroupId) ?? [];
    arr.push(t);
    map.set(t.tradeGroupId, arr);
  }
  return Array.from(map.values()).map(ts => {
    const totalQty = ts.reduce((s, t) => s + t.qty, 0);
    const avgEntry = ts.reduce((s, t) => s + t.entryPrice * t.qty, 0) / totalQty;
    const avgExit = ts.reduce((s, t) => s + t.exitPrice * t.qty, 0) / totalQty;
    const totalPnl = ts.reduce((s, t) => s + t.pnl, 0);
    const sorted = [...ts].sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime());
    return {
      tradeGroupId: ts[0].tradeGroupId,
      trades: sorted,
      symbol: ts[0].symbol,
      platform: ts[0].platform,
      accountName: ts[0].accountName,
      side: ts[0].side,
      totalQty,
      avgEntry,
      avgExit,
      totalPnl,
      entryTime: sorted[0].entryTime,
      exitTime: sorted[sorted.length - 1].exitTime,
      tradeDay: sorted[0].tradeDay,
    };
  });
}

const PLATFORMS = ['All', 'Topstep', 'Lucid'];
const SIDES = ['All', 'Long', 'Short'];
const PNL_FILTERS = ['All', 'Winners', 'Losers'];

export function TradeTable({ trades, filterDay }: Props) {
  const [grouped, setGrouped] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('exitTime');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [platform, setPlatform] = useState('All');
  const [side, setSide] = useState('All');
  const [pnlFilter, setPnlFilter] = useState('All');
  const [symbol, setSymbol] = useState('');

  const symbols = useMemo(() => {
    const set = new Set(trades.map(t => t.symbol));
    return ['All', ...Array.from(set).sort()];
  }, [trades]);

  const filtered = useMemo(() => {
    let ts = trades;
    if (filterDay) ts = ts.filter(t => t.tradeDay === filterDay);
    if (platform !== 'All') ts = ts.filter(t => t.platform === platform);
    if (side !== 'All') ts = ts.filter(t => t.side === side);
    if (pnlFilter === 'Winners') ts = ts.filter(t => t.pnl > 0);
    if (pnlFilter === 'Losers') ts = ts.filter(t => t.pnl < 0);
    if (symbol && symbol !== 'All') ts = ts.filter(t => t.symbol === symbol);
    return ts;
  }, [trades, filterDay, platform, side, pnlFilter, symbol]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sortedTrades = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey as keyof NormalizedTrade];
      const bv = b[sortKey as keyof NormalizedTrade];
      let cmp = 0;
      if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
      else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const groupedTrades = useMemo(() => {
    return groupTrades(filtered).sort((a, b) => {
      const cmp = b.exitTime.getTime() - a.exitTime.getTime();
      return sortDir === 'desc' ? cmp : -cmp;
    });
  }, [filtered, sortDir]);

  function toggleGroup(id: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function SortTh({ label, sk }: { label: string; sk: SortKey }) {
    const active = sortKey === sk;
    return (
      <th
        className="px-3 py-3 text-right cursor-pointer select-none hover:text-[#e2e8f0] transition-colors"
        onClick={() => handleSort(sk)}
      >
        {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
      </th>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select label="Platform" value={platform} onChange={setPlatform} options={PLATFORMS} />
        <Select label="Symbol" value={symbol || 'All'} onChange={v => setSymbol(v === 'All' ? '' : v)} options={symbols} />
        <Select label="Side" value={side} onChange={setSide} options={SIDES} />
        <Select label="P&L" value={pnlFilter} onChange={setPnlFilter} options={PNL_FILTERS} />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[#64748b] text-xs">{filtered.length} trades</span>
          <button
            onClick={() => setGrouped(g => !g)}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              grouped
                ? 'bg-[#6366f1] border-[#6366f1] text-white'
                : 'bg-transparent border-[#1e293b] text-[#94a3b8] hover:border-[#334155]'
            }`}
          >
            {grouped ? 'Grouped' : 'Individual'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          {grouped ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#64748b] text-xs bg-[#0f172a] border-b border-[#1e293b]">
                  <th className="px-3 py-3 text-left">Date</th>
                  <th className="px-3 py-3 text-left">Symbol</th>
                  <th className="px-3 py-3 text-left">Platform</th>
                  <th className="px-3 py-3 text-left">Side</th>
                  <th className="px-3 py-3 text-right">Qty</th>
                  <th className="px-3 py-3 text-right">Avg Entry</th>
                  <th className="px-3 py-3 text-right">Avg Exit</th>
                  <th className="px-3 py-3 text-right">Total P&L</th>
                  <th className="px-3 py-3 text-right">Fills</th>
                </tr>
              </thead>
              <tbody>
                {groupedTrades.map(g => (
                  <React.Fragment key={g.tradeGroupId}>
                    <tr
                      className="border-t border-[#1e293b] hover:bg-[#0f172a] cursor-pointer transition-colors"
                      onClick={() => toggleGroup(g.tradeGroupId)}
                    >
                      <td className="px-3 py-2.5 font-mono text-[#94a3b8] text-xs">{g.tradeDay}</td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-[#e2e8f0]">{g.symbol}</td>
                      <td className="px-3 py-2.5 text-[#94a3b8]">{g.platform}</td>
                      <td className="px-3 py-2.5">
                        <SideBadge side={g.side} />
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-[#94a3b8]">{g.totalQty}</td>
                      <td className="px-3 py-2.5 text-right tabular text-[#94a3b8]">{g.avgEntry.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right tabular text-[#94a3b8]">{g.avgExit.toFixed(2)}</td>
                      <td className={`px-3 py-2.5 text-right tabular font-semibold ${g.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(g.totalPnl, true)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[#6366f1] text-xs">
                        {g.trades.length > 1 ? `${expandedGroups.has(g.tradeGroupId) ? '▲' : '▼'} ${g.trades.length}` : '—'}
                      </td>
                    </tr>
                    {expandedGroups.has(g.tradeGroupId) && g.trades.map(t => (
                      <tr key={t.id} className="border-t border-[#1e293b]/50 bg-[#0a0e17]">
                        <td className="px-3 py-2 pl-8 font-mono text-[#64748b] text-xs">{formatTime(t.entryTime)}</td>
                        <td className="px-3 py-2 text-[#64748b]">—</td>
                        <td className="px-3 py-2 text-[#64748b]">—</td>
                        <td className="px-3 py-2"><SideBadge side={t.side} small /></td>
                        <td className="px-3 py-2 text-right tabular text-[#64748b]">{t.qty}</td>
                        <td className="px-3 py-2 text-right tabular text-[#64748b]">{t.entryPrice.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right tabular text-[#64748b]">{t.exitPrice.toFixed(2)}</td>
                        <td className={`px-3 py-2 text-right tabular ${t.pnl >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                          {formatCurrency(t.pnl, true)}
                        </td>
                        <td className="px-3 py-2 text-right text-[#64748b] text-xs">{t.duration}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#64748b] text-xs bg-[#0f172a] border-b border-[#1e293b]">
                  <th className="px-3 py-3 text-left cursor-pointer hover:text-[#e2e8f0]" onClick={() => handleSort('tradeDay')}>
                    Date {sortKey === 'tradeDay' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-3 py-3 text-left">Platform</th>
                  <th className="px-3 py-3 text-left">Symbol</th>
                  <th className="px-3 py-3 text-left">Side</th>
                  <SortTh label="Qty" sk="qty" />
                  <SortTh label="Entry" sk="entryPrice" />
                  <SortTh label="Exit" sk="exitPrice" />
                  <SortTh label="P&L" sk="pnl" />
                  <th className="px-3 py-3 text-right">Entry Time</th>
                  <th className="px-3 py-3 text-right">Exit Time</th>
                  <th className="px-3 py-3 text-right">Duration</th>
                  <th className="px-3 py-3 text-right">Exit Reason</th>
                </tr>
              </thead>
              <tbody>
                {sortedTrades.map(t => (
                  <tr key={t.id} className="border-t border-[#1e293b] hover:bg-[#0f172a] transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[#94a3b8] text-xs">{t.tradeDay}</td>
                    <td className="px-3 py-2.5 text-[#94a3b8]">{t.platform}</td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-[#e2e8f0]">{t.symbol}</td>
                    <td className="px-3 py-2.5"><SideBadge side={t.side} /></td>
                    <td className="px-3 py-2.5 text-right tabular text-[#94a3b8]">{t.qty}</td>
                    <td className="px-3 py-2.5 text-right tabular text-[#94a3b8]">{t.entryPrice.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right tabular text-[#94a3b8]">{t.exitPrice.toFixed(2)}</td>
                    <td className={`px-3 py-2.5 text-right tabular font-semibold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(t.pnl, true)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular text-[#64748b] text-xs">{formatTime(t.entryTime)}</td>
                    <td className="px-3 py-2.5 text-right tabular text-[#64748b] text-xs">{formatTime(t.exitTime)}</td>
                    <td className="px-3 py-2.5 text-right tabular text-[#64748b]">{t.duration}</td>
                    <td className="px-3 py-2.5 text-right">
                      <ExitReasonBadge reason={t.exitReason} />
                    </td>
                  </tr>
                ))}
                {sortedTrades.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-3 py-8 text-center text-[#64748b]">No trades match the current filters</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#64748b] text-xs">{label}:</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-[#111827] border border-[#1e293b] text-[#e2e8f0] text-xs rounded px-2 py-1.5 outline-none focus:border-[#6366f1] cursor-pointer"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function SideBadge({ side, small }: { side: 'Long' | 'Short'; small?: boolean }) {
  const base = small ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5';
  return (
    <span className={`${base} rounded font-medium ${side === 'Long' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
      {side}
    </span>
  );
}

function ExitReasonBadge({ reason }: { reason: string }) {
  const colors: Record<string, string> = {
    StopLoss: 'text-red-400',
    TakeProfit: 'text-emerald-400',
    Manual: 'text-[#64748b]',
  };
  return <span className={`text-xs ${colors[reason] ?? 'text-[#64748b]'}`}>{reason}</span>;
}
