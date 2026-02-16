import { NextResponse } from 'next/server';
import { getLocations, saveLocation } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const locations = await getLocations();
  return NextResponse.json(locations);
}

export async function POST(request: Request) {
  const body = await request.json();

  const lat = parseFloat(String(body.lat).replace(/[^\d.\-]/g, ''));
  let lng = parseFloat(String(body.lng).replace(/[^\d.\-]/g, ''));

  // Mexico is in the western hemisphere — longitude must be negative
  if (lng > 0) lng = -lng;

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 });
  }

  const location = {
    id: body.id || uuidv4(),
    name: body.name,
    lat,
    lng,
    radiusMeters: parseInt(body.radiusMeters, 10) || 100,
  };
  await saveLocation(location);
  return NextResponse.json(location, { status: 201 });
}

