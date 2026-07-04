"use client";

import { useState, useEffect } from "react";

interface LeaveManagementProps {
    userRole: "admin" | "user";
    userName?: string;
    adminName?: string;
}

interface LeaveRecord {
    id: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: "pending" | "approved" | "rejected";
    appliedDate: string;
    paymentStatus?: string;
    approvedBy?: string;
    approvedDate?: string;
    approvedTime?: string;
}

const festiveHolidays = [
    { name: "New Year's Day", date: "2026-01-01", day: "Thursday", status: "Paid" },
    { name: "Republic Day", date: "2026-01-26", day: "Monday", status: "Paid" },
    { name: "Maha Shivratri", date: "2026-02-15", day: "Sunday", status: "Paid" },
    { name: "Holi", date: "2026-03-04", day: "Wednesday", status: "Paid" },
    { name: "Eid al-Fitr", date: "2026-03-20", day: "Friday", status: "Paid" },
    { name: "Good Friday", date: "2026-04-03", day: "Friday", status: "Paid" },
    { name: "Independence Day", date: "2026-08-15", day: "Saturday", status: "Paid" },
    { name: "Raksha Bandhan", date: "2026-08-28", day: "Friday", status: "Paid" },
    { name: "Gandhi Jayanti", date: "2026-10-02", day: "Friday", status: "Paid" },
    { name: "Dussehra", date: "2026-10-20", day: "Tuesday", status: "Paid" },
    { name: "Diwali (Deepavali)", date: "2026-11-08", day: "Sunday", status: "Paid" },
    { name: "Christmas Day", date: "2026-12-25", day: "Friday", status: "Paid" },
];

