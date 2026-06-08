import Spinner from '../ui/Spinner';

function AppLoadingSkeleton() {
  return (
    <div className="app-loading-skeleton">
      <Spinner label="Loading workspace..." />
    </div>
  );
}

export default AppLoadingSkeleton;
