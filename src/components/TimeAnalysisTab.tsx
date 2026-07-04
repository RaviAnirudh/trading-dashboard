import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import type { NormalizedTrade } from '../parsers/types';
import { computeHourlyStats, computeDowStats } from '../utils/stats';
import { formatCurrency } from '../utils/formatters';

interface Props {
  trades: NormalizedTrade[];
}

function PnlTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const pnl = d.pnl as number;
  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded px-3 py-2 text-xs">
      <p className="text-[#64748b] mb-1">{d.label ?? `${d.hour}:00`}</p>
      <p className={`font-bold tabular ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(pnl, true)}</p>
      <p className="text-[#64748b]">{d.trades} trade{d.trades !== 1 ? 's' : ''}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-md p-4">
      <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">{title}</h3>
      {children}
    </div>
  );
}

export function TimeAnalysisTab({ trades }: Props) {
  const hourlyStats = computeHourlyStats(trades);
  const dowStats = computeDowStats(trades);

  const durationData = trades.map(t => ({
    durationMin: (t.exitTime.getTime() - t.entryTime.getTime()) / 60000,
    pnl: t.pnl,
    symbol: t.symbol,
  }));

  const winners = trades.filter(t => t.pnl > 0);
  const losers = trades.filter(t => t.pnl < 0);
  const avgWinMs = winners.length ? winners.reduce((s, t) => s + (t.exitTime.getTime() - t.entryTime.getTime()), 0) / winners.length : 0;
  const avgLossMs = losers.length ? losers.reduce((s, t) => s + (t.exitTime.getTime() - t.entryTime.getTime()), 0) / losers.length : 0;

  if (trades.length === 0) {
    return (
      <div className="bg-[#111827] border border-[#1e293b] rounded-md p-12 text-center text-[#64748b]">
        Upload trade data to see time analysis
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="P&L by Hour of Day">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyStats} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" tickFormatter={h => `${h}:00`} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
              <YAxis tickFormatter={v => formatCurrency(v)} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={70} />
              <Tooltip content={<PnlTooltip />} cursor={{ fill: '#ffffff06' }} />
              <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                {hourlyStats.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#10b981' : '#ef4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Trade Count by Hour">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyStats} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" tickFormatter={h => `${h}:00`} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4, fontSize: 12 }}
                labelFormatter={h => `${h}:00`}
                formatter={(v: any) => [v, 'Trades']}
              />
              <Bar dataKey="trades" fill="#6366f1" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="P&L by Day of Week">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dowStats} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
              <YAxis tickFormatter={v => formatCurrency(v)} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={70} />
              <Tooltip content={<PnlTooltip />} cursor={{ fill: '#ffffff06' }} />
              <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                {dowStats.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#10b981' : '#ef4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Duration Analysis">
          <div className="flex gap-6 mb-4">
            <div className="flex flex-col gap-1">
              <span className="text-[#64748b] text-xs">Avg Winner Duration</span>
              <span className="text-emerald-400 font-semibold tabular">{formatMinutes(avgWinMs / 60000)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[#64748b] text-xs">Avg Loser Duration</span>
              <span className="text-red-400 font-semibold tabular">{formatMinutes(avgLossMs / 60000)}</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <ScatterChart margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="durationMin"
                name="Duration (min)"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#1e293b' }}
                label={{ value: 'min', position: 'insideRight', fill: '#64748b', fontSize: 10 }}
              />
              <YAxis
                dataKey="pnl"
                name="P&L"
                tickFormatter={v => formatCurrency(v)}
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <ZAxis range={[20, 20]} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4, fontSize: 12 }}
                formatter={(v: any, name: any) => [name === 'P&L' ? formatCurrency(v, true) : `${v.toFixed(1)}m`, name]}
              />
              <Scatter
                data={durationData}
                fill="#6366f1"
                fillOpacity={0.6}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function formatMinutes(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${minutes.toFixed(1)}m`;
  return `${(minutes / 60).toFixed(1)}h`;
}
