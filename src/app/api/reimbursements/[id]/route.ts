import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getReimbursementById, updateReimbursement } from '@/lib/db/reimbursements';
import { createReimbursementSchema } from '@/lib/validators/reimbursement';
import { syncQueue } from '@/lib/google-sheets/queue';
import { z } from 'zod';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const reimbursement = await getReimbursementById(parseInt(id));
    if (!reimbursement) {
      return NextResponse.json({ error: '报销记录不存在' }, { status: 404 });
    }
    return NextResponse.json(reimbursement);
  } catch (error) {
    if (error instanceof Error && error.message === '未登录') {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const rId = parseInt(id);
    const existing = await getReimbursementById(rId);

    if (!existing) {
      return NextResponse.json({ error: '报销记录不存在' }, { status: 404 });
    }
    if (existing.user_id !== user.userId) {
      return NextResponse.json({ error: '无权修改' }, { status: 403 });
    }
    if (existing.status !== 'pending') {
      return NextResponse.json({ error: '只能修改待审批的报销申请' }, { status: 400 });
    }

    const body = await request.json();
    const validated = createReimbursementSchema.partial().parse(body);
    const updated = await updateReimbursement(rId, {
      amount: validated.amount,
      categoryId: validated.categoryId,
      date: validated.date,
      description: validated.description,
      receiptPath: validated.receiptPath,
    });

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
    if (error instanceof Error && error.message === '未登录') {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
