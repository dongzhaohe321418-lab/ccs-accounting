import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validators/auth';
import { hashPassword } from '@/lib/auth';
import { createUser, getUserByEmail, getUserCount } from '@/lib/db/users';
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
    // First user becomes admin
    const userCount = await getUserCount();
    const role = userCount === 0 ? 'admin' : 'member';
    await createUser(email, passwordHash, name, role);

    return NextResponse.json({ message: '注册成功' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '输入验证失败', details: error.issues }, { status: 400 });
    }
    console.error('Register error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
