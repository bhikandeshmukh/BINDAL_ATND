import { parse, format, isValid } from 'date-fns';

/**
 * Common date formats that users might use in CSV files
 */
const DATE_FORMATS = [
  'yyyy-MM-dd',        // 2025-10-30
  'dd/MM/yyyy',        // 30/10/2025
  'MM/dd/yyyy',        // 10/30/2025
  'dd-MM-yyyy',        // 30-10-2025
  'MM-dd-yyyy',        // 10-30-2025
  'dd.MM.yyyy',        // 30.10.2025
  'MM.dd.yyyy',        // 10.30.2025
  'yyyy/MM/dd',        // 2025/10/30
  'dd MMM yyyy',       // 30 Oct 2025
  'MMM dd, yyyy',      // Oct 30, 2025
  'MMMM dd, yyyy',     // October 30, 2025
  'dd MMMM yyyy',      // 30 October 2025
  'yyyy-MM-dd HH:mm:ss', // 2025-10-30 09:00:00
  'dd/MM/yyyy HH:mm',  // 30/10/2025 09:00
  'MM/dd/yyyy HH:mm',  // 10/30/2025 09:00
];

/**
 * Sanitizes text by removing unwanted characters like quotes and apostrophes
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/['"]/g, '') // Remove single and double quotes
    .replace(/[`´]/g, '') // Remove backticks and acute accents
    .replace(/[""'']/g, '') // Remove smart quotes
    .trim();
}

/**
 * Converts various date formats to standard database format (YYYY-MM-DD)
 */
export function convertDateFormat(dateString: string): string {
  if (!dateString || typeof dateString !== 'string') return '';
  
  const sanitizedDate = sanitizeText(dateString);
  
  // If already in correct format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(sanitizedDate)) {
    return sanitizedDate;
  }
  
  // Try parsing with different formats
  for (const formatString of DATE_FORMATS) {
    try {
      const parsedDate = parse(sanitizedDate, formatString, new Date());
      if (isValid(parsedDate)) {
        return format(parsedDate, 'yyyy-MM-dd');
      }
    } catch (error) {
      // Continue to next format
      continue;
    }
  }
  
  // If no format worked, try native Date parsing as last resort
  try {
    const nativeDate = new Date(sanitizedDate);
    if (isValid(nativeDate) && !isNaN(nativeDate.getTime())) {
      return format(nativeDate, 'yyyy-MM-dd');
    }
  } catch (error) {
    // Fall through to error
  }
  
  throw new Error(`Unable to parse date: "${dateString}". Please use format YYYY-MM-DD or common formats like DD/MM/YYYY`);
}

/**
 * Converts time format to standard format (HH:MM:SS AM/PM)
 */
export function convertTimeFormat(timeString: string): string {
  if (!timeString || typeof timeString !== 'string') return '';
  
  const sanitizedTime = sanitizeText(timeString);
  
  // If already in correct format, return as is
  if (/^\d{1,2}:\d{2}:\d{2}\s?(AM|PM)$/i.test(sanitizedTime)) {
    return sanitizedTime;
  }
  
  // Handle HH:MM format (add seconds and AM/PM)
  if (/^\d{1,2}:\d{2}$/.test(sanitizedTime)) {
    const [hours, minutes] = sanitizedTime.split(':');
    const hour24 = parseInt(hours);
    
    if (hour24 >= 0 && hour24 <= 23) {
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      return `${hour12.toString().padStart(2, '0')}:${minutes}:00 ${ampm}`;
    }
  }
  
  // Handle 24-hour format with seconds
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(sanitizedTime)) {
    const [hours, minutes, seconds] = sanitizedTime.split(':');
    const hour24 = parseInt(hours);
    
    if (hour24 >= 0 && hour24 <= 23) {
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      return `${hour12.toString().padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
    }
  }
  
  return sanitizedTime; // Return as is if no conversion possible
}

/**
 * Processes CSV row data with sanitization and format conversion
 */
export function processCsvRow(row: Record<string, string>, type: string): Record<string, any> {
  const processedRow: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(row)) {
    let processedValue: any = sanitizeText(value);
    
    // Apply specific processing based on field type
    if (type === 'attendance') {
      if (key.toLowerCase().includes('date')) {
        try {
          processedValue = convertDateFormat(processedValue);
        } catch (error) {
          throw new Error(`Invalid date in field "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else if (key.toLowerCase().includes('time') && !key.toLowerCase().includes('total')) {
        processedValue = convertTimeFormat(processedValue);
      } else if (key.toLowerCase().includes('minutes') || key.toLowerCase().includes('overtime')) {
        processedValue = parseInt(processedValue) || 0;
      } else if (key.toLowerCase().includes('pay') || key.toLowerCase().includes('rate') || key.toLowerCase().includes('salary')) {
        processedValue = parseFloat(processedValue) || 0;
      }
    } else if (type === 'employees') {
      if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('salary')) {
        processedValue = parseFloat(processedValue) || 0;
      } else if (key.toLowerCase().includes('days')) {
        processedValue = parseInt(processedValue) || 26;
      } else if (key.toLowerCase().includes('time')) {
        processedValue = convertTimeFormat(processedValue);
      }
    } else if (type === 'leaves' || type === 'nightDuty') {
      if (key.toLowerCase().includes('date')) {
        try {
          processedValue = convertDateFormat(processedValue);
        } catch (error) {
          throw new Error(`Invalid date in field "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else if (key.toLowerCase().includes('time')) {
        processedValue = convertTimeFormat(processedValue);
      }
    }
    
    processedRow[key] = processedValue;
  }
  
  return processedRow;
}

/**
 * Enhanced CSV parsing with better handling of quotes and special characters
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"' || char === "'") {
      if (inQuotes && nextChar === char) {
        // Escaped quote
        current += char;
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result.map(field => sanitizeText(field));
}