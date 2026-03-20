'use client';

import { useState } from 'react';
import SearchForm from '@/components/SearchForm';
import ResultsPanel from '@/components/ResultsPanel';
import RecommendationPanel from '@/components/RecommendationPanel';
import { FullAnalysisResult } from '@/lib/types';
import { CuisineRecommendation } from '@/lib/recommender';

type OutputMode = 'score' | 'recommend' | null;

export default function Home() {
  const [outputMode, setOutputMode] = useState<OutputMode>(null);
  const [scoreResults, setScoreResults] = useState<FullAnalysisResult | null>(null);
  const [recommendations, setRecommendations] = useState<CuisineRecommendation[] | null>(null);
  const [recommendAddress, setRecommendAddress] = useState('');
  const [loadingStep, setLoadingStep] = useState<string | null>(null);

  function handleScoreResults(results: FullAnalysisResult) {
    setScoreResults(results);
    setRecommendations(null);
    setOutputMode('score');
  }

  function handleRecommendations(recs: CuisineRecommendation[], address: string) {
    setRecommendations(recs);
    setRecommendAddress(address);
    setScoreResults(null);
    setOutputMode('recommend');
  }

  const hasResults = outputMode !== null && !loadingStep;

  return (
    <div className="space-y-6">
      <SearchForm
        onResults={handleScoreResults}
        onRecommendations={handleRecommendations}
        onLoading={setLoadingStep}
      />

      {/* Loading state */}
      {loadingStep && (
        <div className="bg-white border border-blue-200 rounded-lg p-6 flex items-center gap-4">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900">{loadingStep}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Querying Census, OpenStreetMap, and computing scores...
            </p>
          </div>
        </div>
      )}

      {/* Score results */}
      {hasResults && outputMode === 'score' && scoreResults && (
        <ResultsPanel results={scoreResults} />
      )}

      {/* Recommendation results */}
      {hasResults && outputMode === 'recommend' && recommendations && (
        <RecommendationPanel recommendations={recommendations} address={recommendAddress} />
      )}

      {/* How it works — only shown before any results */}
      {!hasResults && !loadingStep && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">How it works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 border border-gray-200 rounded p-3">
              <p className="text-sm font-semibold text-gray-800 mb-1">Score a cuisine</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Enter an address and a specific cuisine type. Get a 0–100 score, a factor breakdown,
                a map, and a suggestion for the best nearby location.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm font-semibold text-gray-800 mb-1">✨ Find best fit</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Don't know what to open? We test 20 cuisine types and rank them by competition
                gaps, income-tier match, and foot traffic for your specific location.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            {[
              { icon: '👥', title: 'Demographics (40%)', desc: 'Median household income and population density from the US Census ACS.' },
              { icon: '🍽️', title: 'Competition (35%)', desc: '1–3 competitors = proven demand. 6+ = saturated. 0 = unproven.' },
              { icon: '🚶', title: 'Foot Traffic (25%)', desc: 'Commuter rail, subway, bus stops, retail, and offices — weighted by volume.' },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
