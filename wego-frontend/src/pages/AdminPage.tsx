import { useState, type ReactNode } from "react";
import Sidebar from "./Admin/Sidebar";
import Navbar from "./Admin/Navbar";
import Dashboard from "./Admin/Dashboard";
import Users from "./Admin/Users";
import Schedule from "./Admin/Schedule";
import Chatbot from "./Admin/Chatbot";

type Tab = "dashboard" | "users" | "schedule" | "chatbot";

const pages: Record<Tab, ReactNode> = {
  dashboard: <Dashboard />,
  users: <Users />,
  schedule: <Schedule />,
  chatbot: <Chatbot />,
};

export default function AdminLayout() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as Tab)}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Navbar */}
        <Navbar
          userName="Alex Rivera"
          userRole="Systems Admin"
          notificationCount={3}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {pages[activeTab]}
        </main>
      </div>
    </div>
  );
}