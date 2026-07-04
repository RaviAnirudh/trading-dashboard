import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { NormalizedTrade } from '../parsers/types';
import { computeDailyStats } from '../utils/stats';
import type { DailyStat } from '../utils/stats';
import { formatCurrency } from '../utils/formatters';
import { getSessionNote, setSessionNote } from '../store/tradeStore';

interface Props {
  trades: NormalizedTrade[];
  onDaySelect: (day: string) => void;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const pnl = payload[0].value as number;
  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded px-3 py-2 text-xs">
      <p className="text-[#64748b] mb-1">{label}</p>
      <p className={`font-bold tabular ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {formatCurrency(pnl, true)}
      </p>
    </div>
  );
}

function NoteCell({ tradeDay }: { tradeDay: string }) {
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function handleFocus() {
    if (!loaded) {
      const saved = await getSessionNote(tradeDay);
      setNote(saved);
      setLoaded(true);
    }
    setEditing(true);
  }

  async function handleBlur() {
    setEditing(false);
    await setSessionNote(tradeDay, note);
  }

  return editing ? (
    <input
      className="bg-[#0f172a] border border-[#6366f1] rounded px-2 py-1 text-xs text-[#e2e8f0] w-full outline-none"
      value={note}
      onChange={e => setNote(e.target.value)}
      onBlur={handleBlur}
      autoFocus
    />
  ) : (
    <span
      className="text-[#64748b] text-xs cursor-text hover:text-[#94a3b8] transition-colors"
      onClick={handleFocus}
    >
      {note || '+ add note'}
    </span>
  );
}

export function DailyTab({ trades, onDaySelect }: Props) {
  const dailyStats = computeDailyStats(trades);

  return (
    <div className="flex flex-col gap-6">
      {/* Bar chart */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-md p-4">
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">Daily P&L</h3>
        {dailyStats.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-[#64748b] text-sm">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyStats} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              onClick={(d: any) => d?.activePayload?.[0] && onDaySelect((d.activePayload[0].payload as DailyStat).tradeDay)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="tradeDay" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
              <YAxis tickFormatter={v => formatCurrency(v)} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {dailyStats.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Session table */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-md overflow-hidden">
        <div className="p-4 border-b border-[#1e293b]">
          <h3 className="text-sm font-semibold text-[#e2e8f0]">Session Summary</h3>
        </div>
        {dailyStats.length === 0 ? (
          <div className="p-6 text-center text-[#64748b] text-sm">Upload trade data to see sessions</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#64748b] text-xs bg-[#0f172a]">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-right px-4 py-3">Trades</th>
                  <th className="text-right px-4 py-3">W</th>
                  <th className="text-right px-4 py-3">L</th>
                  <th className="text-right px-4 py-3">Win%</th>
                  <th className="text-right px-4 py-3">P&L</th>
                  <th className="text-left px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[...dailyStats].reverse().map(row => (
                  <tr
                    key={row.tradeDay}
                    className="border-t border-[#1e293b] hover:bg-[#0f172a] cursor-pointer transition-colors"
                    onClick={() => onDaySelect(row.tradeDay)}
                  >
                    <td className="px-4 py-3 font-mono text-[#e2e8f0]">{row.tradeDay}</td>
                    <td className="px-4 py-3 text-right tabular text-[#94a3b8]">{row.trades}</td>
                    <td className="px-4 py-3 text-right tabular text-emerald-400">{row.wins}</td>
                    <td className="px-4 py-3 text-right tabular text-red-400">{row.losses}</td>
                    <td className="px-4 py-3 text-right tabular text-[#94a3b8]">{row.winRate.toFixed(1)}%</td>
                    <td className={`px-4 py-3 text-right tabular font-semibold ${row.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(row.pnl, true)}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <NoteCell tradeDay={row.tradeDay} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
