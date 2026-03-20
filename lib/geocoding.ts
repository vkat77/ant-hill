import { GeocodeResult, LatLng } from './types';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'RestaurantScorer/1.0 (vladkat.com)';

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(address)}&format=jsonv2&limit=1&addressdetails=1&countrycodes=us`;

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

  const data = await res.json();
  if (!data.length) throw new Error('Address not found. Try a more specific US address.');

  const place = data[0];
  return {
    latLng: { lat: parseFloat(place.lat), lng: parseFloat(place.lon) },
    displayName: place.display_name,
  };
}

export async function getCensusTract(
  latLng: LatLng
): Promise<{ state: string; county: string; tract: string } | null> {
  const url =
    `https://geocoding.geo.census.gov/geocoder/geographies/coordinates` +
    `?x=${latLng.lng}&y=${latLng.lat}` +
    `&benchmark=Public_AR_Current&vintage=Current_Current&layers=Census%20Tracts&format=json`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    const tracts = data?.result?.geographies?.['Census Tracts'];
    if (!tracts?.length) return null;
    const t = tracts[0];
    return { state: t.STATE, county: t.COUNTY, tract: t.TRACT };
  } catch {
    return null;
  }
}
