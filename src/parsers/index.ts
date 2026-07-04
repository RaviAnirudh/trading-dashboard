import Papa from 'papaparse';
import type { NormalizedTrade, RawRow } from './types';
import { parseTopstep, topstepHeaders } from './topstep';
import { parseLucid, lucidHeaders } from './lucid';

export type Platform = 'Topstep' | 'Lucid' | 'Unknown';

function detectPlatform(headers: string[]): Platform {
  const headerSet = new Set(headers.map(h => h.trim()));
  if (topstepHeaders().every(h => headerSet.has(h))) return 'Topstep';
  if (lucidHeaders().every(h => headerSet.has(h))) return 'Lucid';
  return 'Unknown';
}

export interface ParseFileResult {
  platform: Platform;
  trades: NormalizedTrade[];
  seenIds: Set<string>;
  error?: string;
}

export async function parseCSVFile(file: File): Promise<ParseFileResult> {
  console.group(`[Parser] Processing file: ${file.name}`);
  console.log(`  Size: ${(file.size / 1024).toFixed(1)} KB`);

  return new Promise(resolve => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const rows = results.data as RawRow[];
        console.log(`  Rows parsed by PapaParse: ${rows.length}`);

        if (rows.length === 0) {
          console.warn('  [Parser] File is empty');
          console.groupEnd();
          resolve({ platform: 'Unknown', trades: [], seenIds: new Set(), error: 'Empty file' });
          return;
        }

        const headers = Object.keys(rows[0]);
        console.log(`  Headers detected: [${headers.join(', ')}]`);

        const platform = detectPlatform(headers);
        console.log(`  Platform detected: ${platform}`);

        try {
          if (platform === 'Topstep') {
            const { trades, seenIds } = parseTopstep(rows);
            console.log(`  ✓ Topstep parse complete — ${trades.length} matched trades, ${seenIds.size} fill IDs`);
            console.groupEnd();
            resolve({ platform, trades, seenIds });
          } else if (platform === 'Lucid') {
            const { trades, seenIds } = parseLucid(rows);
            console.log(`  ✓ Lucid parse complete — ${trades.length} trades, ${seenIds.size} fill pairs`);
            console.groupEnd();
            resolve({ platform, trades, seenIds });
          } else {
            console.warn(`  [Parser] Unrecognized format. Headers: [${headers.join(', ')}]`);
            console.groupEnd();
            resolve({ platform: 'Unknown', trades: [], seenIds: new Set(), error: 'Unrecognized CSV format' });
          }
        } catch (err) {
          console.error(`  [Parser] Exception during parsing:`, err);
          console.groupEnd();
          resolve({ platform, trades: [], seenIds: new Set(), error: String(err) });
        }
      },
      error(err) {
        console.error(`  [Parser] PapaParse error:`, err.message);
        console.groupEnd();
        resolve({ platform: 'Unknown', trades: [], seenIds: new Set(), error: err.message });
      },
    });
  });
}
