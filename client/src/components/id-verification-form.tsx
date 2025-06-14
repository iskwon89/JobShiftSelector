import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/language";

import CryptoJS from 'crypto-js';

interface UserData {
  id: string;
  name: string;
  eligible: boolean;
  cohort: string;
}

interface IDVerificationFormProps {
  onVerified: (userData: UserData) => void;
}

export function IDVerificationForm({ onVerified }: IDVerificationFormProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const validateEmployeeId = (id: string) => {
    const trimmedId = id.trim();
    if (!trimmedId) {
      setValidationError(t('id.placeholder'));
      return false;
    }
    if (trimmedId.length !== 10) {
      setValidationError(t('id.nationalId') + ' must be exactly 10 characters long');
      return false;
    }
    setValidationError("");
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmployeeId(value);
    if (value.trim()) {
      validateEmployeeId(value);
    } else {
      setValidationError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmployeeId(employeeId)) {
      return;
    }

    if (!termsAccepted) {
      toast({
        title: "Consent Required",
        description: "Please agree to the data usage terms before proceeding.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      // Hash the employee ID before sending to server
      const normalizedId = employeeId.trim().toUpperCase();
      const hashedId = CryptoJS.MD5(normalizedId).toString();
      console.log("Frontend verification - Input:", normalizedId, "-> Hash:", hashedId);
      
      const response = await apiRequest('POST', '/api/verify-employee', {
        employeeId: hashedId
      });
      
      const userData = await response.json();
      onVerified(userData);
      
      toast({
        title: t('common.success'),
        description: t('id.verificationSuccess'),
        duration: 1000,
      });
    } catch (error: any) {
      const errorMessage = error.message.includes('404') 
        ? "National ID not found. Please check your ID."
        : error.message.includes('403')
        ? "You are not eligible for scheduling through Couflex."
        : "An error occurred. Please try again.";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 mb-2">{t('id.title')}</h2>
        <p className="text-slate-600 text-sm sm:text-base px-4 sm:px-0">{t('id.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6 px-4 sm:px-0">
        <div>
          <Label htmlFor="national-id" className="text-sm sm:text-base">{t('id.nationalId')}</Label>
          <Input
            id="national-id"
            type="text"
            value={employeeId}
            onChange={handleInputChange}
            placeholder={t('id.placeholder')}
            className={`mt-1 text-base sm:text-sm ${validationError ? 'border-red-500' : ''}`}
          />
          {validationError && (
            <p className="text-red-500 text-xs mt-1">{validationError}</p>
          )}
        </div>

        {/* Data Usage Consent */}
        <div className="mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm sm:text-base">{t('id.consent.title')}</h3>
          
          {/* Scrollable Consent Text */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 h-40 sm:h-48 overflow-y-auto mb-4">
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2 sm:space-y-3">
              <p>
                <strong>1. 蒐集者：</strong>火箭物流倉儲股份有限公司
              </p>
              <p>
                <strong>2. 蒐集目的：</strong>人事招募
              </p>
              <p>
                <strong>3. 蒐集個資：</strong>姓名、電話號碼、出生年月日、身分證或居留證號碼、通訊軟體帳號等個人資料。
              </p>
              <p>
                <strong>4. 利用個資期間：</strong>自取得資料日起5年（或至撤回同意為止)。
              </p>
              <p>
                <strong>5. 利用個資地區與對象：</strong>在目的範圍內，與支援招募業務的台灣與韓國關係企業利用個人資料。
              </p>
              <p>
                <strong>6. 利用個資方式：</strong>招募時與應徵者確認與溝通、資格審查、指導與進行招募、指定工作地點、處理招募相關要求與詢問、入職後辦理保險等人事管理作業。我們會將您的資料登錄人才資料庫，並透過電話以及電子郵件、簡訊、Line 等各種電子傳輸媒介向您發送各類職缺招聘通知（廣告）
              </p>
              <p>
                <strong>7. 您的權利：</strong>您可查閱、增修、複製、要求停止處理利用，或要求刪除您的個人資料。請與您的招募者或privacy.tw@coupang.com聯繫行使權利。
              </p>
              <p className="text-slate-600 italic">
                *如您不同意提供個人資料，將無法完成應徵程序並登入於我們的人才資料庫。
              </p>
              <p className="text-slate-600 italic">
                *求職者隱私權政策通知：
                <a 
                  href="https://privacy.coupang.com/en/land/jobs/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline ml-1 break-all"
                >
                  https://privacy.coupang.com/en/land/jobs/
                </a>
              </p>
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="dataConsent"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                className="mt-1 flex-shrink-0"
              />
              <label htmlFor="dataConsent" className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {t('id.consent.text')}
              </label>
            </div>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full text-sm sm:text-base"
          disabled={isLoading || !termsAccepted}
        >
          {isLoading ? t('common.loading') : t('id.verify')}
        </Button>
      </form>
    </div>
  );
}
