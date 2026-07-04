import { z } from "zod";

// Login validation
export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

// Registration validation
export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  position: z.string().min(2).max(100),
  fixedInTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  fixedOutTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  fixedSalary: z.coerce.number().min(0).optional(),
});

// Employee validation
export const employeeSchema = z.object({
  name: z.string().min(2).max(100),
  position: z.string().min(2).max(100),
  role: z.enum(["admin", "user"]),
  status: z.enum(["active", "inactive"]),
  totalWorkingDays: z.number().min(0).max(365),
  fixedInTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  fixedOutTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  perMinuteRate: z.number().min(0),
  fixedSalary: z.number().min(0),
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(6).max(100).optional(),
});

// Attendance validation
export const attendanceSchema = z.object({
  employeeName: z.string().min(2).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  inTime: z.string().optional(),
  outTime: z.string().optional(),
  inLocation: z.string().optional(),
  outLocation: z.string().optional(),
});

// Leave validation
export const leaveSchema = z.object({
  employeeName: z.string().min(2).max(100),
  leaveType: z.enum(["sick", "casual", "earned", "unpaid"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(10).max(500),
});

// Night duty validation
export const nightDutySchema = z.object({
  employeeName: z.string().min(2).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(10).max(500),
});

// Validate data with schema
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  error?: string;
} {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`).join(", "),
      };
    }
    return { success: false, error: "Validation failed" };
  }
}
