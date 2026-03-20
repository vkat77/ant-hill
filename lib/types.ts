export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  latLng: LatLng;
  displayName: string;
}

export interface ScoreInput {
  latLng: LatLng;
  cuisineType: string;
  radiusMiles: number;
}

export interface DemographicsData {
  medianHouseholdIncome: number | null;
  populationDensityPerSqMile: number | null;
  tractFips: string | null;
}

export interface CompetitionData {
  sameTypeCount: number;
  competitorLocations: LatLng[];
}

export interface FootTrafficData {
  // Raw counts by transit tier
  heavyRailCount: number;    // commuter/intercity rail stations  (weight 5x)
  subwayMetroCount: number;  // subway/metro stations             (weight 3x)
  lightRailTramCount: number;// light rail, tram stops            (weight 2x)
  busStopCount: number;      // bus stops, stop positions         (weight 1x)
  ferryCount: number;        // ferry terminals                   (weight 2x)
  // Weighted equivalent (bus-stop units) — used for scoring
  weightedTransitScore: number;
  retailCount: number;
  officeCount: number;
  totalProxyCount: number;
}

export interface ScoreFactor {
  name: string;
  score: number;
  weight: number;
  weightedScore: number;
  explanation: string;
}

export interface ScoreResult {
  totalScore: number;
  grade: string;
  factors: ScoreFactor[];
  demographics: DemographicsData;
  competition: CompetitionData;
  footTraffic: FootTrafficData;
}

export interface OptimalLocation {
  latLng: LatLng;
  score: number;
  distanceMiles: number;
}

export interface FullAnalysisResult {
  queriedLocation: LatLng;
  queriedAddress: string;
  queriedScore: ScoreResult;
  optimalLocation: OptimalLocation;
  competitors: LatLng[];
}
