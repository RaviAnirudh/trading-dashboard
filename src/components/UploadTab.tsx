import React, { useCallback, useState } from 'react';
import { parseCSVFile } from '../parsers/index';
import { addTrades, clearAllTrades } from '../store/tradeStore';

interface UploadResult {
  filename: string;
  platform: string;
  added: number;
  duplicates: number;
  error?: string;
}

interface Props {
  onTradesAdded: () => void;
}

export function UploadTab({ onTradesAdded }: Props) {
  const [results, setResults] = useState<UploadResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  async function processFiles(files: FileList | File[]) {
    setUploading(true);
    const newResults: UploadResult[] = [];

    for (const file of Array.from(files)) {
      if (!file.name.endsWith('.csv')) {
        newResults.push({ filename: file.name, platform: 'Unknown', added: 0, duplicates: 0, error: 'Not a CSV file' });
        continue;
      }

      const parsed = await parseCSVFile(file);
      if (parsed.error) {
        newResults.push({ filename: file.name, platform: parsed.platform, added: 0, duplicates: 0, error: parsed.error });
        continue;
      }

      const { added, duplicates } = await addTrades(parsed.trades, parsed.seenIds, parsed.platform);
      newResults.push({ filename: file.name, platform: parsed.platform, added, duplicates });
    }

    setResults(prev => [...newResults, ...prev]);
    setUploading(false);
    onTradesAdded();
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setDragging(false), []);

  async function handleClearAll() {
    await clearAllTrades();
    setResults([]);
    setShowClearConfirm(false);
    onTradesAdded();
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`border-2 border-dashed rounded-md p-12 text-center transition-colors ${
          dragging
            ? 'border-[#6366f1] bg-[#6366f1]/5'
            : 'border-[#1e293b] hover:border-[#334155]'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl">📂</div>
          <p className="text-[#e2e8f0] font-medium">Drop CSV files here</p>
          <p className="text-[#64748b] text-sm">Supports Topstep and Lucid / Tradovate exports</p>
          <label className="mt-2 cursor-pointer">
            <span className="px-4 py-2 bg-[#6366f1] text-white text-sm rounded hover:bg-[#5254cc] transition-colors">
              {uploading ? 'Processing…' : 'Browse files'}
            </span>
            <input
              type="file"
              accept=".csv"
              multiple
              className="hidden"
              onChange={e => e.target.files && processFiles(e.target.files)}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Supported formats */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-md p-4">
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">Supported Formats</h3>
        <div className="flex flex-col gap-2 text-sm text-[#94a3b8]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full" />
            <span><strong className="text-[#e2e8f0]">Topstep</strong> — Orders export (Id, AccountName, ContractName, Status…)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full" />
            <span><strong className="text-[#e2e8f0]">Lucid / Tradovate</strong> — Trade export (buyFillId, sellFillId, pnl…)</span>
          </div>
        </div>
      </div>

      {/* Upload results */}
      {results.length > 0 && (
        <div className="bg-[#111827] border border-[#1e293b] rounded-md overflow-hidden">
          <div className="p-4 border-b border-[#1e293b]">
            <h3 className="text-sm font-semibold text-[#e2e8f0]">Upload History</h3>
          </div>
          <div className="divide-y divide-[#1e293b]">
            {results.map((r, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <span className={`mt-0.5 text-sm ${r.error ? 'text-red-400' : 'text-emerald-400'}`}>
                  {r.error ? '✗' : '✓'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[#e2e8f0] text-sm truncate">{r.filename}</p>
                  {r.error ? (
                    <p className="text-red-400 text-xs mt-0.5">{r.error}</p>
                  ) : (
                    <p className="text-[#64748b] text-xs mt-0.5">
                      {r.platform} · Added <span className="text-emerald-400">{r.added}</span> trades
                      {r.duplicates > 0 && <>, skipped <span className="text-[#94a3b8]">{r.duplicates}</span> duplicates</>}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="bg-[#111827] border border-red-900/30 rounded-md p-4">
        <h3 className="text-sm font-semibold text-red-400 mb-2">Danger Zone</h3>
        <p className="text-[#64748b] text-xs mb-3">This will permanently delete all trades and upload history from your browser storage.</p>
        {showClearConfirm ? (
          <div className="flex items-center gap-3">
            <span className="text-[#94a3b8] text-sm">Are you sure?</span>
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
            >
              Yes, delete all data
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-3 py-1.5 border border-[#1e293b] text-[#94a3b8] text-xs rounded hover:border-[#334155] transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-3 py-1.5 border border-red-900/50 text-red-400 text-xs rounded hover:bg-red-900/20 transition-colors"
          >
            Clear all data
          </button>
        )}
      </div>
    </div>
  );
}
