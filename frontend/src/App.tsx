import { ReactElement, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfileCompletionPage from './pages/ProfileCompletionPage';
import TutorOnboardingPage from './pages/TutorOnboardingPage';
import AppShell from './components/layout/AppShell';
import RoleGate from './components/layout/RoleGate';
import { AppAccessProvider } from './context/AppAccessContext';
import { useRoleAccess } from './hooks/useRoleAccess';
import AppHomeRedirect from './pages/app/AppHomeRedirect';
import UnauthorizedPage from './pages/app/UnauthorizedPage';
import NotFoundPage from './pages/app/NotFoundPage';
import AdminTutorManagementPage from './pages/app/AdminTutorManagementPage';
import AdminClassAssignmentPage from './pages/app/AdminClassAssignmentPage';
import AdminPayoutsPage from './pages/app/AdminPayoutsPage';
import TutorDashboardPage from './pages/app/TutorDashboardPage';
import TutorSessionsPage from './pages/app/TutorSessionsPage';
import TutorBankAccountsPage from './pages/app/TutorBankAccountsPage';
import TutorClassMarketplacePage from './pages/app/TutorClassMarketplacePage';
import NotificationsPage from './pages/app/NotificationsPage';
import AccountPage from './pages/app/AccountPage';
import PlaceholderPage from './pages/app/PlaceholderPage';
import { getAuthUser, isAuthenticated } from './utils/storage';
import AppErrorBoundary from './components/layout/AppErrorBoundary';
import { startRealtime, stopRealtime } from './services/realtimeClient';

interface RouteGuardProps {
  children: ReactElement;
}

function RequireAuth({ children }: RouteGuardProps) {
  return isAuthenticated() ? children : <Navigate to="/" replace />;
}

function RequireProfileCompletion({ children }: RouteGuardProps) {
  const user = getAuthUser();
  if (user?.needsProfileCompletion !== false) {
    return children;
  }
  return user?.needsTutorOnboarding ? <Navigate to="/tutor-onboarding" replace /> : <Navigate to="/app" replace />;
}

function RequireCompletedProfile({ children }: RouteGuardProps) {
  const user = getAuthUser();
  return user?.needsProfileCompletion !== false ? <Navigate to="/profile-completion" replace /> : children;
}

function RequireTutorOnboarding({ children }: RouteGuardProps) {
  const user = getAuthUser();
  return user?.needsTutorOnboarding ? children : <Navigate to="/app" replace />;
}

function RequireNoTutorOnboarding({ children }: RouteGuardProps) {
  const user = getAuthUser();
  return user?.needsTutorOnboarding ? <Navigate to="/tutor-onboarding" replace /> : children;
}

function ProtectedAppLayout() {
  const { roles, loading, error } = useRoleAccess();

  useEffect(() => {
    let mounted = true;
    async function connect(): Promise<void> {
      try {
        await startRealtime();
      } catch {
        // Realtime is best-effort; app should still work without it.
      }
    }
    if (mounted && !loading) {
      connect();
    }
    return () => {
      mounted = false;
      stopRealtime();
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <div className="card">
            <h2 className="title title-lg">Loading workspace...</h2>
            <p className="subtitle">Resolving your role access from backend APIs.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppErrorBoundary>
      <AppAccessProvider roles={roles}>
        <AppShell roles={roles}>
          {error ? (
            <div className="card">
              <p className="error-text">{error}</p>
            </div>
          ) : null}
        </AppShell>
      </AppAccessProvider>
    </AppErrorBoundary>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
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
        path="/tutor-onboarding"
        element={
          <RequireAuth>
            <RequireCompletedProfile>
              <RequireTutorOnboarding>
                <TutorOnboardingPage />
              </RequireTutorOnboarding>
            </RequireCompletedProfile>
          </RequireAuth>
        }
      />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <RequireCompletedProfile>
              <RequireNoTutorOnboarding>
                <ProtectedAppLayout />
              </RequireNoTutorOnboarding>
            </RequireCompletedProfile>
          </RequireAuth>
        }
      >
        <Route index element={<AppHomeRedirect />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />
        <Route
          path="admin/dashboard"
          element={
            <RoleGate allowed={['ADMIN']}>
              <Navigate to="/app/admin/tutors" replace />
            </RoleGate>
          }
        />
        <Route
          path="admin/tutors"
          element={
            <RoleGate allowed={['ADMIN']}>
              <AdminTutorManagementPage />
            </RoleGate>
          }
        />
        <Route
          path="admin/class-assignment"
          element={
            <RoleGate allowed={['ADMIN']}>
              <AdminClassAssignmentPage />
            </RoleGate>
          }
        />
        <Route
          path="admin/payouts"
          element={
            <RoleGate allowed={['ADMIN']}>
              <AdminPayoutsPage />
            </RoleGate>
          }
        />
        <Route
          path="tutor/dashboard"
          element={
            <RoleGate allowed={['TUTOR']}>
              <TutorDashboardPage />
            </RoleGate>
          }
        />
        <Route
          path="tutor/sessions"
          element={
            <RoleGate allowed={['TUTOR']}>
              <TutorSessionsPage />
            </RoleGate>
          }
        />
        <Route
          path="tutor/bank-accounts"
          element={
            <RoleGate allowed={['TUTOR']}>
              <TutorBankAccountsPage />
            </RoleGate>
          }
        />
        <Route
          path="tutor/available-classes"
          element={
            <RoleGate allowed={['TUTOR']}>
              <TutorClassMarketplacePage />
            </RoleGate>
          }
        />
        <Route
          path="student/classes"
          element={
            <RoleGate allowed={['STUDENT']}>
              <PlaceholderPage
                title="Classes"
                description="Class management for students will be available when backend class APIs are published."
              />
            </RoleGate>
          }
        />
        <Route
          path="student/invoices"
          element={
            <RoleGate allowed={['STUDENT']}>
              <PlaceholderPage
                title="Invoices"
                description="Student invoices are not available yet because invoice APIs are not available."
              />
            </RoleGate>
          }
        />
        <Route
          path="student/payments"
          element={
            <RoleGate allowed={['STUDENT']}>
              <PlaceholderPage
                title="Payments"
                description="Student payment flow will be enabled after backend payment APIs are ready."
              />
            </RoleGate>
          }
        />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="/dashboard" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
