'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { LatLng } from '@/lib/types';

// Fix Leaflet default icon paths broken by webpack
function fixLeafletIcons() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

function makeColoredIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>`,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

const queriedIcon = makeColoredIcon('#2563eb');   // blue
const optimalIcon = makeColoredIcon('#16a34a');   // green
const competitorIcon = makeColoredIcon('#dc2626'); // red

function AutoFitBounds({
  queried,
  optimal,
  competitors,
}: {
  queried: LatLng;
  optimal: LatLng | null;
  competitors: LatLng[];
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [
      [queried.lat, queried.lng],
      ...(optimal ? [[optimal.lat, optimal.lng] as [number, number]] : []),
      ...competitors.map((c): [number, number] => [c.lat, c.lng]),
    ];

    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [map, queried, optimal, competitors]);

  return null;
}

interface Props {
  queried: LatLng;
  queriedAddress: string;
  queriedScore: number;
  optimal: LatLng | null;
  optimalScore: number | null;
  optimalDistance: number | null;
  competitors: LatLng[];
}

export default function Map({
  queried,
  queriedAddress,
  queriedScore,
  optimal,
  optimalScore,
  optimalDistance,
  competitors,
}: Props) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  return (
    <MapContainer
      center={[queried.lat, queried.lng]}
      zoom={14}
      className="h-96 w-full rounded-lg border border-gray-200"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      <AutoFitBounds queried={queried} optimal={optimal} competitors={competitors} />

      {/* Queried location — blue */}
      <Marker position={[queried.lat, queried.lng]} icon={queriedIcon}>
        <Popup>
          <strong>Your location</strong>
          <br />
          <span className="text-xs text-gray-600">{queriedAddress}</span>
          <br />
          <span className="font-bold">Score: {queriedScore}/100</span>
        </Popup>
      </Marker>

      {/* Optimal location — green */}
      {optimal && (
        <Marker position={[optimal.lat, optimal.lng]} icon={optimalIcon}>
          <Popup>
            <strong className="text-green-700">Optimal location</strong>
            <br />
            <span className="text-xs text-gray-600">{optimalDistance} mi away</span>
            <br />
            <span className="font-bold">Score: {optimalScore}/100</span>
          </Popup>
        </Marker>
      )}

      {/* Competitors — red */}
      {competitors.map((c, i) => (
        <Marker key={i} position={[c.lat, c.lng]} icon={competitorIcon}>
          <Popup>
            <span className="text-red-700 font-medium">Competitor restaurant</span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
