import { LayoutDashboard, Users, CalendarDays, Bot, HelpCircle, LogOut } from "lucide-react";
import { useState } from "react";
import { logout } from "../../services/adminService";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "#dashboard" },
  { label: "Users", icon: Users, href: "#users" },
  { label: "Schedule", icon: CalendarDays, href: "#schedule" },
  { label: "Chatbot", icon: Bot, href: "#chatbot" },
];

const bottomItems = [
  { label: "Support", icon: HelpCircle, href: "#support" },
  { label: "Logout", icon: LogOut, href: "#logout" },
];

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function Sidebar({ activeTab = "dashboard", onTabChange }: SidebarProps) {
  const [active, setActive] = useState(activeTab);

  const handleClick = (href: string) => {
    const tab = href.replace("#", "");
    setActive(tab);
    onTabChange?.(tab);
  };

  const handleLogout = async () => {
    try {
      await logout();
  
      // chuyển về login
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("Logout failed");
    }
  };

  return (
    <aside className="w-[200px] min-h-screen bg-white border-r border-slate-100 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-sm bg-white opacity-90" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wide leading-none">
              Operations
            </p>
            <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">
              Management Console
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ label, icon: Icon, href }) => {
          const isActive = active === href.replace("#", "");
          return (
            <a
              key={label}
              href={href}
              onClick={(e) => {
                e.preventDefault();
                handleClick(href);
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Icon
                size={16}
                className={`shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`}
              />
              <span>{label}</span>
            </a>
          );
        })}
      </nav>

      {/* Bottom items */}
      <div className="px-3 pb-5 space-y-0.5 border-t border-slate-100 pt-3">
        {bottomItems.map(({ label, icon: Icon, href }) => (
          <a
            key={label}
            href={href}
            onClick={async (e) => {
              e.preventDefault();
            
              if (label === "Logout") {
                await handleLogout();
              }
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-all duration-150 group"
          >
            <Icon size={16} className="shrink-0 group-hover:text-slate-600" />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </aside>
  );
}