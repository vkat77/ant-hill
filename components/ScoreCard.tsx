'use client';

import { ScoreResult } from '@/lib/types';

interface Props {
  result: ScoreResult;
  label: string;
}

function scoreColor(score: number) {
  if (score >= 70) return { ring: 'text-green-600', bar: 'bg-green-500', bg: 'bg-green-50 border-green-200' };
  if (score >= 45) return { ring: 'text-yellow-600', bar: 'bg-yellow-500', bg: 'bg-yellow-50 border-yellow-200' };
  return { ring: 'text-red-600', bar: 'bg-red-500', bg: 'bg-red-50 border-red-200' };
}

export default function ScoreCard({ result, label }: Props) {
  const { ring, bar, bg } = scoreColor(result.totalScore);

  return (
    <div className={`border rounded-lg p-5 ${bg}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">{label}</p>

      {/* Total score */}
      <div className="flex items-end gap-3 mb-4">
        <span className={`text-6xl font-bold leading-none ${ring}`}>{result.totalScore}</span>
        <div className="mb-1">
          <span className={`text-lg font-semibold ${ring}`}>{result.grade}</span>
          <p className="text-xs text-gray-500">out of 100</p>
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="space-y-3">
        {result.factors.map((factor) => (
          <div key={factor.name}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-800">
                {factor.name}
                <span className="text-xs text-gray-400 font-normal ml-1">({Math.round(factor.weight * 100)}%)</span>
              </span>
              <span className="text-sm font-bold text-gray-700">{factor.score}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${bar}`}
                style={{ width: `${factor.score}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{factor.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
