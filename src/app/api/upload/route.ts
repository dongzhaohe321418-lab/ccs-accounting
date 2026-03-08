import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');
const MAX_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '5242880');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '文件不能超过5MB' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: '不支持的文件类型，请上传 JPG、PNG、WebP 或 PDF' }, { status: 400 });
    }

    const ext = path.extname(file.name) || '.jpg';
    const safeName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

    await mkdir(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, safeName), buffer);

    return NextResponse.json({ path: safeName });
  } catch (error) {
    if (error instanceof Error && error.message === '未登录') {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    console.error('Upload error:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
