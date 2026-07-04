"use client";

import { useState, useEffect } from "react";

interface NightDutyRequest {
  id: string;
  employeeName: string;
  date: string;
  reason: string;
  requestedBy?: string;
  status: "Pending" | "Approved" | "Rejected" | "pending" | "approved" | "rejected";
  requestedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  approvedTime?: string;
}

interface NightDutyManagementProps {
  adminName: string;
}

export default function NightDutyManagement({ adminName }: NightDutyManagementProps) {
  const [requests, setRequests] = useState<NightDutyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Add timestamp to bypass cache
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/night-duty?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      const data = await response.json();
      console.log('Fetched night duty requests:', data);
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching night duty requests:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: "approved" | "rejected") => {
    // Only prevent duplicate clicks for the SAME request
    if (processingId === id) {
      console.log(`Already processing request ${id}`);
      return;
    }

    console.log(`Starting to ${status} request ${id}`);
    setProcessingId(id);

    try {
      // Capitalize first letter for API
      const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);

      console.log(`Sending API request for ${id} with status ${capitalizedStatus}`);

      const response = await fetch("/api/night-duty/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: capitalizedStatus,
          approvedBy: adminName,
          approvedById: "ADMIN"
        }),
      });

      console.log(`API response status: ${response.status}`);

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Success:`, result);
        alert(`✅ Night duty request ${status} successfully!`);
        await fetchRequests();
      } else {
        const errorData = await response.json();
        console.error(`❌ API Error:`, errorData);
        alert(`❌ Failed to update request status: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("❌ Exception in handleStatusUpdate:", error);
      alert(`❌ Error updating request status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      console.log(`Finished processing request ${id}`);
      setProcessingId(null);
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

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">
          🌙 Night Duty Requests
        </h2>
      </div>

      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
        {loading ? (
          <div className="animate-pulse">
            {/* Table Header Skeleton */}
            <div className="bg-gray-100 rounded-t-lg p-3 mb-2">
              <div className="grid grid-cols-10 gap-2">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-3 bg-gray-300 rounded"></div>
                ))}
              </div>
            </div>
            
            {/* Table Rows Skeleton */}
            {[...Array(5)].map((_, rowIndex) => (
              <div key={rowIndex} className="bg-white border-b p-3">
                <div className="grid grid-cols-10 gap-2">
                  {[...Array(10)].map((_, colIndex) => (
                    <div key={colIndex} className="h-3 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm animate-pulse">Loading night duty requests...</p>
            </div>
          </div>
        ) : requests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                    Employee
                  </th>
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
                    Requested By
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
                  <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {request.employeeName}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {request.date}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-indigo-600 font-medium">
                      9:00 PM - 7:00 AM
                    </td>
                    <td className="px-3 py-2 text-xs sm:text-sm text-gray-900 max-w-xs truncate">
                      {request.reason}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                      {request.requestedBy || request.employeeName}
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
                    <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                      {request.approvedBy || "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                      {request.approvedDate || "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                      {request.approvedTime || "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm">
                      {(request.status === "pending" || request.status === "Pending") && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusUpdate(request.id, "approved")}
                            disabled={processingId === request.id}
                            className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {processingId === request.id ? "⏳ Processing..." : "✓ Approve"}
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(request.id, "rejected")}
                            disabled={processingId === request.id}
                            className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {processingId === request.id ? "⏳ Processing..." : "✗ Reject"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl sm:text-6xl mb-4">🌙</div>
            <p className="text-gray-600 text-sm sm:text-base">No night duty requests found</p>
          </div>
        )}
      </div>
    </div>
  );
}
