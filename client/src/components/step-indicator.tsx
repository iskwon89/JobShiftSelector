import { useLanguage } from "@/lib/language";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const { t } = useLanguage();
  
  const steps = [
    { number: 1, label: t('steps.idVerification'), shortLabel: t('steps.verifyIdShort') },
    { number: 2, label: t('steps.shiftSelection'), shortLabel: t('steps.selectShiftsShort') },
    { number: 3, label: t('steps.contactInfo'), shortLabel: t('steps.contactInfoShort') }
  ];

  return (
    <div className="w-full px-4 sm:px-6">
      {/* Mobile version - vertical compact layout */}
      <div className="flex sm:hidden items-center justify-between max-w-xs mx-auto">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-medium text-xs ${
                step.number <= currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-300 text-slate-500'
              }`}>
                {step.number}
              </div>
              <span className={`mt-1 text-xs font-medium text-center ${
                step.number <= currentStep
                  ? 'text-blue-600'
                  : 'text-slate-500'
              }`}>
                {step.shortLabel}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="w-8 h-0.5 bg-slate-300 mx-2 mt-[-12px]"></div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop version - horizontal layout */}
      <div className="hidden sm:flex items-center justify-center space-x-4">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-medium text-sm ${
                step.number <= currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-300 text-slate-500'
              }`}>
                {step.number}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                step.number <= currentStep
                  ? 'text-blue-600'
                  : 'text-slate-500'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="w-12 h-0.5 bg-slate-300 ml-4"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
