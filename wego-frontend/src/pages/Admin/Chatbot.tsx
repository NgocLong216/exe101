import {
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Download,
} from "lucide-react";

// ── Stat cards ────────────────────────────────────────────────────────────────
const stats = [
  { label: "Total Conversations", value: "12,842", change: "+12%",  up: true  },
  { label: "Resolution Rate",     value: "84.2%",  change: "+3.5%", up: true  },
  { label: "Avg. Response Time",  value: "1.2s",   change: "-0.4s", up: false },
  { label: "Fallback Rate",       value: "5.1%",   change: "+0.8%", up: false },
];

// ── Top queries ───────────────────────────────────────────────────────────────
const queries = [
  { q: '"How do I reset my password?"',        freq: 2410, max: 2410 },
  { q: '"What are your business hours?"',       freq: 1892, max: 2410 },
  { q: '"Can I talk to a human?"',              freq: 1540, max: 2410 },
  { q: '"Track my recent order status"',        freq: 1311, max: 2410 },
  { q: '"Pricing for enterprise plans"',        freq: 982,  max: 2410 },
];

// ── Keyword cloud ─────────────────────────────────────────────────────────────
const keywords: { word: string; style: string }[] = [
  { word: "Password",    style: "bg-slate-800 text-white text-base font-bold px-5 py-2" },
  { word: "Login",       style: "bg-white border border-slate-200 text-slate-700 text-sm font-medium px-4 py-1.5" },
  { word: "Pricing",     style: "bg-white border border-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5" },
  { word: "Support",     style: "bg-slate-100 text-slate-500 text-xs font-medium px-3 py-1.5" },
  { word: "Account",     style: "bg-slate-700 text-white text-sm font-semibold px-4 py-1.5" },
  { word: "Status",      style: "bg-white border border-slate-200 text-slate-500 text-xs px-3 py-1.5" },
  { word: "Human",       style: "bg-white border border-slate-300 text-slate-700 text-sm font-medium px-4 py-1.5" },
  { word: "Refund",      style: "bg-teal-400 text-white text-sm font-semibold px-4 py-1.5" },
  { word: "Billing",     style: "bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5" },
  { word: "Security",    style: "bg-slate-200 text-slate-500 text-xs px-3 py-1.5" },
  { word: "Integration", style: "bg-slate-600 text-white text-sm font-semibold px-4 py-1.5" },
  { word: "API",         style: "bg-white border border-slate-300 text-slate-600 text-xs px-3 py-1.5" },
];

// ── Interaction Volume heatmap ────────────────────────────────────────────────
const heatmap = [
  [1, 1, 2, 1, 1, 0, 0],
  [2, 2, 3, 2, 2, 1, 1],
  [2, 3, 3, 4, 3, 2, 1],
  [3, 3, 4, 4, 3, 2, 1],
  [2, 2, 3, 3, 2, 1, 1],
  [1, 1, 2, 2, 1, 1, 0],
];

const heatColors = [
  "bg-slate-100",
  "bg-slate-300",
  "bg-slate-400",
  "bg-slate-600",
  "bg-slate-800",
];

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function Chatbot() {
  return (
    <div className="p-8 space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Chatbot Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Reviewing 24.5k user interactions from the last 30 days.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="flex items-center gap-2 border border-slate-200 bg-white text-slate-700 px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <CalendarDays size={14} />
            Last 30 Days
          </button>
          <button className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors shadow-sm">
            <Download size={14} />
            Export Report
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, change, up }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-slate-800 tracking-tight">{value}</p>
              <span className={`flex items-center gap-0.5 text-xs font-semibold mb-1 ${up ? "text-emerald-600" : "text-red-400"}`}>
                {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Middle row ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Top User Queries */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">Top User Queries</h2>
            <button className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">View All</button>
          </div>
          <div>
            <div className="grid grid-cols-[1fr_80px_90px] px-5 py-2 border-b border-slate-50">
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Query / Question</span>
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Frequency</span>
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Trend</span>
            </div>
            {queries.map(({ q, freq, max }) => (
              <div key={q} className="grid grid-cols-[1fr_80px_90px] px-5 py-3.5 border-b border-slate-50 hover:bg-slate-50/60 transition-colors items-center">
                <p className="text-xs text-slate-700 pr-3 leading-snug">{q}</p>
                <p className="text-xs font-semibold text-slate-700">{freq.toLocaleString()}</p>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-20">
                  <div className="h-full bg-slate-700 rounded-full" style={{ width: `${(freq / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Keyword Cloud */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-5">Keyword Cloud</h2>
          <div className="flex flex-wrap gap-2 items-center">
            {keywords.map(({ word, style }) => (
              <span key={word} className={`rounded-full cursor-default select-none transition-transform hover:scale-105 ${style}`}>
                {word}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* User Sentiment */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4">User Sentiment</h2>
          <div className="flex gap-5 items-start">
            {/* Donut */}
            <div className="relative shrink-0 w-24 h-24">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#334155" strokeWidth="4"
                  strokeDasharray={`${0.72 * 87.96} ${87.96}`} strokeLinecap="round" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#94a3b8" strokeWidth="4"
                  strokeDasharray={`${0.18 * 87.96} ${87.96}`}
                  strokeDashoffset={`-${0.72 * 87.96}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-slate-800 leading-none">72%</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wide mt-0.5">Positive</span>
              </div>
            </div>
            {/* Bars */}
            <div className="flex-1">
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Overall mood of interactions has improved by 4% since the last model update.
              </p>
              <div className="space-y-2.5">
                {[
                  { label: "POSITIVE", pct: 72, color: "bg-slate-700" },
                  { label: "NEUTRAL",  pct: 18, color: "bg-slate-400" },
                  { label: "NEGATIVE", pct: 10, color: "bg-slate-200" },
                ].map(({ label, pct, color }) => (
                  <div key={label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
                      <span className="text-[9px] font-semibold text-slate-600">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Interaction Volume heatmap */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">Interaction Volume</h2>
            <span className="text-[10px] text-slate-400">Peak: 14:00 – 16:00 EST</span>
          </div>
          <div className="space-y-1.5">
            {heatmap.map((row, ri) => (
              <div key={ri} className="grid grid-cols-7 gap-1.5">
                {row.map((val, ci) => (
                  <div key={ci} className={`h-8 rounded-lg ${heatColors[val]}`} />
                ))}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5 mt-2">
            {DAYS.map((d) => (
              <p key={d} className="text-center text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{d}</p>
            ))}
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-3">
            <span className="text-[9px] text-slate-400">Less</span>
            {heatColors.map((c, i) => (
              <div key={i} className={`w-3.5 h-3.5 rounded-sm ${c}`} />
            ))}
            <span className="text-[9px] text-slate-400">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}