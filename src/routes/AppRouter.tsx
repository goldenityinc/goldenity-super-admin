import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import DashboardPage from '../pages/dashboard/DashboardPage';
import TenantsPage from '../pages/tenants/TenantsPage';
import UsersPage from '../pages/users/UsersPage';
import SolutionsPage from '../pages/solutions/SolutionsPage';
import AppInstancesPage from '../pages/subscriptions/AppInstancesPage';
import SettingsPage from '../pages/settings/SettingsPage';
import DownloadsPage from '../pages/downloads/DownloadsPage';
import LoginPage from '../pages/auth/LoginPage';
import UnauthorizedPage from '../pages/auth/UnauthorizedPage';
import { useAuth } from '../context/AuthContext';

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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="solutions" element={<SolutionsPage />} />
        <Route path="subscriptions" element={<AppInstancesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="downloads" element={<DownloadsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
