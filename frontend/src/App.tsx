import { lazy, ReactElement, useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { setNavigator } from './utils/navigation';
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

const AdminDashboardPage = lazy(() => import('./pages/app/admin/AdminDashboardPage'));
const AdminClassesPage = lazy(() => import('./pages/app/admin/classes/AdminClassesPage'));
const AdminTutorsPage = lazy(() => import('./pages/app/admin/AdminTutorsPage'));
const AdminPayoutsPage = lazy(() => import('./pages/app/admin/AdminPayoutsPage'));
const AdminStudentBillingPage = lazy(() => import('./pages/app/admin/AdminStudentBillingPage'));
const TutorHomePage = lazy(() => import('./pages/app/tutor/TutorHomePage'));
const TutorMyClassesPage = lazy(() => import('./pages/app/tutor/TutorMyClassesPage'));
const TutorSessionsPage = lazy(() => import('./pages/app/tutor/TutorSessionsPage'));
const TutorMarketplacePage = lazy(() => import('./pages/app/tutor/TutorMarketplacePage'));
const TutorEarningsLayout = lazy(() => import('./pages/app/tutor/earnings/TutorEarningsLayout'));
const TutorPayoutsPage = lazy(() => import('./pages/app/tutor/earnings/TutorPayoutsPage'));
const TutorBankAccountsPage = lazy(() => import('./pages/app/tutor/earnings/TutorBankAccountsPage'));
const StudentHomePage = lazy(() => import('./pages/app/student/StudentHomePage'));
const StudentClassesPage = lazy(() => import('./pages/app/student/StudentClassesPage'));
const StudentBillingPage = lazy(() => import('./pages/app/student/StudentBillingPage'));
const NotificationsPage = lazy(() => import('./pages/app/NotificationsPage'));
const AccountPage = lazy(() => import('./pages/app/AccountPage'));

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
  const navigate = useNavigate();
  useEffect(() => {
    setNavigator(navigate);
  }, [navigate]);

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

        {/* Admin */}
        <Route
          path="admin/dashboard"
          element={
            <RoleGate allowed={['ADMIN']}>
              <AdminDashboardPage />
            </RoleGate>
          }
        />
        <Route
          path="admin/classes"
          element={
            <RoleGate allowed={['ADMIN']}>
              <AdminClassesPage />
            </RoleGate>
          }
        />
        <Route path="admin/class-assignment" element={<Navigate to="/app/admin/classes" replace />} />
        <Route
          path="admin/tutors"
          element={
            <RoleGate allowed={['ADMIN']}>
              <AdminTutorsPage />
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
          path="admin/student-billing"
          element={
            <RoleGate allowed={['ADMIN']}>
              <AdminStudentBillingPage />
            </RoleGate>
          }
        />
        <Route path="admin/student-invoices" element={<Navigate to="/app/admin/student-billing" replace />} />

        {/* Tutor */}
        <Route
          path="tutor/home"
          element={
            <RoleGate allowed={['TUTOR']}>
              <TutorHomePage />
            </RoleGate>
          }
        />
        <Route path="tutor/dashboard" element={<Navigate to="/app/tutor/home" replace />} />
        <Route
          path="tutor/classes"
          element={
            <RoleGate allowed={['TUTOR']}>
              <TutorMyClassesPage />
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
          path="tutor/marketplace"
          element={
            <RoleGate allowed={['TUTOR']}>
              <TutorMarketplacePage />
            </RoleGate>
          }
        />
        <Route path="tutor/available-classes" element={<Navigate to="/app/tutor/marketplace" replace />} />
        <Route
          path="tutor/earnings"
          element={
            <RoleGate allowed={['TUTOR']}>
              <TutorEarningsLayout />
            </RoleGate>
          }
        >
          <Route index element={<Navigate to="payouts" replace />} />
          <Route path="payouts" element={<TutorPayoutsPage />} />
          <Route path="bank" element={<TutorBankAccountsPage />} />
        </Route>
        <Route path="tutor/bank-accounts" element={<Navigate to="/app/tutor/earnings/bank" replace />} />

        {/* Student */}
        <Route
          path="student/home"
          element={
            <RoleGate allowed={['STUDENT']}>
              <StudentHomePage />
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
          path="student/billing"
          element={
            <RoleGate allowed={['STUDENT']}>
              <StudentBillingPage />
            </RoleGate>
          }
        />
        <Route path="student/invoices" element={<Navigate to="/app/student/billing" replace />} />
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
