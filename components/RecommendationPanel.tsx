'use client';

import { CuisineRecommendation } from '@/lib/recommender';

interface Props {
  recommendations: CuisineRecommendation[];
  address: string;
}

const MEDAL = ['🥇', '🥈', '🥉', '4.', '5.'];

function scoreColor(score: number) {
  if (score >= 70) return { text: 'text-green-700', bar: 'bg-green-500', bg: 'bg-green-50 border-green-200' };
  if (score >= 45) return { text: 'text-yellow-700', bar: 'bg-yellow-500', bg: 'bg-yellow-50 border-yellow-200' };
  return { text: 'text-red-700', bar: 'bg-red-500', bg: 'bg-red-50 border-red-200' };
}

export default function RecommendationPanel({ recommendations, address }: Props) {
  const top = recommendations[0];

  return (
    <div className="space-y-4">
      {/* Header callout */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-1">Best fit for this location</p>
        <p className="text-sm text-blue-800 leading-snug">
          Based on competition gaps, demographics, and foot traffic near{' '}
          <span className="font-medium">{address.split(',').slice(0, 2).join(',')}</span>
        </p>
      </div>

      {/* Ranked list */}
      {recommendations.map((rec, i) => {
        const { text, bar, bg } = scoreColor(rec.score);
        const isTop = i === 0;

        return (
          <div
            key={rec.cuisine}
            className={`border rounded-lg p-5 ${bg} ${isTop ? 'ring-2 ring-blue-400' : ''}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl w-8 flex-shrink-0">{MEDAL[i]}</span>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-bold ${text}`}>{rec.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{rec.opportunityReason}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{rec.demographicsFit}</p>
                </div>
              </div>

              {/* Score */}
              <div className="text-right flex-shrink-0">
                <span className={`text-3xl font-bold ${text}`}>{rec.score}</span>
                <p className="text-xs text-gray-400">/ 100</p>
              </div>
            </div>

            {/* Score bar */}
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${bar}`}
                style={{ width: `${rec.score}%` }}
              />
            </div>

            {/* Competitor count pill */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-600">
                {rec.competitorCount === 0
                  ? 'No competitors in radius'
                  : `${rec.competitorCount} competitor${rec.competitorCount > 1 ? 's' : ''} in radius`}
              </span>
              {isTop && (
                <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-0.5 font-medium">
                  Recommended
                </span>
              )}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-gray-400 text-center">
        Scores reflect competition gaps, income-tier fit, and foot traffic. Conduct your own market research before committing.
      </p>
    </div>
  );
}
