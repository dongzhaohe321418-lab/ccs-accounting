import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { getTransactionStats, getRecentTransactions } from '@/lib/db/transactions';
import { getPendingReimbursementsCount } from '@/lib/db/reimbursements';
import { getUserCount } from '@/lib/db/users';

export async function GET() {
  try {
    await requireAdmin();

    const { totalIncome, totalExpense } = getTransactionStats();
    const pendingReimbursements = getPendingReimbursementsCount();
    const totalMembers = getUserCount();
    const recentTransactions = getRecentTransactions(5);

    return NextResponse.json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      pendingReimbursements,
      totalMembers,
      recentTransactions,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === '未登录' || error.message === '权限不足')) {
      return NextResponse.json({ error: error.message }, { status: error.message === '未登录' ? 401 : 403 });
    }
    console.error('Stats error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
