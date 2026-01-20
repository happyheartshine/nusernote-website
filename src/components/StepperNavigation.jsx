'use client';

import PropTypes from 'prop-types';

/**
 * Fixed bottom navigation for stepper forms
 * Always visible, no scrolling needed
 */
export default function StepperNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSave,
  canGoNext = true,
  isSubmitting = false,
  showSave = false,
}) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="sticky bottom-0 z-20 bg-white border-t border-gray-200 shadow-lg">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        {/* Previous Button */}
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirstStep || isSubmitting}
          className={`flex-1 btn ${
            isFirstStep ? 'btn-outline-secondary opacity-50 cursor-not-allowed' : 'btn-outline-secondary'
          }`}
        >
          <i className="ph ph-arrow-left me-2"></i>
          前へ
        </button>

        {/* Next/Save Button */}
        {isLastStep && showSave ? (
          <button
            type="button"
            onClick={onSave}
            disabled={!canGoNext || isSubmitting}
            className={`flex-1 btn btn-primary ${!canGoNext || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? (
              <>
                <span className="me-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                保存中...
              </>
            ) : (
              <>
                <i className="ph ph-check me-2"></i>
                保存
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext || isSubmitting}
            className={`flex-1 btn btn-primary ${!canGoNext || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            次へ
            <i className="ph ph-arrow-right ms-2"></i>
          </button>
        )}
      </div>
    </div>
  );
}

StepperNavigation.propTypes = {
  currentStep: PropTypes.number.isRequired,
  totalSteps: PropTypes.number.isRequired,
  onPrevious: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  canGoNext: PropTypes.bool,
  isSubmitting: PropTypes.bool,
  showSave: PropTypes.bool,
};
