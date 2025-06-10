import * as XLSX from 'xlsx';

export interface ExcelEmployee {
  ID: string;
  Name: string;
  Eligible: boolean;
  Cohort: string;
}

export function parseExcelFile(file: File): Promise<ExcelEmployee[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const employees = jsonData.map((row: any) => ({
          ID: String(row.ID || row.id || '').trim(),
          Name: String(row.Name || row.name || '').trim(),
          Eligible: Boolean(row.Eligible === true || row.Eligible === 'TRUE' || row.Eligible === 'true'),
          Cohort: String(row.Cohort || row.cohort || '').trim()
        }));
        
        resolve(employees);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function downloadSampleExcel() {
  const sampleData = [
    { ID: 'EMP001', Name: 'John Doe', Eligible: true, Cohort: 'A' },
    { ID: 'EMP002', Name: 'Jane Smith', Eligible: true, Cohort: 'B' },
    { ID: 'EMP003', Name: 'Bob Johnson', Eligible: false, Cohort: '' }
  ];
  
  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
  
  XLSX.writeFile(workbook, 'sample_employees.xlsx');
}
