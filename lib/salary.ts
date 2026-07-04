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
    if (!timeStr) return 0;
    const [time, period] = timeStr.trim().split(/\s+/);
    const normalizedTime = time.replace(/\./g, ':');
    let [hours, minutes] = normalizedTime.split(':').map(Number);
    if (period?.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (period?.toUpperCase() === 'AM' && hours === 12) hours = 0;
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

const STATIC_FESTIVE_HOLIDAY_DATES = [
  "2026-01-01", "2026-01-26", "2026-02-15", "2026-03-04",
  "2026-03-20", "2026-04-03", "2026-08-15", "2026-08-28",
  "2026-10-02", "2026-10-20", "2026-11-08", "2026-12-25"
];

export function calculateMonthlySalary(
  employee: Employee,
  records: AttendanceRecord[],
  leaves: LeaveLike[],
  year: number,
  month: number,
  holidays: string[] = []
): SalarySummary {
  const workingDays = getWorkingDaysInMonth(year, month);
  const workingDaySet = new Set(workingDays);
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  
  const presentRecords = records.filter(
    (record) => record.employeeName === employee.name && record.inTime && workingDaySet.has(record.date)
  );

  const presentDays = new Set(presentRecords.map((r) => r.date));

  // Group present records by date to find max attendance day value (prevents duplicate punch doubling)
  const dateToMaxDayValue = new Map<string, number>();
  for (const record of presentRecords) {
    const dayValue = getAttendanceDayValue(record, employee).value;
    const existing = dateToMaxDayValue.get(record.date) || 0;
    if (dayValue > existing) {
      dateToMaxDayValue.set(record.date, dayValue);
    }
  }

  let presentPayableDaysSum = 0;
  dateToMaxDayValue.forEach((val) => {
    presentPayableDaysSum += val;
  });

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

  // Count festive holidays (use db holidays list if provided, fallback to static list)
  const holidayList = holidays.length > 0 ? holidays : STATIC_FESTIVE_HOLIDAY_DATES;
  const holidayDays = new Set<string>();
  for (const date of holidayList) {
    if (date.startsWith(monthStr) && workingDaySet.has(date)) {
      if (!presentDays.has(date) && !paidLeaveDays.has(date) && !unpaidLeaveDays.has(date)) {
        holidayDays.add(date);
      }
    }
  }

  const fixedSalary = Number(employee.fixedSalary || 0);
  const dailyRate = workingDays.length > 0 ? fixedSalary / workingDays.length : 0;
  
  // Total payable days (actual present sum + paid leaves + paid holidays)
  const payableDays = presentPayableDaysSum + paidLeaveDays.size + holidayDays.size;

  // Unpaid days from leaves
  const unpaidDaysCount = unpaidLeaveDays.size;

  // Absent days (working days not present, not on leave, and not a festive holiday)
  let absentDaysCount = 0;
  for (const date of workingDays) {
    if (!presentDays.has(date) && !paidLeaveDays.has(date) && !unpaidLeaveDays.has(date) && !holidayDays.has(date)) {
      absentDaysCount++;
    }
  }

  // Adjust/waive 1 free leave per month policy (only applies to approved unpaid leaves)
  let adjustedUnpaidDaysCount = unpaidDaysCount;
  if (adjustedUnpaidDaysCount > 0) {
    adjustedUnpaidDaysCount = adjustedUnpaidDaysCount - 1;
  }

  // Total days to deduct salary
  const totalDeductDays = adjustedUnpaidDaysCount + absentDaysCount;

  const unpaidDeduction = totalDeductDays * dailyRate;
  const netSalary = Math.max(0, fixedSalary - unpaidDeduction);

  return {
    workingDays: workingDays.length,
    presentDays: presentDays.size,
    paidLeaveDays: paidLeaveDays.size + holidayDays.size, // count holidays as paid leave days for reporting
    unpaidLeaveDays: unpaidLeaveDays.size,
    payableDays,
    absentDays: absentDaysCount,
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
