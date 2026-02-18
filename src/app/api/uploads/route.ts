import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import mime from 'mime-types';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const filePath = searchParams.get('path');

  if (!filePath) {
    return new NextResponse('Missing path parameter', { status: 400 });
  }

  // Security check: Prevent directory traversal
  // Allow only paths starting with "data/img/"
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith('data/img/') || normalizedPath.includes('..')) {
    return new NextResponse('Invalid path', { status: 403 });
  }

  const absolutePath = path.join(process.cwd(), normalizedPath);

  if (!fs.existsSync(absolutePath)) {
    return new NextResponse('File not found', { status: 404 });
  }

  const fileBuffer = await fs.readFile(absolutePath);
  const contentType = mime.lookup(absolutePath) || 'application/octet-stream';

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
