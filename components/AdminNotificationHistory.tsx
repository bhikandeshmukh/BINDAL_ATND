"use client";

import { useState, useEffect } from "react";

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface Employee {
  id: string;
  name: string;
}

export default function AdminNotificationHistory() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchNotifications();
    }
  }, [selectedUserId]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      const data = await response.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      if (selectedUserId === "all") {
        // Fetch notifications for all users
        const allNotifications: Notification[] = [];
        for (const emp of employees) {
          if (emp.id) {
            const response = await fetch(`/api/notifications?userId=${emp.id}`);
            if (response.ok) {
              const data = await response.json();
              const notifications = data.notifications || [];
              // Transform to match interface
              const transformed = notifications.map((n: any) => ({
                id: n.id,
                userId: n.userId,
                type: n.type,
                title: n.title,
                message: n.message,
                isRead: n.read || n.isRead,
                createdAt: n.createdAt,
              }));
              allNotifications.push(...transformed);
            }
          }
        }
        // Sort by date
        allNotifications.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setNotifications(allNotifications);
      } else {
        const response = await fetch(`/api/notifications?userId=${selectedUserId}`);
        if (response.ok) {
          const data = await response.json();
          const notifications = data.notifications || [];
          // Transform to match interface
          const transformed = notifications.map((n: any) => ({
            id: n.id,
            userId: n.userId,
            type: n.type,
            title: n.title,
            message: n.message,
            isRead: n.read || n.isRead,
            createdAt: n.createdAt,
          }));
          setNotifications(transformed);
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "leave_request":
        return "🏖️";
      case "leave_approved":
        return "✅";
      case "leave_rejected":
        return "❌";
      case "night_duty_request":
        return "🌙";
      case "night_duty_approved":
        return "✅";
      case "night_duty_rejected":
        return "❌";
      case "attendance_modified":
        return "📋";
      case "late_arrival":
        return "⏰";
      case "password_reset":
        return "🔑";
      case "system_alert":
        return "🔔";
      default:
        return "📢";
    }
  };

  const getEmployeeName = (userId: string) => {
    const employee = employees.find(emp => emp.id === userId);
    return employee?.name || userId;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            📜 Notification History
          </h2>
          <button
            onClick={fetchNotifications}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Filter by Employee */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Employee
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm">Loading notifications...</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border ${
                  notification.isRead
                    ? "bg-gray-50 border-gray-200"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {notification.title}
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                          To: {getEmployeeName(notification.userId)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-gray-500">
                          {formatDate(notification.createdAt)}
                        </span>
                        {!notification.isRead && (
                          <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                            Unread
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mt-2">
                      {notification.message}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                        {notification.type.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600">No notifications found</p>
          </div>
        )}
      </div>
    </div>
  );
}
