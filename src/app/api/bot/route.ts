import { NextResponse } from 'next/server';

const BOT_API_URL = 'http://localhost:3001';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path'); // e.g. /status or /qr

  if (!path) return NextResponse.json({ error: 'Path required' }, { status: 400 });

  try {
    const res = await fetch(`${BOT_API_URL}${path}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Bot API error');
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Bot offline' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) return NextResponse.json({ error: 'Path required' }, { status: 400 });

  try {
    const res = await fetch(`${BOT_API_URL}${path}`, { method: 'POST' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Bot offline' }, { status: 503 });
  }
}
