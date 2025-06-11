import { useState, useEffect } from "react";
import { StepIndicator } from "@/components/step-indicator";
import { IDVerificationForm } from "@/components/id-verification-form";
import { ShiftSelectionGrid } from "@/components/shift-selection-grid";
import { ContactInfoForm } from "@/components/contact-info-form";
import { LineConfirmation } from "@/components/line-confirmation";
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
    queryFn: async () => {
      if (!userData?.id) return null;
      const response = await fetch(`/api/application/${userData.id}`);
      if (!response.ok) {
        if (response.status === 404) return null; // No previous application
        throw new Error('Failed to fetch previous application');
      }
      return response.json();
    },
    enabled: !!userData?.id,
    retry: false,
  });

  // Load previous application data when available
  useEffect(() => {
    if (previousApplication && userData) {
      setExistingApplication(previousApplication);
      const app = previousApplication as any;
      const shifts = Array.isArray(app.selectedShifts) 
        ? app.selectedShifts 
        : [];
      setSelectedShifts(shifts);
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
    <div className="min-h-screen bg-slate-50 pt-safe">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 pt-2 sm:pt-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-4">
          <h1 className="text-lg sm:text-2xl font-semibold text-slate-800">Couflex</h1>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Step Indicator */}
        <div className="mb-6 sm:mb-8">
          <StepIndicator currentStep={currentStep} totalSteps={4} />
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-8">
            <IDVerificationForm onVerified={handleIDVerified} />
          </div>
        )}

        {currentStep === 2 && userData && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-8">
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
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-8">
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
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-8">
            <LineConfirmation
              applicationId={applicationId}
              onConfirm={() => {}}
              onBack={() => {}}
            />
          </div>
        )}
      </main>
    </div>
  );
}
