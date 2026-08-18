import {
  Home,
  Building2,
  Users,
  Layers3,
  Link2,
  Settings,
  Menu,
  X,
  LogOut,
  Download,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Wallet,
  FileText,
  CreditCard,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import type { ComponentType } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

type SidebarSingleItem = {
  type?: 'item';
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type SidebarGroupItem = {
  type: 'group';
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  children: SidebarSingleItem[];
};

type SidebarItem = SidebarSingleItem | SidebarGroupItem;

type SidebarSection = {
  title: string;
  items: SidebarItem[];
};

const menuSections: SidebarSection[] = [
  {
    title: 'General',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: Home },
      { to: '/dashboard/tenants', label: 'Tenants', icon: Building2 },
      { to: '/dashboard/subscriptions', label: 'Subscriptions', icon: Link2 },
      { to: '/dashboard/users', label: 'Users', icon: Users },
      { to: '/dashboard/roles', label: 'Roles', icon: Users },
      { to: '/dashboard/solutions', label: 'Solutions', icon: Layers3 },
      { to: '/dashboard/settings', label: 'Settings', icon: Settings },
      { to: '/dashboard/downloads', label: 'Downloads', icon: Download },
    ],
  },
  {
    title: 'Finance & Accounting',
    items: [
      {
        type: 'group',
        key: 'finance',
        label: 'Finance',
        icon: Wallet,
        children: [
          { to: '/dashboard/finance/incomes', label: 'Incomes', icon: TrendingUp },
          { to: '/dashboard/finance/expenses', label: 'Expenses', icon: FileText },
          { to: '/dashboard/finance/client-payments', label: 'Client Payment', icon: CreditCard },
        ],
      },
    ],
  },
  {
    title: 'Transactions / Sales',
    items: [{ to: '/dashboard/sales/pre-orders', label: 'Pre-Order', icon: ClipboardList }],
  },
];

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const { user, logout } = useAuth();
  const location = useLocation();

  const closeMobile = () => setMobileOpen(false);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

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

          <nav className="space-y-3 px-3 py-4">
            {menuSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {section.title}
                </p>
                {section.items.map((item, index) => {
                  if (item.type === 'group') {
                    const GroupIcon = item.icon;
                    const isGroupExpanded = expandedGroups.has(item.key);
                    const isGroupActive = item.children.some(
                      (child) => location.pathname === child.to
                    );
                    return (
                      <div key={item.key}>
                        <button
                          type="button"
                          onClick={() => toggleGroup(item.key)}
                          className={[
                            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            isGroupActive
                              ? 'bg-primary/20 text-primary'
                              : 'text-slate-200 hover:bg-slate-800 hover:text-white',
                          ].join(' ')}
                        >
                          <GroupIcon className="h-4 w-4" />
                          <span className="flex-1 text-left">{item.label}</span>
                          {isGroupExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        {isGroupExpanded ? (
                          <div className="mt-1 space-y-1 pl-7">
                            {item.children.map((child) => {
                              const ChildIcon = child.icon;
                              return (
                                <NavLink
                                  key={child.to}
                                  to={child.to}
                                  end
                                  onClick={closeMobile}
                                  className={({ isActive }) =>
                                    [
                                      'flex items-center gap-3 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                                      isActive
                                        ? 'bg-primary text-white'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                                    ].join(' ')
                                  }
                                >
                                  <ChildIcon className="h-3.5 w-3.5" />
                                  <span>{child.label}</span>
                                </NavLink>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  }
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to ?? `item-${index}`}
                      to={item.to}
                      end={item.to === '/dashboard'}
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
              </div>
            ))}
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
