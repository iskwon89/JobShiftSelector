import * as XLSX from 'xlsx';

export function downloadSampleExcel() {
  // Create sample data matching the expected format
  const sampleData = [
    { ID: 'Test1', Name: 'Name 1', Eligible: true, Cohort: 'A' },
    { ID: 'Test2', Name: 'Name 2', Eligible: false, Cohort: 'A' },
    { ID: 'Test3', Name: 'Name 3', Eligible: true, Cohort: 'B' },
    { ID: 'Test4', Name: 'Name 4', Eligible: true, Cohort: 'A' },
    { ID: 'Test5', Name: 'Name 5', Eligible: false, Cohort: 'B' },
  ];

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');

  // Save file
  XLSX.writeFile(wb, 'sample_employees.xlsx');
}