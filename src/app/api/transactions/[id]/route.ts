import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { updateTransactionSchema } from '@/lib/validators/transaction';
import { getTransactionById, updateTransaction, deleteTransaction } from '@/lib/db/transactions';
import { syncQueue } from '@/lib/google-sheets/queue';
import { z } from 'zod';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const txId = parseInt(id);
    if (Number.isNaN(txId) || txId < 1) {
      return NextResponse.json({ error: '无效的交易ID' }, { status: 400 });
    }
    const transaction = await getTransactionById(txId);
    if (!transaction) {
      return NextResponse.json({ error: '交易不存在' }, { status: 404 });
    }
    return NextResponse.json(transaction);
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
    const txId = parseInt(id);
    if (Number.isNaN(txId) || txId < 1) {
      return NextResponse.json({ error: '无效的交易ID' }, { status: 400 });
    }
    const existing = await getTransactionById(txId);
    if (!existing) {
      return NextResponse.json({ error: '交易不存在' }, { status: 404 });
    }
    if (existing.user_id !== user.userId && user.role !== 'admin') {
      return NextResponse.json({ error: '无权修改' }, { status: 403 });
    }

    const body = await request.json();
    const validated = updateTransactionSchema.parse(body);
    const updated = await updateTransaction(txId, {
      type: validated.type,
      amount: validated.amount,
      categoryId: validated.categoryId,
      date: validated.date,
      description: validated.description,
      receiptPath: validated.receiptPath,
    });

    syncQueue.enqueue({
      entityType: 'transaction',
      entityId: txId,
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

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const txId = parseInt(id);
    if (Number.isNaN(txId) || txId < 1) {
      return NextResponse.json({ error: '无效的交易ID' }, { status: 400 });
    }
    const existing = await getTransactionById(txId);
    if (!existing) {
      return NextResponse.json({ error: '交易不存在' }, { status: 404 });
    }
    if (existing.user_id !== user.userId && user.role !== 'admin') {
      return NextResponse.json({ error: '无权删除' }, { status: 403 });
    }

    await deleteTransaction(txId);

    syncQueue.enqueue({
      entityType: 'transaction',
      entityId: txId,
      action: 'delete',
      retryCount: 0,
    });

    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    if (error instanceof Error && error.message === '未登录') {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
