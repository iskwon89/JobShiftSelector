interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const steps = [
    { number: 1, label: "Verify ID" },
    { number: 2, label: "Select Shifts" },
    { number: 3, label: "Contact Info" }
  ];

  return (
    <div className="flex items-center justify-center space-x-4 pl-[0px] pr-[0px] text-center">
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
  );
}
