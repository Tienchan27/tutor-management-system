interface SpinnerProps {
  label?: string;
}

function Spinner({ label = 'Loading...' }: SpinnerProps) {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="spinner-label">{label}</span>
    </div>
  );
}

export default Spinner;
