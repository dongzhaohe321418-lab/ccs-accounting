import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validators/auth';
import { verifyPassword, signToken } from '@/lib/auth';
import { getUserPasswordHash } from '@/lib/db/users';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const user = await getUserPasswordHash(email);
    if (!user) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    const token = await signToken({ userId: user.id, email, role: user.role as 'admin' | 'member' });

    const response = NextResponse.json({
      message: '登录成功',
      user: { id: user.id, email, name: user.name, role: user.role },
    });

    response.cookies.set('ccs-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '输入验证失败', details: error.issues }, { status: 400 });
    }
    console.error('Login error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
