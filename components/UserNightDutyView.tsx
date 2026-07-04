"use client";

import { useState, useEffect } from "react";

interface UserNightDutyViewProps {
  userName: string;
}

interface NightDutyRequest {
  id: string;
  employeeName: string;
  date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestedDate: string;
}

export default function UserNightDutyView({ userName }: UserNightDutyViewProps) {
  const [requests, setRequests] = useState<NightDutyRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserRequests();
  }, [userName]);

  const fetchUserRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/night-duty");
      const data = await response.json();
      const allRequests = Array.isArray(data) ? data : [];
      
      // Filter only this user's requests
      const userRequests = allRequests.filter(
        (req: NightDutyRequest) => req.employeeName === userName
      );
      
      setRequests(userRequests);
    } catch (error) {
      console.error("Error fetching night duty requests:", error);
      setRequests([]);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-sm">Loading...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-3">🌙</div>
        <p className="text-gray-600 text-sm">No night duty requests yet</p>
        <p className="text-gray-500 text-xs mt-1">Request night duty from the section above</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
              Date
            </th>
            <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
              Shift Time
            </th>
            <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
              Reason
            </th>
            <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
              Requested On
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                {request.date}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-indigo-600 font-medium">
                9:00 PM - 7:00 AM
              </td>
              <td className="px-3 py-2 text-xs sm:text-sm text-gray-900 max-w-xs truncate">
                {request.reason}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm">
                <span
                  className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${getStatusColor(
                    request.status
                  )}`}
                >
                  {request.status.toUpperCase()}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                {request.requestedDate}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
