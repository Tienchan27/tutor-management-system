export interface StepperItem {
  id: string;
  label: string;
}

interface StepperProps {
  steps: StepperItem[];
  activeStepId: string;
}

function Stepper({ steps, activeStepId }: StepperProps) {
  const activeIndex = steps.findIndex((step) => step.id === activeStepId);

  return (
    <nav className="stepper" aria-label="Progress">
      {steps.map((step, index) => {
        const isActive = step.id === activeStepId;
        const isDone = index < activeIndex;
        return (
          <div key={step.id} className="stepper-step-wrap" style={{ display: 'contents' }}>
            {index > 0 ? (
              <span className="stepper-separator" aria-hidden="true">
                /
              </span>
            ) : null}
            <div
              className={`stepper-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="stepper-index">{index + 1}</span>
              <span>{step.label}</span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export default Stepper;
