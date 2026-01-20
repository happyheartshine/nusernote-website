'use client';

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Stepper Component for multi-step forms
 * Designed for mobile-first, no-scroll experience
 */
export default function Stepper({ steps, currentStep, onStepChange, children, showProgress = true }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Progress Indicator */}
      {showProgress && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">
                ステップ {currentStep + 1} / {steps.length}
              </span>
              <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={index} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      index < currentStep
                        ? 'bg-blue-600 text-white'
                        : index === currentStep
                        ? 'bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-2'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index < currentStep ? (
                      <i className="ph ph-check text-sm"></i>
                    ) : (
                      index + 1
                    )}
                  </div>
                  {isMobile ? (
                    <span
                      className={`mt-1 text-xs text-center ${
                        index === currentStep ? 'font-semibold text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      {step.shortLabel || step.label}
                    </span>
                  ) : (
                    <span
                      className={`mt-1 text-xs text-center ${
                        index === currentStep ? 'font-semibold text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 ${
                      index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

Stepper.propTypes = {
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      shortLabel: PropTypes.string, // For mobile display
    })
  ).isRequired,
  currentStep: PropTypes.number.isRequired,
  onStepChange: PropTypes.func,
  children: PropTypes.node.isRequired,
  showProgress: PropTypes.bool,
};
