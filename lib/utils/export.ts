/**
 * Export data to CSV file
 */

export function exportToCSV(data: any[], filename: string, headers?: string[]) {
    if (data.length === 0) {
        alert("No data to export");
        return;
    }

    // Get headers from first object if not provided
    const csvHeaders = headers || Object.keys(data[0]);

    // Create CSV content
    const csvRows = [];

    // Add header row
    csvRows.push(csvHeaders.join(","));

    // Add data rows
    for (const row of data) {
        const values = csvHeaders.map((header) => {
            const value = row[header];
            // Escape quotes and wrap in quotes if contains comma
            const escaped = String(value).replace(/"/g, '""');
            return escaped.includes(",") ? `"${escaped}"` : escaped;
        });
        csvRows.push(values.join(","));
    }

    // Create blob and download
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Export data to Excel-compatible CSV
 */
export function exportToExcel(data: any[], filename: string, headers?: string[]) {
    if (data.length === 0) {
        alert("No data to export");
        return;
    }

    const csvHeaders = headers || Object.keys(data[0]);
    const csvRows = [];

    // Add BOM for Excel UTF-8 support
    const BOM = "\uFEFF";

    // Add header row
    csvRows.push(csvHeaders.join(","));

    // Add data rows
    for (const row of data) {
        const values = csvHeaders.map((header) => {
            const value = row[header];
            const escaped = String(value).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(","));
    }

    const csvContent = BOM + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Parse CSV file
 */
export function parseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split("\n").filter((line) => line.trim());

                if (lines.length === 0) {
                    reject(new Error("Empty file"));
                    return;
                }

                // Parse headers
                const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

                // Parse data
                const data = [];
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
                    const row: any = {};

                    headers.forEach((header, index) => {
                        row[header] = values[index] || "";
                    });

                    data.push(row);
                }

                resolve(data);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file);
    });
}

/**
 * Download JSON as file
 */
export function downloadJSON(data: any, filename: string) {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Format date for export
 */
export function formatDateForExport(date: string | Date): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-IN");
}

/**
 * Format time for export
 */
export function formatTimeForExport(time: string): string {
    return time;
}
