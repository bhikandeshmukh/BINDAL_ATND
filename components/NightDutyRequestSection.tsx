"use client";

import { useState, useEffect } from "react";

interface NightDutyRequestSectionProps {
    userRole: "admin" | "user";
    userName?: string;
}

export default function NightDutyRequestSection({ userRole, userName }: NightDutyRequestSectionProps) {
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        // Set default date to today
        const today = new Date().toISOString().split("T")[0];
        setSelectedDate(today);

        if (userRole === "admin") {
            fetchEmployees();
        } else if (userRole === "user" && userName) {
            setSelectedEmployee(userName);
        }
    }, [userRole, userName]);

    const fetchEmployees = async () => {
        try {
            const response = await fetch("/api/employees");
            const data = await response.json();
            setEmployees(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    };

    const handleNightDutyRequest = async () => {
        const empName = userRole === "admin" ? selectedEmployee : userName;

        if (!empName) {
            alert("❌ Please select an employee first!");
            return;
        }

        if (!selectedDate) {
            alert("❌ Please select a date!");
            return;
        }

        if (!reason.trim()) {
            alert("❌ Please provide a reason for night duty!");
            return;
        }

        const confirmed = confirm(
            "🌙 Night Duty Request\n\n" +
            `Employee: ${empName}\n` +
            `Date: ${selectedDate}\n` +
            `Reason: ${reason}\n\n` +
            "Night duty hours: 9:00 PM - 7:00 AM (10 hours)\n" +
            (userRole === "user" ? "Admin approval is required.\n\n" : "\n") +
            "Do you want to proceed?"
        );

        if (!confirmed) return;

        setSubmitting(true);
        setMessage("");

        try {
            const response = await fetch("/api/night-duty", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeName: empName,
                    date: selectedDate,
                    reason: reason.trim(),
                    requestedBy: userName || empName,
                }),
            });

            if (response.ok) {
                alert("✅ Night duty request submitted successfully!\n\n" + 
                      (userRole === "user" ? "Waiting for admin approval." : "Request created."));
                setMessage("✅ Night duty request submitted!");
                setReason("");
                // Reset date to today
                const today = new Date().toISOString().split("T")[0];
                setSelectedDate(today);
            } else {
                const errorData = await response.json();
                alert(`❌ Error: ${errorData.error || "Failed to submit night duty request"}`);
                setMessage("❌ Failed to submit request");
            }
        } catch (error) {
            alert("❌ Network Error!\n\nFailed to submit request. Please try again.");
            setMessage("❌ Network error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-4">
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-2 border-indigo-300 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">🌙</span>
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-indigo-900">Night Duty Request</h3>
                        <p className="text-xs text-indigo-600">Request for any date - advance booking allowed</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {userRole === "admin" && (
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-indigo-900 mb-1">
                                Select Employee *
                            </label>
                            <select
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                className="w-full px-3 py-2 text-sm border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                required
                            >
                                <option value="">Select Employee</option>
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.name}>
                                        {emp.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-indigo-900 mb-1">
                            Night Duty Date *
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            required
                        />
                        <p className="text-xs text-indigo-600 mt-1">
                            ℹ️ You can select today or any future date
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-indigo-900 mb-1">
                            Reason for Night Duty *
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Enter reason for night duty request..."
                            rows={3}
                            className="w-full px-3 py-2 text-sm border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                            required
                        />
                    </div>

                    <div className="bg-indigo-100 rounded-lg p-3 border border-indigo-200">
                        <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div className="text-xs text-indigo-800">
                                <p className="font-semibold mb-1">Night Duty Details:</p>
                                <ul className="space-y-0.5">
                                    <li>⏰ Shift: 9:00 PM - 7:00 AM (10 hours)</li>
                                    <li>📅 Can request for any date (today or future)</li>
                                    {userRole === "user" && <li>✅ Requires admin approval</li>}
                                    {userRole === "admin" && <li>✅ Auto-approved for admin requests</li>}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleNightDutyRequest}
                        disabled={submitting || !selectedEmployee || !selectedDate || !reason.trim()}
                        className="w-full px-6 py-3 text-sm font-bold bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:transform-none"
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Submitting Request...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Submit Night Duty Request
                            </span>
                        )}
                    </button>
                </div>

                {message && (
                    <div className={`mt-3 p-3 rounded-lg text-sm text-center font-semibold ${
                        message.includes("✅") 
                            ? "bg-green-100 text-green-800 border-2 border-green-300" 
                            : "bg-red-100 text-red-800 border-2 border-red-300"
                    }`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}
