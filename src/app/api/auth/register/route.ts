import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validators/auth';
import { hashPassword } from '@/lib/auth';
import { createUserAtomicRole, getUserByEmail } from '@/lib/db/users';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = registerSchema.parse(body);

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    // Role determined atomically in SQL to prevent race condition
    await createUserAtomicRole(email, passwordHash, name);

    return NextResponse.json({ message: '注册成功' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '输入验证失败', details: error.issues }, { status: 400 });
    }
    console.error('Register error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
