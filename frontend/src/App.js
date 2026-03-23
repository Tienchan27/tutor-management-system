import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProfileCompletionPage from './pages/ProfileCompletionPage';
import DashboardPage from './pages/DashboardPage';
import { isAuthenticated, getAuthUser } from './utils/storage';

function RequireAuth({ children }) {
  return isAuthenticated() ? children : <Navigate to="/" replace />;
}

function RequireProfileCompletion({ children }) {
  const user = getAuthUser();
  return user?.needsProfileCompletion ? children : <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
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
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
