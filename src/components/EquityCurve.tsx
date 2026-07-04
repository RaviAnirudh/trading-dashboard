import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../utils/formatters';

interface DataPoint {
  date: string;
  cumPnl: number;
}

interface Props {
  data: DataPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value as number;
  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded px-3 py-2 text-xs">
      <p className="text-[#64748b] mb-1">{label}</p>
      <p className={`font-bold tabular ${val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {formatCurrency(val, true)}
      </p>
    </div>
  );
}

export function EquityCurve({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-[#111827] border border-[#1e293b] rounded-md p-6 flex items-center justify-center h-56">
        <span className="text-[#64748b] text-sm">No trade data yet</span>
      </div>
    );
  }

  const isPositive = data[data.length - 1].cumPnl >= 0;
  const strokeColor = isPositive ? '#10b981' : '#ef4444';

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-md p-4">
      <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">Equity Curve</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#1e293b' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={v => formatCurrency(v)}
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="cumPnl"
            stroke={strokeColor}
            strokeWidth={2}
            fill="url(#pnlGrad)"
            dot={false}
            activeDot={{ r: 4, fill: strokeColor, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
