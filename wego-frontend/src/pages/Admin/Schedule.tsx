import { ChevronLeft, ChevronRight, Plus, Clock, User, Video } from "lucide-react";
import { useState, useEffect } from "react";
import { getAllSchedules } from "../../services/adminService";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type ScheduleHistory = {
  id: string;
  groupId: string;
  groupTitle: string;
  hostFirebaseUid: string;
  hostName: string;
  meetingTime: string;
  createdAt: string;
};

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const [schedules, setSchedules] = useState<ScheduleHistory[]>([]);
  const schedulesInMonth = schedules.map((s) => ({
    ...s,
    date: new Date(s.meetingTime),
  }));

  const COLORS = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
  ];

  const getColorByHost = (hostName: string) => {
    const sum = hostName
      .split("")
      .reduce((a, c) => a + c.charCodeAt(0), 0);

    return COLORS[sum % COLORS.length];
  };

  const daySchedules =
    selectedDay !== null
      ? schedulesInMonth.filter(
        (s) =>
          s.date.getDate() === selectedDay &&
          s.date.getMonth() === month &&
          s.date.getFullYear() === year
      )
      : schedulesInMonth.slice(0, 10);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const data = await getAllSchedules();
        setSchedules(
          data.sort(
            (a, b) =>
              new Date(b.meetingTime).getTime() -
              new Date(a.meetingTime).getTime()
          )
        );
      } catch (error) {
        console.error(error);
      }
    };

    fetchSchedules();
  }, []);



  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Schedule</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage schedules and time blocks.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-800">{MONTHS[month]} {year}</h2>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
                <ChevronLeft size={15} />
              </button>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wide py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const hasSche = schedulesInMonth.some(
                (s) =>
                  s.date.getDate() === day &&
                  s.date.getMonth() === month &&
                  s.date.getFullYear() === year
              );
              const isSelected = selectedDay === day;
              const isToday = day === 15;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all ${isSelected
                    ? "bg-slate-800 text-white"
                    : isToday
                      ? "bg-slate-100 text-slate-800 font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  {day}
                  {hasSche && (
                    <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-slate-400"}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule list */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
          <h2 className="text-sm font-bold text-slate-800 mb-4">
            {selectedDay ? `Day ${selectedDay} — Schedules` : "Upcoming Schedules"}
          </h2>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {daySchedules.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No schedules this day</p>
            ) : (
              daySchedules.map((sche) => (
                <div key={sche.id} className="flex gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                  <div
                    className={`w-1 rounded-full ${getColorByHost(
                      sche.hostName
                    )} shrink-0`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{sche.groupTitle}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock size={10} />
                        {new Date(sche.meetingTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        <User size={10} /> {sche.hostName}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="mt-4 w-full py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors tracking-wide uppercase">
            View All
          </button>
        </div>
      </div>
    </div>
  );
}