'use client';

import { useState } from 'react';
import { FullAnalysisResult, GeocodeResult, OptimalLocation, ScoreResult } from '@/lib/types';
import { CuisineRecommendation } from '@/lib/recommender';

const CUISINE_OPTIONS = [
  'thai', 'italian', 'mexican', 'chinese', 'japanese', 'indian',
  'mediterranean', 'american', 'korean', 'vietnamese', 'french', 'greek',
];

type Mode = 'score' | 'recommend';

interface Props {
  onResults: (results: FullAnalysisResult) => void;
  onRecommendations: (recs: CuisineRecommendation[], address: string) => void;
  onLoading: (step: string | null) => void;
}

/** Parse a fetch response safely — throws a readable error if the body isn't JSON. */
async function safeJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // Non-JSON body: likely a Vercel timeout/crash page
    if (res.status === 504 || res.status === 408) {
      throw new Error('Request timed out. Try a smaller search radius.');
    }
    const preview = text.slice(0, 120).replace(/\s+/g, ' ');
    throw new Error(`Server error (${res.status}): ${preview}`);
  }
}

export default function SearchForm({ onResults, onRecommendations, onLoading }: Props) {
  const [mode, setMode] = useState<Mode>('score');
  const [address, setAddress] = useState('');
  const [cuisine, setCuisine] = useState('thai');
  const [customCuisine, setCustomCuisine] = useState('');
  const [radius, setRadius] = useState(2);
  const [error, setError] = useState<string | null>(null);

  const effectiveCuisine = cuisine === '__custom__' ? customCuisine : cuisine;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!address.trim()) { setError('Please enter an address.'); return; }
    if (mode === 'score' && !effectiveCuisine.trim()) { setError('Please enter a cuisine type.'); return; }

    try {
      // Step 1: Geocode (shared for both modes)
      onLoading('Finding address...');
      const geoRes = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const geoData = await safeJson<GeocodeResult & { error?: string }>(geoRes);
      if (geoData.error) throw new Error(geoData.error);
      const { latLng, displayName } = geoData;

      if (mode === 'recommend') {
        // Recommendation mode: test all cuisines and rank them
        onLoading('Testing 20 cuisine types — analyzing competition gaps & demographics...');
        const recRes = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latLng, radiusMiles: radius }),
        });
        const recData = await safeJson<CuisineRecommendation[] | { error: string }>(recRes);
        if ('error' in recData) throw new Error(recData.error);
        onRecommendations(recData, displayName);
      } else {
        // Score mode: score first (required), then optimize in parallel (optional — timeout is non-fatal)
        onLoading('Analyzing demographics, competition & foot traffic...');

        const scoreBody = JSON.stringify({ latLng, cuisineType: effectiveCuisine, radiusMiles: radius });

        const [scoreRes, optimizeResult] = await Promise.all([
          fetch('/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: scoreBody }),
          fetch('/api/optimize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: scoreBody })
            .then((r) => safeJson<OptimalLocation & { error?: string }>(r))
            .catch(() => null), // optimizer timeout is non-fatal — score still shows
        ]);

        const scoreData = await safeJson<ScoreResult & { error?: string }>(scoreRes);
        const optimizeData = optimizeResult;
        if (scoreData.error) throw new Error(scoreData.error);

        onResults({
          queriedLocation: latLng,
          queriedAddress: displayName,
          queriedScore: scoreData,
          optimalLocation: optimizeData,
          competitors: scoreData.competition.competitorLocations,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      onLoading(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Mode toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5">
        <button
          type="button"
          onClick={() => setMode('score')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            mode === 'score'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Score a cuisine
        </button>
        <button
          type="button"
          onClick={() => setMode('recommend')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            mode === 'recommend'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ✨ Find best fit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Address */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, Chicago, IL"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Cuisine — only shown in score mode */}
        {mode === 'score' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Type</label>
            <select
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {CUISINE_OPTIONS.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
              <option value="__custom__">Other (type below)</option>
            </select>
            {cuisine === '__custom__' && (
              <input
                type="text"
                value={customCuisine}
                onChange={(e) => setCustomCuisine(e.target.value)}
                placeholder="e.g. peruvian"
                className="mt-2 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        )}

        {/* Recommend mode hint */}
        {mode === 'recommend' && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded px-3 py-2">
            <span className="text-blue-500 text-lg">💡</span>
            <p className="text-xs text-blue-700 leading-snug">
              We'll test 20 cuisine types and rank them by competition gaps, demographics fit, and foot traffic.
            </p>
          </div>
        )}

        {/* Radius — always shown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Radius: <span className="font-bold text-blue-600">{radius} mi</span>
          </label>
          <input
            type="range"
            min={0.5}
            max={20}
            step={0.5}
            value={radius}
            onChange={(e) => setRadius(parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>0.5 mi</span><span>20 mi</span>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded transition-colors text-sm"
      >
        {mode === 'recommend' ? '✨ Find Best Fit' : 'Analyze Location'}
      </button>
    </form>
  );
}
