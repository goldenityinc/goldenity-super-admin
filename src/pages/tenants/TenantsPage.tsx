import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import {
  createTenant,
  type TenantFirstAdminCredential,
  listTenants,
  type PaginationMeta,
  type Tenant,
} from '../../lib/api/tenantApi';
import { getApiErrorMessage } from '../../lib/utils/apiError';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import TableSkeleton from '../../components/common/TableSkeleton';

type TenantFormState = {
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  adminEmail: string;
  adminPassword: string;
};

const initialForm: TenantFormState = {
  name: '',
  slug: '',
  email: '',
  phone: '',
  address: '',
  adminEmail: '',
  adminPassword: '',
};

type TenantCreationResult = {
  tenant: Tenant;
  firstAdmin: TenantFirstAdminCredential;
};

function generateStrongPassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let value = '';

  for (let index = 0; index < length; index += 1) {
    value += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return value;
}

export default function TenantsPage() {
  const [form, setForm] = useState<TenantFormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCreatedTenant, setLastCreatedTenant] = useState<TenantCreationResult | null>(null);

  const [items, setItems] = useState<Tenant[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
  });

  const fetchTenants = async () => {
    setLoadingTable(true);
    setTableError(null);
    try {
      const result = await listTenants({
        page,
        limit: meta.limit,
        search: search || undefined,
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (fetchError: unknown) {
      const message = getApiErrorMessage(fetchError);
      setTableError(message);
      toast.error(message);
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    void fetchTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const createdTenantResult = await createTenant({
        name: form.name,
        slug: form.slug || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
      });

      setLastCreatedTenant(createdTenantResult);
      setForm(initialForm);
      toast.success('Tenant berhasil dibuat');
      setPage(1);
      await fetchTenants();
    } catch (submitError: unknown) {
      const message = getApiErrorMessage(submitError);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: keyof TenantFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-dark">Tenants</h1>
        <p className="text-slate-600">Daftarkan perusahaan/klien baru dari dashboard Super Admin.</p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Company Name *</span>
            <input
              required
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Slug</span>
            <input
              value={form.slug}
              onChange={(event) => updateField('slug', event.target.value)}
              placeholder="opsional, contoh: toko-jaya"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Phone</span>
            <input
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
          </label>
        </div>

        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Address</span>
          <textarea
            value={form.address}
            onChange={(event) => updateField('address', event.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
          />
        </label>

        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-semibold text-dark">Tenant Admin Account</p>
          <p className="mt-1 text-xs text-slate-500">
            Akun ini akan dibuat otomatis sebagai first admin tenant.
          </p>

          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Admin Email *</span>
              <input
                required
                type="email"
                value={form.adminEmail}
                onChange={(event) => updateField('adminEmail', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Admin Password *</span>
              <div className="flex gap-2">
                <input
                  required
                  minLength={8}
                  type="text"
                  value={form.adminPassword}
                  onChange={(event) => updateField('adminPassword', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
                />
                <button
                  type="button"
                  onClick={() => updateField('adminPassword', generateStrongPassword())}
                  className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Auto Generate
                </button>
              </div>
            </label>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Menyimpan...' : 'Create Tenant'}
          </button>
        </div>
      </form>

      {lastCreatedTenant ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-semibold text-dark">Tenant berhasil dibuat</p>
          <p className="text-slate-700">ID: {lastCreatedTenant.tenant.id}</p>
          <p className="text-slate-700">Name: {lastCreatedTenant.tenant.name}</p>
          <p className="text-slate-700">Slug: {lastCreatedTenant.tenant.slug}</p>
          <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
            <p className="font-semibold text-dark">First Admin Credential</p>
            <p className="text-slate-700">Email: {lastCreatedTenant.firstAdmin.email}</p>
            <p className="text-slate-700">Password: {lastCreatedTenant.firstAdmin.password}</p>
            <button
              type="button"
              className="mt-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `Email: ${lastCreatedTenant.firstAdmin.email}\nPassword: ${lastCreatedTenant.firstAdmin.password}`
                );
                toast.success('Kredensial berhasil disalin');
              }}
            >
              Copy Credential
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-dark">Tenant List</h2>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama/slug/email"
              className="w-60 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-primary/30 focus:ring"
            />
            <button
              type="button"
              onClick={() => {
                setPage(1);
                void fetchTenants();
              }}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Search
            </button>
          </div>
        </div>

        {loadingTable ? (
          <TableSkeleton rows={5} columns={5} />
        ) : (
          <DataTable
            headers={['Name', 'Slug', 'Email', 'Status', 'Created At']}
            hasData={items.length > 0}
            emptyMessage={tableError ?? 'Belum ada tenant.'}
          >
            {items.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-medium text-dark">{tenant.name}</td>
                <td className="px-4 py-3">{tenant.slug}</td>
                <td className="px-4 py-3">{tenant.email ?? '-'}</td>
                <td className="px-4 py-3">
                  <span
                    className={[
                      'rounded-full px-2 py-1 text-xs font-semibold',
                      tenant.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
                    ].join(' ')}
                  >
                    {tenant.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(tenant.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </DataTable>
        )}

        <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
      </div>
    </section>
  );
}
