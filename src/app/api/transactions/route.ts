import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { createTransactionSchema } from '@/lib/validators/transaction';
import { createTransaction, listTransactions } from '@/lib/db/transactions';
import { syncQueue } from '@/lib/google-sheets/queue';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type') || undefined;

    const result = await listTransactions({
      type,
      limit,
      offset: (page - 1) * limit,
    });

    return NextResponse.json({
      ...result,
      page,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error) {
    if (error instanceof Error && error.message === '未登录') {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    console.error('List transactions error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const validated = createTransactionSchema.parse(body);

    const transaction = await createTransaction({
      userId: user.userId,
      type: validated.type,
      amount: validated.amount,
      categoryId: validated.categoryId,
      date: validated.date,
      description: validated.description,
      receiptPath: validated.receiptPath,
    });

    syncQueue.enqueue({
      entityType: 'transaction',
      entityId: transaction.id,
      action: 'create',
      retryCount: 0,
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '输入验证失败', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === '未登录') {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    console.error('Create transaction error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
