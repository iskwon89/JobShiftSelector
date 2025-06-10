import * as XLSX from 'xlsx';

export function downloadSampleExcel() {
  // Create sample data matching the expected format with various test cases
  const sampleData = [
    { ID: 'TEST1', Name: 'John Smith', Eligible: true, Cohort: 'A' },
    { ID: 'TEST2', Name: 'Jane Doe', Eligible: false, Cohort: 'A' },
    { ID: 'TEST3', Name: 'Bob Johnson', Eligible: true, Cohort: 'B' },
    { ID: 'TEST4', Name: 'Alice Brown', Eligible: true, Cohort: 'C' },
    { ID: 'TEST5', Name: 'Charlie Wilson', Eligible: false, Cohort: 'B' },
    { ID: 'EMP001', Name: 'Sarah Davis', Eligible: true, Cohort: 'A' },
    { ID: 'EMP002', Name: 'Mike Taylor', Eligible: true, Cohort: 'B' },
  ];

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');

  // Save file
  XLSX.writeFile(wb, 'sample_employees.xlsx');
}