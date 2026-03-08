import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { getAllUsers, updateUserRole, updateUserStatus } from '@/lib/db/users';
import { z } from 'zod';

export async function GET() {
  try {
    await requireAdmin();
    const users = getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    if (error instanceof Error && (error.message === '未登录' || error.message === '权限不足')) {
      return NextResponse.json({ error: error.message }, { status: error.message === '未登录' ? 401 : 403 });
    }
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

const updateMemberSchema = z.object({
  id: z.number().int().positive(),
  role: z.enum(['admin', 'member']).optional(),
  isActive: z.number().min(0).max(1).optional(),
});

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { id, role, isActive } = updateMemberSchema.parse(body);

    if (role !== undefined) updateUserRole(id, role);
    if (isActive !== undefined) updateUserStatus(id, isActive);

    return NextResponse.json({ message: '更新成功' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '输入验证失败' }, { status: 400 });
    }
    if (error instanceof Error && (error.message === '未登录' || error.message === '权限不足')) {
      return NextResponse.json({ error: error.message }, { status: error.message === '未登录' ? 401 : 403 });
    }
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
