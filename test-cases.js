import XLSX from 'xlsx';

// Test cases for Couflex job application system
const testCases = [
  // ID Verification Test Cases
  {
    'Test Case ID': 'TC_ID_001',
    'Module': 'ID Verification',
    'Test Scenario': 'Valid ID - Eligible Employee',
    'Test Data': 'A134382733',
    'Expected Result': 'Success - Navigate to shift selection',
    'Priority': 'High',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_ID_002',
    'Module': 'ID Verification',
    'Test Scenario': 'Valid ID - Ineligible Employee',
    'Test Data': 'A999999999',
    'Expected Result': 'Error - Not eligible message',
    'Priority': 'High',
    'Test Type': 'Negative'
  },
  {
    'Test Case ID': 'TC_ID_003',
    'Module': 'ID Verification',
    'Test Scenario': 'Invalid ID - Not Found',
    'Test Data': 'A000000000',
    'Expected Result': 'Error - ID not found',
    'Priority': 'High',
    'Test Type': 'Negative'
  },
  {
    'Test Case ID': 'TC_ID_004',
    'Module': 'ID Verification',
    'Test Scenario': 'Empty ID Field',
    'Test Data': '',
    'Expected Result': 'Validation error - Required field',
    'Priority': 'Medium',
    'Test Type': 'Negative'
  },
  {
    'Test Case ID': 'TC_ID_005',
    'Module': 'ID Verification',
    'Test Scenario': 'ID Too Short',
    'Test Data': 'A12345',
    'Expected Result': 'Validation error - Must be 10 characters',
    'Priority': 'Medium',
    'Test Type': 'Negative'
  },
  {
    'Test Case ID': 'TC_ID_006',
    'Module': 'ID Verification',
    'Test Scenario': 'ID Too Long',
    'Test Data': 'A12345678901',
    'Expected Result': 'Validation error - Must be 10 characters',
    'Priority': 'Medium',
    'Test Type': 'Negative'
  },
  {
    'Test Case ID': 'TC_ID_007',
    'Module': 'ID Verification',
    'Test Scenario': 'Submit Without Consent',
    'Test Data': 'A134382733',
    'Expected Result': 'Error - Must agree to data usage terms',
    'Priority': 'High',
    'Test Type': 'Negative'
  },
  {
    'Test Case ID': 'TC_ID_008',
    'Module': 'ID Verification',
    'Test Scenario': 'Lowercase ID Input',
    'Test Data': 'a134382733',
    'Expected Result': 'Success - Normalized to uppercase',
    'Priority': 'Medium',
    'Test Type': 'Positive'
  },

  // Shift Selection Test Cases
  {
    'Test Case ID': 'TC_SHIFT_001',
    'Module': 'Shift Selection',
    'Test Scenario': 'Select Single Day Shift',
    'Test Data': 'TAO4, Jun 16, DS',
    'Expected Result': 'Shift selected successfully',
    'Priority': 'High',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_SHIFT_002',
    'Module': 'Shift Selection',
    'Test Scenario': 'Select Single Night Shift',
    'Test Data': 'TAO4, Jun 16, NS',
    'Expected Result': 'Shift selected successfully',
    'Priority': 'High',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_SHIFT_003',
    'Module': 'Shift Selection',
    'Test Scenario': 'Select Multiple Different Days',
    'Test Data': 'TAO4 Jun 16 DS, TAO4 Jun 17 NS',
    'Expected Result': 'Multiple shifts selected',
    'Priority': 'High',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_SHIFT_004',
    'Module': 'Shift Selection',
    'Test Scenario': 'Change Shift Same Day',
    'Test Data': 'Select TAO4 Jun 16 DS, then TAO4 Jun 16 NS',
    'Expected Result': 'Previous selection replaced',
    'Priority': 'Medium',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_SHIFT_005',
    'Module': 'Shift Selection',
    'Test Scenario': 'Deselect Shift',
    'Test Data': 'Select then click same shift again',
    'Expected Result': 'Shift deselected',
    'Priority': 'Medium',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_SHIFT_006',
    'Module': 'Shift Selection',
    'Test Scenario': 'Select Fully Booked Shift',
    'Test Data': 'Click on fully booked shift',
    'Expected Result': 'Error - Shift is fully booked',
    'Priority': 'High',
    'Test Type': 'Negative'
  },
  {
    'Test Case ID': 'TC_SHIFT_007',
    'Module': 'Shift Selection',
    'Test Scenario': 'Continue Without Selection',
    'Test Data': 'No shifts selected',
    'Expected Result': 'Error - Must select at least one shift',
    'Priority': 'High',
    'Test Type': 'Negative'
  },
  {
    'Test Case ID': 'TC_SHIFT_008',
    'Module': 'Shift Selection',
    'Test Scenario': 'Maximum Shifts Selection',
    'Test Data': 'Select all available shifts',
    'Expected Result': 'All shifts selected successfully',
    'Priority': 'Low',
    'Test Type': 'Positive'
  },

  // Contact Information Test Cases
  {
    'Test Case ID': 'TC_CONTACT_001',
    'Module': 'Contact Information',
    'Test Scenario': 'Valid Phone and Line ID',
    'Test Data': 'Phone: 0912345678, Line: testuser123',
    'Expected Result': 'Application submitted successfully',
    'Priority': 'High',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_CONTACT_002',
    'Module': 'Contact Information',
    'Test Scenario': 'Empty Phone Number',
    'Test Data': 'Phone: "", Line: testuser123',
    'Expected Result': 'Validation error - Phone required',
    'Priority': 'High',
    'Test Type': 'Negative'
  },
  {
    'Test Case ID': 'TC_CONTACT_003',
    'Module': 'Contact Information',
    'Test Scenario': 'Empty Line ID',
    'Test Data': 'Phone: 0912345678, Line: ""',
    'Expected Result': 'Validation error - Line ID required',
    'Priority': 'High',
    'Test Type': 'Negative'
  },
  {
    'Test Case ID': 'TC_CONTACT_004',
    'Module': 'Contact Information',
    'Test Scenario': 'Invalid Phone Format',
    'Test Data': 'Phone: 12345, Line: testuser123',
    'Expected Result': 'Validation error - Invalid Taiwan phone',
    'Priority': 'Medium',
    'Test Type': 'Negative'
  },
  {
    'Test Case ID': 'TC_CONTACT_005',
    'Module': 'Contact Information',
    'Test Scenario': 'Phone with Country Code',
    'Test Data': 'Phone: +886912345678, Line: testuser123',
    'Expected Result': 'Phone normalized and accepted',
    'Priority': 'Medium',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_CONTACT_006',
    'Module': 'Contact Information',
    'Test Scenario': 'Phone with Spaces',
    'Test Data': 'Phone: 091 234 5678, Line: testuser123',
    'Expected Result': 'Phone normalized and accepted',
    'Priority': 'Low',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_CONTACT_007',
    'Module': 'Contact Information',
    'Test Scenario': 'Update Existing Application',
    'Test Data': 'Returning user updates contact info',
    'Expected Result': 'Application updated successfully',
    'Priority': 'High',
    'Test Type': 'Positive'
  },

  // Line Confirmation Test Cases
  {
    'Test Case ID': 'TC_LINE_001',
    'Module': 'Line Confirmation',
    'Test Scenario': 'QR Code Display',
    'Test Data': 'Navigate to Line confirmation',
    'Expected Result': 'QR code and instructions displayed',
    'Priority': 'Medium',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_LINE_002',
    'Module': 'Line Confirmation',
    'Test Scenario': 'Add via Link Button',
    'Test Data': 'Click "Add via link" button',
    'Expected Result': 'Line app opens with add friend page',
    'Priority': 'Medium',
    'Test Type': 'Positive'
  },

  // Language Toggle Test Cases
  {
    'Test Case ID': 'TC_LANG_001',
    'Module': 'Language Toggle',
    'Test Scenario': 'Switch to English',
    'Test Data': 'Click English when Chinese is active',
    'Expected Result': 'All text displays in English',
    'Priority': 'Medium',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_LANG_002',
    'Module': 'Language Toggle',
    'Test Scenario': 'Switch to Chinese',
    'Test Data': 'Click 中文 when English is active',
    'Expected Result': 'All text displays in Chinese',
    'Priority': 'Medium',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_LANG_003',
    'Module': 'Language Toggle',
    'Test Scenario': 'Language Persistence',
    'Test Data': 'Change language and refresh page',
    'Expected Result': 'Selected language persists',
    'Priority': 'Low',
    'Test Type': 'Positive'
  },

  // Navigation Test Cases
  {
    'Test Case ID': 'TC_NAV_001',
    'Module': 'Navigation',
    'Test Scenario': 'Back Button Functionality',
    'Test Data': 'Click back on any step',
    'Expected Result': 'Navigate to previous step',
    'Priority': 'Medium',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_NAV_002',
    'Module': 'Navigation',
    'Test Scenario': 'Step Indicator Display',
    'Test Data': 'Progress through application',
    'Expected Result': 'Current step highlighted correctly',
    'Priority': 'Low',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_NAV_003',
    'Module': 'Navigation',
    'Test Scenario': 'Direct URL Access',
    'Test Data': 'Access application URL directly',
    'Expected Result': 'Start from ID verification step',
    'Priority': 'Low',
    'Test Type': 'Positive'
  },

  // Mobile Responsiveness Test Cases
  {
    'Test Case ID': 'TC_MOBILE_001',
    'Module': 'Mobile UI',
    'Test Scenario': 'Mobile Shift Selection',
    'Test Data': 'Use mobile viewport for shift selection',
    'Expected Result': 'Card layout displays correctly',
    'Priority': 'Medium',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_MOBILE_002',
    'Module': 'Mobile UI',
    'Test Scenario': 'Touch Interactions',
    'Test Data': 'Tap to select shifts on mobile',
    'Expected Result': 'Touch events work properly',
    'Priority': 'Medium',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_MOBILE_003',
    'Module': 'Mobile UI',
    'Test Scenario': 'Form Input on Mobile',
    'Test Data': 'Fill contact form on mobile',
    'Expected Result': 'Forms are easily usable',
    'Priority': 'Medium',
    'Test Type': 'Positive'
  },

  // Toast Message Test Cases
  {
    'Test Case ID': 'TC_TOAST_001',
    'Module': 'Toast Messages',
    'Test Scenario': 'Success Toast Duration',
    'Test Data': 'Complete any successful action',
    'Expected Result': 'Toast appears for 1 second',
    'Priority': 'Low',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_TOAST_002',
    'Module': 'Toast Messages',
    'Test Scenario': 'Success Toast Language',
    'Test Data': 'Success action in Chinese mode',
    'Expected Result': 'Toast displays in Chinese',
    'Priority': 'Low',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_TOAST_003',
    'Module': 'Toast Messages',
    'Test Scenario': 'Error Toast Display',
    'Test Data': 'Trigger validation error',
    'Expected Result': 'Error toast shows with description',
    'Priority': 'Medium',
    'Test Type': 'Positive'
  },

  // Data Persistence Test Cases
  {
    'Test Case ID': 'TC_DATA_001',
    'Module': 'Data Persistence',
    'Test Scenario': 'Return User Flow',
    'Test Data': 'User with existing application',
    'Expected Result': 'Previous data pre-populated',
    'Priority': 'High',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_DATA_002',
    'Module': 'Data Persistence',
    'Test Scenario': 'Shift Capacity Updates',
    'Test Data': 'Multiple users selecting same shift',
    'Expected Result': 'Capacity decrements correctly',
    'Priority': 'High',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_DATA_003',
    'Module': 'Data Persistence',
    'Test Scenario': 'Application ID Generation',
    'Test Data': 'Submit new application',
    'Expected Result': 'Unique application ID generated',
    'Priority': 'Medium',
    'Test Type': 'Positive'
  },

  // Edge Cases
  {
    'Test Case ID': 'TC_EDGE_001',
    'Module': 'Edge Cases',
    'Test Scenario': 'Network Interruption',
    'Test Data': 'Disconnect network during submission',
    'Expected Result': 'Error message displayed',
    'Priority': 'Low',
    'Test Type': 'Negative'
  },
  {
    'Test Case ID': 'TC_EDGE_002',
    'Module': 'Edge Cases',
    'Test Scenario': 'Concurrent User Actions',
    'Test Data': 'Multiple users same shift simultaneously',
    'Expected Result': 'First user gets shift, others see error',
    'Priority': 'Medium',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_EDGE_003',
    'Module': 'Edge Cases',
    'Test Scenario': 'Browser Refresh During Flow',
    'Test Data': 'Refresh page mid-application',
    'Expected Result': 'Returns to appropriate step',
    'Priority': 'Low',
    'Test Type': 'Positive'
  },

  // Security Test Cases
  {
    'Test Case ID': 'TC_SEC_001',
    'Module': 'Security',
    'Test Scenario': 'ID Hash Protection',
    'Test Data': 'Check network requests',
    'Expected Result': 'ID is hashed before transmission',
    'Priority': 'High',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_SEC_002',
    'Module': 'Security',
    'Test Scenario': 'Data Consent Requirement',
    'Test Data': 'Try to proceed without consent',
    'Expected Result': 'Blocked until consent given',
    'Priority': 'High',
    'Test Type': 'Negative'
  },

  // Admin Panel Test Cases
  {
    'Test Case ID': 'TC_ADMIN_001',
    'Module': 'Admin Panel',
    'Test Scenario': 'Admin Login',
    'Test Data': 'Valid admin credentials',
    'Expected Result': 'Access to admin dashboard',
    'Priority': 'High',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_ADMIN_002',
    'Module': 'Admin Panel',
    'Test Scenario': 'Download Applications',
    'Test Data': 'Click download applications',
    'Expected Result': 'Excel file with all applications',
    'Priority': 'Medium',
    'Test Type': 'Positive'
  },
  {
    'Test Case ID': 'TC_ADMIN_003',
    'Module': 'Admin Panel',
    'Test Scenario': 'Upload Employee Data',
    'Test Data': 'Upload valid Excel file',
    'Expected Result': 'Employee data imported successfully',
    'Priority': 'High',
    'Test Type': 'Positive'
  }
];

// Create workbook and worksheet
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(testCases);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, "Test Cases");

// Write file
XLSX.writeFile(wb, 'couflex-test-cases.xlsx');
console.log('Test cases Excel file created: couflex-test-cases.xlsx');