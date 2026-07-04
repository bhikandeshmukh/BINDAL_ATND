"use client";

import { useState, useEffect, useMemo } from 'react';
import { getDailySalary } from '@/lib/salary';

interface RealTimeEarningProps {
  employeeName: string;
  checkInTime: string;
  checkInDate: string;
  fixedSalary?: number;
  fixedInTime?: string;
  fixedOutTime?: string;
}

export default function RealTimeEarning({
  employeeName,
  checkInTime,
  checkInDate,
  fixedSalary,
  fixedInTime,
  fixedOutTime,
}: RealTimeEarningProps) {
  const [minutesWorked, setMinutesWorked] = useState(0);
  const [currentTime, setCurrentTime] = useState('');

  // Calculate daily salary once when inputs change
  const dailyEarning = useMemo(() => {
    try {
      const [year, month] = checkInDate.split("-").map(Number);
      return Math.round(getDailySalary({
        id: "",
        name: employeeName,
        role: "user",
        fixedSalary,
      }, year, month));
    } catch (error) {
      console.error('Error calculating earning:', error);
      return 0;
    }
  }, [fixedSalary, checkInDate, employeeName]);

  // Calculate dynamic earned salary for today based on minutes worked and late check-in
  const earnedSalary = useMemo(() => {
    try {
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

      const recordInMins = parseTime(checkInTime);
      const fixedInMins = parseTime(fixedInTime || "10:00:00 AM");
      const fixedOutMins = parseTime(fixedOutTime || "07:00:00 PM");

      const isLate = checkIsLate(recordInMins, fixedInMins, 15);

      let shiftDuration = fixedOutMins - fixedInMins;
      if (shiftDuration < 0) shiftDuration += 24 * 60;

      const reqFullDayMins = shiftDuration - 15;
      const reqHalfDayMins = Math.round(shiftDuration * 5 / 9);

      let dayValue = 0.0;
      if (minutesWorked < reqHalfDayMins) {
        dayValue = 0.0;
      } else if (minutesWorked >= reqFullDayMins && !isLate) {
        dayValue = 1.0;
      } else {
        dayValue = 0.5;
      }

      return {
        value: dayValue,
        amount: Math.round(dailyEarning * dayValue),
        status: dayValue === 1.0 ? "Full Day" : dayValue === 0.5 ? "Half Day" : "Absent (Min Hours Pending)"
      };
    } catch (error) {
      return { value: 0.0, amount: 0, status: "Absent" };
    }
  }, [dailyEarning, checkInTime, fixedInTime, fixedOutTime, minutesWorked]);

  useEffect(() => {
    const updateTime = () => {
      try {
        // Parse check-in time
        const parseTime = (timeStr: string) => {
          if (!timeStr) return 0;
          const [time, period] = timeStr.trim().split(/\s+/);
          const normalizedTime = time.replace(/\./g, ':');
          let [hours, minutes] = normalizedTime.split(':').map(Number);
          if (period?.toUpperCase() === 'PM' && hours !== 12) hours += 12;
          if (period?.toUpperCase() === 'AM' && hours === 12) hours = 0;
          return hours * 60 + (minutes || 0);
        };

        const checkInMinutes = parseTime(checkInTime);

        // Get current time
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentSeconds = now.getSeconds();
        const currentTotalMinutes = currentHours * 60 + currentMinutes;

        // Calculate minutes worked
        let worked = currentTotalMinutes - checkInMinutes;
        if (worked < 0) worked += 24 * 60; // Handle overnight

        setMinutesWorked(worked);

        // Format current time
        const period = currentHours >= 12 ? 'PM' : 'AM';
        const displayHours = currentHours % 12 || 12;
        const timeStr = `${displayHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}:${currentSeconds.toString().padStart(2, '0')} ${period}`;
        setCurrentTime(timeStr);
      } catch (error) {
        console.error('Error in RealTimeEarning update:', error);
      }
    };

    // Update immediately on mount
    updateTime();

    // Update every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [checkInTime]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 rounded-2xl shadow-lg p-5 mb-6 border border-emerald-200 backdrop-blur-md transition-all duration-300 hover:shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-2xl shadow-md shadow-emerald-200 animate-pulse">
            💵
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">Today's Fixed Pay</h3>
            <p className="text-xs font-semibold text-emerald-800">Assigned shift attendance day rate</p>
          </div>
        </div>
        <div className="bg-white/80 border border-emerald-200 rounded-xl px-3 py-1.5 self-start sm:self-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-500 block leading-none mb-0.5">Current Time</span>
          <span className="text-xs font-mono font-bold text-slate-700">{currentTime}</span>
        </div>
      </div>

      {/* Main Earning Display */}
      <div className="bg-white rounded-xl p-5 mb-4 shadow-sm border border-emerald-100 flex flex-col items-center justify-center">
        <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-1">Today's Earned Pay</span>
        <span className="text-5xl font-black text-emerald-600 tracking-tight mb-2 select-none">
          ₹{earnedSalary.amount.toLocaleString('en-IN')}
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
            earnedSalary.value === 1.0 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : earnedSalary.value === 0.5 
                ? 'bg-blue-50 text-blue-800 border-blue-200' 
                : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            {earnedSalary.status}
          </span>
          <div className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold border border-slate-200/50">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatTime(minutesWorked)} Worked
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/60 hover:bg-white rounded-xl p-3 border border-emerald-100/50 shadow-sm transition-all">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Check-In Time</span>
          <span className="text-sm font-extrabold text-slate-700">{checkInTime}</span>
        </div>
        <div className="bg-white/60 hover:bg-white rounded-xl p-3 border border-emerald-100/50 shadow-sm transition-all">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Scheduled Day Rate</span>
          <span className="text-sm font-extrabold text-slate-700">₹{dailyEarning.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Rate Info */}
      <div className="mt-4 p-3 bg-white/40 rounded-xl border border-emerald-100 text-xs text-slate-600 flex items-center justify-between">
        <span className="font-medium">💵 Fixed Monthly Base:</span>
        <span className="font-extrabold text-slate-800">₹{fixedSalary?.toLocaleString('en-IN')}/mo</span>
      </div>

      {/* Note */}
      <div className="mt-3 text-[10px] text-slate-400 text-center font-medium">
        ⏱️ Working time is calculated based on check-in duration for reporting.
      </div>
    </div>
  );
}
