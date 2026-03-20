import { DemographicsData, LatLng } from './types';
import { getCensusTract } from './geocoding';

const ACS_BASE = 'https://api.census.gov/data/2022/acs/acs5';
const TIGER_BASE = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/14/query';

export async function getDemographics(latLng: LatLng): Promise<DemographicsData> {
  const tractInfo = await getCensusTract(latLng);

  if (!tractInfo) {
    return { medianHouseholdIncome: null, populationDensityPerSqMile: null, tractFips: null };
  }

  const { state, county, tract } = tractInfo;
  const tractFips = `${state}${county}${tract}`;
  const key = process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : '';

  try {
    // Fetch income + population from ACS
    const acsUrl = `${ACS_BASE}?get=B19013_001E,B01003_001E&for=tract:${tract}&in=state:${state}%20county:${county}${key}`;
    const acsRes = await fetch(acsUrl, { next: { revalidate: 86400 } });
    if (!acsRes.ok) throw new Error('ACS fetch failed');

    const acsText = await acsRes.text();
    let acsData: string[][];
    try {
      acsData = JSON.parse(acsText);
    } catch {
      console.error('ACS non-JSON response:', acsText.slice(0, 300));
      throw new Error('Census ACS returned unexpected response');
    }
    const row = acsData[1];
    const income = parseInt(row[0]);
    const population = parseInt(row[1]);

    // Fetch tract land area from TIGER for density calculation
    const tigerUrl = `${TIGER_BASE}?where=STATE%3D'${state}'%20AND%20COUNTY%3D'${county}'%20AND%20TRACT%3D'${tract}'&outFields=ALAND&f=json`;
    const tigerRes = await fetch(tigerUrl, { next: { revalidate: 86400 } });

    let densityPerSqMile: number | null = null;
    if (tigerRes.ok) {
      const tigerText = await tigerRes.text();
      let tigerData: { features?: Array<{ attributes?: { ALAND?: number } }> };
      try {
        tigerData = JSON.parse(tigerText);
      } catch {
        tigerData = {};
      }
      const aland = tigerData?.features?.[0]?.attributes?.ALAND;
      if (aland && aland > 0) {
        const areaSqMiles = aland / 2589988.11;
        densityPerSqMile = population / areaSqMiles;
      }
    }

    return {
      medianHouseholdIncome: income > 0 ? income : null,
      populationDensityPerSqMile: densityPerSqMile,
      tractFips,
    };
  } catch {
    return { medianHouseholdIncome: null, populationDensityPerSqMile: null, tractFips };
  }
}
