import { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProfileCompletionPage from './pages/ProfileCompletionPage';
import DashboardPage from './pages/DashboardPage';
import ApiTesterPage from './pages/ApiTesterPage';
import { getAuthUser, isAuthenticated } from './utils/storage';

interface RouteGuardProps {
  children: ReactElement;
}

function RequireAuth({ children }: RouteGuardProps) {
  return isAuthenticated() ? children : <Navigate to="/" replace />;
}

function RequireProfileCompletion({ children }: RouteGuardProps) {
  const user = getAuthUser();
  return user?.needsProfileCompletion !== false ? children : <Navigate to="/dashboard" replace />;
}

function RequireCompletedProfile({ children }: RouteGuardProps) {
  const user = getAuthUser();
  return user?.needsProfileCompletion !== false ? <Navigate to="/profile-completion" replace /> : children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/api-tester" element={<ApiTesterPage />} />
      <Route
        path="/profile-completion"
        element={
          <RequireAuth>
            <RequireProfileCompletion>
              <ProfileCompletionPage />
            </RequireProfileCompletion>
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <RequireCompletedProfile>
              <DashboardPage />
            </RequireCompletedProfile>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
