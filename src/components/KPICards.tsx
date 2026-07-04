import type { KPIStats } from '../utils/stats';
import { formatCurrency } from '../utils/formatters';

interface Props {
  stats: KPIStats;
}

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean | null;
}

function KPICard({ label, value, sub, positive }: CardProps) {
  const valueColor =
    positive === true ? 'text-emerald-400' :
    positive === false ? 'text-red-400' :
    'text-slate-100';

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-md p-4 flex flex-col gap-1">
      <span className="text-[#64748b] text-xs font-medium uppercase tracking-wider">{label}</span>
      <span className={`text-xl font-bold tabular ${valueColor}`}>{value}</span>
      {sub && <span className="text-[#64748b] text-xs">{sub}</span>}
    </div>
  );
}

export function KPICards({ stats }: Props) {
  const pnlPos = stats.totalPnl > 0 ? true : stats.totalPnl < 0 ? false : null;
  const todayPos = stats.todayPnl > 0 ? true : stats.todayPnl < 0 ? false : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-3">
      <KPICard
        label="Total P&L"
        value={formatCurrency(stats.totalPnl, true)}
        positive={pnlPos}
      />
      <KPICard
        label="Today's P&L"
        value={formatCurrency(stats.todayPnl, true)}
        positive={todayPos}
      />
      <KPICard
        label="Win Rate"
        value={`${stats.winRate.toFixed(1)}%`}
        sub={`${stats.totalWins}W / ${stats.totalLosses}L`}
        positive={stats.winRate >= 50 ? true : false}
      />
      <KPICard
        label="Total Trades"
        value={String(stats.totalTrades)}
      />
      <KPICard
        label="Avg Winner"
        value={formatCurrency(stats.avgWinner)}
        sub={`Avg duration: ${stats.avgWinDuration}`}
        positive={true}
      />
      <KPICard
        label="Avg Loser"
        value={formatCurrency(stats.avgLoser)}
        sub={`Avg duration: ${stats.avgLossDuration}`}
        positive={false}
      />
      <KPICard
        label="Reward : Risk"
        value={stats.rewardToRisk.toFixed(2)}
        positive={stats.rewardToRisk >= 1 ? true : false}
      />
      <KPICard
        label="Profit Factor"
        value={isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'}
        positive={stats.profitFactor >= 1 ? true : false}
      />
      <KPICard
        label="Best Trade"
        value={formatCurrency(stats.bestTrade, true)}
        positive={true}
      />
      <KPICard
        label="Worst Trade"
        value={formatCurrency(stats.worstTrade, true)}
        positive={false}
      />
    </div>
  );
}
