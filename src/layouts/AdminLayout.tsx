import { Home, Building2, Users, Layers3, Link2, Settings, Menu, X, LogOut, Download } from 'lucide-react';
import { useState } from 'react';
import type { ComponentType } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

type SidebarItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const menuItems: SidebarItem[] = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/tenants', label: 'Tenants', icon: Building2 },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/solutions', label: 'Solutions', icon: Layers3 },
  { to: '/subscriptions', label: 'Subscriptions', icon: Link2 },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/downloads', label: 'Downloads', icon: Download },
];

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-background text-dark">
      <div className="flex">
        <aside
          className={[
            'fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-dark text-slate-100 transition-transform duration-200',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
            'lg:translate-x-0',
          ].join(' ')}
        >
          <div className="flex h-16 items-center justify-between border-b border-slate-700 px-5">
            <div>
              <p className="text-lg font-semibold tracking-wide text-white">Goldenity</p>
              <p className="text-xs text-slate-400">Super Admin</p>
            </div>
            <button
              type="button"
              className="rounded p-1 text-slate-300 hover:bg-slate-800 lg:hidden"
              onClick={closeMobile}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-1 px-3 py-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white',
                    ].join(' ')
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <div className="min-h-screen w-full lg:pl-72">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-md border border-slate-200 p-2 text-dark hover:bg-slate-50 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
              <p className="text-sm text-slate-500">Welcome back</p>
              <p className="font-semibold text-dark">{user?.email ?? 'Super Admin'}</p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </header>

          <main className="p-4 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={closeMobile}
          aria-label="Close sidebar overlay"
        />
      ) : null}
    </div>
  );
}
