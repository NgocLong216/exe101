import { Search, Bell, Settings } from "lucide-react";

interface NavbarProps {
  userName?: string;
  userRole?: string;
  avatarUrl?: string;
  notificationCount?: number;
}

export default function Navbar({
  userName = "Alex Rivera",
  userRole = "Systems Admin",
  avatarUrl,
  notificationCount = 3,
}: NavbarProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0 shadow-sm">
      {/* Brand */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-bold text-slate-800 tracking-tight">AdminPanel</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-sm mx-8">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search operations..."
            className="w-full pl-8 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-full text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <Bell size={17} className="text-slate-500" />
          {notificationCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>

        {/* Settings */}
        <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <Settings size={17} className="text-slate-500" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200" />

        {/* User info */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-800 leading-tight">{userName}</p>
            <p className="text-[10px] text-slate-400 leading-tight">{userRole}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden ring-2 ring-slate-200">
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold">
                {userName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}