import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { useAuth } from '../context/useAuth';

const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const TenantsPage = lazy(() => import('../pages/tenants/TenantsPage'));
const UsersPage = lazy(() => import('../pages/users/UsersPage'));
const SolutionsPage = lazy(() => import('../pages/solutions/SolutionsPage'));
const AppInstancesPage = lazy(() => import('../pages/subscriptions/AppInstancesPage'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));
const DownloadsPage = lazy(() => import('../pages/downloads/DownloadsPage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const UnauthorizedPage = lazy(() => import('../pages/auth/UnauthorizedPage'));

function RouteLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500 shadow-sm">
      Loading page...
    </div>
  );
}

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<RouteLoader />}>{node}</Suspense>;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-dark">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={withSuspense(<LoginPage />)} />
      <Route path="/unauthorized" element={withSuspense(<UnauthorizedPage />)} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={withSuspense(<DashboardPage />)} />
        <Route path="tenants" element={withSuspense(<TenantsPage />)} />
        <Route path="users" element={withSuspense(<UsersPage />)} />
        <Route path="solutions" element={withSuspense(<SolutionsPage />)} />
        <Route path="subscriptions" element={withSuspense(<AppInstancesPage />)} />
        <Route path="settings" element={withSuspense(<SettingsPage />)} />
        <Route path="downloads" element={withSuspense(<DownloadsPage />)} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
