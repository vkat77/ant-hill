import { NextRequest, NextResponse } from 'next/server';
import { recommendCuisines } from '@/lib/recommender';
import { LatLng } from '@/lib/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { latLng, radiusMiles }: { latLng: LatLng; radiusMiles: number } = await req.json();

    if (!latLng?.lat || !latLng?.lng || !radiusMiles) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const recommendations = await recommendCuisines(latLng, radiusMiles);
    return NextResponse.json(recommendations);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Recommendation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
