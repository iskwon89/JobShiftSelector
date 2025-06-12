import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.admin': 'Admin',
    'nav.application': 'Job Application',
    
    // Common
    'common.next': 'Next',
    'common.back': 'Back',
    'common.submit': 'Submit',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.upload': 'Upload',
    'common.download': 'Download',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.required': 'Required',
    'common.optional': 'Optional',
    
    // Step Indicator
    'steps.verifyIdShort': 'ID',
    'steps.selectShiftsShort': 'Shifts',
    'steps.contactInfoShort': 'Info',
    
    // ID Verification
    'id.title': 'Employee ID Verification',
    'id.subtitle': 'Enter your National ID to verify eligibility',
    'id.nationalId': 'National ID',
    'id.placeholder': 'Enter your National ID',
    'id.consent.title': 'Data Collection Consent',
    'id.consent.text': 'I consent to the collection and processing of my personal data for employment purposes.',
    'id.consent.required': 'You must provide consent to continue.',
    'id.verify': 'Verify ID',
    'id.notFound': 'Employee not found or not eligible',
    'id.notEligible': 'You are not eligible for shift selection at this time.',
    
    // Shift Selection
    'shift.title': 'Select Your Shifts',
    'shift.subtitle': 'Choose your preferred work shifts',
    'shift.dayShift': 'Day Shift',
    'shift.nightShift': 'Night Shift',
    'shift.location': 'Location',
    'shift.date': 'Date',
    'shift.rate': 'Rate',
    'shift.capacity': 'Capacity',
    'shift.remaining': 'remaining',
    'shift.full': 'Full',
    'shift.selected': 'Selected',
    'shift.selectShifts': 'Select Shifts',
    'shift.totalEarnings': 'Total Potential Earnings',
    'shift.noShifts': 'Please select at least one shift to continue.',
    'shift.selectedSuccess': 'Shift selected successfully!',
    
    // Contact Info
    'contact.title': 'Contact Information',
    'contact.subtitle': 'Provide your contact details',
    'contact.phone': 'Phone Number',
    'contact.phonePlaceholder': 'Enter your phone number',
    'contact.lineId': 'Line ID',
    'contact.lineIdPlaceholder': 'Enter your Line ID',
    'contact.phoneRequired': 'Phone number is required',
    'contact.lineRequired': 'Line ID is required',
    'contact.phoneInvalid': 'Please enter a valid Taiwan phone number',
    'contact.submitApplication': 'Submit Application',
    'contact.updateApplication': 'Update Application',
    
    // Line Confirmation
    'line.title': 'Let\'s Connect!',
    'line.step1': 'Add our official Coupang Line account for important updates and shift reminders.',
    'line.step2': 'You will receive a confirmation message on Line/SMS shortly.',
    'line.step3': 'Please arrive at the designated Fulfillment Center at least 15 minutes before your shift starts.',
    'line.step4': 'Bring your National ID for verification on your first day.',
    'line.qrInstructions': 'Scan this QR code with your LINE app to add our official account',
    'line.addViaLink': 'Or click here to add via link',
    
    // Admin
    'admin.title': 'Admin Dashboard',
    'admin.login': 'Admin Login',
    'admin.username': 'Username',
    'admin.password': 'Password',
    'admin.loginButton': 'Login',
    'admin.logout': 'Logout',
    'admin.shiftMatrix': 'Shift Pricing Matrix',
    'admin.cohortManagement': 'Cohort Management',
    'admin.excelUpload': 'Excel Upload',
    'admin.applications': 'Applications',
    'admin.downloadApplications': 'Download Applications',
    'admin.addLocation': 'Add Location',
    'admin.addDate': 'Add Date',
    'admin.createCohort': 'Create Cohort',
    'admin.duplicateCohort': 'Duplicate Cohort',
    'admin.deleteCohort': 'Delete Cohort',
    'admin.employeeDatabase': 'Employee Database Upload',
    'admin.fileFormat': 'Excel File Format',
    'admin.uploadSuccess': 'File uploaded successfully',
    
    // Steps
    'steps.idVerification': 'ID Verification',
    'steps.shiftSelection': 'Shift Selection',
    'steps.contactInfo': 'Contact Info',
    'steps.lineConfirmation': 'Line Confirmation',
    
    // Errors
    'error.network': 'Network error occurred',
    'error.server': 'Server error occurred',
    'error.validation': 'Please check your input',
    'error.unauthorized': 'Unauthorized access',
    'error.shiftFull': 'This shift has reached maximum capacity',
    'error.submitFailed': 'Failed to submit application. Please try again.',
    
    // Success Messages
    'success.applicationSubmitted': 'Application submitted successfully',
    'success.applicationUpdated': 'Application updated successfully',
    'success.dataUploaded': 'Data uploaded successfully',
    'success.settingsSaved': 'Settings saved successfully',
    
    // Application Summary
    'summary.title': 'Application Summary',
    'summary.totalEarnings': 'Total Earnings Potential',
    'summary.shiftsSelected': 'shifts selected',
    'summary.shiftSelected': 'shift selected',
    'summary.selectedShifts': 'Selected Shifts',
  },
  
  zh: {
    // Navigation
    'nav.home': '首頁',
    'nav.admin': '管理員',
    'nav.application': '工作申請',
    
    // Common
    'common.next': '下一步',
    'common.back': '返回',
    'common.submit': '提交',
    'common.cancel': '取消',
    'common.confirm': '確認',
    'common.save': '保存',
    'common.delete': '刪除',
    'common.edit': '編輯',
    'common.add': '添加',
    'common.upload': '上傳',
    'common.download': '下載',
    'common.loading': '載入中...',
    'common.error': '錯誤',
    'common.success': '成功',
    'common.required': '必填',
    'common.optional': '選填',
    
    // Step Indicator
    'steps.verifyIdShort': 'ID',
    'steps.selectShiftsShort': '班次',
    'steps.contactInfoShort': '資訊',
    
    // ID Verification
    'id.title': '員工身份驗證',
    'id.subtitle': '請輸入您的身份證號碼以驗證資格',
    'id.nationalId': '身份證號碼',
    'id.placeholder': '請輸入您的身份證號碼',
    'id.consent.title': '資料收集同意書',
    'id.consent.text': '我同意為就業目的收集和處理我的個人資料。',
    'id.consent.required': '您必須提供同意才能繼續。',
    'id.verify': '驗證身份',
    'id.notFound': '找不到員工或不符合資格',
    'id.notEligible': '您目前不符合班次選擇的資格。',
    
    // Shift Selection
    'shift.title': '選擇您的班次',
    'shift.subtitle': '選擇您偏好的工作班次',
    'shift.dayShift': '日班',
    'shift.nightShift': '夜班',
    'shift.location': '地點',
    'shift.date': '日期',
    'shift.rate': '薪資',
    'shift.capacity': '容量',
    'shift.remaining': '剩餘',
    'shift.full': '已滿',
    'shift.selected': '已選擇',
    'shift.selectShifts': '選擇班次',
    'shift.totalEarnings': '總潛在收入',
    'shift.noShifts': '請至少選擇一個班次才能繼續。',
    'shift.selectedSuccess': '班次選擇成功！',
    
    // Contact Info
    'contact.title': '聯絡資訊',
    'contact.subtitle': '請提供您的聯絡方式',
    'contact.phone': '電話號碼',
    'contact.phonePlaceholder': '請輸入您的電話號碼',
    'contact.lineId': 'Line ID',
    'contact.lineIdPlaceholder': '請輸入您的Line ID',
    'contact.phoneRequired': '電話號碼為必填項目',
    'contact.lineRequired': 'Line ID為必填項目',
    'contact.phoneInvalid': '請輸入有效的台灣電話號碼',
    'contact.submitApplication': '提交申請',
    'contact.updateApplication': '更新申請',
    
    // Line Confirmation
    'line.title': '讓我們連接！',
    'line.step1': '加入我們的官方 Coupang Line 帳號以獲取重要更新和班次提醒。',
    'line.step2': '您將很快在 Line/SMS 上收到確認訊息。',
    'line.step3': '請在班次開始前至少 15 分鐘到達指定的物流中心。',
    'line.step4': '請在第一天帶上您的身分證進行驗證。',
    'line.qrInstructions': '用您的 LINE 應用程式掃描此 QR 碼以加入我們的官方帳號',
    'line.addViaLink': '或點擊此處透過連結加入',
    
    // Admin
    'admin.title': '管理員儀表板',
    'admin.login': '管理員登入',
    'admin.username': '用戶名',
    'admin.password': '密碼',
    'admin.loginButton': '登入',
    'admin.logout': '登出',
    'admin.shiftMatrix': '班次價格矩陣',
    'admin.cohortManagement': '群組管理',
    'admin.excelUpload': 'Excel上傳',
    'admin.applications': '申請表',
    'admin.downloadApplications': '下載申請表',
    'admin.addLocation': '添加地點',
    'admin.addDate': '添加日期',
    'admin.createCohort': '創建群組',
    'admin.duplicateCohort': '複製群組',
    'admin.deleteCohort': '刪除群組',
    'admin.employeeDatabase': '員工數據庫上傳',
    'admin.fileFormat': 'Excel文件格式',
    'admin.uploadSuccess': '文件上傳成功',
    
    // Steps
    'steps.idVerification': '身份驗證',
    'steps.shiftSelection': '班次選擇',
    'steps.contactInfo': '聯絡資訊',
    'steps.lineConfirmation': 'Line確認',
    
    // Errors
    'error.network': '發生網路錯誤',
    'error.server': '發生伺服器錯誤',
    'error.validation': '請檢查您的輸入',
    'error.unauthorized': '未授權存取',
    'error.shiftFull': '此班次已達最大容量',
    'error.submitFailed': '提交申請失敗，請重試。',
    
    // Success Messages
    'success.applicationSubmitted': '申請提交成功',
    'success.applicationUpdated': '申請更新成功',
    'success.dataUploaded': '資料上傳成功',
    'success.settingsSaved': '設定保存成功',
    
    // Application Summary
    'summary.title': '申請摘要',
    'summary.totalEarnings': '總潛在收入',
    'summary.shiftsSelected': '個班次已選擇',
    'summary.shiftSelected': '個班次已選擇',
    'summary.selectedShifts': '已選班次',
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('couflex-language');
    return (saved as Language) || 'zh';
  });

  useEffect(() => {
    localStorage.setItem('couflex-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}