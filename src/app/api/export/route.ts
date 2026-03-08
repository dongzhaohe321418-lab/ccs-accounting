import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { getAllTransactions } from '@/lib/db/transactions';
import { getAllReimbursements } from '@/lib/db/reimbursements';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const type = request.nextUrl.searchParams.get('type') || 'transactions';

    if (type === 'transactions') {
      const transactions = getAllTransactions();
      const header = 'ID,类型,金额(GBP),分类,日期,描述,记录人,创建时间\n';
      const rows = transactions.map(t =>
        `${t.id},${t.type === 'income' ? '收入' : '支出'},${t.amount},${t.category_name || ''},${t.date},"${t.description}",${t.user_name || ''},${t.created_at}`
      ).join('\n');

      return new NextResponse(header + rows, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else {
      const reimbursements = getAllReimbursements();
      const header = 'ID,金额(GBP),分类,日期,描述,申请人,状态,审批人,审批时间,备注\n';
      const rows = reimbursements.map(r =>
        `${r.id},${r.amount},${r.category_name || ''},${r.date},"${r.description}",${r.user_name || ''},${r.status},${r.reviewer_name || ''},${r.reviewed_at || ''},"${r.review_notes || ''}"`
      ).join('\n');

      return new NextResponse(header + rows, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="reimbursements-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }
  } catch (error) {
    if (error instanceof Error && (error.message === '未登录' || error.message === '权限不足')) {
      return NextResponse.json({ error: error.message }, { status: error.message === '未登录' ? 401 : 403 });
    }
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
