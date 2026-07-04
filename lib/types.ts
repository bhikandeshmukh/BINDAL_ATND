export interface AttendanceRecord {
  date: string;
  employeeName: string;
  inTime: string;
  outTime: string;
  inLocation: string;
  outLocation: string;
  totalMinutes: number;
  totalHours: string;
}

export interface Employee {
  id: string;
  name: string;
  position?: string;
  role: "admin" | "user";
  status?: "active" | "inactive";
  totalWorkingDays?: number;
  fixedInTime?: string;
  fixedOutTime?: string;
  perMinuteRate?: number;
  fixedSalary?: number;
  username?: string;
  password?: string;
  email?: string;
}
