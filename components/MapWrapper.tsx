'use client';

import dynamic from 'next/dynamic';
import { LatLng } from '@/lib/types';

const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full rounded-lg border border-gray-200 bg-gray-100 animate-pulse flex items-center justify-center">
      <span className="text-gray-400 text-sm">Loading map...</span>
    </div>
  ),
});

interface Props {
  queried: LatLng;
  queriedAddress: string;
  queriedScore: number;
  optimal: LatLng | null;
  optimalScore: number | null;
  optimalDistance: number | null;
  competitors: LatLng[];
}

export default function MapWrapper(props: Props) {
  return <Map {...props} />;
}
