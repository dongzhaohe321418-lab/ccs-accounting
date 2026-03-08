import { NextResponse } from 'next/server';
import { getAllCategories } from '@/lib/db/categories';

export async function GET() {
  try {
    const categories = await getAllCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Categories error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
