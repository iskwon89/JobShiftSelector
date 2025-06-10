import * as XLSX from 'xlsx';
import { InsertEmployee } from '@shared/schema';

export interface ExcelEmployee {
  ID: string;
  Name: string;
  Eligible: boolean;
  Cohort: string;
}

export function parseExcelFile(file: File): Promise<InsertEmployee[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        // Transform to our schema format
        const employees: InsertEmployee[] = jsonData.map(row => ({
          employeeId: String(row.ID || row.id || row['Employee ID'] || '').trim(),
          name: String(row.Name || row.name || '').trim(),
          eligible: Boolean(row.Eligible === true || row.Eligible === 'TRUE' || row.Eligible === 'true' || row.Eligible === 1),
          cohort: String(row.Cohort || row.cohort || '').trim() || null,
        })).filter(emp => emp.employeeId && emp.name); // Filter out invalid rows
        
        if (employees.length === 0) {
          reject(new Error('No valid employee data found in the Excel file. Please ensure columns are named: ID, Name, Eligible, Cohort'));
          return;
        }
        
        resolve(employees);
      } catch (error) {
        reject(new Error('Failed to parse Excel file. Please ensure it\'s a valid .xlsx or .xls file.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read the file.'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}
