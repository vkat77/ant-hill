import { DemographicsData, FootTrafficData, LatLng, ScoreInput } from './types';
import { getDemographics } from './demographics';
import { getCompetitionData, getFootTrafficData } from './overpass';
import { calculateScore } from './scoring';

// Cuisines to evaluate — broad enough to be useful, narrow enough to be fast
export const CUISINES_TO_TEST = [
  'thai', 'italian', 'mexican', 'chinese', 'japanese', 'indian',
  'mediterranean', 'american', 'korean', 'vietnamese', 'french', 'greek',
  'middle_eastern', 'ethiopian', 'spanish', 'seafood', 'pizza', 'burger',
  'sushi', 'ramen',
];

// Income tier each cuisine tends to fit best
// Used to compute a demographics-fit modifier on top of the base score
type Tier = 'value' | 'mainstream' | 'upscale' | 'niche';

const CUISINE_TIER: Record<string, Tier> = {
  ramen: 'value', vietnamese: 'value', chinese: 'value',
  indian: 'value', burger: 'value', korean: 'value',
  thai: 'mainstream', mexican: 'mainstream', italian: 'mainstream',
  american: 'mainstream', pizza: 'mainstream', japanese: 'mainstream',
  greek: 'mainstream', middle_eastern: 'mainstream',
  french: 'upscale', sushi: 'upscale', seafood: 'upscale',
  mediterranean: 'upscale', spanish: 'upscale',
  ethiopian: 'niche',
};

/**
 * Returns a 0–1 multiplier for how well a cuisine's income tier
 * matches the area's median household income.
 */
function incomeFitMultiplier(tier: Tier, income: number | null): number {
  if (income === null) return 1.0; // no data → neutral
  switch (tier) {
    case 'value':
      // Peaks at $35k–$55k, fades above $90k
      if (income < 25000) return 0.7;
      if (income <= 55000) return 1.0;
      if (income <= 90000) return 1.0 - ((income - 55000) / 35000) * 0.3;
      return 0.7;
    case 'mainstream':
      // Broad sweet spot $45k–$80k
      if (income < 35000) return 0.75;
      if (income <= 80000) return 1.0;
      if (income <= 120000) return 1.0 - ((income - 80000) / 40000) * 0.15;
      return 0.85;
    case 'upscale':
      // Grows with income, minimum floor
      if (income < 50000) return 0.6;
      if (income <= 75000) return 0.6 + ((income - 50000) / 25000) * 0.2;
      if (income <= 150000) return 0.8 + ((income - 75000) / 75000) * 0.2;
      return 1.0;
    case 'niche':
      // Needs density more than income — income-neutral
      return 1.0;
  }
}

export interface CuisineRecommendation {
  cuisine: string;
  label: string;
  score: number;
  competitorCount: number;
  opportunityReason: string;
  demographicsFit: string;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function recommendCuisines(
  latLng: LatLng,
  radiusMiles: number
): Promise<CuisineRecommendation[]> {
  // Fetch demographics and foot traffic once — shared across all cuisines
  const [demographics, footTraffic] = await Promise.all([
    getDemographics(latLng),
    getFootTrafficData(latLng, radiusMiles),
  ]);

  const results: CuisineRecommendation[] = [];

  for (const cuisine of CUISINES_TO_TEST) {
    await sleep(80); // rate-limit Overpass

    const competition = await getCompetitionData(latLng, cuisine, radiusMiles);
    const baseScore = calculateScore(demographics, competition, footTraffic);

    const tier = CUISINE_TIER[cuisine] ?? 'mainstream';
    const fitMultiplier = incomeFitMultiplier(tier, demographics.medianHouseholdIncome);

    // Adjusted score: base composite × income-fit multiplier
    const adjustedScore = Math.min(100, Math.round(baseScore.totalScore * fitMultiplier));

    // Opportunity reasoning
    const count = competition.sameTypeCount;
    let opportunityReason: string;
    if (count === 0) opportunityReason = 'No competitors — first mover opportunity, unproven demand';
    else if (count === 1) opportunityReason = '1 competitor — demand is validated, low competition';
    else if (count <= 3) opportunityReason = `${count} competitors — healthy market, room to differentiate`;
    else if (count <= 5) opportunityReason = `${count} competitors — established market, needs strong differentiation`;
    else opportunityReason = `${count} competitors — saturated, difficult to break in`;

    // Demographics fit description
    const inc = demographics.medianHouseholdIncome;
    let demographicsFit: string;
    if (fitMultiplier >= 0.95) demographicsFit = 'Strong income match for this cuisine';
    else if (fitMultiplier >= 0.80) demographicsFit = 'Good income match';
    else if (fitMultiplier >= 0.65) demographicsFit = 'Moderate income match';
    else demographicsFit = 'Weaker income match for this area';
    if (inc !== null) demographicsFit += ` ($${Math.round(inc / 1000)}k median income)`;

    results.push({
      cuisine,
      label: cuisine.charAt(0).toUpperCase() + cuisine.slice(1).replace('_', ' '),
      score: adjustedScore,
      competitorCount: count,
      opportunityReason,
      demographicsFit,
    });
  }

  // Sort by score descending, return top 5
  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}
