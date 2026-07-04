"use client";

import { useState, useEffect } from "react";
import MonthlyReportSummary from "./MonthlyReportSummary";
import AttendanceTable from "./AttendanceTable";
import { AttendanceRecord } from "@/lib/types";

export default function AdminReportsView() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [employees, setEmployees] = useState<any[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    fetchEmployees();
    fetchLeaves();
  }, []);

  useEffect(() => {
    fetchMonthlyRecords();
  }, [selectedYear, selectedMonth, selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      const data = await response.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchMonthlyRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/attendance/month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: selectedYear, month: selectedMonth }),
      });

      if (response.ok) {
        const data = await response.json();
        const filteredRecords = Array.isArray(data)
          ? selectedEmployee === "all"
            ? data
            : data.filter((r: AttendanceRecord) => r.employeeName === selectedEmployee)
          : [];
        setRecords(filteredRecords);
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error("Error fetching records:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaves = async () => {
    try {
      const response = await fetch("/api/leaves");
      const data = await response.json();
      setLeaves(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching leaves:", error);
      setLeaves([]);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
        <div className="mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-2 sm:mb-3">
            📊 Attendance Reports
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            >
              <option value="all">All Employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.name}>
                  {employee.name}
                </option>
              ))}
            </select>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {/* Summary Cards Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-4">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-300 rounded w-1/2"></div>
                </div>
              ))}
            </div>

            {/* Table Skeleton */}
            <div className="animate-pulse mt-6">
              <div className="h-6 bg-gray-300 rounded w-1/4 mb-3"></div>
              <div className="bg-gray-100 rounded-t-lg p-3 mb-2">
                <div className="grid grid-cols-6 gap-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-3 bg-gray-300 rounded"></div>
                  ))}
                </div>
              </div>
              {[...Array(5)].map((_, rowIndex) => (
                <div key={rowIndex} className="bg-white border-b p-3">
                  <div className="grid grid-cols-6 gap-2">
                    {[...Array(6)].map((_, colIndex) => (
                      <div key={colIndex} className="h-3 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm animate-pulse">Loading attendance records...</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <MonthlyReportSummary
              records={records}
              employees={selectedEmployee === "all" ? employees : employees.filter((employee) => employee.name === selectedEmployee)}
              leaves={selectedEmployee === "all" ? leaves : leaves.filter((leave) => leave.employeeName === selectedEmployee)}
              year={parseInt(selectedYear)}
              month={parseInt(selectedMonth)}
            />
            {records.length > 0 ? (
              <div className="mt-3 sm:mt-4">
                <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-3">
                  Detailed Records
                  {selectedEmployee !== "all" && ` - ${selectedEmployee}`}
                </h3>
                <AttendanceTable records={records} employees={employees} />
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-600 text-lg">
                  No attendance records found for{" "}
                  {selectedEmployee === "all" ? "any employee" : selectedEmployee} in{" "}
                  {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
