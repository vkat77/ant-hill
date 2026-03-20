import { LatLng, OptimalLocation, ScoreInput } from './types';
import { getDemographics } from './demographics';
import { getCompetitionData, getFootTrafficData, isCommerciallyViable } from './overpass';
import { calculateScore } from './scoring';

function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function generateCandidateGrid(center: LatLng, radiusMiles: number): LatLng[] {
  const latDegPerMile = 1 / 69.0;
  const lngDegPerMile = 1 / (69.0 * Math.cos((center.lat * Math.PI) / 180));

  const candidates: LatLng[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const lat =
        center.lat - radiusMiles * latDegPerMile + row * ((radiusMiles * 2 * latDegPerMile) / 4);
      const lng =
        center.lng - radiusMiles * lngDegPerMile + col * ((radiusMiles * 2 * lngDegPerMile) / 4);
      candidates.push({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) });
    }
  }
  return candidates.filter((c) => haversineDistance(center, c) <= radiusMiles);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Run an array of async tasks in parallel batches of `size`. */
async function batchedParallel<T>(
  items: LatLng[],
  fn: (item: LatLng) => Promise<T>,
  size: number,
  delayBetweenBatches = 200
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + size < items.length) await sleep(delayBetweenBatches);
  }
  return results;
}

export async function findOptimalLocation(input: ScoreInput): Promise<OptimalLocation> {
  const candidates = generateCandidateGrid(input.latLng, input.radiusMiles);

  // Phase 1 (parallel): shared data + commercial viability for all candidates at once
  const [sharedCompetition, sharedFootTraffic, viabilityResults] = await Promise.all([
    getCompetitionData(input.latLng, input.cuisineType, input.radiusMiles),
    getFootTrafficData(input.latLng, input.radiusMiles),
    batchedParallel(candidates, isCommerciallyViable, 5, 200),
  ]);

  const viableCandidates = candidates.filter((_, i) => viabilityResults[i]);

  // Phase 2 (sequential): demographics per viable candidate only — Census rate-limits poorly in parallel
  let best: OptimalLocation | null = null;

  for (const candidate of viableCandidates) {
    await sleep(80);
    const demographics = await getDemographics(candidate);
    const result = calculateScore(demographics, sharedCompetition, sharedFootTraffic);

    if (best === null || result.totalScore > best.score) {
      best = {
        latLng: candidate,
        score: result.totalScore,
        distanceMiles: parseFloat(haversineDistance(input.latLng, candidate).toFixed(2)),
      };
    }
  }

  // Fallback: if no commercially-viable candidate found, score the queried location itself
  if (!best) {
    const demographics = await getDemographics(input.latLng);
    const result = calculateScore(demographics, sharedCompetition, sharedFootTraffic);
    best = { latLng: input.latLng, score: result.totalScore, distanceMiles: 0 };
  }

  return best;
}
