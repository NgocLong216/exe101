import { TrendingUp, TrendingDown, Users, CalendarDays, Cpu, UserPlus, CalendarCheck, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { getUserCount, getScheduleCount } from "../../services/adminService";

const growthData = [18, 24, 22, 30, 28, 35, 32, 40, 44, 42, 50, 48, 55, 58, 62, 60, 65, 68, 72, 70, 75, 73, 80, 82, 85, 83, 88, 90, 92, 95];

const activityItems = [
  { icon: UserPlus, color: "text-blue-500 bg-blue-50", label: "New user registered", time: "2 minutes ago" },
  { icon: CalendarCheck, color: "text-green-500 bg-green-50", label: "Appointment confirmed", time: "15 minutes ago" },
  { icon: AlertTriangle, color: "text-amber-500 bg-amber-50", label: "Token limit alert", time: "1 hour ago" },
];

export default function Dashboard() {
  const maxVal = Math.max(...growthData);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [totalSchedules, setTotalSchedules] = useState<number | null>(null);

  const stats = [
    {
      label: "Total Users",
      value:
        totalUsers === null
          ? "..."
          : totalUsers.toLocaleString(),
      change: 12,
      icon: Users,
      positive: true,
    },
    {
      label: "Schedules Created",
      value:
        totalSchedules === null
          ? "..."
          : totalSchedules.toLocaleString(),
      change: 8,
      icon: CalendarDays,
      positive: true,
    },
    {
      label: "Chatbot Tokens Used",
      value: "842.5k",
      change: -4,
      icon: Cpu,
      positive: false,
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, scheduleData] = await Promise.all([
          getUserCount(),
          getScheduleCount(),
        ]);

        setTotalUsers(userData.totalUsers);
        setTotalSchedules(scheduleData.totalSchedules);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Real-time operational overview and performance metrics.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, change, icon: Icon, positive }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                <Icon size={17} className="text-slate-600" />
              </div>
              <span className={`flex items-center gap-1 text-xs font-semibold ${positive ? "text-emerald-600" : "text-red-500"}`}>
                {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(change)}%
              </span>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
            <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${positive ? "bg-emerald-400" : "bg-red-400"}`}
                style={{ width: `${Math.min(Math.abs(change) * 5, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Growth Trends chart */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Growth Trends</h2>
              <p className="text-xs text-slate-400">User acquisition vs Token utilization over 30 days</p>
            </div>
            <select className="text-xs text-slate-600 border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-slate-300">
              <option>Last 30 Days</option>
              <option>Last 7 Days</option>
              <option>Last 90 Days</option>
            </select>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-1.5 h-36">
            {growthData.map((val, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm transition-all hover:opacity-80"
                style={{
                  height: `${(val / maxVal) * 100}%`,
                  backgroundColor: i >= 20 ? "#1e293b" : "#cbd5e1",
                }}
              />
            ))}
          </div>

          {/* X labels */}
          <div className="flex justify-between mt-2 px-0.5">
            {["Day 1", "Day 10", "Day 20", "Day 30"].map((d) => (
              <span key={d} className="text-[10px] text-slate-400">{d}</span>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Recent Activity</h2>
          <div className="space-y-3 flex-1">
            {activityItems.map(({ icon: Icon, color, label, time }) => (
              <div key={label} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                  <Icon size={13} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-700 leading-tight">{label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors tracking-wide uppercase">
            View All Logs
          </button>
        </div>
      </div>
    </div>
  );
}