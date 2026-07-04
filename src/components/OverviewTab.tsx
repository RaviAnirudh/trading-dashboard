import type { NormalizedTrade } from '../parsers/types';
import { computeKPIs, computeEquityCurve, computeSymbolStats, computePlatformStats } from '../utils/stats';
import { KPICards } from './KPICards';
import { EquityCurve } from './EquityCurve';
import { formatCurrency } from '../utils/formatters';

interface Props {
  trades: NormalizedTrade[];
}

export function OverviewTab({ trades }: Props) {
  const kpis = computeKPIs(trades);
  const equityData = computeEquityCurve(trades);
  const symbolStats = computeSymbolStats(trades);
  const platformStats = computePlatformStats(trades);

  return (
    <div className="flex flex-col gap-6">
      <KPICards stats={kpis} />
      <EquityCurve data={equityData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Symbol breakdown */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-md p-4">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">By Symbol</h3>
          {symbolStats.length === 0 ? (
            <p className="text-[#64748b] text-sm">No data</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#64748b] text-xs border-b border-[#1e293b]">
                  <th className="text-left pb-2">Symbol</th>
                  <th className="text-right pb-2">Trades</th>
                  <th className="text-right pb-2">Win%</th>
                  <th className="text-right pb-2">P&L</th>
                </tr>
              </thead>
              <tbody>
                {symbolStats.map(s => (
                  <tr key={s.symbol} className="border-b border-[#1e293b]/50 last:border-0">
                    <td className="py-2 font-mono text-[#e2e8f0]">{s.symbol}</td>
                    <td className="py-2 text-right text-[#94a3b8] tabular">{s.trades}</td>
                    <td className="py-2 text-right tabular text-[#94a3b8]">{s.winRate.toFixed(1)}%</td>
                    <td className={`py-2 text-right tabular font-semibold ${s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(s.pnl, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Platform breakdown */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-md p-4">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">By Platform</h3>
          {platformStats.length === 0 ? (
            <p className="text-[#64748b] text-sm">No data</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#64748b] text-xs border-b border-[#1e293b]">
                  <th className="text-left pb-2">Platform</th>
                  <th className="text-right pb-2">Trades</th>
                  <th className="text-right pb-2">P&L</th>
                </tr>
              </thead>
              <tbody>
                {platformStats.map(s => (
                  <tr key={s.platform} className="border-b border-[#1e293b]/50 last:border-0">
                    <td className="py-2 text-[#e2e8f0]">{s.platform}</td>
                    <td className="py-2 text-right text-[#94a3b8] tabular">{s.trades}</td>
                    <td className={`py-2 text-right tabular font-semibold ${s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(s.pnl, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
