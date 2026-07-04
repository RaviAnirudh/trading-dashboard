import type { NormalizedTrade } from '../parsers/types';
import { calcPnl } from '../utils/tickValues';
import { formatDuration, toSessionDay } from '../utils/formatters';
import { calcCommission } from '../utils/commissions';
import { v4 as uuidv4 } from 'uuid';

interface OpenUnit {
  price: number;
  filledAt: Date;
  remainingQty: number;
  side: 'Long' | 'Short';
  orderType: string;
  exitReason: string;
}

export interface ClosingFill {
  price: number;
  filledAt: Date;
  qty: number;
  orderType: string;
  exitReason: string;
}

export interface OpeningFill {
  price: number;
  filledAt: Date;
  qty: number;
}

export function fifoMatch(
  platform: string,
  accountName: string,
  symbol: string,
  side: 'Long' | 'Short',
  openings: OpeningFill[],
  closings: ClosingFill[],
  tradeGroupId: string,
): NormalizedTrade[] {
  console.group(`    [FIFO] ${symbol} ${side} — openings: ${openings.length}, closings: ${closings.length}`);

  const queue: OpenUnit[] = openings.map(o => ({
    price: o.price,
    filledAt: o.filledAt,
    remainingQty: o.qty,
    side,
    orderType: '',
    exitReason: '',
  }));

  console.log(`    Queue initialized:`, queue.map(u => `qty=${u.remainingQty} @${u.price}`).join(', '));

  const trades: NormalizedTrade[] = [];

  for (const closing of closings) {
    let remainingClose = closing.qty;
    console.log(`    Processing closing: qty=${closing.qty} @${closing.price}`);

    while (remainingClose > 0 && queue.length > 0) {
      const open = queue[0];
      const matched = Math.min(open.remainingQty, remainingClose);

      const grossPnl = calcPnl(symbol, side, open.price, closing.price, matched);
      const commission = calcCommission(platform, symbol, matched);
      const pnl = grossPnl - commission;
      const durationMs = closing.filledAt.getTime() - open.filledAt.getTime();

      console.log(
        `      Matched: qty=${matched} entry=${open.price} → exit=${closing.price} | gross=$${grossPnl.toFixed(2)} comm=-$${commission.toFixed(2)} net=$${pnl.toFixed(2)} | duration=${formatDuration(Math.max(0, durationMs))}`
      );

      trades.push({
        id: uuidv4(),
        tradeGroupId,
        platform,
        accountName,
        symbol,
        side,
        qty: matched,
        entryPrice: open.price,
        exitPrice: closing.price,
        pnl,
        entryTime: open.filledAt,
        exitTime: closing.filledAt,
        duration: formatDuration(Math.max(0, durationMs)),
        tradeDay: toSessionDay(closing.filledAt),
        orderType: closing.orderType,
        exitReason: closing.exitReason,
      });

      open.remainingQty -= matched;
      remainingClose -= matched;

      if (open.remainingQty === 0) {
        console.log(`      Open unit fully consumed, removing from queue. Queue remaining: ${queue.length - 1}`);
        queue.shift();
      } else {
        console.log(`      Open unit partially consumed. Remaining qty: ${open.remainingQty}`);
      }
    }

    if (remainingClose > 0) {
      console.warn(`      WARNING: ${remainingClose} closing qty unmatched — queue exhausted`);
    }
  }

  console.log(`    [FIFO] Result: ${trades.length} trade(s) produced`);
  console.groupEnd();
  return trades;
}
