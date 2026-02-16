import { NextResponse } from 'next/server';
import { deleteLocation } from '@/lib/db';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteLocation(id);
  return NextResponse.json({ success: true });
}
