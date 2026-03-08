import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params;
    // Prevent path traversal
    const safeName = path.basename(filename);
    const filePath = path.join(UPLOAD_DIR, safeName);

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    const buffer = await readFile(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: '文件读取失败' }, { status: 500 });
  }
}
