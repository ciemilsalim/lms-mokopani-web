import React from 'react';

interface WizardStepperProps {
    currentStep: number;
    steps: Array<{ id: number; title: string; description: string }>;
    onStepClick?: (stepId: number) => void;
}

export const WizardStepper: React.FC<WizardStepperProps> = ({ currentStep, steps, onStepClick }) => {
    return (
        <div className="w-full py-4 mb-6">
            <div className="flex items-center justify-between relative">
                {/* Connecting Bar */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
                <div
                    className="absolute top-1/2 left-0 h-1 bg-indigo-600 dark:bg-indigo-500 -translate-y-1/2 transition-all duration-500 z-0"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                />

                {/* Steps */}
                {steps.map((step) => {
                    const isCompleted = currentStep > step.id;
                    const isCurrent = currentStep === step.id;

                    return (
                        <div
                            key={step.id}
                            onClick={() => isCompleted && onStepClick && onStepClick(step.id)}
                            className={`relative z-10 flex flex-col items-center group cursor-pointer ${
                                isCompleted ? 'opacity-100' : isCurrent ? 'opacity-100' : 'opacity-70'
                            }`}
                        >
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-md ${
                                    isCompleted
                                        ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                        : isCurrent
                                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/20 shadow-indigo-600/30 scale-110'
                                        : 'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-500'
                                }`}
                            >
                                {isCompleted ? '✓' : step.id}
                            </div>
                            <div className="mt-2 text-center">
                                <p
                                    className={`text-xs font-semibold ${
                                        isCurrent
                                            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                                            : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    {step.title}
                                </p>
                                <p className="text-[10px] text-slate-400 hidden sm:block">{step.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
