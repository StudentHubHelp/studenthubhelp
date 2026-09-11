import React, { useState } from 'react';
import {
  Scale,
  Award,
  CheckCircle2,
  XCircle,
  Phone,
  Navigation,
  Sparkles,
  MapPin,
  TrendingDown,
  ShieldCheck,
  Zap,
  Utensils,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { ComparisonMatrix, ComparisonItem } from '../types';

interface ComparisonMatrixCardProps {
  matrix: ComparisonMatrix;
  onSelectOption?: (optionName: string) => void;
  onSendQuery?: (query: string) => void;
}

export const ComparisonMatrixCard: React.FC<ComparisonMatrixCardProps> = ({
  matrix,
  onSelectOption,
  onSendQuery
}) => {
  const [activeTab, setActiveTab] = useState<'both' | string>('both');

  const items = matrix.items || [];
  if (items.length === 0) return null;

  return (
    <div className="mt-3 bg-gradient-to-br from-slate-900 via-slate-900 to-[#071a33] text-white rounded-2xl p-3.5 sm:p-4 border-2 border-amber-400/50 shadow-2xl">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-700/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black shadow-md">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs sm:text-sm font-black text-amber-300 tracking-tight">
                {matrix.title || 'Advance Multi-Option Comparison Matrix'}
              </h4>
              <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.2 rounded font-bold">
                AI Verified
              </span>
            </div>
            <p className="text-[10px] text-slate-300 line-clamp-1">
              {matrix.summary || 'Side-by-side analysis of verified student accommodations'}
            </p>
          </div>
        </div>

        {matrix.costDifferenceText && (
          <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
            <TrendingDown className="w-3 h-3" />
            {matrix.costDifferenceText}
          </span>
        )}
      </div>

      {/* AI Verdict Winner Banner */}
      {matrix.winnerReason && (
        <div className="mt-3 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent border-l-4 border-amber-400 rounded-r-xl p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-300 uppercase tracking-wide">
            <Award className="w-4 h-4 text-amber-400 animate-pulse" />
            AI Decisive Recommendation
          </div>
          <div className="text-[11px] text-slate-200 mt-0.5 leading-snug font-medium">
            {matrix.winnerReason}
          </div>
        </div>
      )}

      {/* Mobile Selector Tabs (for side-by-side vs single view) */}
      <div className="flex items-center gap-1 mt-3 sm:hidden bg-slate-800/80 p-1 rounded-xl border border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab('both')}
          className={`flex-1 text-[10px] font-bold py-1 px-2 rounded-lg transition ${
            activeTab === 'both' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
          }`}
        >
          Side-by-Side (Both)
        </button>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`flex-1 text-[10px] font-bold py-1 px-2 rounded-lg transition truncate ${
              activeTab === item.id ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            {item.name.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Comparison Cards Grid */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item, idx) => {
          const isWinner = item.id === matrix.winnerId;
          const isHiddenOnMobile = activeTab !== 'both' && activeTab !== item.id;

          if (isHiddenOnMobile) return null;

          return (
            <div
              key={item.id}
              className={`rounded-xl p-3 border transition-all flex flex-col justify-between ${
                isWinner
                  ? 'bg-slate-800/90 border-amber-400/80 shadow-lg ring-1 ring-amber-400/30'
                  : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-start justify-between gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {item.badge || (idx === 0 ? 'Option A' : 'Option B')}
                  </span>
                  {item.rating && (
                    <span className="text-[10px] font-bold text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                      ⭐ {item.rating}
                    </span>
                  )}
                </div>

                {/* Title & Price */}
                <h5 className="font-bold text-xs sm:text-sm text-white mt-1.5 leading-snug">
                  {item.name}
                </h5>

                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  <span className="line-clamp-1">{item.location}</span>
                </div>

                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-base sm:text-lg font-black text-amber-400 font-mono">
                    {item.priceMonthly}
                  </span>
                  <span className="text-[10px] text-slate-400">/ month</span>
                </div>

                {/* Key Features Breakdown */}
                {item.features && (
                  <div className="mt-2.5 space-y-1.5 text-[10px] bg-slate-900/80 rounded-lg p-2 border border-slate-700/60">
                    <div className="flex items-start gap-1.5 text-slate-300">
                      <span className="text-amber-400 font-bold flex-shrink-0">🚶 Walk:</span>
                      <span>{item.features.distanceToCoaching}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-slate-300">
                      <Utensils className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{item.features.foodMess}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-slate-300">
                      <ShieldCheck className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span>{item.features.wifiSecurity}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-slate-300">
                      <Zap className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>{item.features.powerBackup}</span>
                    </div>
                  </div>
                )}

                {/* Pros & Cons */}
                <div className="mt-2.5 space-y-1 text-[10px]">
                  {item.pros?.map((pro, pIdx) => (
                    <div key={pIdx} className="flex items-start gap-1 text-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{pro}</span>
                    </div>
                  ))}
                  {item.cons?.map((con, cIdx) => (
                    <div key={cIdx} className="flex items-start gap-1 text-rose-300">
                      <XCircle className="w-3 h-3 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{con}</span>
                    </div>
                  ))}
                </div>

                {/* Best For */}
                {item.bestFor && (
                  <div className="mt-2 pt-2 border-t border-slate-700/60 text-[10px] text-slate-300">
                    <span className="text-amber-400 font-bold">🎯 Best For: </span>
                    {item.bestFor}
                  </div>
                )}
              </div>

              {/* Action Buttons for this item */}
              <div className="mt-3 pt-2 border-t border-slate-700 flex items-center gap-1.5 flex-wrap">
                {item.phone && (
                  <a
                    href={`tel:${item.phone}`}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 px-2.5 py-1.5 rounded-lg transition"
                  >
                    <Phone className="w-3 h-3 text-slate-950" /> Call
                  </a>
                )}

                {item.mapsUrl && (
                  <a
                    href={item.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-200 hover:text-white bg-slate-700 hover:bg-slate-600 px-2 py-1.5 rounded-lg transition"
                  >
                    <Navigation className="w-3 h-3 text-blue-400" /> Map
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (onSendQuery) {
                      onSendQuery(`${item.name} ki verified seat booking aur discount offer kya hai?`);
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:text-amber-200 ml-auto"
                >
                  Book Details <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Footer Help */}
      <div className="mt-3 pt-2 border-t border-slate-700/80 flex items-center justify-between text-[11px] text-slate-300">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Need a personalized 1-on-1 comparison?
        </span>
        <a
          href="tel:+919929718264"
          className="font-bold text-amber-300 hover:text-amber-200 underline"
        >
          Director Satpal Swami: +91 9929718264
        </a>
      </div>
    </div>
  );
};