export default function LeaveManagement({ userRole, userName, adminName }: LeaveManagementProps) {
    const [employees, setEmployees] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
    const [dbHolidays, setDbHolidays] = useState<any[]>([]);
    const [newHolidayName, setNewHolidayName] = useState("");
    const [newHolidayDate, setNewHolidayDate] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        employeeName: userName || "",
        leaveType: "sick",
        startDate: "",
        endDate: "",
        reason: "",
    });

    useEffect(() => {
        fetchEmployees();
        fetchLeaves();
        fetchDbHolidays();
    }, []);

    const fetchDbHolidays = async () => {
        try {
            const response = await fetch("/api/holidays");
            const data = await response.json();
            setDbHolidays(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching db holidays:", error);
        }
    };

    const handleAddHoliday = async () => {
        if (!newHolidayName || !newHolidayDate) return;
        try {
            const response = await fetch("/api/holidays", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newHolidayName, date: newHolidayDate }),
            });
            if (response.ok) {
                setNewHolidayName("");
                setNewHolidayDate("");
                fetchDbHolidays();
                alert("✅ Holiday added successfully!");
            } else {
                alert("❌ Failed to add holiday");
            }
        } catch (error) {
            console.error("Error adding holiday:", error);
            alert("❌ Error adding holiday");
        }
    };

    const handleDeleteHoliday = async (id: string) => {
        if (!confirm("Are you sure you want to delete this holiday?")) return;
        try {
            const response = await fetch(`/api/holidays/${id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                fetchDbHolidays();
                alert("🗑️ Holiday deleted successfully!");
            } else {
                alert("❌ Failed to delete holiday");
            }
        } catch (error) {
            console.error("Error deleting holiday:", error);
            alert("❌ Error deleting holiday");
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await fetch("/api/employees");
            const data = await response.json();
            setEmployees(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    };

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/leaves");
            const data = await response.json();
            const allLeaves = Array.isArray(data) ? data : [];

            // Filter for users to show only their leaves
            if (userRole === "user" && userName) {
                setLeaves(allLeaves.filter((leave: LeaveRecord) => leave.employeeName === userName));
            } else {
                setLeaves(allLeaves);
            }
        } catch (error) {
            console.error("Error fetching leaves:", error);
            setLeaves([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch("/api/leaves", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                alert("✅ Leave application submitted successfully!");
                setFormData({
                    employeeName: userName || "",
                    leaveType: "sick",
                    startDate: "",
                    endDate: "",
                    reason: "",
                });
                setShowForm(false);
                fetchLeaves();
            } else {
                alert("❌ Failed to submit leave application");
            }
        } catch (error) {
            alert("❌ Error submitting leave application");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, status: "approved" | "rejected", paymentStatus?: string) => {
        if (processingId) return; // Prevent duplicate clicks
        
        setProcessingId(id);
        try {
            const response = await fetch("/api/leaves/status", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    id, 
                    status, 
                    paymentStatus,
                    approvedBy: adminName ? `Admin: ${adminName}` : undefined
                }),
            });

            if (response.ok) {
                alert(`✅ Leave ${status} successfully!`);
                fetchLeaves();
            } else {
                alert("❌ Failed to update leave status");
            }
        } catch (error) {
            alert("❌ Error updating leave status");
        } finally {
            setProcessingId(null);
        }
    };

    const handleApproveWithPayment = (id: string, leaveType: string) => {
        if (processingId) return; // Prevent duplicate clicks
        
        // Sick and Casual leaves are unpaid by default
        const defaultPaymentStatus = (leaveType === "sick" || leaveType === "casual") ? "unpaid" : "paid";

        const paymentStatus = prompt(
            `Select payment status for this leave:\n\nType "paid" or "unpaid"\n\nDefault for ${leaveType} leave: ${defaultPaymentStatus}`,
            defaultPaymentStatus
        );

        if (paymentStatus && (paymentStatus === "paid" || paymentStatus === "unpaid")) {
            handleStatusUpdate(id, "approved", paymentStatus);
        } else if (paymentStatus !== null) {
            alert("❌ Invalid input! Please enter 'paid' or 'unpaid'");
        }
    };

    const getStatusColor = (status: string) => {
        const lowerStatus = status.toLowerCase();
        switch (lowerStatus) {
            case "approved":
                return "bg-green-100 text-green-800";
            case "rejected":
                return "bg-red-100 text-red-800";
            default:
                return "bg-yellow-100 text-yellow-800";
        }
    };

    const calculateDays = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    const getWorkingLeaveDays = (leave: LeaveRecord) => {
        const days: string[] = [];
        const current = new Date(`${leave.startDate}T00:00:00`);
        const end = new Date(`${leave.endDate}T00:00:00`);

        while (current <= end) {
            if (current.getDay() !== 0) {
                days.push(current.toISOString().split("T")[0]);
            }
            current.setDate(current.getDate() + 1);
        }

        return days;
    };

    const approvedLeaves = leaves.filter((leave) => leave.status === "approved");
    const paidLeaveDates = new Set(
        approvedLeaves
            .filter((leave) => (leave.paymentStatus || (leave.leaveType === "unpaid" ? "unpaid" : "paid")) === "paid")
            .flatMap(getWorkingLeaveDays)
    );
    const unpaidLeaveDates = new Set(
        approvedLeaves
            .filter((leave) => (leave.paymentStatus || (leave.leaveType === "unpaid" ? "unpaid" : "paid")) === "unpaid")
            .flatMap(getWorkingLeaveDays)
    );

    const currentYear = new Date().getFullYear();
    const userApprovedLeavesThisYear = leaves.filter(leave => {
        if (leave.status !== "approved") return false;
        if (userRole === "user" && leave.employeeName !== userName) return false;
        try {
            const year = new Date(leave.startDate).getFullYear();
            return year === currentYear;
        } catch(e) {
            return false;
        }
    });

    const calculateTotalDaysForLeaves = (filteredLeaves: LeaveRecord[]) => {
        return filteredLeaves.reduce((sum, leave) => {
            return sum + calculateDays(leave.startDate, leave.endDate);
        }, 0);
    };

    const sickUsed = calculateTotalDaysForLeaves(userApprovedLeavesThisYear.filter(l => l.leaveType === "sick"));
    const casualUsed = calculateTotalDaysForLeaves(userApprovedLeavesThisYear.filter(l => l.leaveType === "casual"));
    const earnedUsed = calculateTotalDaysForLeaves(userApprovedLeavesThisYear.filter(l => l.leaveType === "earned"));
    const calendarMonth = new Date();
    const calendarYear = calendarMonth.getFullYear();
    const calendarMonthIndex = calendarMonth.getMonth();
    const calendarDays = Array.from(
        { length: new Date(calendarYear, calendarMonthIndex + 1, 0).getDate() },
        (_, index) => {
            const date = new Date(calendarYear, calendarMonthIndex, index + 1);
            const key = date.toISOString().split("T")[0];
            return {
                key,
                day: index + 1,
                isSunday: date.getDay() === 0,
                isPaid: paidLeaveDates.has(key),
                isUnpaid: unpaidLeaveDates.has(key),
            };
        }
    );

    return (
        <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">
                    🏖️ Leave Management
                </h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    {showForm ? "Cancel" : "+ Apply Leave"}
                </button>
            </div>

            {/* Leave Summary & Festive Holidays Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Leave Balances Card */}
                <div className="bg-white rounded-xl shadow-md p-4 border border-slate-100">
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                        📊 Leave Balances ({currentYear})
                    </h3>
                    <div className="space-y-3.5">
                        {/* Casual Leave */}
                        <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-slate-600">Casual Leave (CL)</span>
                                <span className="text-slate-800">{casualUsed} / 12 Days Used</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                    className="bg-blue-500 h-full transition-all duration-500" 
                                    style={{ width: `${Math.min(100, (casualUsed / 12) * 100)}%` }}
                                ></div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">Remaining: {Math.max(0, 12 - casualUsed)} Days</span>
                        </div>

                        {/* Sick Leave */}
                        <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-slate-600">Sick Leave (SL)</span>
                                <span className="text-slate-800">{sickUsed} / 10 Days Used</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                    className="bg-emerald-500 h-full transition-all duration-500" 
                                    style={{ width: `${Math.min(100, (sickUsed / 10) * 100)}%` }}
                                ></div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">Remaining: {Math.max(0, 10 - sickUsed)} Days</span>
                        </div>

                        {/* Earned Leave */}
                        <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-slate-600">Earned Leave (EL)</span>
                                <span className="text-slate-800">{earnedUsed} / 15 Days Used</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                    className="bg-violet-500 h-full transition-all duration-500" 
                                    style={{ width: `${Math.min(100, (earnedUsed / 15) * 100)}%` }}
                                ></div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">Remaining: {Math.max(0, 15 - earnedUsed)} Days</span>
                        </div>
                    </div>
                </div>

                {/* Festive Holidays Card */}
                <div className="bg-white rounded-xl shadow-md p-4 border border-slate-100 flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                            🎉 Company Festive Holidays ({currentYear})
                        </h3>
                        <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                            {[
                                ...dbHolidays,
                                ...festiveHolidays.filter(fh => !dbHolidays.some(dh => dh.date === fh.date))
                            ].sort((a, b) => a.date.localeCompare(b.date)).map((holiday, index) => {
                                const [y, m, d] = holiday.date.split("-").map(Number);
                                const holidayDate = new Date(y, m - 1, d);
                                const today = new Date();
                                today.setHours(0,0,0,0);
                                const isPast = holidayDate < today;
                                const dayName = holiday.day || holidayDate.toLocaleDateString("en-US", { weekday: "long" });
                                
                                return (
                                    <div 
                                        key={holiday.id || `static-${index}`} 
                                        className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                                            isPast 
                                                ? 'bg-slate-50/50 border-slate-100 text-slate-400 line-through' 
                                                : 'bg-gradient-to-r from-blue-50/20 to-indigo-50/10 border-blue-100 text-slate-700 hover:border-blue-200'
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0 pr-2">
                                            <p className="font-extrabold truncate">{holiday.name}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{holiday.date} • {dayName}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                                isPast ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {holiday.status || "Paid"}
                                            </span>
                                            {userRole === "admin" && holiday.id && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteHoliday(holiday.id)}
                                                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete Holiday"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {userRole === "admin" && (
                        <div className="mt-4 pt-3 border-t border-slate-100">
                            <p className="text-[11px] font-bold text-slate-600 mb-1.5">📢 Add Festive Holiday</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Name (e.g. Diwali)"
                                    value={newHolidayName}
                                    onChange={(e) => setNewHolidayName(e.target.value)}
                                    className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <input
                                    type="date"
                                    value={newHolidayDate}
                                    onChange={(e) => setNewHolidayDate(e.target.value)}
                                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddHoliday}
                                    disabled={!newHolidayName || !newHolidayDate}
                                    className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-900 text-white rounded font-bold disabled:bg-gray-200 disabled:text-gray-400"
                                >
                                    + Add
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {userRole === "admin" && (
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    Employee Name *
                                </label>
                                <select
                                    required
                                    value={formData.employeeName}
                                    onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                Leave Type *
                            </label>
                            <select
                                required
                                value={formData.leaveType}
                                onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                                className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="sick">Sick Leave</option>
                                <option value="casual">Casual Leave</option>
                                <option value="earned">Earned Leave</option>
                                <option value="unpaid">Unpaid Leave</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                Start Date *
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                End Date *
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                Reason *
                            </label>
                            <textarea
                                required
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Please provide reason for leave..."
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 sm:px-6 py-2 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    >
                        {loading ? "Submitting..." : "Submit Leave Application"}
                    </button>
                </form>
            )}

            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                        Paid / Unpaid Leave Calendar
                    </h3>
                    <div className="flex gap-2 text-[10px] sm:text-xs">
                        <span className="px-2 py-1 rounded bg-green-100 text-green-800">Paid</span>
                        <span className="px-2 py-1 rounded bg-red-100 text-red-800">Unpaid</span>
                        <span className="px-2 py-1 rounded bg-gray-100 text-gray-600">Sunday</span>
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                        <div key={day} className="font-semibold text-gray-500 py-1">{day}</div>
                    ))}
                    {Array.from({ length: (new Date(calendarYear, calendarMonthIndex, 1).getDay() + 6) % 7 }).map((_, index) => (
                        <div key={`blank-${index}`} />
                    ))}
                    {calendarDays.map((day) => (
                        <div
                            key={day.key}
                            className={`min-h-10 rounded border p-1 flex flex-col items-center justify-center ${
                                day.isPaid
                                    ? "bg-green-100 border-green-300 text-green-900"
                                    : day.isUnpaid
                                        ? "bg-red-100 border-red-300 text-red-900"
                                        : day.isSunday
                                            ? "bg-gray-100 border-gray-200 text-gray-400"
                                            : "bg-white border-gray-200 text-gray-700"
                            }`}
                        >
                            <span className="font-semibold">{day.day}</span>
                            {day.isPaid && <span className="text-[9px]">paid</span>}
                            {day.isUnpaid && <span className="text-[9px]">cut</span>}
                        </div>
                    ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded bg-green-50 border border-green-200 p-2 text-green-800">
                        Paid leave working days: <b>{paidLeaveDates.size}</b>
                    </div>
                    <div className="rounded bg-red-50 border border-red-200 p-2 text-red-800">
                        Unpaid leave salary-cut days: <b>{unpaidLeaveDates.size}</b>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-3">
                    {userRole === "admin" ? "All Leave Applications" : "My Leave Applications"}
                </h3>

                {loading ? (
                    <div className="animate-pulse">
                        {/* Table Header Skeleton */}
                        <div className="bg-gray-100 rounded-t-lg p-3 mb-2">
                            <div className="grid grid-cols-8 gap-2">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="h-3 bg-gray-300 rounded"></div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Table Rows Skeleton */}
                        {[...Array(5)].map((_, rowIndex) => (
                            <div key={rowIndex} className="bg-white border-b p-3">
                                <div className="grid grid-cols-8 gap-2">
                                    {[...Array(8)].map((_, colIndex) => (
                                        <div key={colIndex} className="h-3 bg-gray-200 rounded"></div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        
                        <div className="text-center py-4">
                            <p className="text-gray-500 text-sm animate-pulse">Loading leave requests...</p>
                        </div>
                    </div>
                ) : leaves.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                                        Employee
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                                        Type
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                                        Start Date
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                                        End Date
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                                        Days
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                                        Reason
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                                        Status
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                                        Approved By
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                                        Approved Date
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                                        Approved Time
                                    </th>
                                    {userRole === "admin" && (
                                        <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                                            Action
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {leaves.map((leave) => (
                                    <tr key={leave.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                            {leave.employeeName}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-900 capitalize">
                                            {leave.leaveType}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                            {leave.startDate}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                            {leave.endDate}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                            {calculateDays(leave.startDate, leave.endDate)}
                                        </td>
                                        <td className="px-3 py-2 text-xs sm:text-sm text-gray-900 max-w-xs truncate">
                                            {leave.reason}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm">
                                            <span
                                                className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${getStatusColor(
                                                    leave.status
                                                )}`}
                                            >
                                                {leave.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                                            {leave.approvedBy || "-"}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                                            {leave.approvedDate || "-"}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                                            {leave.approvedTime || "-"}
                                        </td>
                                        {userRole === "admin" && (
                                            <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm">
                                                {leave.status === "pending" && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleApproveWithPayment(leave.id, leave.leaveType)}
                                                            disabled={processingId === leave.id}
                                                            className="text-green-600 hover:text-green-800 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {processingId === leave.id ? "⏳" : "✓"} Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(leave.id, "rejected")}
                                                            disabled={processingId === leave.id}
                                                            className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {processingId === leave.id ? "⏳" : "✗"} Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="text-4xl sm:text-6xl mb-4">📭</div>
                        <p className="text-gray-600 text-sm sm:text-base">No leave applications found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
