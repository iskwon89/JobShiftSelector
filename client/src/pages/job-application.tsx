import { useState, useEffect } from "react";
import { StepIndicator } from "@/components/step-indicator";
import { IDVerificationForm } from "@/components/id-verification-form";
import { ShiftSelectionGrid } from "@/components/shift-selection-grid";
import { ContactInfoForm } from "@/components/contact-info-form";
import { CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ShiftSelection } from "@shared/schema";

interface UserData {
  id: string;
  name: string;
  eligible: boolean;
  cohort: string;
}

export default function JobApplication() {
  const [currentStep, setCurrentStep] = useState(1);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedShifts, setSelectedShifts] = useState<ShiftSelection[]>([]);
  const [applicationId, setApplicationId] = useState<string>("");
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);

  // Query to get existing application when user data is available
  const { data: previousApplication } = useQuery({
    queryKey: ['/api/application', userData?.id],
    enabled: !!userData?.id,
    retry: false,
  });

  // Load previous application data when available
  useEffect(() => {
    if (previousApplication && userData) {
      setExistingApplication(previousApplication);
      setSelectedShifts(previousApplication.selectedShifts || []);
      setIsReturningUser(true);
    }
  }, [previousApplication, userData]);

  const handleIDVerified = (user: UserData) => {
    setUserData(user);
    setCurrentStep(2);
  };

  const handleShiftsSelected = (shifts: ShiftSelection[]) => {
    setSelectedShifts(shifts);
    setCurrentStep(3);
  };

  const handleApplicationSubmitted = (appId: string) => {
    setApplicationId(appId);
    setCurrentStep(4);
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-semibold text-slate-800">Job Application Portal</h1>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Step Indicator */}
        <div className="mb-8">
          <StepIndicator currentStep={currentStep} totalSteps={3} />
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <IDVerificationForm onVerified={handleIDVerified} />
          </div>
        )}

        {currentStep === 2 && userData && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <ShiftSelectionGrid
              userData={userData}
              onShiftsSelected={handleShiftsSelected}
              onBack={() => goToStep(1)}
              initialSelectedShifts={selectedShifts}
              isReturningUser={isReturningUser}
            />
          </div>
        )}

        {currentStep === 3 && userData && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <ContactInfoForm
              userData={userData}
              selectedShifts={selectedShifts}
              onSubmitted={handleApplicationSubmitted}
              onBack={() => goToStep(2)}
              existingApplication={existingApplication}
              isUpdate={isReturningUser}
            />
          </div>
        )}

        {currentStep === 4 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">Application Submitted Successfully!</h2>
            <p className="text-slate-600 mb-6">Thank you for your application. We'll contact you soon regarding your selected shifts.</p>
            <p className="text-sm text-slate-500">
              Application ID: <span className="font-mono bg-slate-100 px-2 py-1 rounded">{applicationId}</span>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
