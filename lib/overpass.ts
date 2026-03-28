import { CompetitionData, FootTrafficData, LatLng } from './types';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function milesToMeters(miles: number): number {
  return Math.round(miles * 1609.344);
}

async function runOverpassQuery(query: string): Promise<{ elements: OverpassElement[] }> {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Overpass error ${res.status}: ${text.slice(0, 200)}`);
  try {
    return JSON.parse(text);
  } catch {
    console.error('Overpass returned non-JSON:', text.slice(0, 300));
    throw new Error(`Overpass returned unexpected response: ${text.slice(0, 100)}`);
  }
}

interface OverpassElement {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export async function getCompetitionData(
  latLng: LatLng,
  cuisineType: string,
  radiusMiles: number
): Promise<CompetitionData> {
  const radius = milesToMeters(radiusMiles);
  const { lat, lng } = latLng;

  const query = `
[out:json][timeout:25];
(
  node["amenity"="restaurant"]["cuisine"~"${cuisineType}",i](around:${radius},${lat},${lng});
  way["amenity"="restaurant"]["cuisine"~"${cuisineType}",i](around:${radius},${lat},${lng});
);
out center;`;

  try {
    const data = await runOverpassQuery(query);
    const locations: LatLng[] = data.elements
      .map((el) => {
        if (el.lat && el.lon) return { lat: el.lat, lng: el.lon };
        if (el.center) return { lat: el.center.lat, lng: el.center.lon };
        return null;
      })
      .filter((l): l is LatLng => l !== null);

    return { sameTypeCount: locations.length, competitorLocations: locations };
  } catch {
    return { sameTypeCount: 0, competitorLocations: [] };
  }
}

/**
 * Fetches all restaurants in the radius in a single query and returns
 * a map of cuisine tag → { count, locations }.
 * Used by the recommender to avoid making one Overpass call per cuisine.
 */
export async function getAllRestaurantsByCuisine(
  latLng: LatLng,
  radiusMiles: number
): Promise<Map<string, CompetitionData>> {
  const radius = milesToMeters(radiusMiles);
  const { lat, lng } = latLng;

  const query = `
[out:json][timeout:25];
(
  node["amenity"="restaurant"](around:${radius},${lat},${lng});
  way["amenity"="restaurant"](around:${radius},${lat},${lng});
);
out center tags;`;

  const cuisineMap = new Map<string, CompetitionData>();

  try {
    const data = await runOverpassQuery(query);

    for (const el of data.elements) {
      const rawCuisine = el.tags?.cuisine;
      if (!rawCuisine) continue;

      const location: LatLng | null =
        el.lat && el.lon ? { lat: el.lat, lng: el.lon }
        : el.center ? { lat: el.center.lat, lng: el.center.lon }
        : null;

      // OSM cuisine tags can be semicolon-delimited (e.g. "pizza;italian")
      const parts = rawCuisine.toLowerCase().split(/[;,]/);
      for (const part of parts) {
        const tag = part.trim();
        if (!tag) continue;
        const existing = cuisineMap.get(tag) ?? { sameTypeCount: 0, competitorLocations: [] };
        cuisineMap.set(tag, {
          sameTypeCount: existing.sameTypeCount + 1,
          competitorLocations: location
            ? [...existing.competitorLocations, location]
            : existing.competitorLocations,
        });
      }
    }
  } catch {
    // Return empty map — recommender falls back to 0 competitors per cuisine
  }

  return cuisineMap;
}

// OSM commercial landuse values that indicate a location can host a restaurant
const COMMERCIAL_LANDUSE = ['commercial', 'retail', 'mixed', 'industrial', 'village_green'];

/**
 * Returns true if a point appears to be in a commercially-zoned area based on OSM data.
 *
 * Two-signal approach:
 *  1. A landuse polygon tagged commercial/retail/mixed covers the point (within 75m)
 *  2. At least one existing amenity or shop exists within 75m (proxy for commercial activity)
 *
 * Either signal is sufficient. Falls back to true if Overpass is unreachable,
 * so the optimizer degrades gracefully rather than filtering everything out.
 */
export async function isCommerciallyViable(latLng: LatLng): Promise<boolean> {
  const { lat, lng } = latLng;
  const CHECK_RADIUS = 75; // metres — tight enough to avoid false positives from nearby zones

  const query = `
[out:json][timeout:10];
(
  way["landuse"~"${COMMERCIAL_LANDUSE.join('|')}"](around:${CHECK_RADIUS},${lat},${lng});
  relation["landuse"~"${COMMERCIAL_LANDUSE.join('|')}"](around:${CHECK_RADIUS},${lat},${lng});
  node["amenity"](around:${CHECK_RADIUS},${lat},${lng});
  node["shop"](around:${CHECK_RADIUS},${lat},${lng});
  way["shop"](around:${CHECK_RADIUS},${lat},${lng});
  node["building"~"commercial|retail|mixed_use"](around:${CHECK_RADIUS},${lat},${lng});
  way["building"~"commercial|retail|mixed_use"](around:${CHECK_RADIUS},${lat},${lng});
);
out count;`;

  try {
    const data = await runOverpassQuery(query);
    // "out count" returns a single element with a "total" tag
    const total = data.elements[0]?.tags?.total;
    return total ? parseInt(total) > 0 : data.elements.length > 0;
  } catch {
    // If Overpass is down, don't silently discard all candidates
    return true;
  }
}

export async function getFootTrafficData(
  latLng: LatLng,
  radiusMiles: number
): Promise<FootTrafficData> {
  const radius = milesToMeters(radiusMiles);
  const { lat, lng } = latLng;

  // Transit query: all element types (node/way/relation) to catch commuter rail stations
  // which are frequently mapped as area ways or stop_area relations in OSM.
  const transitQuery = `
[out:json][timeout:25];
(
  node["highway"="bus_stop"](around:${radius},${lat},${lng});
  node["public_transport"="stop_position"](around:${radius},${lat},${lng});
  node["railway"~"^(station|halt|subway_entrance|tram_stop)$"](around:${radius},${lat},${lng});
  way["railway"~"^(station|halt)$"](around:${radius},${lat},${lng});
  relation["railway"="station"](around:${radius},${lat},${lng});
  node["public_transport"="station"](around:${radius},${lat},${lng});
  way["public_transport"="station"](around:${radius},${lat},${lng});
  node["amenity"="ferry_terminal"](around:${radius},${lat},${lng});
  way["amenity"="ferry_terminal"](around:${radius},${lat},${lng});
);
out tags;`;

  const retailQuery = `
[out:json][timeout:25];
(
  node["shop"](around:${radius},${lat},${lng});
  way["shop"](around:${radius},${lat},${lng});
  node["amenity"="marketplace"](around:${radius},${lat},${lng});
  node["leisure"="fitness_centre"](around:${radius},${lat},${lng});
  node["amenity"="gym"](around:${radius},${lat},${lng});
);
out count;`;

  const officeQuery = `
[out:json][timeout:25];
(
  node["office"](around:${radius},${lat},${lng});
  way["office"](around:${radius},${lat},${lng});
  node["building"="office"](around:${radius},${lat},${lng});
);
out count;`;

  try {
    const [transitData, retailData, officeData] = await Promise.all([
      runOverpassQuery(transitQuery),
      runOverpassQuery(retailQuery),
      runOverpassQuery(officeQuery),
    ]);

    // Classify each transit element into a tier by its OSM tags
    let heavyRailCount = 0;
    let subwayMetroCount = 0;
    let lightRailTramCount = 0;
    let busStopCount = 0;
    let ferryCount = 0;

    for (const el of transitData.elements) {
      const tags = el.tags ?? {};
      const railway = tags['railway'] ?? '';
      const station = tags['station'] ?? '';
      const pt = tags['public_transport'] ?? '';
      const amenity = tags['amenity'] ?? '';
      const highway = tags['highway'] ?? '';
      const network = (tags['network'] ?? '').toLowerCase();

      if (amenity === 'ferry_terminal') {
        ferryCount++;
      } else if (railway === 'subway_entrance' || station === 'subway') {
        subwayMetroCount++;
      } else if (
        railway === 'station' ||
        railway === 'halt' ||
        station === 'commuter' ||
        station === 'main' ||
        station === 'international' ||
        // Catch commuter/regional networks by name when station tag is missing
        network.includes('commuter') ||
        network.includes('metra') ||
        network.includes('lirr') ||
        network.includes('metro-north') ||
        network.includes('caltrain') ||
        network.includes('septa') ||
        network.includes('amtrak') ||
        (pt === 'station' && railway !== '' && railway !== 'tram_stop')
      ) {
        heavyRailCount++;
      } else if (railway === 'tram_stop' || station === 'light_rail') {
        lightRailTramCount++;
      } else if (highway === 'bus_stop' || pt === 'stop_position') {
        busStopCount++;
      } else {
        // Unrecognised transit element — count as bus-stop equivalent
        busStopCount++;
      }
    }

    // Weighted equivalent in bus-stop units:
    //   heavy rail = 5×, subway = 3×, light rail/ferry = 2×, bus = 1×
    const weightedTransitScore =
      heavyRailCount * 5 +
      subwayMetroCount * 3 +
      lightRailTramCount * 2 +
      ferryCount * 2 +
      busStopCount * 1;

    const retailCount = retailData.elements[0]?.tags?.total
      ? parseInt(retailData.elements[0].tags.total)
      : retailData.elements.length;

    const officeCount = officeData.elements[0]?.tags?.total
      ? parseInt(officeData.elements[0].tags.total)
      : officeData.elements.length;

    const totalRawTransit = heavyRailCount + subwayMetroCount + lightRailTramCount + busStopCount + ferryCount;

    return {
      heavyRailCount,
      subwayMetroCount,
      lightRailTramCount,
      busStopCount,
      ferryCount,
      weightedTransitScore,
      retailCount,
      officeCount,
      totalProxyCount: totalRawTransit + retailCount + officeCount,
    };
  } catch {
    return {
      heavyRailCount: 0,
      subwayMetroCount: 0,
      lightRailTramCount: 0,
      busStopCount: 0,
      ferryCount: 0,
      weightedTransitScore: 0,
      retailCount: 0,
      officeCount: 0,
      totalProxyCount: 0,
    };
  }
}
