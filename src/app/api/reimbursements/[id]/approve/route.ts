import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { approveReimbursementSchema } from '@/lib/validators/reimbursement';
import { getReimbursementById, approveReimbursement, markReimbursementPaid } from '@/lib/db/reimbursements';
import { syncQueue } from '@/lib/google-sheets/queue';
import { z } from 'zod';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const rId = parseInt(id);
    if (Number.isNaN(rId) || rId < 1) {
      return NextResponse.json({ error: '无效的报销ID' }, { status: 400 });
    }
    const existing = await getReimbursementById(rId);

    if (!existing) {
      return NextResponse.json({ error: '报销记录不存在' }, { status: 404 });
    }

    const body = await request.json();

    // Handle "paid" status separately
    if (body.status === 'paid') {
      if (existing.status !== 'approved') {
        return NextResponse.json({ error: '只能将已批准的报销标记为已付款' }, { status: 400 });
      }
      const updated = await markReimbursementPaid(rId);
      syncQueue.enqueue({ entityType: 'reimbursement', entityId: rId, action: 'update', retryCount: 0 });
      return NextResponse.json(updated);
    }

    if (existing.status !== 'pending') {
      return NextResponse.json({ error: '该报销申请已处理' }, { status: 400 });
    }

    const validated = approveReimbursementSchema.parse(body);
    const updated = await approveReimbursement(rId, admin.userId, validated.status, validated.notes);

    syncQueue.enqueue({
      entityType: 'reimbursement',
      entityId: rId,
      action: 'update',
      retryCount: 0,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '输入验证失败', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === '未登录' || error.message === '权限不足')) {
      return NextResponse.json({ error: error.message }, { status: error.message === '未登录' ? 401 : 403 });
    }
    console.error('Approve reimbursement error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
