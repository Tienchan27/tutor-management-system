import { lazy, ReactElement, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfileCompletionPage from './pages/ProfileCompletionPage';
import TutorOnboardingPage from './pages/TutorOnboardingPage';
import AppShell from './components/layout/AppShell';
import AppLoadingSkeleton from './components/layout/AppLoadingSkeleton';
import RoleGate from './components/layout/RoleGate';
import { AppAccessProvider } from './context/AppAccessContext';
import { useRoleAccess } from './hooks/useRoleAccess';
import AppHomeRedirect from './pages/app/AppHomeRedirect';
import UnauthorizedPage from './pages/app/UnauthorizedPage';
import NotFoundPage from './pages/app/NotFoundPage';
import StudentComingSoon from './pages/app/StudentComingSoon';
import { getAuthUser, isAuthenticated } from './utils/storage';
import AppErrorBoundary from './components/layout/AppErrorBoundary';
import { startRealtime, stopRealtime } from './services/realtimeClient';

const AdminTutorManagementPage = lazy(() => import('./pages/app/AdminTutorManagementPage'));
const AdminClassAssignmentPage = lazy(() => import('./pages/app/AdminClassAssignmentPage'));
const AdminPayoutsPage = lazy(() => import('./pages/app/AdminPayoutsPage'));
const AdminStudentInvoicesPage = lazy(() => import('./pages/app/AdminStudentInvoicesPage'));
const TutorDashboardPage = lazy(() => import('./pages/app/TutorDashboardPage'));
const TutorSessionsPage = lazy(() => import('./pages/app/TutorSessionsPage'));
const TutorBankAccountsPage = lazy(() => import('./pages/app/TutorBankAccountsPage'));
const TutorClassMarketplacePage = lazy(() => import('./pages/app/TutorClassMarketplacePage'));
const NotificationsPage = lazy(() => import('./pages/app/NotificationsPage'));
const AccountPage = lazy(() => import('./pages/app/AccountPage'));
const StudentClassesPage = lazy(() => import('./pages/app/StudentClassesPage'));
const StudentInvoicesPage = lazy(() => import('./pages/app/StudentInvoicesPage'));

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
        <AppLoadingSkeleton />
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
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>
                Retry
              </button>
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
          path="admin/student-invoices"
          element={
            <RoleGate allowed={['ADMIN']}>
              <AdminStudentInvoicesPage />
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
              <StudentClassesPage />
            </RoleGate>
          }
        />
        <Route
          path="student/invoices"
          element={
            <RoleGate allowed={['STUDENT']}>
              <StudentInvoicesPage />
            </RoleGate>
          }
        />
        <Route
          path="student/payments"
          element={
            <RoleGate allowed={['STUDENT']}>
              <StudentComingSoon
                title="Payments"
                description="Online payment and bank confirmation will be available in a future release."
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
