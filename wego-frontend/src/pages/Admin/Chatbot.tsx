import {
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Download,
} from "lucide-react";

import { useEffect, useState } from "react";
import { getQueryCount, getAllQueries, getInteractionHeatmap } from "../../services/adminService";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function Chatbot() {
  const [totalConversations, setTotalConversations] = useState<number | null>(null);

  const [queries, setQueries] = useState<
    {
      q: string;
      freq: number;
      max: number;
    }[]
  >([]);

  const [keywords, setKeywords] = useState<
    {
      word: string;
      count: number;
    }[]
  >([]);

  const [heatmap, setHeatmap] = useState<number[][]>(
    Array.from({ length: 8 }, () =>
      Array(7).fill(0)
    )
  );

  const heatColors = [
    "bg-slate-100",
    "bg-slate-300",
    "bg-slate-500",
    "bg-slate-700",
    "bg-slate-900",
  ];

  const keywordStyles = [
    "bg-slate-800 text-white text-base font-bold px-5 py-2",
    "bg-slate-700 text-white text-sm font-semibold px-4 py-1.5",
    "bg-slate-600 text-white text-sm font-medium px-4 py-1.5",
    "bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1.5",
    "bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5",
  ];

  const [peakTime, setPeakTime] =
    useState("No data");

  const exportCSV = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Conversations", totalConversations],
      ["Peak Time", peakTime],
      [],
      ["Top Queries", "Frequency"],
      ...queries.map(q => [q.q, q.freq]),
    ];

    const csvContent = rows
      .map((row) => row.join(","))
      .join("\n");

    const BOM = "\uFEFF";

    const blob = new Blob(
      [BOM + csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `chatbot-report-${Date.now()}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const loadHeatmap = async () => {

      const data =
        await getInteractionHeatmap();

      const matrix =
        Array.from(
          { length: 8 },
          () => Array(7).fill(0)
        );

      data.forEach((item: any) => {

        const day =
          item.dayOfWeek % 7;

        matrix[item.timeSlot][day] =
          item.count;
      });

      let peakCount = 0;
      let peakDay = "";
      let peakSlot = 0;

      matrix.forEach((row, slot) => {
        row.forEach((count, day) => {
          if (count > peakCount) {
            peakCount = count;
            peakDay = DAYS[day];
            peakSlot = slot;
          }
        });
      });

      const startHour = peakSlot * 3;
      const endHour = startHour + 3;

      const peakLabel =
        peakCount > 0
          ? `${peakDay} ${startHour
            .toString()
            .padStart(2, "0")}:00 - ${endHour
              .toString()
              .padStart(2, "0")}:00`
          : "No data";

      setPeakTime(peakLabel);

      const max =
        Math.max(
          ...matrix.flat(),
          1
        );

      const normalized =
        matrix.map(row =>
          row.map(value => {

            const ratio =
              value / max;

            if (ratio === 0) return 0;
            if (ratio < 0.25) return 1;
            if (ratio < 0.5) return 2;
            if (ratio < 0.75) return 3;

            return 4;
          })
        );

      setHeatmap(normalized);
    };

    loadHeatmap();
  }, []);

  useEffect(() => {
    const fetchKeywords = async () => {
      try {
        const data = await getAllQueries();

        const stopWords = new Set([
          "quán",
          "nhà",
          "hàng",
          "có",
          "và",
          "ở",
          "gần",
          "tìm",
          "giúp",
        ]);

        const meaningfulPhrases = [
          "cà phê",
          "trà sữa",
          "buffet",
          "hải sản",
          "nhà hàng",
          "khách sạn",
          "bệnh viện",
          "công viên",
          "trung tâm",
          "thủ đức",
          "quận 1",
          "quận 7",
          "sài gòn",
          "wifi",
          "học nhóm",
          "yên tĩnh",
          "quán nướng"
        ];

        const counts: Record<string, number> = {};

        data.forEach((item: any) => {
          const prompt = item.prompt?.toLowerCase() || "";

          meaningfulPhrases.forEach((phrase) => {
            if (prompt.includes(phrase)) {
              counts[phrase] = (counts[phrase] || 0) + 1;
            }
          });
        });

        const result = Object.entries(counts)
          .map(([word, count]) => ({
            word,
            count,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 15);

        const maxCount = result[0]?.count || 1;

        const formattedKeywords = result.map((item) => {
          const ratio = item.count / maxCount;

          let style = keywordStyles[4];

          if (ratio >= 0.8) {
            style = keywordStyles[0];
          } else if (ratio >= 0.6) {
            style = keywordStyles[1];
          } else if (ratio >= 0.4) {
            style = keywordStyles[2];
          } else if (ratio >= 0.2) {
            style = keywordStyles[3];
          }

          return {
            word: item.word,
            style,
          };
        });

        setKeywords(formattedKeywords);

      } catch (err) {
        console.error(err);
      }
    };

    fetchKeywords();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getQueryCount();
        setTotalConversations(data.totalQueries);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchQueries = async () => {
      try {
        const data = await getAllQueries();

        const counts: Record<string, number> = {};

        data.forEach((item: any) => {
          const prompt = item.prompt?.trim();

          if (!prompt) return;

          counts[prompt] = (counts[prompt] || 0) + 1;
        });

        const result = Object.entries(counts)
          .map(([prompt, count]) => ({
            q: `"${prompt}"`,
            freq: count,
          }))
          .sort((a, b) => b.freq - a.freq);

        const max =
          result.length > 0
            ? result[0].freq
            : 1;

        setQueries(
          result.slice(0, 5).map((item) => ({
            ...item,
            max,
          }))
        );
      } catch (error) {
        console.error(error);
      }
    };

    fetchQueries();
  }, []);

  const stats = [
    {
      label: "Total Conversations",
      value:
        totalConversations === null
          ? "..."
          : totalConversations.toLocaleString(),
      change: "+12%",
      up: true,
    },
    {
      label: "Avg. Response Time",
      value: "5.2s",
      change: "-0.4s",
      up: false,
    },
  ];

  return (
    <div className="p-8 space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Chatbot Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Reviewing user interactions from the last 30 days.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="flex items-center gap-2 border border-slate-200 bg-white text-slate-700 px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <CalendarDays size={14} />
            Last 30 Days
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl"
          >
            <Download size={14} />
            Export Report
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map(({ label, value, change, up }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-slate-800 tracking-tight">{value}</p>
              {/* <span className={`flex items-center gap-0.5 text-xs font-semibold mb-1 ${up ? "text-emerald-600" : "text-red-400"}`}>
                {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {change}
              </span> */}
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
      <div className="grid grid-cols-1 gap-4">

        {/* Interaction Volume heatmap */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">Interaction Volume</h2>
            <span className="text-[10px] text-slate-400">Peak: {peakTime}</span>
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