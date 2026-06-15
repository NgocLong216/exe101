import { TrendingUp, TrendingDown, Users, CalendarDays, Cpu, UserPlus, CalendarCheck, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { getUserCount, getScheduleCount, getQueryCount, getRecentActivities, getScheduleTrend, getAvgTimeToFirstSchedule } from "../../services/adminService";

export default function Dashboard() {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [totalSchedules, setTotalSchedules] = useState<number | null>(null);
  const [totalConversations, setTotalConversations] = useState<number | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const displayedActivities = showAllActivities
    ? activities
    : activities.slice(0, 3);
  const [growthData, setGrowthData] = useState<number[]>([]);
  const maxVal =
    growthData.length > 0
      ? Math.max(...growthData)
      : 1;

  const [
    avgTimeToFirstSchedule,
    setAvgTimeToFirstSchedule,
  ] = useState<number | null>(null);

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
      label: "Chatbot Conversations",
      value: totalConversations === null
        ? "..."
        : totalConversations.toLocaleString(),
      change: -4,
      icon: Cpu,
      positive: false,
    },
    {
      label: "Avg Time To First Schedule",
      value:
        avgTimeToFirstSchedule === null
          ? "..."
          : `${avgTimeToFirstSchedule.toFixed(1)}h`,
      icon: CalendarCheck,
      positive: true,
    }
  ];

  useEffect(() => {
    getAvgTimeToFirstSchedule()
      .then((data) =>
        setAvgTimeToFirstSchedule(
          data.avgHours
        )
      )
      .catch(console.error);
  }, []);

  useEffect(() => {
    getScheduleTrend()
      .then((data) => {
        setGrowthData(
          data.map(
            (item: any) => item.count
          )
        );
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    getRecentActivities()
      .then(setActivities)
      .catch(console.error);
  }, []);

  const getActivityMeta = (type: string) => {
    switch (type) {
      case "USER_REGISTER":
        return {
          icon: UserPlus,
          color: "text-blue-500 bg-blue-50",
        };

      case "SCHEDULE_CREATED":
        return {
          icon: CalendarCheck,
          color: "text-green-500 bg-green-50",
        };

      case "CHATBOT_QUERY":
        return {
          icon: Cpu,
          color: "text-purple-500 bg-purple-50",
        };

      default:
        return {
          icon: AlertTriangle,
          color: "text-slate-500 bg-slate-50",
        };
    }
  };

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

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Real-time operational overview and performance metrics.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, change, icon: Icon, positive }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                <Icon size={17} className="text-slate-600" />
              </div>
              {/* <span className={`flex items-center gap-1 text-xs font-semibold ${positive ? "text-emerald-600" : "text-red-500"}`}>
                {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(change)}%
              </span> */}
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
              <h2 className="text-sm font-bold text-slate-800">
                Schedules Created
              </h2>

              <p className="text-xs text-slate-400">
                Number of schedules created during the last 30 days
              </p>
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
            <span className="text-[10px] text-slate-400">
              30 days ago
            </span>

            <span className="text-[10px] text-slate-400">
              Today
            </span>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Recent Activity</h2>
          <div className="space-y-3 flex-1">
            {displayedActivities.map((activity) => {
              const {
                icon: Icon,
                color,
              } = getActivityMeta(activity.type);

              return (
                <div
                  key={`${activity.type}-${activity.createdAt}`}
                  className="flex items-start gap-3"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${color}`}
                  >
                    <Icon size={13} />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-700">
                      {activity.message}
                    </p>

                    <p className="text-[10px] text-slate-400">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() =>
              setShowAllActivities((prev) => !prev)
            }
            className="mt-4 w-full py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors tracking-wide uppercase"
          >
            {showAllActivities
              ? "Show Less"
              : "View All Logs"}
          </button>
        </div>
      </div>
    </div>
  );
}