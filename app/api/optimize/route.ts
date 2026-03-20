import { NextRequest, NextResponse } from 'next/server';
import { findOptimalLocation } from '@/lib/optimizer';
import { ScoreInput } from '@/lib/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const input: ScoreInput = await req.json();
    const { latLng, cuisineType, radiusMiles } = input;

    if (!latLng?.lat || !latLng?.lng || !cuisineType || !radiusMiles) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const optimal = await findOptimalLocation(input);
    return NextResponse.json(optimal);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Optimization failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
