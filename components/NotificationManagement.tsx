"use client";

import { useState, useEffect } from "react";
import { notificationService } from "@/lib/notifications/client";

interface Employee {
  id: string;
  name: string;
  position: string;
  status: string;
}

interface NotificationHistory {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [sendToAll, setSendToAll] = useState(false);
  const [notificationType, setNotificationType] = useState("system_alert");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      const data = await response.json();
      setEmployees(data.filter((emp: Employee) => emp.status === "active"));
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      alert("Please fill in all fields");
      return;
    }

    if (!sendToAll && !selectedUser) {
      alert("Please select a user or choose 'Send to All'");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/notifications/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser,
          type: notificationType,
          title,
          message,
          sendToAll,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "Notification sent successfully!");
        // Reset form
        setTitle("");
        setMessage("");
        setSelectedUser("");
        setSendToAll(false);
      } else {
        alert(data.error || "Failed to send notification");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      alert("Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const notificationTypes = [
    { value: "system_alert", label: "🔔 System Alert", icon: "🔔" },
    { value: "leave_approved", label: "✅ Leave Approved", icon: "✅" },
    { value: "leave_rejected", label: "❌ Leave Rejected", icon: "❌" },
    { value: "night_duty_approved", label: "✅ Night Duty Approved", icon: "✅" },
    { value: "night_duty_rejected", label: "❌ Night Duty Rejected", icon: "❌" },
    { value: "attendance_modified", label: "📋 Attendance Modified", icon: "📋" },
    { value: "late_arrival", label: "⏰ Late Arrival", icon: "⏰" },
    { value: "password_reset", label: "🔑 Password Reset", icon: "🔑" },
  ];

  const quickMessages = [
    {
      title: "System Maintenance",
      message: "The system will be under maintenance from 10 PM to 11 PM today. Please complete your attendance before that.",
    },
    {
      title: "Holiday Announcement",
      message: "Tomorrow is a public holiday. The office will remain closed.",
    },
    {
      title: "Reminder: Submit Reports",
      message: "Please submit your monthly reports by end of this week.",
    },
    {
      title: "Meeting Reminder",
      message: "Team meeting scheduled at 3 PM today. Please be on time.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Create Notification Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          📢 Send Notification
        </h2>

        <form onSubmit={handleSendNotification} className="space-y-4">
          {/* Recipient Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send To
            </label>
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sendToAll}
                  onChange={(e) => {
                    setSendToAll(e.target.checked);
                    if (e.target.checked) setSelectedUser("");
                  }}
                  className="mr-2"
                />
                <span className="text-sm">Send to All Users</span>
              </label>
            </div>

            {!sendToAll && (
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required={!sendToAll}
              >
                <option value="">Select User</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} - {emp.position}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Notification Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notification Type
            </label>
            <select
              value={notificationType}
              onChange={(e) => setNotificationType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {notificationTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Messages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Messages (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {quickMessages.map((quick, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setTitle(quick.title);
                    setMessage(quick.message);
                  }}
                  className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-left transition-colors"
                >
                  <div className="font-medium">{quick.title}</div>
                  <div className="text-gray-600 truncate">{quick.message}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {title.length}/100 characters
            </p>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter notification message"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {message.length}/500 characters
            </p>
          </div>

          {/* Preview */}
          {(title || message) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-2">Preview:</p>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {notificationTypes.find((t) => t.value === notificationType)
                      ?.icon || "🔔"}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {title || "Notification Title"}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {message || "Notification message will appear here"}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Just now</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={sending}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {sending ? "Sending..." : sendToAll ? "Send to All Users" : "Send Notification"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTitle("");
                setMessage("");
                setSelectedUser("");
                setSendToAll(false);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
              👥
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {employees.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
              📨
            </div>
            <div>
              <p className="text-sm text-gray-600">Notification Types</p>
              <p className="text-2xl font-bold text-gray-900">
                {notificationTypes.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl">
              ⚡
            </div>
            <div>
              <p className="text-sm text-gray-600">Quick Messages</p>
              <p className="text-2xl font-bold text-gray-900">
                {quickMessages.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-yellow-900 mb-2">
          💡 Tips for Effective Notifications
        </h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Keep titles short and descriptive (max 100 characters)</li>
          <li>• Write clear and actionable messages</li>
          <li>• Use appropriate notification types for better organization</li>
          <li>• Test with a single user before sending to all</li>
          <li>• Avoid sending too many notifications to prevent notification fatigue</li>
        </ul>
      </div>
    </div>
  );
}
