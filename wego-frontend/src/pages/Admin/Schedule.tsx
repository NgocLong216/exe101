import { ChevronLeft, ChevronRight, Plus, Clock, User, Video } from "lucide-react";
import { useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const appointments = [
  { id: 1, title: "AI Model Review", time: "9:00 AM", duration: "1h", user: "Sophia Turner", type: "video", day: 3, color: "bg-blue-500" },
  { id: 2, title: "System Health Check", time: "11:30 AM", duration: "30m", user: "Marcus Chen", type: "call", day: 3, color: "bg-emerald-500" },
  { id: 3, title: "Chatbot Optimization", time: "2:00 PM", duration: "2h", user: "Aisha Patel", type: "video", day: 5, color: "bg-violet-500" },
  { id: 4, title: "User Onboarding", time: "10:00 AM", duration: "45m", user: "Liam O'Brien", type: "call", day: 8, color: "bg-amber-500" },
  { id: 5, title: "Q2 Performance Review", time: "3:30 PM", duration: "1.5h", user: "Carlos Mendez", type: "video", day: 12, color: "bg-rose-500" },
  { id: 6, title: "Token Budget Planning", time: "9:30 AM", duration: "1h", user: "Yuna Nakamura", type: "call", day: 15, color: "bg-cyan-500" },
];

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 5, 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const dayAppointments = selectedDay ? appointments.filter((a) => a.day === selectedDay) : appointments.slice(0, 3);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Schedule</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage appointments and time blocks.</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors shadow-sm">
          <Plus size={15} />
          New Appointment
        </button>
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
              const hasAppt = appointments.some((a) => a.day === day);
              const isSelected = selectedDay === day;
              const isToday = day === 15;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all ${
                    isSelected
                      ? "bg-slate-800 text-white"
                      : isToday
                      ? "bg-slate-100 text-slate-800 font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {day}
                  {hasAppt && (
                    <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-slate-400"}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Appointment list */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
          <h2 className="text-sm font-bold text-slate-800 mb-4">
            {selectedDay ? `Day ${selectedDay} — Appointments` : "Upcoming Appointments"}
          </h2>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {dayAppointments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No appointments this day</p>
            ) : (
              dayAppointments.map((appt) => (
                <div key={appt.id} className="flex gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                  <div className={`w-1 rounded-full ${appt.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{appt.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock size={10} /> {appt.time} · {appt.duration}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        <User size={10} /> {appt.user}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Video size={10} /> {appt.type}
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