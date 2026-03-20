'use client';

import { FullAnalysisResult } from '@/lib/types';
import ScoreCard from './ScoreCard';
import MapWrapper from './MapWrapper';

interface Props {
  results: FullAnalysisResult;
}

export default function ResultsPanel({ results }: Props) {
  const { queriedLocation, queriedAddress, queriedScore, optimalLocation, competitors } = results;

  const optimalBetter = optimalLocation && optimalLocation.score > queriedScore.totalScore;

  return (
    <div className="space-y-6">
      {/* Map */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" /> Your location
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> Optimal location
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> Competitors
          </span>
        </div>
        <MapWrapper
          queried={queriedLocation}
          queriedAddress={queriedAddress}
          queriedScore={queriedScore.totalScore}
          optimal={optimalLocation?.latLng ?? null}
          optimalScore={optimalLocation?.score ?? null}
          optimalDistance={optimalLocation?.distanceMiles ?? null}
          competitors={competitors}
        />
      </div>

      {/* Score cards side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScoreCard result={queriedScore} label="Your location" />

        {optimalLocation && (
          <div className="space-y-2">
            {optimalBetter && (
              <div className="bg-green-100 border border-green-300 rounded px-3 py-2 text-sm text-green-800 font-medium">
                A better spot was found {optimalLocation.distanceMiles} mi away (+{optimalLocation.score - queriedScore.totalScore} pts)
              </div>
            )}
            {!optimalBetter && (
              <div className="bg-blue-100 border border-blue-300 rounded px-3 py-2 text-sm text-blue-800 font-medium">
                Your location is already the best in the area.
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Optimal nearby</p>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-5xl font-bold text-green-600">{optimalLocation.score}</span>
                <span className="text-sm text-gray-500 mb-1">/ 100 · {optimalLocation.distanceMiles} mi away</span>
              </div>
              <p className="text-xs text-gray-500">
                Lat {optimalLocation.latLng.lat.toFixed(5)}, Lng {optimalLocation.latLng.lng.toFixed(5)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
