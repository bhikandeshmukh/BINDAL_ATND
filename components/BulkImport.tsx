"use client";

import { useState } from "react";

type ImportType = "employees" | "attendance" | "leaves" | "nightDuty" | "notifications";

export default function BulkImport() {
    const [selectedType, setSelectedType] = useState<ImportType>("employees");
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

    const importTypes = [
        { value: "employees", label: "👥 Employees", icon: "👥" },
        { value: "attendance", label: "📋 Attendance", icon: "📋" },
        { value: "leaves", label: "🏖️ Leave Requests", icon: "🏖️" },
        { value: "nightDuty", label: "🌙 Night Duty", icon: "🌙" },
        { value: "notifications", label: "🔔 Notifications", icon: "🔔" },
    ];

    const csvTemplates = {
        employees: `ID,Name,Position,Role,Status,Total Working Days,Fixed In Time,Fixed Out Time,Fixed Salary,Username,Password,Email
001,ADMIN,Administrator,admin,active,26,10:00:00 AM,07:00:00 PM,50000,admin,admin123,admin@company.com
002,BHIKAN,E-Commerce Head,user,active,26,10:00:00 AM,07:00:00 PM,45000,bhikan,bhikan123,bhikan@company.com`,

        attendance: `Date,Employee Name,In Time,Out Time,In Location,Out Location,Total Minutes,Total Hours,Modified By,Overtime Minutes,Overtime Pay,Is Holiday
2025-10-30,BHIKAN,09:00:00 AM,07:00:00 PM,21.169707 72.850052,21.177958 72.820326,600,10:00,,,0,0,
30/10/2025,ADMIN,9:00 AM,6:00 PM,21.169707 72.850052,21.177958 72.820326,540,9:00,,,0,0,
Oct 31 2025,KARAN,09:00,19:00,21.169707 72.850052,21.177958 72.820326,600,10:00,,,0,0,`,

        leaves: `Employee Name,Leave Type,Start Date,End Date,Reason,Status,Payment Status,Applied Date
BHIKAN,casual,01/11/2025,03/11/2025,Personal work,pending,,30/10/2025
ADMIN,sick,Nov 05 2025,Nov 06 2025,Medical checkup,approved,paid,29-10-2025`,

        nightDuty: `Employee Name,Date,Start Time,End Time,Reason,Status,Applied Date,Requested By
BHIKAN,01/11/2025,21:00,07:00,Security duty,pending,30/10/2025,BHIKAN
KARAN,Nov 02 2025,9:00 PM,7:00 AM,Night shift,approved,29-10-2025,ADMIN`,

        notifications: `User ID,Type,Title,Message,Send To All
002,system_alert,System Maintenance,System will be down from 10 PM to 11 PM,no
all,system_alert,Holiday Notice,Tomorrow is a public holiday,yes`,
    };

    const handleDownloadTemplate = () => {
        const template = csvTemplates[selectedType];
        const blob = new Blob([template], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedType}_template.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            alert("Please select a file first");
            return;
        }

        setUploading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("type", selectedType);

            const response = await fetch("/api/import/bulk", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setResult(data);
                setFile(null);
                // Reset file input
                const fileInput = document.getElementById("file-upload") as HTMLInputElement;
                if (fileInput) fileInput.value = "";
            } else {
                alert(data.error || "Import failed");
            }
        } catch (error) {
            console.error("Import error:", error);
            alert("Import failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    📥 Bulk Import
                </h2>
                <p className="text-gray-600 mb-6">
                    Import multiple records at once using CSV files
                </p>

                {/* Import Type Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Import Type
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {importTypes.map((type) => (
                            <button
                                key={type.value}
                                onClick={() => {
                                    setSelectedType(type.value as ImportType);
                                    setFile(null);
                                    setResult(null);
                                }}
                                className={`p-4 rounded-lg border-2 transition-all ${selectedType === type.value
                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                    : "border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                <div className="text-3xl mb-2">{type.icon}</div>
                                <div className="text-sm font-medium">{type.label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Download Template */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <div className="text-2xl">📄</div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-blue-900 mb-1">
                                Step 1: Download CSV Template
                            </h3>
                            <p className="text-sm text-blue-700 mb-3">
                                Download the template, fill in your data, and upload it back
                            </p>
                            <button
                                onClick={handleDownloadTemplate}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                            >
                                ⬇️ Download {importTypes.find(t => t.value === selectedType)?.label} Template
                            </button>
                        </div>
                    </div>
                </div>

                {/* File Upload */}
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6">
                    <div className="text-center">
                        <div className="text-4xl mb-3">📤</div>
                        <h3 className="font-semibold text-gray-900 mb-2">
                            Step 2: Upload Filled CSV
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Select your filled CSV file to import
                        </p>
                        <input
                            id="file-upload"
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <label
                            htmlFor="file-upload"
                            className="inline-block px-6 py-3 bg-gray-700 text-white rounded-lg cursor-pointer hover:bg-gray-800 font-medium"
                        >
                            Choose CSV File
                        </label>
                        {file && (
                            <div className="mt-4 text-sm text-gray-700">
                                Selected: <span className="font-medium">{file.name}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Upload Button */}
                {file && (
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {uploading ? "⏳ Importing..." : "✅ Import Data"}
                    </button>
                )}

                {/* Results */}
                {result && (
                    <div className={`mt-6 p-4 rounded-lg ${result.failed === 0 ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"
                        }`}>
                        <h3 className="font-semibold text-lg mb-2">
                            {result.failed === 0 ? "✅ Import Successful!" : "⚠️ Import Completed with Errors"}
                        </h3>
                        <div className="space-y-1 text-sm">
                            <p className="text-green-700">✓ Successfully imported: {result.success} records</p>
                            {result.failed > 0 && (
                                <>
                                    <p className="text-red-700">✗ Failed: {result.failed} records</p>
                                    {result.errors.length > 0 && (
                                        <div className="mt-3">
                                            <p className="font-medium text-gray-900 mb-1">Errors:</p>
                                            <ul className="list-disc list-inside space-y-1 text-red-600">
                                                {result.errors.slice(0, 10).map((error, index) => (
                                                    <li key={index}>{error}</li>
                                                ))}
                                                {result.errors.length > 10 && (
                                                    <li>... and {result.errors.length - 10} more errors</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    📖 Instructions
                </h3>
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="flex gap-3">
                        <span className="font-bold text-blue-600">1.</span>
                        <p>Download the CSV template for the type of data you want to import</p>
                    </div>
                    <div className="flex gap-3">
                        <span className="font-bold text-blue-600">2.</span>
                        <p>Open the template in Excel or any spreadsheet software</p>
                    </div>
                    <div className="flex gap-3">
                        <span className="font-bold text-blue-600">3.</span>
                        <p>Fill in your data following the format shown in the template</p>
                    </div>
                    <div className="flex gap-3">
                        <span className="font-bold text-blue-600">4.</span>
                        <p>Save the file as CSV format</p>
                    </div>
                    <div className="flex gap-3">
                        <span className="font-bold text-blue-600">5.</span>
                        <p>Upload the CSV file using the upload button above</p>
                    </div>
                    <div className="flex gap-3">
                        <span className="font-bold text-blue-600">6.</span>
                        <p>Review the import results and fix any errors if needed</p>
                    </div>
                </div>
                
                {/* Supported Formats */}
                <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-3">✅ Supported Date & Time Formats</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="font-medium text-green-800 mb-2">📅 Date Formats:</p>
                            <ul className="space-y-1 text-green-700">
                                <li>• 2025-10-30 (YYYY-MM-DD)</li>
                                <li>• 30/10/2025 (DD/MM/YYYY)</li>
                                <li>• 10/30/2025 (MM/DD/YYYY)</li>
                                <li>• 30-10-2025 (DD-MM-YYYY)</li>
                                <li>• Oct 30, 2025</li>
                                <li>• 30 October 2025</li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-medium text-green-800 mb-2">🕐 Time Formats:</p>
                            <ul className="space-y-1 text-green-700">
                                <li>• 09:00:00 AM (12-hour)</li>
                                <li>• 9:00 AM (12-hour short)</li>
                                <li>• 09:00 (24-hour)</li>
                                <li>• 21:00 (24-hour)</li>
                            </ul>
                        </div>
                    </div>
                    <p className="text-xs text-green-600 mt-3">
                        💡 The system automatically converts all formats to the database standard format
                    </p>
                </div>
            </div>
        </div>
    );
}
