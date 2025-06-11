import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
}

export function ContactInfoForm({ userData, selectedShifts, onSubmitted, onBack }: ContactInfoFormProps) {
  const [lineId, setLineId] = useState("");
  const [phone, setPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

    if (!termsAccepted) {
      toast({
        title: "Error",
        description: "Please accept the terms and conditions to continue.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiRequest('POST', '/api/submit-application', {
        employeeId: userData.id,
        name: userData.name,
        cohort: userData.cohort,
        selectedShifts,
        lineId: lineId.trim(),
        phone: phone.trim()
      });
      
      const result = await response.json();
      
      // Invalidate shift data cache to refresh capacity for all users
      queryClient.invalidateQueries({ queryKey: ['/api/shift-data'] });
      
      onSubmitted(result.applicationId);
      
      toast({
        title: "Success",
        description: "Your application has been submitted successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
      console.error("Submission error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">Contact Information</h2>
        <p className="text-slate-600">Complete your application by providing your contact details</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <Label htmlFor="line-id">LINE ID</Label>
            <Input
              id="line-id"
              type="text"
              value={lineId}
              onChange={(e) => setLineId(e.target.value)}
              placeholder="Enter your LINE ID"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
              className="mt-1"
            />
          </div>
        </div>

        {/* Application Summary */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-slate-800 mb-4">Application Summary</h3>
            
            {/* Total Earnings */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-green-900">Total Earnings Potential</h4>
                  <p className="text-green-700 text-sm">{selectedShifts.length} shift{selectedShifts.length > 1 ? 's' : ''} selected</p>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  NT${selectedShifts.reduce((total, shift) => {
                    const rate = parseInt(shift.rate.replace(/[^\d]/g, ''));
                    return total + rate;
                  }, 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Employee:</span>
                <span className="font-medium">{userData.name} ({userData.id})</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-600">Selected Shifts:</span>
                <span className="font-medium">{selectedShifts.length} shifts</span>
              </div>
              <hr className="border-slate-200" />
              <div className="space-y-2 text-sm">
                {selectedShifts.map((shift, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-slate-600">
                      {shift.location} - {shift.date} ({shift.shift})
                    </span>
                    <span className="font-medium">{shift.rate} rate</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Usage Consent */}
        <div className="mb-8">
          <h3 className="font-semibold text-slate-800 mb-4">Data Usage Consent</h3>
          
          {/* Scrollable Consent Text */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-40 overflow-y-auto mb-4">
            <div className="text-sm text-slate-700 leading-relaxed space-y-3">
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
                  className="text-blue-600 hover:text-blue-700 underline ml-1"
                >
                  https://privacy.coupang.com/en/land/jobs/
                </a>
              </p>
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="dataConsent"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                className="mt-1"
              />
              <label htmlFor="dataConsent" className="text-sm text-slate-700 leading-relaxed">
                I have read and agree to the Data Usage terms.
              </label>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button type="button" variant="ghost" onClick={onBack}>
            ← Back to Shift Selection
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? "Submitting..." : "Submit Application"}
          </Button>
        </div>
      </form>
    </div>
  );
}
