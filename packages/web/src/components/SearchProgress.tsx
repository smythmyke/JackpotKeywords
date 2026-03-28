import { useState, useEffect } from 'react';

const STEPS = [
  { label: 'Analyzing your product description', duration: 2000 },
  { label: 'Generating keyword seeds across 10 categories', duration: 3000 },
  { label: 'Expanding long-tail keywords via autocomplete', duration: 4000 },
  { label: 'Enriching keywords with Google Ads data', duration: 8000 },
  { label: 'Overlaying Google Trends data', duration: 3000 },
  { label: 'Scoring and classifying opportunities', duration: 2000 },
];

export default function SearchProgress() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep >= STEPS.length) return;
    const timer = setTimeout(() => {
      setCurrentStep((s) => Math.min(s + 1, STEPS.length));
    }, STEPS[currentStep].duration);
    return () => clearTimeout(timer);
  }, [currentStep]);

  return (
    <div className="w-full max-w-lg mx-auto py-12">
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const isActive = i === currentStep;
          const isDone = i < currentStep;

          return (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                isDone
                  ? 'bg-jackpot-500 text-black'
                  : isActive
                    ? 'bg-jackpot-500/20 border-2 border-jackpot-500'
                    : 'bg-gray-800 border border-gray-700'
              }`}>
                {isDone && (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {isActive && (
                  <div className="w-2 h-2 bg-jackpot-500 rounded-full animate-pulse" />
                )}
              </div>
              <span className={`text-sm transition-colors ${
                isDone
                  ? 'text-gray-400'
                  : isActive
                    ? 'text-white font-medium'
                    : 'text-gray-600'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
