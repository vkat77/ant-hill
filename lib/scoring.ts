import { DemographicsData, CompetitionData, FootTrafficData, ScoreFactor, ScoreResult } from './types';

const WEIGHTS = {
  demographics: 0.40,
  competition: 0.35,
  footTraffic: 0.25,
};

function scoreDemographics(d: DemographicsData): { score: number; explanation: string } {
  // Income sub-score: sweet spot $50k–$80k
  let incomeScore = 50; // neutral fallback
  const inc = d.medianHouseholdIncome;
  if (inc !== null) {
    if (inc < 30000) incomeScore = 20;
    else if (inc < 50000) incomeScore = 20 + ((inc - 30000) / 20000) * 50;
    else if (inc <= 80000) incomeScore = 70 + ((inc - 50000) / 30000) * 30;
    else if (inc < 120000) incomeScore = 100 - ((inc - 80000) / 40000) * 40;
    else incomeScore = 60;
  }

  // Density sub-score
  let densityScore = 50;
  const density = d.populationDensityPerSqMile;
  if (density !== null) {
    if (density < 500) densityScore = 10;
    else if (density < 2000) densityScore = 10 + ((density - 500) / 1500) * 50;
    else if (density <= 10000) densityScore = 60 + ((density - 2000) / 8000) * 40;
    else densityScore = 100;
  }

  const score = Math.round(incomeScore * 0.6 + densityScore * 0.4);

  const incStr = inc !== null ? `$${Math.round(inc / 1000)}k median income` : 'income data unavailable';
  const densStr =
    density !== null ? `${Math.round(density).toLocaleString()}/sq mi population density` : 'density data unavailable';
  const explanation = `${incStr} · ${densStr}`;

  return { score: Math.min(100, Math.max(0, score)), explanation };
}

function scoreCompetition(c: CompetitionData): { score: number; explanation: string } {
  const count = c.sameTypeCount;
  let score: number;

  if (count === 0) score = 40;
  else if (count === 1) score = 85;
  else if (count === 2) score = 100;
  else if (count === 3) score = 90;
  else if (count === 4) score = 70;
  else if (count === 5) score = 50;
  else score = Math.max(10, 50 - (count - 5) * 8);

  const explanation =
    count === 0
      ? 'No competitors — unproven market, higher risk'
      : count <= 2
      ? `${count} competitor${count > 1 ? 's' : ''} — validated demand, manageable competition`
      : count <= 4
      ? `${count} competitors — established market, getting competitive`
      : `${count} competitors — saturated market`;

  return { score, explanation };
}

function scoreFootTraffic(f: FootTrafficData): { score: number; explanation: string } {
  // Transit: normalize weighted score against a cap of 15 weighted units
  // (e.g. 3 commuter rail stations = 15, or 15 bus stops = 15)
  const transitScore = Math.min(f.weightedTransitScore / 15, 1.0) * 100;
  const retailScore = Math.min(f.retailCount / 10, 1.0) * 100;
  const officeScore = Math.min(f.officeCount / 5, 1.0) * 100;

  const score = Math.round(transitScore * 0.5 + retailScore * 0.3 + officeScore * 0.2);

  // Build a human-readable transit breakdown
  const transitParts: string[] = [];
  if (f.heavyRailCount > 0) transitParts.push(`${f.heavyRailCount} commuter/rail`);
  if (f.subwayMetroCount > 0) transitParts.push(`${f.subwayMetroCount} subway`);
  if (f.lightRailTramCount > 0) transitParts.push(`${f.lightRailTramCount} tram/light rail`);
  if (f.ferryCount > 0) transitParts.push(`${f.ferryCount} ferry`);
  if (f.busStopCount > 0) transitParts.push(`${f.busStopCount} bus`);
  const transitStr = transitParts.length > 0 ? transitParts.join(', ') : 'no transit';

  const explanation = `Transit: ${transitStr} · ${f.retailCount} retail/shops · ${f.officeCount} offices`;

  return { score: Math.min(100, Math.max(0, score)), explanation };
}

function gradeScore(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 35) return 'Poor';
  return 'Very Poor';
}

export function calculateScore(
  demographics: DemographicsData,
  competition: CompetitionData,
  footTraffic: FootTrafficData
): ScoreResult {
  const demo = scoreDemographics(demographics);
  const comp = scoreCompetition(competition);
  const foot = scoreFootTraffic(footTraffic);

  const factors: ScoreFactor[] = [
    {
      name: 'Demographics',
      score: demo.score,
      weight: WEIGHTS.demographics,
      weightedScore: Math.round(demo.score * WEIGHTS.demographics),
      explanation: demo.explanation,
    },
    {
      name: 'Competition',
      score: comp.score,
      weight: WEIGHTS.competition,
      weightedScore: Math.round(comp.score * WEIGHTS.competition),
      explanation: comp.explanation,
    },
    {
      name: 'Foot Traffic',
      score: foot.score,
      weight: WEIGHTS.footTraffic,
      weightedScore: Math.round(foot.score * WEIGHTS.footTraffic),
      explanation: foot.explanation,
    },
  ];

  const totalScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        demo.score * WEIGHTS.demographics +
        comp.score * WEIGHTS.competition +
        foot.score * WEIGHTS.footTraffic
      )
    )
  );

  return {
    totalScore,
    grade: gradeScore(totalScore),
    factors,
    demographics,
    competition,
    footTraffic,
  };
}
