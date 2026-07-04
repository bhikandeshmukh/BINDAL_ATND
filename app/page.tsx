"use client";

import { useState, useEffect } from "react";
import AttendanceForm from "@/components/AttendanceForm";
import AttendanceTable from "@/components/AttendanceTable";
import EmployeeManagement from "@/components/EmployeeManagement";
import LeaveManagement from "@/components/LeaveManagement";
import NightDutyManagement from "@/components/NightDutyManagement";
import NightDutyRequestSection from "@/components/NightDutyRequestSection";
import LoginForm from "@/components/LoginForm";
import UserReportsView from "@/components/UserReportsView";
import AdminReportsView from "@/components/AdminReportsView";
import { AttendanceRecord } from "@/lib/types";
import UserNightDutyView from "@/components/UserNightDutyView";
import InstallPWA from "@/components/InstallPWA";
import NotificationBell from "@/components/NotificationBell";
import NotificationManagement from "@/components/NotificationManagement";
import UserNotifications from "@/components/UserNotifications";
import AdminNotificationHistory from "@/components/AdminNotificationHistory";
import BulkImport from "@/components/BulkImport";
import LocationTracker from "@/components/LocationTracker";

export interface AuthUser {
  id: string;
  username: string;
  role: "admin" | "user";
  name: string;
}

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"attendance" | "employees" | "reports" | "leaves" | "nightduty" | "notifications" | "import">("attendance");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await fetch("/api/attendance");
      const data = await response.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching records:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      const data = await response.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecords();
      fetchEmployees();
    }
  }, [user]);

  const handleLogin = (loggedInUser: AuthUser) => {
    setUser(loggedInUser);
    localStorage.setItem("user", JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const handleRecordAdded = () => {
    fetchRecords();
  };

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - Hidden by default, toggle on click */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-64 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'} fixed inset-y-0 left-0 z-50 bg-slate-700 text-white transition-all duration-300 ease-in-out flex flex-col shadow-xl`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              AT
            </div>
            <h2 className={`font-bold text-lg ${sidebarCollapsed ? 'lg:hidden' : ''}`}>Attendance</h2>
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 hover:bg-slate-600 rounded hidden lg:block"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
            </svg>
          </button>
        </div>

        {/* User Info */}
        <div className={`p-4 border-b border-slate-600 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
          <div className="text-xs text-slate-300">Welcome</div>
          <div className="font-semibold truncate">{user.name}</div>
          <div className="text-xs text-slate-400">{user.role === "admin" ? "Administrator" : "User"}</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <button
            onClick={() => {
              setActiveTab("attendance");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-600 transition-colors ${activeTab === "attendance" ? "bg-slate-600 border-l-4 border-blue-500" : ""}`}
            title="Attendance"
          >
            <span className="text-xl">📋</span>
            <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>Attendance</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("nightduty");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-600 transition-colors ${activeTab === "nightduty" ? "bg-slate-600 border-l-4 border-blue-500" : ""}`}
            title="Night Duty"
          >
            <span className="text-xl">🌙</span>
            <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>Night Duty</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("leaves");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-600 transition-colors ${activeTab === "leaves" ? "bg-slate-600 border-l-4 border-blue-500" : ""}`}
            title="Leaves"
          >
            <span className="text-xl">🏖️</span>
            <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>Leaves</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("reports");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-600 transition-colors ${activeTab === "reports" ? "bg-slate-600 border-l-4 border-blue-500" : ""}`}
            title="Reports"
          >
            <span className="text-xl">📊</span>
            <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>{isAdmin ? "Reports" : "My Reports"}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("notifications");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-600 transition-colors ${activeTab === "notifications" ? "bg-slate-600 border-l-4 border-blue-500" : ""}`}
            title="Notifications"
          >
            <span className="text-xl">🔔</span>
            <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>Notifications</span>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => {
                  setActiveTab("employees");
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-600 transition-colors ${activeTab === "employees" ? "bg-slate-600 border-l-4 border-blue-500" : ""}`}
                title="Employees"
              >
                <span className="text-xl">👥</span>
                <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>Employees</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("import");
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-600 transition-colors ${activeTab === "import" ? "bg-slate-600 border-l-4 border-blue-500" : ""}`}
                title="Import Data"
              >
                <span className="text-xl">📥</span>
                <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>Import Data</span>
              </button>
            </>
          )}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-600">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            title="Logout"
          >
            <span className="text-xl">🚪</span>
            <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay - Shows when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between p-3 sm:p-4">
            {/* Hamburger Menu - Same for Mobile & Desktop */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex-1 text-center">
              Bindal Punching
            </h1>
            <NotificationBell userId={user.id} userName={user.name} />
          </div>
        </header>

        {/* Content Area */}
        <div className="p-3 sm:p-4 md:p-6">



          {activeTab === "attendance" ? (
            <>
              <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-4">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-3">
                  {isAdmin ? "Add Attendance" : "Mark Your Attendance"}
                </h2>
                <AttendanceForm onRecordAdded={handleRecordAdded} userRole={user.role} userName={user.name} />
              </div>

              <NightDutyRequestSection userRole={user.role} userName={user.name} />

              <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-3">
                  {isAdmin ? "Monthly Attendance Records" : "My Monthly Attendance Records"}
                </h2>
                {loading ? (
                  <p className="text-gray-600 text-sm">Loading...</p>
                ) : (
                  <AttendanceTable records={records} employees={employees} />
                )}
              </div>
            </>
          ) : activeTab === "leaves" ? (
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
              <LeaveManagement userRole={user.role} userName={user.name} adminName={user.role === "admin" ? user.name : undefined} />
            </div>
          ) : activeTab === "nightduty" ? (
            isAdmin ? (
              <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
                <NightDutyManagement adminName={user.name} />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-3">
                  🌙 My Night Duty Requests
                </h2>
                <NightDutyRequestSection userRole={user.role} userName={user.name} />

                {/* Show user's own requests */}
                <div className="mt-4">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-2">My Requests History</h3>
                  <UserNightDutyView userName={user.name} />
                </div>
              </div>
            )
          ) : activeTab === "reports" ? (
            isAdmin ? <AdminReportsView /> : <UserReportsView userName={user.name} />
          ) : activeTab === "notifications" ? (
            <div className="space-y-4">
              {isAdmin ? (
                <>
                  <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
                    <NotificationManagement />
                  </div>
                  <AdminNotificationHistory />
                </>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
                  <UserNotifications userId={user.id} userName={user.name} />
                </div>
              )}
            </div>
          ) : activeTab === "import" ? (
            isAdmin && <BulkImport />
          ) : (
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
              <EmployeeManagement />
            </div>
          )}

          {/* Footer */}
          <footer className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500">
              © 2025-26 Bhikan Deshmukh. All rights reserved.
            </p>
          </footer>
        </div>
      </main>
      <InstallPWA />
    </div>
  );
}
