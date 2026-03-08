import { getGoogleSheetsClient, getSpreadsheetId } from './client';
import { getAllTransactions, updateTransactionSyncStatus } from '@/lib/db/transactions';
import { getAllReimbursements, updateReimbursementSyncStatus } from '@/lib/db/reimbursements';
import { getAllUsers } from '@/lib/db/users';

const TRANSACTION_HEADERS = ['ID', '类型', '金额(GBP)', '分类', '日期', '描述', '记录人', '创建时间', '同步时间'];
const REIMBURSEMENT_HEADERS = ['ID', '金额(GBP)', '分类', '日期', '描述', '申请人', '状态', '审批人', '审批时间', '备注', '创建时间', '同步时间'];
const MEMBER_HEADERS = ['ID', '姓名', '邮箱', '角色', '状态', '注册时间'];

export async function fullSync(): Promise<{ success: boolean; message: string; details?: { transactions: number; reimbursements: number; members: number } }> {
  const client = getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!client || !spreadsheetId) {
    return { success: false, message: 'Google Sheets 未配置，请在 .env.local 中设置 GOOGLE_SERVICE_ACCOUNT_EMAIL、GOOGLE_PRIVATE_KEY 和 GOOGLE_SPREADSHEET_ID' };
  }

  try {
    // Ensure all sheets exist
    const spreadsheet = await client.spreadsheets.get({ spreadsheetId });
    const existingSheets = new Set(spreadsheet.data.sheets?.map(s => s.properties?.title) || []);

    const sheetsToCreate = ['交易记录', '报销记录', '成员列表'].filter(name => !existingSheets.has(name));
    if (sheetsToCreate.length > 0) {
      await client.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: sheetsToCreate.map(title => ({ addSheet: { properties: { title } } })),
        },
      });
    }

    // Sync transactions
    const transactions = await getAllTransactions();
    const now = new Date().toISOString();
    const txRows = transactions.map(t => [
      t.id,
      t.type === 'income' ? '收入' : '支出',
      t.amount,
      t.category_name || '',
      t.date,
      t.description,
      t.user_name || '',
      t.created_at,
      now,
    ]);

    await client.spreadsheets.values.update({
      spreadsheetId,
      range: '交易记录!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [TRANSACTION_HEADERS, ...txRows] },
    });

    // Mark all transactions as synced
    for (const t of transactions) {
      await updateTransactionSyncStatus(t.id, 'synced', now);
    }

    // Sync reimbursements
    const reimbursements = await getAllReimbursements();
    const statusMap: Record<string, string> = { pending: '待审批', approved: '已批准', rejected: '已拒绝', paid: '已付款' };
    const reimRows = reimbursements.map(r => [
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
    ]);

    await client.spreadsheets.values.update({
      spreadsheetId,
      range: '报销记录!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [REIMBURSEMENT_HEADERS, ...reimRows] },
    });

    for (const r of reimbursements) {
      await updateReimbursementSyncStatus(r.id, 'synced', now);
    }

    // Sync members
    const users = await getAllUsers();
    const memberRows = users.map(u => [
      u.id,
      u.name,
      u.email,
      u.role === 'admin' ? '管理员' : '成员',
      u.is_active ? '活跃' : '已停用',
      u.created_at,
    ]);

    await client.spreadsheets.values.update({
      spreadsheetId,
      range: '成员列表!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [MEMBER_HEADERS, ...memberRows] },
    });

    return {
      success: true,
      message: '全量同步完成',
      details: {
        transactions: transactions.length,
        reimbursements: reimbursements.length,
        members: users.length,
      },
    };
  } catch (error) {
    console.error('Full sync failed:', error);
    const errMsg = error instanceof Error ? error.message : '未知错误';
    return { success: false, message: `同步失败: ${errMsg}` };
  }
}
