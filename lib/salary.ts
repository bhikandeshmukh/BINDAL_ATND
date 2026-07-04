import { AttendanceRecord, Employee } from "./types";

export interface LeaveLike {
  employeeName: string;
  startDate: string;
  endDate: string;
  status?: string;
  paymentStatus?: string;
  leaveType?: string;
}

export interface SalarySummary {
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  payableDays: number;
  absentDays: number;
  dailyRate: number;
  grossSalary: number;
  unpaidDeduction: number;
  netSalary: number;
}

export const DEFAULT_FIXED_IN_TIME = "10:00:00 AM";
export const DEFAULT_FIXED_OUT_TIME = "07:00:00 PM";

export function normalizeEmployeeSchedule<T extends Partial<Employee>>(employee: T): T {
  return {
    ...employee,
    fixedInTime: employee.fixedInTime || DEFAULT_FIXED_IN_TIME,
    fixedOutTime: employee.fixedOutTime || DEFAULT_FIXED_OUT_TIME,
  };
}

const workingDaysCache = new Map<string, string[]>();

export function getWorkingDaysInMonth(year: number, month: number): string[] {
  const cacheKey = `${year}-${month}`;
  if (workingDaysCache.has(cacheKey)) {
    return workingDaysCache.get(cacheKey)!;
  }

  const result: string[] = [];
  const date = new Date(year, month - 1, 1);

  while (date.getMonth() === month - 1) {
    if (date.getDay() !== 0) {
      result.push(toDateKey(date));
    }
    date.setDate(date.getDate() + 1);
  }

  workingDaysCache.set(cacheKey, result);
  return result;
}

export function getAttendanceDayValue(
  record: { inTime?: string; outTime?: string },
  employee: Partial<Employee>
): { status: "full" | "half" | "absent"; value: number } {
  if (!record.inTime) {
    return { status: "absent", value: 0.0 };
  }

  if (!record.outTime) {
    return { status: "full", value: 1.0 }; // Assume full day if check-out is pending
  }

  const parseTime = (timeStr: string) => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + (minutes || 0);
  };

  const checkIsLate = (actualIn: number, scheduledIn: number, graceMinutes: number = 15) => {
    let diff = actualIn - scheduledIn;
    if (diff < -12 * 60) diff += 24 * 60;
    if (diff > 12 * 60) diff -= 24 * 60;
    return diff > graceMinutes;
  };

  try {
    const recordInMins = parseTime(record.inTime);
    const recordOutMins = parseTime(record.outTime);

    const fixedInMins = parseTime(employee.fixedInTime || "10:00:00 AM");
    const fixedOutMins = parseTime(employee.fixedOutTime || "07:00:00 PM");

    // Check if check-in is late (more than 15 mins after shift start)
    const isLate = checkIsLate(recordInMins, fixedInMins, 15);

    // Calculate actual worked duration in minutes (handling overnight rollover)
    let workedMinutes = recordOutMins - recordInMins;
    if (workedMinutes < 0) workedMinutes += 24 * 60;

    // Calculate scheduled shift duration
    let shiftDuration = fixedOutMins - fixedInMins;
    if (shiftDuration < 0) shiftDuration += 24 * 60;

    // Required working minutes:
    // Full day requires shiftDuration - 15 minutes (e.g. 8h 45m for a 9h shift)
    const reqFullDayMins = shiftDuration - 15;
    // Half day requires 5 hours (300 minutes) for a standard 9h shift, scaled proportionally
    const reqHalfDayMins = Math.round(shiftDuration * 5 / 9);

    if (workedMinutes < reqHalfDayMins) {
      return { status: "absent", value: 0.0 };
    } else if (workedMinutes >= reqFullDayMins && !isLate) {
      return { status: "full", value: 1.0 };
    } else {
      return { status: "half", value: 0.5 };
    }
  } catch (error) {
    return { status: "full", value: 1.0 };
  }
}

export function calculateRecordEarning(record: AttendanceRecord, employee: Employee): number {
  if (!record.inTime || !record.date) return 0;
  const [year, month] = record.date.split("-").map(Number);
  const dailySalary = getDailySalary(employee, year, month);
  const dayValue = getAttendanceDayValue(record, employee);
  return Math.round(dailySalary * dayValue.value);
}

export function calculateMonthlySalary(
  employee: Employee,
  records: AttendanceRecord[],
  leaves: LeaveLike[],
  year: number,
  month: number
): SalarySummary {
  const workingDays = getWorkingDaysInMonth(year, month);
  const workingDaySet = new Set(workingDays);
  
  const presentRecords = records.filter(
    (record) => record.employeeName === employee.name && record.inTime && workingDaySet.has(record.date)
  );

  const presentDays = new Set(presentRecords.map((r) => r.date));

  let presentPayableDaysSum = 0;
  for (const record of presentRecords) {
    const dayValue = getAttendanceDayValue(record, employee);
    presentPayableDaysSum += dayValue.value;
  }

  const approvedLeaves = leaves.filter(
    (leave) =>
      leave.employeeName === employee.name &&
      leave.status?.toLowerCase() === "approved"
  );

  const paidLeaveDays = new Set<string>();
  const unpaidLeaveDays = new Set<string>();

  for (const leave of approvedLeaves) {
    const isPaid = getLeavePaymentStatus(leave) === "paid";
    for (const date of getLeaveDatesInMonth(leave, year, month)) {
      if (!workingDaySet.has(date) || presentDays.has(date)) continue;
      if (isPaid) {
        paidLeaveDays.add(date);
      } else {
        unpaidLeaveDays.add(date);
      }
    }
  }

  const fixedSalary = Number(employee.fixedSalary || 0);
  const dailyRate = workingDays.length > 0 ? fixedSalary / workingDays.length : 0;
  const payableDays = presentPayableDaysSum + paidLeaveDays.size;
  const unpaidDeduction = unpaidLeaveDays.size * dailyRate;
  const netSalary = Math.max(0, fixedSalary - unpaidDeduction);

  return {
    workingDays: workingDays.length,
    presentDays: presentDays.size,
    paidLeaveDays: paidLeaveDays.size,
    unpaidLeaveDays: unpaidLeaveDays.size,
    payableDays,
    absentDays: Math.max(0, workingDays.length - payableDays - unpaidLeaveDays.size),
    dailyRate,
    grossSalary: fixedSalary,
    unpaidDeduction,
    netSalary,
  };
}

export function getDailySalary(employee: Employee, year: number, month: number): number {
  const fixedSalary = Number(employee.fixedSalary || 0);
  const workingDays = getWorkingDaysInMonth(year, month).length;
  return workingDays > 0 ? fixedSalary / workingDays : 0;
}

function getLeavePaymentStatus(leave: LeaveLike): "paid" | "unpaid" {
  if (leave.paymentStatus?.toLowerCase() === "paid") return "paid";
  if (leave.paymentStatus?.toLowerCase() === "unpaid") return "unpaid";
  return leave.leaveType?.toLowerCase() === "unpaid" ? "unpaid" : "paid";
}

function getLeaveDatesInMonth(leave: LeaveLike, year: number, month: number): string[] {
  if (!leave.startDate || !leave.endDate) return [];

  const result: string[] = [];
  const date = parseDateKey(leave.startDate);
  const endDate = parseDateKey(leave.endDate);

  while (date <= endDate) {
    if (date.getFullYear() === year && date.getMonth() === month - 1) {
      result.push(toDateKey(date));
    }
    date.setDate(date.getDate() + 1);
  }

  return result;
}

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
