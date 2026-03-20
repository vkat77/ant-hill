import { NextRequest, NextResponse } from 'next/server';
import { getDemographics } from '@/lib/demographics';
import { getCompetitionData, getFootTrafficData } from '@/lib/overpass';
import { calculateScore } from '@/lib/scoring';
import { ScoreInput } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const input: ScoreInput = await req.json();
    const { latLng, cuisineType, radiusMiles } = input;

    if (!latLng?.lat || !latLng?.lng || !cuisineType || !radiusMiles) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [demographics, competition, footTraffic] = await Promise.all([
      getDemographics(latLng),
      getCompetitionData(latLng, cuisineType, radiusMiles),
      getFootTrafficData(latLng, radiusMiles),
    ]);

    const result = calculateScore(demographics, competition, footTraffic);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scoring failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
