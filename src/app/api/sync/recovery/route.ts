import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { getUnsyncedTransactions } from '@/lib/db/transactions';
import { getUnsyncedReimbursements } from '@/lib/db/reimbursements';
import { syncQueue } from '@/lib/google-sheets/queue';
import { getGoogleSheetsClient, getSpreadsheetId } from '@/lib/google-sheets/client';

// POST: re-queue all unsynced items
export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: '权限不足' }, { status: 403 });
  }

  const client = getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  if (!client || !spreadsheetId) {
    return NextResponse.json({ error: 'Google Sheets 未配置' }, { status: 400 });
  }

  const unsyncedTx = getUnsyncedTransactions();
  const unsyncedReim = getUnsyncedReimbursements();

  for (const t of unsyncedTx) {
    syncQueue.enqueue({ entityType: 'transaction', entityId: t.id, action: 'create', retryCount: 0 });
  }
  for (const r of unsyncedReim) {
    syncQueue.enqueue({ entityType: 'reimbursement', entityId: r.id, action: 'create', retryCount: 0 });
  }

  return NextResponse.json({
    success: true,
    message: `已重新入队 ${unsyncedTx.length} 笔交易和 ${unsyncedReim.length} 笔报销`,
    queued: { transactions: unsyncedTx.length, reimbursements: unsyncedReim.length },
  });
}
