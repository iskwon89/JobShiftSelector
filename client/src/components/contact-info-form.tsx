import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/language";
import { LanguageToggle } from "@/components/language-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ShiftSelection } from "@shared/schema";

interface UserData {
  id: string;
  name: string;
  cohort: string;
}

interface ContactInfoFormProps {
  userData: UserData;
  selectedShifts: ShiftSelection[];
  onSubmitted: (applicationId: string) => void;
  onBack: () => void;
  existingApplication?: any;
  isUpdate?: boolean;
}

export function ContactInfoForm({ userData, selectedShifts, onSubmitted, onBack, existingApplication, isUpdate = false }: ContactInfoFormProps) {
  const [lineId, setLineId] = useState(existingApplication?.lineId || "");
  const [phone, setPhone] = useState(existingApplication?.phone || "");
  const [phoneError, setPhoneError] = useState("");
  const { t } = useLanguage();

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const validatePhone = (phoneNumber: string) => {
    const trimmedPhone = phoneNumber.trim();
    if (!trimmedPhone) {
      setPhoneError("Phone number is required");
      return false;
    }
    if (trimmedPhone.length !== 10) {
      setPhoneError("Phone number must be exactly 10 digits");
      return false;
    }
    if (!trimmedPhone.startsWith("09")) {
      setPhoneError("Phone number must start with 09");
      return false;
    }
    if (!/^\d+$/.test(trimmedPhone)) {
      setPhoneError("Phone number must contain only digits");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhone(value);
    if (value.trim()) {
      validatePhone(value);
    } else {
      setPhoneError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lineId.trim() || !phone.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all contact information fields.",
        variant: "destructive",
      });
      return;
    }

    if (!validatePhone(phone)) {
      return;
    }



    try {
      setIsLoading(true);
      
      let response;
      let result;
      
      if (isUpdate && existingApplication) {
        // Update existing application
        response = await apiRequest('PUT', `/api/application/${existingApplication.id}`, {
          name: userData.name,
          cohort: userData.cohort,
          selectedShifts,
          lineId: lineId.trim(),
          phone: phone.trim(),
          submittedAt: new Date().toISOString()
        });
        
        result = await response.json();
        
        toast({
          title: t('common.success'),
          description: t('success.applicationUpdated'),
        });
        
        // Generate application ID for display
        const applicationId = `APP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(existingApplication.id).padStart(3, '0')}`;
        onSubmitted(applicationId);
      } else {
        // Create new application
        response = await apiRequest('POST', '/api/submit-application', {
          employeeId: userData.id,
          name: userData.name,
          cohort: userData.cohort,
          selectedShifts,
          lineId: lineId.trim(),
          phone: phone.trim()
        });
        
        result = await response.json();
        onSubmitted(result.applicationId);
        
        toast({
          title: t('common.success'),
          description: t('success.applicationSubmitted'),
        });
      }
      
      // Invalidate shift data cache to refresh capacity for all users
      queryClient.invalidateQueries({ queryKey: ['/api/shift-data'] });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: t('error.submitFailed'),
        variant: "destructive",
      });
      console.error("Submission error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 mb-2">{t('contact.title')}</h2>
        <p className="text-slate-600 text-sm sm:text-base">{t('contact.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div>
            <Label htmlFor="line-id">{t('contact.lineId')}</Label>
            <Input
              id="line-id"
              type="text"
              value={lineId}
              onChange={(e) => setLineId(e.target.value)}
              placeholder={t('contact.lineIdPlaceholder')}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">{t('contact.phone')}</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder={t('contact.phonePlaceholder')}
              className={`mt-1 ${phoneError ? 'border-red-500' : ''}`}
            />
            {phoneError && (
              <p className="text-red-500 text-xs mt-1">{phoneError}</p>
            )}
          </div>
        </div>

        {/* Application Summary */}
        <Card className="mb-6 sm:mb-8">
          <CardContent className="pt-4 sm:pt-6">
            <h3 className="font-semibold text-slate-800 mb-4 text-sm sm:text-base">{t('summary.title')}</h3>
            
            {/* Total Earnings */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                <div>
                  <h4 className="font-semibold text-green-900 text-sm sm:text-base">{t('summary.totalEarnings')}</h4>
                  <p className="text-green-700 text-xs sm:text-sm">{selectedShifts.length} {selectedShifts.length === 1 ? t('summary.shiftSelected') : t('summary.shiftsSelected')}</p>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-green-900">
                  NT${selectedShifts.reduce((total, shift) => {
                    const rate = parseInt(shift.rate.replace(/[^\d]/g, ''));
                    return total + rate;
                  }, 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-slate-600 text-sm">{t('summary.selectedShifts')}:</span>
                <span className="font-medium text-sm">{selectedShifts.length} {selectedShifts.length === 1 ? t('summary.shiftSelected').replace('個', '') : t('summary.shiftsSelected').replace('個', '')}</span>
              </div>
              <hr className="border-slate-200" />
              <div className="space-y-2 text-xs sm:text-sm">
                {selectedShifts.map((shift, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-slate-600">
                      {shift.location} - {shift.date} ({shift.shift})
                    </span>
                    <span className="font-medium">{shift.rate}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Navigation */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
          <Button type="button" variant="ghost" onClick={onBack} className="order-2 sm:order-1">
            ← {t('common.back')}
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 order-1 sm:order-2"
          >
            {isLoading ? t('common.loading') : (isUpdate ? t('contact.updateApplication') : t('contact.submitApplication'))}
          </Button>
        </div>
      </form>
    </div>
  );
}
