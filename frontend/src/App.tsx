import { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProfileCompletionPage from './pages/ProfileCompletionPage';
import AppShell from './components/layout/AppShell';
import RoleGate from './components/layout/RoleGate';
import { AppAccessProvider } from './context/AppAccessContext';
import { useRoleAccess } from './hooks/useRoleAccess';
import AppHomeRedirect from './pages/app/AppHomeRedirect';
import UnauthorizedPage from './pages/app/UnauthorizedPage';
import NotFoundPage from './pages/app/NotFoundPage';
import AdminDashboardPage from './pages/app/AdminDashboardPage';
import AdminBankVerificationPage from './pages/app/AdminBankVerificationPage';
import AdminPayoutsPage from './pages/app/AdminPayoutsPage';
import TutorDashboardPage from './pages/app/TutorDashboardPage';
import TutorSessionsPage from './pages/app/TutorSessionsPage';
import TutorBankAccountsPage from './pages/app/TutorBankAccountsPage';
import NotificationsPage from './pages/app/NotificationsPage';
import AccountPage from './pages/app/AccountPage';
import PlaceholderPage from './pages/app/PlaceholderPage';
import { getAuthUser, isAuthenticated } from './utils/storage';

interface RouteGuardProps {
  children: ReactElement;
}

function RequireAuth({ children }: RouteGuardProps) {
  return isAuthenticated() ? children : <Navigate to="/" replace />;
}

function RequireProfileCompletion({ children }: RouteGuardProps) {
  const user = getAuthUser();
  return user?.needsProfileCompletion !== false ? children : <Navigate to="/app" replace />;
}

function RequireCompletedProfile({ children }: RouteGuardProps) {
  const user = getAuthUser();
  return user?.needsProfileCompletion !== false ? <Navigate to="/profile-completion" replace /> : children;
}

function ProtectedAppLayout() {
  const { roles, loading, error } = useRoleAccess();

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
    <AppAccessProvider roles={roles}>
      <AppShell roles={roles}>
        {error ? (
          <div className="card">
            <p className="error-text">{error}</p>
          </div>
        ) : null}
      </AppShell>
    </AppAccessProvider>
  );
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
        path="/app"
        element={
          <RequireAuth>
            <RequireCompletedProfile>
              <ProtectedAppLayout />
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
              <AdminDashboardPage />
            </RoleGate>
          }
        />
        <Route
          path="admin/bank-verification"
          element={
            <RoleGate allowed={['ADMIN']}>
              <AdminBankVerificationPage />
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
