import { useEffect, useState, useCallback } from 'react';
import type { NormalizedTrade } from './parsers/types';
import { getAllTrades } from './store/tradeStore';
import { OverviewTab } from './components/OverviewTab';
import { DailyTab } from './components/DailyTab';
import { TradeTable } from './components/TradeTable';
import { TimeAnalysisTab } from './components/TimeAnalysisTab';
import { UploadTab } from './components/UploadTab';

type Tab = 'overview' | 'daily' | 'trades' | 'time' | 'upload';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'daily', label: 'Daily' },
  { id: 'trades', label: 'All Trades' },
  { id: 'time', label: 'Time Analysis' },
  { id: 'upload', label: 'Upload' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [trades, setTrades] = useState<NormalizedTrade[]>([]);
  const [filterDay, setFilterDay] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const loadTrades = useCallback(async () => {
    const all = await getAllTrades();
    setTrades(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  function handleDaySelect(day: string) {
    setFilterDay(day);
    setActiveTab('trades');
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    if (tab !== 'trades') setFilterDay(undefined);
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] text-[#e2e8f0]">
      {/* Header */}
      <header className="border-b border-[#1e293b] px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#6366f1] rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <span className="font-semibold text-[#e2e8f0] tracking-tight">TradeLens</span>
        </div>
        <div className="h-4 w-px bg-[#1e293b]" />
        <span className="text-[#64748b] text-xs">
          {trades.length} trades · {new Set(trades.map(t => t.tradeDay)).size} sessions
        </span>
        <div className="ml-auto" />
        <button
          onClick={() => handleTabChange('upload')}
          className="px-3 py-1.5 text-xs border border-[#6366f1] text-[#6366f1] rounded hover:bg-[#6366f1]/10 transition-colors"
        >
          + Upload CSV
        </button>
      </header>

      {/* Tab nav */}
      <nav className="border-b border-[#1e293b] px-6 flex gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-3 text-sm transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-[#e2e8f0] border-[#6366f1]'
                : 'text-[#64748b] border-transparent hover:text-[#94a3b8]'
            }`}
          >
            {tab.label}
            {tab.id === 'trades' && filterDay && (
              <span className="ml-1.5 text-xs bg-[#6366f1] text-white px-1.5 py-0.5 rounded">
                {filterDay}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-[#64748b]">
            Loading trades…
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab trades={trades} />}
            {activeTab === 'daily' && <DailyTab trades={trades} onDaySelect={handleDaySelect} />}
            {activeTab === 'trades' && <TradeTable trades={trades} filterDay={filterDay} />}
            {activeTab === 'time' && <TimeAnalysisTab trades={trades} />}
            {activeTab === 'upload' && <UploadTab onTradesAdded={loadTrades} />}
          </>
        )}
      </main>
    </div>
  );
}
