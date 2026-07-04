"use client";

import { useState, useEffect } from "react";
import { getCurrentLocation, isWithinOfficeRadius, getOfficeLocation } from "@/lib/geofence";
import { backgroundTracker } from "@/lib/geofencing/background-tracker";
import { pushNotificationService } from "@/lib/notifications/push-service";
import RealTimeEarning from "./RealTimeEarning";
import { getDailySalary } from "@/lib/salary";

interface AttendanceFormProps {
  onRecordAdded: () => void;
  userRole: "admin" | "user";
  userName?: string;
}

export default function AttendanceForm({ onRecordAdded, userRole, userName }: AttendanceFormProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<any>(null);
  const [dailyEarning, setDailyEarning] = useState<number>(0);
  const [totalMinutes, setTotalMinutes] = useState<number>(0);
  const [isNightDuty, setIsNightDuty] = useState<boolean>(false);
  const [checkInTimestamp, setCheckInTimestamp] = useState<number | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true);

  // Get Indian Standard Time (IST) date
  const getISTDate = () => {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const istTime = new Date(now.getTime() + istOffset);
    return istTime.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState(() => {
    const today = getISTDate();
    return {
      employeeName: "",
      date: today,
      inTime: "",
      outTime: "",
      inLocation: "",
      outLocation: "",
    };
  });

  useEffect(() => {
    // Get IST date
    const today = getISTDate();
    const savedDate = localStorage.getItem("lastAttendanceDate");

    // Auto-reset if date has changed
    if (savedDate && savedDate !== today) {
      console.log("🔄 Auto-reset triggered: Date changed from", savedDate, "to", today);

      // Clear ALL old attendance keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("attendance_")) {
          console.log("Removing old key:", key);
          localStorage.removeItem(key);
        }
      });

      // Reset ALL states for new day
      setInTimeDone(false);
      setOutTimeDone(false);
      setMessage("");
      setFormData(prev => ({
        ...prev,
        date: today,
        inTime: "",
        outTime: "",
        inLocation: "",
        outLocation: "",
      }));
      setLocationStatus({ inLocation: null, outLocation: null });
      setHasEdited(false);

      console.log("✅ Auto-reset complete - Ready for new day:", today);
    }

    // Save current date
    localStorage.setItem("lastAttendanceDate", today);

    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const response = await fetch("/api/employees");
        const data = await response.json();
        const employeeList = Array.isArray(data) ? data : [];
        setEmployees(employeeList);

        if (userRole === "user" && userName && employeeList.length > 0) {
          const userEmployee = employeeList.find((emp: any) => emp.name === userName);
          if (userEmployee) {
            setSelectedEmployeeData(userEmployee);
            setFormData(prev => ({
              ...prev,
              employeeName: userEmployee.name,
              date: today, // Always set to today
            }));

            // Check if user has already checked in today
            checkAttendanceStatus(userEmployee.name);
          }
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();

    // Check location permission for users
    if (userRole === "user") {
      checkLocationPermission();
    }
  }, [userRole, userName]);

  // Auto-reset check - runs every 30 seconds
  useEffect(() => {
    const autoResetCheck = () => {
      const today = getISTDate();
      const savedDate = localStorage.getItem("lastAttendanceDate");

      // If date has changed, reset the form
      if (savedDate && savedDate !== today) {
        console.log("Date changed from", savedDate, "to", today, "- Resetting form");

        // Clear ALL old attendance completion keys
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith("attendance_") && !key.includes(today)) {
            console.log("Removing old key:", key);
            localStorage.removeItem(key);
          }
        });

        setInTimeDone(false);
        setOutTimeDone(false);
        setMessage("");
        setFormData(prev => ({
          ...prev,
          date: today,
          inTime: "",
          outTime: "",
          inLocation: "",
          outLocation: "",
        }));
        setLocationStatus({ inLocation: null, outLocation: null });
        setHasEdited(false);

        // Re-check attendance status for new day
        if (formData.employeeName) {
          setTimeout(() => {
            checkAttendanceStatus(formData.employeeName);
          }, 100);
        }
      }

      // Save current date
      localStorage.setItem("lastAttendanceDate", today);
    };

    // Check immediately on mount
    autoResetCheck();

    // Check every 30 seconds for date change (auto-reset at midnight)
    const interval = setInterval(autoResetCheck, 30000);

    return () => clearInterval(interval);
  }, [formData.employeeName]);

  const checkLocationPermission = async () => {
    if (!("geolocation" in navigator)) {
      alert("⚠️ Location Not Supported\n\nYour browser doesn't support location services. Please use a modern browser.");
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });

      if (permission.state === 'denied') {
        alert("🚫 Location Permission Required\n\nPlease enable location access in your browser settings to mark attendance.\n\nSteps:\n1. Click the lock icon in address bar\n2. Allow location access\n3. Refresh the page");
      }
    } catch (error) {
      // Fallback - will check when user clicks button
      console.log("Permissions API not supported");
    }
  };

  // Check if employee has approved night duty for today
  const checkNightDutyStatus = async (employeeName: string, date: string) => {
    try {
      const response = await fetch("/api/night-duty");
      const nightDutyRequests = await response.json();
      
      if (Array.isArray(nightDutyRequests)) {
        const approvedNightDuty = nightDutyRequests.find(
          (req: any) => 
            req.employeeName === employeeName && 
            req.date === date && 
            req.status.toLowerCase() === "approved"
        );
        
        setIsNightDuty(!!approvedNightDuty);
        return !!approvedNightDuty;
      }
    } catch (error) {
      console.error("Error checking night duty status:", error);
    }
    return false;
  };

  const checkAttendanceStatus = async (employeeName: string) => {
    try {
      const today = getISTDate();

      // Check if this is a night duty day
      await checkNightDutyStatus(employeeName, today);

      // Always fetch from API to get latest data
      const response = await fetch("/api/attendance/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeName, date: today }),
      });

      if (response.ok) {
        const status = await response.json();

        if (status.hasCheckedIn) {
          setFormData(prev => ({
            ...prev,
            date: today,
            inTime: status.inTime,
            inLocation: status.inLocation,
            outTime: status.outTime || "",
            outLocation: status.outLocation || "",
          }));
          setInTimeDone(true);

          if (status.hasCheckedOut) {
            setOutTimeDone(true);
            setMessage("✅ You have already completed attendance for today!");
            // Save completion status
            const completionKey = `attendance_${today}_${employeeName}`;
            localStorage.setItem(completionKey, "completed");
          } else {
            setMessage("✅ Check In found! You can now mark Check Out.");
          }
        } else {
          // No attendance for today - ensure form is clean
          setFormData(prev => ({
            ...prev,
            date: today,
            inTime: "",
            outTime: "",
            inLocation: "",
            outLocation: "",
          }));
          setInTimeDone(false);
          setOutTimeDone(false);
          setMessage("");
        }
      }
    } catch (error) {
      console.error("Error checking attendance status:", error);
    }
  };

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [inTimeDone, setInTimeDone] = useState(false);
  const [outTimeDone, setOutTimeDone] = useState(false);
  const [locationStatus, setLocationStatus] = useState<{
    inLocation: { allowed: boolean; distance: number } | null;
    outLocation: { allowed: boolean; distance: number } | null;
  }>({ inLocation: null, outLocation: null });
  const [hasEdited, setHasEdited] = useState(false);

  const calculateEarning = (inTime: string, outTime: string, employeeData: any) => {
    if (!inTime || !outTime || !employeeData) return { minutes: 0, earning: 0 };

    try {
      // Parse times
      const parseTime = (timeStr: string) => {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes, seconds] = time.split(':').map(Number);

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        return hours * 60 + minutes;
      };

      const inMinutes = parseTime(inTime);
      const outMinutes = parseTime(outTime);

      let totalMins = outMinutes - inMinutes;
      if (totalMins < 0) totalMins += 24 * 60; // Handle overnight shift

      const [year, month] = formData.date.split("-").map(Number);
      const earning = getDailySalary(employeeData, year, month);

      return { minutes: totalMins, earning: Math.round(earning) };
    } catch (error) {
      console.error("Error calculating earning:", error);
      return { minutes: 0, earning: 0 };
    }
  };

  // Update earning when both times are available
  useEffect(() => {
    if (formData.inTime && formData.outTime && selectedEmployeeData) {
      const { minutes, earning } = calculateEarning(formData.inTime, formData.outTime, selectedEmployeeData);
      setTotalMinutes(minutes);
      setDailyEarning(earning);
    } else {
      setTotalMinutes(0);
      setDailyEarning(0);
    }
  }, [formData.inTime, formData.outTime, selectedEmployeeData]);

  // Auto-start location tracking
  const startLocationTracking = async () => {
    try {
      // Initialize push notifications
      await pushNotificationService.initialize();

      // Office location configuration
      const officeConfig = {
        latitude: 21.190391,
        longitude: 72.887242,
        radius: 30,
        officeId: 'main-office',
        officeName: 'Main Office',
      };

      const initialized = await backgroundTracker.initialize(officeConfig);
      if (initialized) {
        // Get user ID from localStorage or use employee name
        const userId = formData.employeeName || userName || 'user';
        backgroundTracker.startTracking(userId, formData.employeeName || userName || 'User');
        console.log('✅ Location tracking started automatically');
      }
    } catch (error) {
      console.error('Failed to start location tracking:', error);
    }
  };

  // Auto-stop location tracking
  const stopLocationTracking = () => {
    try {
      backgroundTracker.stopTracking();
      console.log('⏹️ Location tracking stopped automatically');
    } catch (error) {
      console.error('Failed to stop location tracking:', error);
    }
  };

  const handleInTimeDone = async () => {
    // Check if attendance is already completed for today
    const today = getISTDate();
    const completionKey = `attendance_${today}_${formData.employeeName}`;
    const isCompleted = localStorage.getItem(completionKey);

    if (isCompleted === "completed") {
      setMessage("✅ You have already completed attendance for today!");
      return;
    }

    if (inTimeDone) {
      setMessage("⚠️ You have already marked Check In today!");
      return;
    }

    setGettingLocation(true);
    setMessage("");

    try {
      const location = await getCurrentLocation();
      const { latitude, longitude, locationString } = location;

      if (userRole === "user") {
        const check = isWithinOfficeRadius(latitude, longitude);
        setLocationStatus(prev => ({ ...prev, inLocation: check }));

        if (!check.allowed) {
          setMessage(`❌ You are ${check.distance}m away from office. You must be within ${getOfficeLocation().radius}m to mark attendance.`);
          setGettingLocation(false);
          return;
        }
      }

      // Get IST time
      const istTime = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      const currentTime = istTime.toUpperCase(); // Convert am/pm to AM/PM
      const currentDate = getISTDate();

      const checkInData = {
        employeeName: formData.employeeName,
        date: currentDate,
        inTime: currentTime,
        inLocation: locationString,
        modifiedBy: userRole === "admin" ? userName : undefined,
        isNightDuty: isNightDuty,
      };

      // Submit check-in to sheet
      const response = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkInData),
      });

      if (response.ok) {
        // Store check-in timestamp for 1-hour restriction
        setCheckInTimestamp(Date.now());
        
        const displayTime = isNightDuty ? "09:00:00 PM" : currentTime;
        setFormData(prev => ({
          ...prev,
          date: currentDate,
          inTime: displayTime,
          inLocation: locationString,
        }));

        setInTimeDone(true);
        const nightDutyMsg = isNightDuty ? "\n🌙 Night Duty - Attendance will show 9:00 PM - 7:00 AM" : "";
        alert(`✅ Check In Successful!\n\nTime: ${currentTime}${nightDutyMsg}\nDate: ${currentDate}`);
        setMessage(`✅ Check In recorded at ${currentTime}${isNightDuty ? " (Night Duty)" : ""}`);
        
        // Auto-enable location tracking on check-in
        await startLocationTracking();
        
        onRecordAdded();
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.error || "Failed to record check-in"}`);
        setMessage("❌ Failed to record check-in");
      }
    } catch (error) {
      console.error("Error getting location:", error);
      alert("❌ Location Permission Required!\n\nPlease enable location access in your browser.");
      setMessage("❌ Location permission required!");
    } finally {
      setGettingLocation(false);
    }
  };

  const handleOutTimeDone = async () => {
    // Check if attendance is already completed for today
    const today = getISTDate();
    const completionKey = `attendance_${today}_${formData.employeeName}`;
    const isCompleted = localStorage.getItem(completionKey);

    if (isCompleted === "completed") {
      setMessage("✅ You have already completed attendance for today!");
      return;
    }

    if (outTimeDone) {
      setMessage("⚠️ You have already marked Check Out today!");
      return;
    }

    // Check 1-hour restriction
    if (checkInTimestamp) {
      const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds
      const timeSinceCheckIn = Date.now() - checkInTimestamp;
      
      if (timeSinceCheckIn < oneHourInMs) {
        const remainingMinutes = Math.ceil((oneHourInMs - timeSinceCheckIn) / (60 * 1000));
        alert(`⏰ Please wait ${remainingMinutes} more minutes before checking out.\n\nYou must work at least 1 hour after check-in.`);
        setMessage(`⏰ Check-out available in ${remainingMinutes} minutes`);
        return;
      }
    }

    setGettingLocation(true);
    setMessage("");

    try {
      const location = await getCurrentLocation();
      const { latitude, longitude, locationString } = location;

      if (userRole === "user") {
        const check = isWithinOfficeRadius(latitude, longitude);
        setLocationStatus(prev => ({ ...prev, outLocation: check }));

        if (!check.allowed) {
          setMessage(`❌ You are ${check.distance}m away from office. You must be within ${getOfficeLocation().radius}m to mark attendance.`);
          setGettingLocation(false);
          return;
        }
      }

      // Get IST time
      const istTime = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      const currentTime = istTime.toUpperCase(); // Convert am/pm to AM/PM

      const updatedData = {
        ...formData,
        outTime: currentTime,
        outLocation: locationString,
      };

      setFormData(updatedData);
      setOutTimeDone(true);

      // Auto-submit check-out (update existing record)
      await submitCheckOut(updatedData);
    } catch (error) {
      console.error("Error getting location:", error);
      alert("❌ Location Permission Required!\n\nPlease enable location access in your browser.");
      setMessage("❌ Location permission required!");
    } finally {
      setGettingLocation(false);
    }
  };

  const submitCheckOut = async (data: typeof formData) => {
    setSubmitting(true);

    try {
      const response = await fetch("/api/attendance/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeName: data.employeeName,
          date: data.date,
          outTime: data.outTime,
          outLocation: data.outLocation,
          modifiedBy: userRole === "admin" ? userName : undefined,
          isNightDuty: isNightDuty,
        }),
      });

      if (response.ok) {
        // Calculate fixed day pay for the selected salary month.
        const displayInTime = isNightDuty ? "09:00:00 PM" : data.inTime;
        const displayOutTime = isNightDuty ? "07:00:00 AM" : data.outTime;
        const { minutes, earning } = calculateEarning(displayInTime, displayOutTime, selectedEmployeeData);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        const nightDutyNote = isNightDuty ? "\n🌙 Night Duty - Recorded as 9:00 PM - 7:00 AM" : "";
        alert(`✅ Check Out Successful!\n\nCheck In: ${displayInTime}\nCheck Out: ${displayOutTime}\nDate: ${data.date}${nightDutyNote}\n\n💰 Fixed Day Pay: ₹${earning.toLocaleString('en-IN')}\n⏱️ Total Time: ${hours}h ${mins}m`);
        setMessage(`✅ Attendance completed! Fixed Day Pay: ₹${earning.toLocaleString('en-IN')} (${hours}h ${mins}m)${isNightDuty ? " 🌙" : ""}`);

        // Save completion status for today
        const today = getISTDate();
        localStorage.setItem("lastAttendanceDate", today);
        localStorage.setItem(`attendance_${today}_${data.employeeName}`, "completed");

        // Auto-disable location tracking on check-out
        stopLocationTracking();

        onRecordAdded();

        // Don't reset - keep showing completed status until next day
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.error || "Failed to record check-out"}`);
        setMessage(`❌ ${errorData.error || "Error recording check-out"}`);
      }
    } catch (error) {
      alert("❌ Network Error!\n\nFailed to record check-out. Please try again.");
      setMessage("❌ Error recording check-out");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Fixed day pay display - Show after check-in */}
      {inTimeDone && !outTimeDone && selectedEmployeeData && formData.inTime && (
        <RealTimeEarning
          employeeName={formData.employeeName}
          checkInTime={formData.inTime}
          checkInDate={formData.date}
          fixedSalary={selectedEmployeeData.fixedSalary}
          fixedInTime={selectedEmployeeData.fixedInTime}
          fixedOutTime={selectedEmployeeData.fixedOutTime}
        />
      )}

      <div className="grid grid-cols-1 gap-3 mb-3">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            Employee Name
          </label>
          {loadingEmployees ? (
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded-md"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2 mt-2"></div>
            </div>
          ) : (
            <>
              <select
                required
                value={formData.employeeName}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  const empData = employees.find(emp => emp.name === selectedName);
                  setSelectedEmployeeData(empData || null);
                  setFormData({ ...formData, employeeName: selectedName });

                  // Check attendance status for selected employee (for admin)
                  if (userRole === "admin" && selectedName) {
                    checkAttendanceStatus(selectedName);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={userRole === "user"}
              >
                <option value="">Select Employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.name}>
                    {employee.name}
                  </option>
                ))}
              </select>
              {userRole === "user" && employees.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">Your profile is auto-selected</p>
              )}
              {userRole === "admin" && (
                <p className="text-xs text-blue-600 mt-1">Select employee to view/edit their attendance</p>
              )}
            </>
          )}
        </div>

        {/* Check In Section */}
        <div className="md:col-span-2">
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${inTimeDone ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                  <svg className={`w-6 h-6 ${inTimeDone ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Check In</h3>
                  <p className="text-xs text-gray-500">Mark your arrival</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleInTimeDone}
                disabled={gettingLocation || inTimeDone}
                className={`relative px-6 py-3 rounded-xl text-sm font-bold transition-all ${inTimeDone
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transform hover:scale-105"
                  }`}
              >
                {gettingLocation ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : inTimeDone ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Checked In
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Check In
                  </span>
                )}
              </button>
            </div>
            {inTimeDone && (
              <div className="space-y-2 bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-gray-600">Time:</span>
                  </div>
                  {userRole === "admin" ? (
                    <input
                      type="text"
                      value={formData.inTime}
                      onChange={(e) => {
                        setFormData({ ...formData, inTime: e.target.value });
                        setHasEdited(true);
                      }}
                      className="text-sm font-bold text-green-700 bg-white px-2 py-1 rounded border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="HH:MM:SS AM/PM"
                    />
                  ) : (
                    <span className="text-sm font-bold text-green-700">{formData.inTime}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-gray-600">Date:</span>
                  </div>
                  <span className="text-sm font-bold text-green-700">{formData.date}</span>
                </div>
                <div className="pt-2 border-t border-green-200">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-600 block mb-1">Location:</span>
                      {userRole === "admin" ? (
                        <input
                          type="text"
                          value={formData.inLocation}
                          onChange={(e) => {
                            setFormData({ ...formData, inLocation: e.target.value });
                            setHasEdited(true);
                          }}
                          className="w-full text-xs font-mono text-green-700 bg-white px-2 py-1 rounded border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Latitude, Longitude"
                        />
                      ) : (
                        <span className="text-xs font-mono text-green-700 break-all">{formData.inLocation}</span>
                      )}
                    </div>
                  </div>
                  {locationStatus.inLocation && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-700 bg-white px-2 py-1 rounded">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified: {locationStatus.inLocation.distance}m from office
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Check Out Section */}
        <div className="md:col-span-2">
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${outTimeDone ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                  <svg className={`w-6 h-6 ${outTimeDone ? 'text-red-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Check Out</h3>
                  <p className="text-xs text-gray-500">Mark your departure</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOutTimeDone}
                disabled={gettingLocation || outTimeDone || !inTimeDone}
                className={`relative px-6 py-3 rounded-xl text-sm font-bold transition-all ${outTimeDone
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : !inTimeDone
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transform hover:scale-105"
                  }`}
              >
                {gettingLocation ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : outTimeDone ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Checked Out
                  </span>
                ) : !inTimeDone ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Check In First
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Check Out
                  </span>
                )}
              </button>
            </div>
            {outTimeDone && (
              <div className="space-y-2 bg-red-50 rounded-lg p-3 border border-red-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-gray-600">Time:</span>
                  </div>
                  {userRole === "admin" ? (
                    <input
                      type="text"
                      value={formData.outTime}
                      onChange={(e) => {
                        setFormData({ ...formData, outTime: e.target.value });
                        setHasEdited(true);
                      }}
                      className="text-sm font-bold text-red-700 bg-white px-2 py-1 rounded border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="HH:MM:SS AM/PM"
                    />
                  ) : (
                    <span className="text-sm font-bold text-red-700">{formData.outTime}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-gray-600">Date:</span>
                  </div>
                  <span className="text-sm font-bold text-red-700">{formData.date}</span>
                </div>
                <div className="pt-2 border-t border-red-200">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-600 block mb-1">Location:</span>
                      {userRole === "admin" ? (
                        <input
                          type="text"
                          value={formData.outLocation}
                          onChange={(e) => {
                            setFormData({ ...formData, outLocation: e.target.value });
                            setHasEdited(true);
                          }}
                          className="w-full text-xs font-mono text-red-700 bg-white px-2 py-1 rounded border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="Latitude, Longitude"
                        />
                      ) : (
                        <span className="text-xs font-mono text-red-700 break-all">{formData.outLocation}</span>
                      )}
                    </div>
                  </div>
                  {locationStatus.outLocation && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-700 bg-white px-2 py-1 rounded">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified: {locationStatus.outLocation.distance}m from office
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Fixed day pay display */}
        {inTimeDone && outTimeDone && dailyEarning > 0 && (
          <div className="md:col-span-2">
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-yellow-900">Today's Fixed Day Pay</h3>
                    <p className="text-xs text-yellow-700">Not calculated by minutes</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-bold text-yellow-900">
                    ₹{dailyEarning.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-yellow-700 mt-1">
                    {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m worked
                  </div>
                </div>
              </div>
              {selectedEmployeeData && (
                <div className="mt-3 pt-3 border-t border-yellow-200">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white rounded px-2 py-1">
                      <span className="text-gray-600">Salary:</span>
                      <span className="ml-1 font-semibold text-yellow-800">
                        ₹{selectedEmployeeData.fixedSalary}/month
                      </span>
                    </div>
                    <div className="bg-white rounded px-2 py-1">
                      <span className="text-gray-600">Total Minutes:</span>
                      <span className="ml-1 font-semibold text-yellow-800">{totalMinutes} mins</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {userRole === "admin" && hasEdited && (inTimeDone || outTimeDone) && (
        <button
          onClick={async () => {
            setSubmitting(true);
            try {
              // Update check-in if edited (Admin modification)
              if (inTimeDone) {
                const response = await fetch("/api/attendance/checkin", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    employeeName: formData.employeeName,
                    date: formData.date,
                    inTime: formData.inTime,
                    inLocation: formData.inLocation,
                    modifiedBy: `Admin: ${userName}`,
                  }),
                });
                if (!response.ok) throw new Error("Failed to update check-in");
              }

              // Update check-out if edited (Admin modification)
              if (outTimeDone) {
                const response = await fetch("/api/attendance/update", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    employeeName: formData.employeeName,
                    date: formData.date,
                    outTime: formData.outTime,
                    outLocation: formData.outLocation,
                    modifiedBy: `Admin: ${userName}`,
                  }),
                });
                if (!response.ok) throw new Error("Failed to update check-out");
              }

              alert("✅ Changes Saved Successfully!");
              setHasEdited(false);
              onRecordAdded();
            } catch (error) {
              alert("❌ Failed to save changes. Please try again.");
            } finally {
              setSubmitting(false);
            }
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold py-2 sm:py-2.5 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl"
        >
          💾 Save Changes
        </button>
      )}

      {message && (
        <div className={`p-2 sm:p-3 rounded-lg text-center text-xs sm:text-sm font-semibold ${message.includes("success") || message.includes("✅")
          ? "bg-green-100 text-green-800 border-2 border-green-300"
          : "bg-red-100 text-red-800 border-2 border-red-300"
          }`}>
          {message}
        </div>
      )}

      {submitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-gray-800">Submitting Attendance...</p>
          </div>
        </div>
      )}
    </div>
  );
}
