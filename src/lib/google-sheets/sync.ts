import { getGoogleSheetsClient, getSpreadsheetId } from './client';
import { getTransactionById, updateTransactionSyncStatus } from '@/lib/db/transactions';
import { getReimbursementById, updateReimbursementSyncStatus } from '@/lib/db/reimbursements';

const TRANSACTION_HEADERS = ['ID', '类型', '金额(GBP)', '分类', '日期', '描述', '记录人', '创建时间', '同步时间'];
const REIMBURSEMENT_HEADERS = ['ID', '金额(GBP)', '分类', '日期', '描述', '申请人', '状态', '审批人', '审批时间', '备注', '创建时间', '同步时间'];

async function ensureSheetHeaders(sheetName: string, headers: string[]) {
  const client = getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  if (!client || !spreadsheetId) return;

  try {
    // Check if sheet exists
    const spreadsheet = await client.spreadsheets.get({ spreadsheetId });
    const sheetExists = spreadsheet.data.sheets?.some(s => s.properties?.title === sheetName);

    if (!sheetExists) {
      await client.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        },
      });
    }

    // Set headers
    await client.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
  } catch (error) {
    console.error(`Error ensuring sheet headers for ${sheetName}:`, error);
  }
}

export async function syncTransactionToSheet(transactionId: number) {
  const client = getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  if (!client || !spreadsheetId) {
    console.log('Google Sheets not configured, skipping sync');
    return;
  }

  await ensureSheetHeaders('交易记录', TRANSACTION_HEADERS);

  const t = getTransactionById(transactionId);
  if (!t) return;

  const now = new Date().toISOString();
  const row = [
    t.id,
    t.type === 'income' ? '收入' : '支出',
    t.amount,
    t.category_name || '',
    t.date,
    t.description,
    t.user_name || '',
    t.created_at,
    now,
  ];

  try {
    // Find existing row or append
    const existing = await client.spreadsheets.values.get({
      spreadsheetId,
      range: '交易记录!A:A',
    });

    const rows = existing.data.values || [];
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === String(t.id)) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex > 0) {
      await client.spreadsheets.values.update({
        spreadsheetId,
        range: `交易记录!A${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [row] },
      });
    } else {
      await client.spreadsheets.values.append({
        spreadsheetId,
        range: '交易记录!A:A',
        valueInputOption: 'RAW',
        requestBody: { values: [row] },
      });
    }

    updateTransactionSyncStatus(transactionId, 'synced', now);
  } catch (error) {
    console.error('Failed to sync transaction to Google Sheets:', error);
    updateTransactionSyncStatus(transactionId, 'failed');
    throw error;
  }
}

export async function syncReimbursementToSheet(reimbursementId: number) {
  const client = getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  if (!client || !spreadsheetId) {
    console.log('Google Sheets not configured, skipping sync');
    return;
  }

  await ensureSheetHeaders('报销记录', REIMBURSEMENT_HEADERS);

  const r = getReimbursementById(reimbursementId);
  if (!r) return;

  const now = new Date().toISOString();
  const statusMap: Record<string, string> = { pending: '待审批', approved: '已批准', rejected: '已拒绝', paid: '已付款' };
  const row = [
    r.id,
    r.amount,
    r.category_name || '',
    r.date,
    r.description,
    r.user_name || '',
    statusMap[r.status] || r.status,
    r.reviewer_name || '',
    r.reviewed_at || '',
    r.review_notes || '',
    r.created_at,
    now,
  ];

  try {
    const existing = await client.spreadsheets.values.get({
      spreadsheetId,
      range: '报销记录!A:A',
    });

    const rows = existing.data.values || [];
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === String(r.id)) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex > 0) {
      await client.spreadsheets.values.update({
        spreadsheetId,
        range: `报销记录!A${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [row] },
      });
    } else {
      await client.spreadsheets.values.append({
        spreadsheetId,
        range: '报销记录!A:A',
        valueInputOption: 'RAW',
        requestBody: { values: [row] },
      });
    }

    updateReimbursementSyncStatus(reimbursementId, 'synced', now);
  } catch (error) {
    console.error('Failed to sync reimbursement to Google Sheets:', error);
    updateReimbursementSyncStatus(reimbursementId, 'failed');
    throw error;
  }
}
