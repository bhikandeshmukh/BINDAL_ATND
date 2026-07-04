"use client";

import { useMemo } from "react";
import { AttendanceRecord } from "@/lib/types";
import { calculateRecordEarning, getAttendanceDayValue } from "@/lib/salary";

interface AttendanceTableProps {
  records: AttendanceRecord[];
  employees?: any[];
}

export default function AttendanceTable({ records, employees = [] }: AttendanceTableProps) {
  const employeeMap = useMemo(() => {
    const map = new Map<string, any>();
    if (Array.isArray(employees)) {
      employees.forEach(emp => {
        if (emp?.name) map.set(emp.name, emp);
      });
    }
    return map;
  }, [employees]);

  if (!Array.isArray(records) || records.length === 0) {
    return <p className="text-gray-600">No attendance records for this month.</p>;
  }

  const getEarningAndStatus = (record: AttendanceRecord) => {
    const employee = employeeMap.get(record.employeeName);
    if (!employee || !record.inTime || !record.date) {
      return { earning: 0, status: "absent" as const };
    }

    const dayValue = getAttendanceDayValue(record, employee);
    const earning = calculateRecordEarning(record, employee);

    return { earning, status: dayValue.status };
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Employee Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              In Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Out Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              In Location
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Out Location
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Minutes
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Hours
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Day Pay
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {records.map((record, index) => {
            const { earning, status } = getEarningAndStatus(record);
            return (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.employeeName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.inTime}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.outTime || "Not checked out"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono text-xs break-all">
                  {record.inLocation || "Not captured"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono text-xs break-all">
                  {record.outLocation || "Not captured"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.totalMinutes || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.totalHours || "0h 0m"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                  {!record.outTime ? (
                    <span className="text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded-full text-xs">Active</span>
                  ) : status === "absent" ? (
                    <span className="text-red-600 font-bold bg-red-50 px-2.5 py-1 rounded-full text-xs">Absent (₹0)</span>
                  ) : status === "half" ? (
                    <span className="text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-full text-xs">Half Day (₹{earning})</span>
                  ) : earning > 0 ? (
                    <span className="text-green-700 font-bold bg-green-50 px-2.5 py-1 rounded-full text-xs">₹{earning}</span>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
