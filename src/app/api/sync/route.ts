import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { fullSync } from '@/lib/google-sheets/full-sync';
import { getGoogleSheetsClient, getSpreadsheetId } from '@/lib/google-sheets/client';
import { syncQueue } from '@/lib/google-sheets/queue';
import { getUnsyncedTransactions } from '@/lib/db/transactions';
import { getUnsyncedReimbursements } from '@/lib/db/reimbursements';

// GET: sync status
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: '权限不足' }, { status: 403 });
  }

  const client = getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const configured = !!(client && spreadsheetId);

  const unsyncedTransactions = getUnsyncedTransactions();
  const unsyncedReimbursements = getUnsyncedReimbursements();

  return NextResponse.json({
    configured,
    queueLength: syncQueue.getQueueLength(),
    processing: syncQueue.isProcessing(),
    unsyncedTransactions: unsyncedTransactions.length,
    unsyncedReimbursements: unsyncedReimbursements.length,
  });
}

// POST: trigger full sync
export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: '权限不足' }, { status: 403 });
  }

  const result = await fullSync();
  return NextResponse.json(result);
}
