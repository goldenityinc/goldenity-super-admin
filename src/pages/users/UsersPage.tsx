import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import {
  createUser,
  listUsers,
  resetUserPassword,
  toggleUserActive,
  deleteUser,
  type UserListItem,
} from '../../lib/api/userApi';
import {
  listTenants,
  type PaginationMeta,
  type Tenant,
} from '../../lib/api/tenantApi';
import { getApiErrorMessage } from '../../lib/utils/apiError';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import TableSkeleton from '../../components/common/TableSkeleton';
import ConfirmDialog from '../../components/common/ConfirmDialog';

type UserFormState = {
  tenantId: string;
  email: string;
  username: string;
  password: string;
  name: string;
  role: 'TENANT_ADMIN';
};

const initialForm: UserFormState = {
  tenantId: '',
  email: '',
  username: '',
  password: '',
  name: '',
  role: 'TENANT_ADMIN',
};

type ResetPasswordModal = {
  userId: string;
  userName: string;
  newPassword: string;
};

export default function UsersPage() {
  const [form, setForm] = useState<UserFormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [items, setItems] = useState<UserListItem[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
  });
  const [resetModal, setResetModal] = useState<ResetPasswordModal | null>(null);
  const [resetting, setResetting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserListItem | null>(null);

  const fetchTenants = async () => {
    setLoadingTenants(true);
    try {
      const result = await listTenants({ page: 1, limit: 100 });
      setTenants(result.items);
    } catch (fetchError: unknown) {
      const message = getApiErrorMessage(fetchError);
      toast.error(`Gagal memuat daftar tenant: ${message}`);
    } finally {
      setLoadingTenants(false);
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoadingTable(true);
    setTableError(null);

    try {
      const result = await listUsers({
        page,
        limit: meta.limit,
        search: search || undefined,
        tenantId: tenantFilter || undefined,
      });
      if (!Array.isArray(result.items)) {
        console.error('[fetchUsers] Unexpected response shape:', result);
        throw new Error('Format respons tidak valid dari server.');
      }
      setItems(result.items);
      setMeta(result.meta);
    } catch (fetchError: unknown) {
      const message = getApiErrorMessage(fetchError);
      console.error('[fetchUsers] Error:', message, fetchError);
      setTableError(message);
      toast.error(`Gagal memuat users: ${message}`);
    } finally {
      setLoadingTable(false);
    }
  }, [meta.limit, page, search, tenantFilter]);

  useEffect(() => {
    void fetchTenants();
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const normalizedEmail = form.email.trim().toLowerCase();
      const normalizedUsername = form.username
        ? form.username.toLowerCase().replace(/\s+/g, '')
        : '';

      const created = await createUser({
        tenantId: form.tenantId,
        email: normalizedEmail,
        ...(normalizedUsername ? { username: normalizedUsername } : {}),
        password: form.password,
        name: form.name,
        role: form.role,
      });

      setSuccessMessage(
        `User ${created.email ?? created.username ?? '-'} berhasil dibuat pada tenant ${created.tenant.name}`,
      );
      setForm(initialForm);
      toast.success('Tenant user berhasil dibuat');
      setPage(1);
      await fetchUsers();
    } catch (submitError: unknown) {
      const message = getApiErrorMessage(submitError);
      setError(message);
      toast.error(message);
      // Jika error duplicate, arahkan filter ke tenant yang sedang dipilih
      // agar user existing langsung terlihat di tabel.
      if (form.tenantId && tenantFilter !== form.tenantId) {
        setTenantFilter(form.tenantId);
        setPage(1);
      } else {
        void fetchUsers();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: keyof UserFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value as UserFormState[typeof field] }));
  };

  const openResetModal = (user: UserListItem) => {
    setResetModal({ userId: user.id, userName: user.name, newPassword: '' });
  };

  const handleToggleActive = async (user: UserListItem) => {
    setTogglingId(user.id);
    try {
      const updated = await toggleUserActive(user.id, !user.isActive);
      setItems((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(
        updated.isActive
          ? `${user.name} berhasil diaktifkan`
          : `${user.name} berhasil dinonaktifkan`,
      );
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    setDeletingId(deleteConfirm.id);
    try {
      await deleteUser(deleteConfirm.id);
      toast.success(`User ${deleteConfirm.name} berhasil dihapus`);
      setDeleteConfirm(null);
      setItems((prev) => prev.filter((u) => u.id !== deleteConfirm.id));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const closeResetModal = () => setResetModal(null);

  const handleResetPassword = async () => {
    if (!resetModal || !resetModal.newPassword) {
      return;
    }

    if (resetModal.newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }

    setResetting(true);
    try {
      await resetUserPassword(resetModal.userId, resetModal.newPassword);
      toast.success(`Password ${resetModal.userName} berhasil direset`);
      closeResetModal();
    } catch (resetError: unknown) {
      toast.error(getApiErrorMessage(resetError));
    } finally {
      setResetting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-dark">Users</h1>
        <p className="text-slate-600">
          Daftarkan akun Owner/Admin pertama (email + password) untuk tenant yang sudah ada.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Tenant *</span>
            <select
              required
              value={form.tenantId}
              onChange={(event) => updateField('tenantId', event.target.value)}
              disabled={loadingTenants}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            >
              <option value="">-- Pilih Tenant --</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Email *</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="contoh: owner@company.com"
              autoComplete="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Username (opsional)</span>
            <input
              value={form.username}
              onChange={(event) =>
                updateField('username', event.target.value.toLowerCase().replace(/\s+/g, ''))
              }
              placeholder="contoh: owner01"
              pattern="^[a-z0-9._-]+$"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Full Name *</span>
            <input
              required
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="Nama lengkap pemilik toko"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Password *</span>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
          </label>

          <div className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Role</span>
            <input
              readOnly
              value="Admin (TENANT_ADMIN)"
              className="w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
            />
            <p className="text-xs text-slate-500">
              Super Admin hanya membuat 1 akun Owner/Admin per perusahaan. Akun Kasir dan Auditor
              dibuat langsung dari dalam aplikasi POS.
            </p>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Menyimpan...' : 'Create Tenant User'}
          </button>
          <button
            type="button"
            onClick={() => {
              setPage(1);
              void fetchUsers();
            }}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Load Users
          </button>
        </div>
      </form>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-dark">Users</h2>
          <div className="flex gap-2">
            <select
              value={tenantFilter}
              onChange={(event) => {
                setTenantFilter(event.target.value);
                setPage(1);
              }}
              className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-primary/30 focus:ring"
            >
              <option value="">Pilih Tenant (Semua)</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari nama/username/email/tenant"
              className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-primary/30 focus:ring"
            />
            <button
              type="button"
              onClick={() => {
                if (page === 1 && search === searchInput) {
                  void fetchUsers();
                  return;
                }

                setPage(1);
                setSearch(searchInput);
              }}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Search
            </button>
          </div>
        </div>

        {loadingTable ? (
          <TableSkeleton rows={5} columns={7} />
        ) : (
          <DataTable
            headers={['Name', 'Username', 'Email', 'Role', 'Tenant Name', 'Created At', 'Actions']}
            hasData={items.length > 0}
            emptyMessage={tableError ?? 'Belum ada user.'}
          >
            {items.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-medium text-dark">{user.name}</td>
                <td className="px-4 py-3">{user.username ?? '-'}</td>
                <td className="px-4 py-3">{user.email ?? '-'}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{user.tenant?.name ?? '-'}</td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {user.role !== 'SUPER_ADMIN' ? (
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => openResetModal(user)}
                        title="Reset Password"
                        className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                      >
                        Reset Password
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(user)}
                        disabled={togglingId === user.id}
                        title={user.isActive ? 'Deactivate user' : 'Activate user'}
                        className={[
                          'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                          user.isActive
                            ? 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                            : 'border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200',
                        ].join(' ')}
                      >
                        {togglingId === user.id
                          ? '...'
                          : user.isActive
                            ? 'Deactivate'
                            : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(user)}
                        title="Hapus user"
                        className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </DataTable>
        )}

        <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
      </div>

      {resetModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-dark">Reset Password</h3>
            <p className="mt-1 text-sm text-slate-500">
              Atur password baru untuk <strong>{resetModal.userName}</strong>.
            </p>

            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium text-slate-700">Password Baru *</label>
              <input
                type="password"
                autoFocus
                minLength={6}
                placeholder="Minimal 6 karakter"
                value={resetModal.newPassword}
                onChange={(event) =>
                  setResetModal((prev) =>
                    prev ? { ...prev, newPassword: event.target.value } : null,
                  )
                }
                autoComplete="new-password"
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeResetModal}
                disabled={resetting}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleResetPassword()}
                disabled={resetting || !resetModal.newPassword}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resetting ? 'Menyimpan...' : 'Simpan Password Baru'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => void handleDeleteUser()}
        title="Hapus User"
        message={`Apakah Anda yakin ingin menghapus user "${deleteConfirm?.name ?? ''}" secara permanen? Aksi ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="danger"
        isLoading={deletingId !== null}
      />
    </section>
  );
}
