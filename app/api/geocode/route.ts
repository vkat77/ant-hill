import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocoding';

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    if (!address?.trim()) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }
    const result = await geocodeAddress(address);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Geocoding failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
