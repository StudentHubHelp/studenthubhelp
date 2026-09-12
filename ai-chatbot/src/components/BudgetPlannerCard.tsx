import React, { useState } from 'react';
import {
  Calculator,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Phone,
  Home,
  UtensilsCrossed,
  BookOpen,
  FileText,
  Coffee,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info
} from 'lucide-react';
import { StudentBudgetPlan, BudgetBreakdownItem } from '../types';

interface BudgetPlannerCardProps {
  initialPlan: StudentBudgetPlan;
  onRecalculate?: (newBudget: number) => void;
  onSendQuery?: (query: string) => void;
}

export const BudgetPlannerCard: React.FC<BudgetPlannerCardProps> = ({
  initialPlan,
  onRecalculate,
  onSendQuery
}) => {
  const [sliderBudget, setSliderBudget] = useState<number>(initialPlan.targetBudget || 8000);
  const [showTips, setShowTips] = useState<boolean>(true);

  // Compute live items based on current sliderBudget
const [plan, setPlan] = useState<StudentBudgetPlan>(initialPlan);
  const total =
  Number(plan.rent || 0) +
  Number(plan.food || 0) +
  Number(plan.library || 0) +
  Number(plan.stationery || 0) +
  Number(plan.misc || 0);

    return [
      { category: 'rent', label: rentLabel, amount: rent, note: rentNote },
      { category: 'food', label: foodLabel, amount: food, note: foodNote },
      { category: 'library', label: libraryLabel, amount: library, note: libraryNote },
      { category: 'stationery', label: stationeryLabel, amount: stationery, note: stationeryNote },
      { category: 'misc', label: miscLabel, amount: misc, note: miscNote }
    ];
  };

  const items = calculateItems(sliderBudget);
  const totalEstimated = items.reduce((sum, it) => sum + it.amount, 0);
  const diff = sliderBudget - totalEstimated;

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'rent':
        return <Home className="w-3.5 h-3.5 text-blue-600" />;
      case 'food':
        return <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-600" />;
      case 'library':
        return <BookOpen className="w-3.5 h-3.5 text-amber-600" />;
      case 'stationery':
        return <FileText className="w-3.5 h-3.5 text-purple-600" />;
      case 'misc':
      default:
        return <Coffee className="w-3.5 h-3.5 text-rose-600" />;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'rent':
        return 'bg-blue-500';
      case 'food':
        return 'bg-emerald-500';
      case 'library':
        return 'bg-amber-500';
      case 'stationery':
        return 'bg-purple-500';
      case 'misc':
      default:
        return 'bg-rose-500';
    }
  };

  const presets = [
    { label: '₹5,500 (Budget)', value: 5500 },
    { label: '₹7,500 (Sharing)', value: 7500 },
    { label: '₹9,500 (Standard)', value: 9500 },
    { label: '₹12,000 (Single AC)', value: 12000 },
  ];

  return (
    <div className="mt-3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-2xl p-3.5 sm:p-4 border border-amber-400/40 shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-700/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black shadow-md">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs sm:text-sm font-black text-amber-300 tracking-tight">
                Student Monthly Budget Planner
              </h4>
              <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.2 rounded font-bold">
                Live AI Engine
              </span>
            </div>
            <p className="text-[10px] text-slate-300">
              City: {initialPlan.city || 'Sikar'} • Zero Brokerage Calculation
            </p>
          </div>
        </div>

        <span
          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
            diff >= 0
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}
        >
          {diff >= 0 ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
          {diff >= 0 ? `+₹${diff.toLocaleString('en-IN')} Surplus` : `-₹${Math.abs(diff).toLocaleString('en-IN')} Overrun`}
        </span>
      </div>

      {/* Target Budget Slider & Quick Presets */}
      <div className="mt-3 bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
        <div className="flex items-center justify-between text-xs font-bold mb-1.5">
          <span className="text-slate-300 flex items-center gap-1">
            Target Monthly Budget:
          </span>
          <span className="text-amber-400 font-extrabold text-sm sm:text-base">
            ₹{sliderBudget.toLocaleString('en-IN')} <span className="text-[10px] text-slate-400 font-normal">/ month</span>
          </span>
        </div>

        <input
          type="range"
          min={4500}
          max={16000}
          step={500}
          value={sliderBudget}
          onChange={(e) => setSliderBudget(parseInt(e.target.value, 10))}
          className="w-full accent-amber-400 h-2 bg-slate-700 rounded-lg cursor-pointer"
        />

        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
          <span>₹4,500 (Min)</span>
          <span>₹10,000 (Average)</span>
          <span>₹16,000 (Premium AC)</span>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-700/60 overflow-x-auto scrollbar-none">
          <span className="text-[10px] text-slate-400 flex-shrink-0">Presets:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSliderBudget(p.value)}
              className={`text-[10px] px-2 py-0.5 rounded-md font-semibold whitespace-nowrap transition border ${
                sliderBudget === p.value
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                  : 'bg-slate-700/80 text-slate-200 border-slate-600 hover:bg-slate-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Proportion Bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1">
          <span>Cost Allocation Ratio:</span>
          <span className="text-amber-300 font-medium">Est. Total: ₹{totalEstimated.toLocaleString('en-IN')}</span>
        </div>
        <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-700">
          {items.map((it, idx) => {
            const pct = Math.max(5, (it.amount / totalEstimated) * 100);
            return (
              <div
                key={idx}
                style={{ width: `${pct}%` }}
                title={`${it.label}: ₹${it.amount}`}
                className={`${getCategoryColor(it.category)} h-full transition-all duration-300`}
              />
            );
          })}
        </div>
      </div>

      {/* Itemized Breakdown List */}
      <div className="mt-3 space-y-1.5">
        {items.map((it, idx) => (
          <div
            key={idx}
            className="bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 rounded-xl p-2 transition flex items-center justify-between gap-2 text-xs"
          >
            <div className="flex items-start gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 flex-shrink-0 mt-0.5">
                {getCategoryIcon(it.category)}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-100 truncate text-[11px] sm:text-xs">
                  {it.label}
                </div>
                {it.note && (
                  <div className="text-[10px] text-slate-400 truncate">
                    {it.note}
                  </div>
                )}
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm">
                ₹{it.amount.toLocaleString('en-IN')}
              </span>
              <div className="text-[9px] text-slate-400">/ mo</div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Banner */}
      <div className="mt-3 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-400/30 rounded-xl p-2.5 flex items-center justify-between text-xs">
        <div>
          <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
            Smart Recommendation
          </div>
          <div className="font-semibold text-slate-200 text-[11px] mt-0.5">
            {sliderBudget <= 6500
              ? 'Use the live active listings above to build your combination.'
              : (sliderBudget >= 10000
                  ? 'Use the live active listings above to build your combination.'
                  : 'Use the live active listings above to build your combination.')}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-[10px] text-slate-400">Total Living Cost</div>
          <div className="text-sm font-black text-white font-mono">
            ₹{totalEstimated.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Savings Tips Dropdown */}
      <div className="mt-2.5">
        <button
          type="button"
          onClick={() => setShowTips(!showTips)}
          className="w-full flex items-center justify-between text-[11px] font-bold text-amber-300 hover:text-amber-200 py-1"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Zero-Brokerage Money Saving Tips (Save ₹3,000+)
          </span>
          {showTips ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showTips && (
          <div className="mt-1.5 space-y-1 bg-slate-900/80 rounded-xl p-2 text-[10px] text-slate-300 border border-slate-800">
            <div className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold">•</span>
              <span><strong>Zero Broker Commission</strong>: StudentHubHelp guarantees direct verified owner contact without middleman broker fees (saves ₹3,000 - ₹5,000 upfront).</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold">•</span>
              <span><strong>Tiffin Pause Facility</strong>: Check the active listing for its current pause/subscription policy.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold">•</span>
              <span><strong>Library Combo Pass</strong>: Book 24/7 Digital Library quarterly for flat 15% discount.</span>
            </div>
          </div>
        )}
      </div>

      {/* Action CTA buttons */}
      <div className="mt-3 pt-2.5 border-t border-slate-700/80 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => {
            if (onSendQuery) {
              onSendQuery(`Mera monthly budget ₹${sliderBudget} hai, isme best verified hostel aur tiffin combo suggest karo`);
            }
          }}
          className="flex-1 min-w-[140px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[11px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-950" />
          Lock ₹{sliderBudget.toLocaleString('en-IN')} Plan in AI
        </button>

        <a
          href="tel:+919929718264"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-2 rounded-xl transition"
        >
          <Phone className="w-3 h-3 text-emerald-400" />
          Call Director Helpline
        </a>
      </div>
    </div>
  );
};
