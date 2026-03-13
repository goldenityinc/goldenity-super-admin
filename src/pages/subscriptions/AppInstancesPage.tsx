import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createAppInstance,
  deleteAppInstance,
  listAppInstances,
  updateAppInstance,
  updateSubscriptionTier,
  type AppInstance,
  type AppInstanceStatus,
  type SubscriptionTier,
} from '../../lib/api/appInstanceApi';
import { listSolutions, type Solution } from '../../lib/api/solutionApi';
import { listTenants, type PaginationMeta, type Tenant } from '../../lib/api/tenantApi';
import { getApiErrorMessage } from '../../lib/utils/apiError';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import TableSkeleton from '../../components/common/TableSkeleton';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

type FormState = {
  tenantId: string;
  solutionId: string;
  tier: SubscriptionTier;
  status: AppInstanceStatus;
  dbConnectionString: string;
  appUrl: string;
};

const initialForm: FormState = {
  tenantId: '',
  solutionId: '',
  tier: 'Standard',
  status: 'DEPLOYING',
  dbConnectionString: '',
  appUrl: '',
};

export default function AppInstancesPage() {
  const [items, setItems] = useState<AppInstance[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [tenantSubscriptions, setTenantSubscriptions] = useState<AppInstance[]>([]);
  const [loadingTenantSubscriptions, setLoadingTenantSubscriptions] = useState(false);
  const [savingTierId, setSavingTierId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AppInstance | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<AppInstance | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fetchReferences = async () => {
    setLoadingRefs(true);
    try {
      const [tenantResult, solutionResult] = await Promise.all([
        listTenants({ page: 1, limit: 100 }),
        listSolutions({ page: 1, limit: 100, isActive: true }),
      ]);
      setTenants(tenantResult.items);
      setSolutions(solutionResult.items);
    } catch (error: unknown) {
      toast.error(`Gagal memuat data referensi: ${getApiErrorMessage(error)}`);
    } finally {
      setLoadingRefs(false);
    }
  };

  const fetchAppInstances = async () => {
    setLoadingTable(true);
    setTableError(null);

    try {
      const result = await listAppInstances({ page, limit: meta.limit });
      setItems(result.items);
      setMeta(result.meta);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      setTableError(message);
      toast.error(message);
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    void fetchReferences();
  }, []);

  const fetchTenantSubscriptions = async (tenantId: string) => {
    if (!tenantId) {
      setTenantSubscriptions([]);
      return;
    }

    setLoadingTenantSubscriptions(true);
    try {
      const result = await listAppInstances({
        page: 1,
        limit: 100,
        tenantId,
      });
      setTenantSubscriptions(result.items);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error));
      setTenantSubscriptions([]);
    } finally {
      setLoadingTenantSubscriptions(false);
    }
  };

  useEffect(() => {
    void fetchAppInstances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    void fetchTenantSubscriptions(selectedTenantId);
  }, [selectedTenantId]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(initialForm);
    setIsModalOpen(true);
  };

  const openEditModal = (item: AppInstance) => {
    setEditingItem(item);
    setForm({
      tenantId: item.tenantId,
      solutionId: item.solutionId,
      tier: item.tier,
      status: item.status,
      dbConnectionString: item.dbConnectionString ?? '',
      appUrl: item.appUrl ?? '',
    });
    setIsModalOpen(true);
  };

  const onChangeField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value as FormState[typeof field] }));
  };

  const getDbNamePreview = () => {
    if (form.dbConnectionString.trim() !== '') {
      return null;
    }

    const selectedTenant = tenants.find((t) => t.id === form.tenantId);
    const selectedSolution = solutions.find((s) => s.id === form.solutionId);

    if (!selectedTenant || !selectedSolution) {
      return null;
    }

    const dbName = `${selectedTenant.slug}_${selectedSolution.code}_db`;
    return `postgresql://admin:***@host/${dbName}`;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (editingItem) {
        await updateAppInstance(editingItem.id, {
          tier: form.tier,
          status: form.status,
          dbConnectionString: form.dbConnectionString || null,
          appUrl: form.appUrl || null,
        });
        toast.success('Subscription berhasil diupdate');
      } else {
        await createAppInstance({
          tenantId: form.tenantId,
          solutionId: form.solutionId,
          tier: form.tier,
          status: form.status,
          dbConnectionString: form.dbConnectionString || null,
          appUrl: form.appUrl || null,
        });
        toast.success('Subscription berhasil dibuat');
      }

      setIsModalOpen(false);
      setForm(initialForm);
      setEditingItem(null);
      setPage(1);
      await fetchAppInstances();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!deletingItem) return;

    setDeleteSubmitting(true);
    try {
      await deleteAppInstance(deletingItem.id);
      toast.success('Subscription berhasil dihapus');
      setIsDeleteOpen(false);
      setDeletingItem(null);
      await fetchAppInstances();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const onSaveTier = async (itemId: string, nextTier: SubscriptionTier) => {
    setSavingTierId(itemId);
    try {
      await updateSubscriptionTier(itemId, nextTier);
      toast.success('Tier subscription berhasil diupdate');
      await Promise.all([fetchAppInstances(), fetchTenantSubscriptions(selectedTenantId)]);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSavingTierId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-dark">Subscriptions</h1>
          <p className="text-slate-600">
            Atur langganan tenant ke masing-masing solution termasuk tier, status, dan koneksi database.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Add Subscription
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-base font-semibold text-dark">Tenant Subscription Manager</p>
        <p className="mt-1 text-sm text-slate-600">
          Pilih tenant untuk melihat solusi yang dimiliki beserta tier aktif, lalu ubah tier langsung.
        </p>

        <div className="mt-3 max-w-xl">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Tenant</span>
            <select
              value={selectedTenantId}
              onChange={(event) => setSelectedTenantId(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            >
              <option value="">-- Select Tenant --</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.slug})
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedTenantId ? (
          <div className="mt-4 space-y-2">
            {loadingTenantSubscriptions ? (
              <TableSkeleton rows={3} columns={4} />
            ) : tenantSubscriptions.length === 0 ? (
              <p className="text-sm text-slate-500">Tenant ini belum memiliki subscription.</p>
            ) : (
              tenantSubscriptions.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-md border border-slate-200 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium text-dark">{item.solution.name}</p>
                    <p className="text-xs text-slate-500">Code: {item.solution.code}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={item.tier}
                      onChange={(event) => {
                        const nextTier = event.target.value as SubscriptionTier;
                        setTenantSubscriptions((prev) =>
                          prev.map((current) =>
                            current.id === item.id ? { ...current, tier: nextTier } : current
                          )
                        );
                      }}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-primary/30 focus:ring"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Professional">Professional</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                    <button
                      type="button"
                      disabled={savingTierId === item.id}
                      onClick={() => onSaveTier(item.id, item.tier)}
                      className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingTierId === item.id ? 'Saving...' : 'Save Tier'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>

      {loadingTable ? (
        <TableSkeleton rows={6} columns={6} />
      ) : (
        <DataTable
          headers={['Client', 'Solution', 'Tier', 'Status', 'App URL', 'Actions']}
          hasData={items.length > 0}
          emptyMessage={tableError ?? 'Belum ada subscription/app instance.'}
        >
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/70">
              <td className="px-4 py-3 font-medium text-dark">{item.tenant.name}</td>
              <td className="px-4 py-3">
                {item.solution.name}
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {item.solution.code}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {item.tier}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={[
                    'rounded-full px-2 py-1 text-xs font-semibold',
                    item.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-700'
                      : item.status === 'DEPLOYING'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700',
                  ].join(' ')}
                >
                  {item.status}
                </span>
              </td>
              <td className="max-w-[260px] truncate px-4 py-3 text-slate-600" title={item.appUrl ?? '-'}>
                {item.appUrl ?? '-'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="rounded-md p-1.5 text-yellow-600 hover:bg-yellow-50"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingItem(item);
                      setIsDeleteOpen(true);
                    }}
                    className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
          setForm(initialForm);
        }}
        title={editingItem ? 'Edit Subscription' : 'Add Subscription'}
        size="lg"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Tenant *</span>
              <select
                required
                value={form.tenantId}
                onChange={(event) => onChangeField('tenantId', event.target.value)}
                disabled={loadingRefs || Boolean(editingItem)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
              >
                <option value="">-- Select Tenant --</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.slug})
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Solution *</span>
              <select
                required
                value={form.solutionId}
                onChange={(event) => onChangeField('solutionId', event.target.value)}
                disabled={loadingRefs || Boolean(editingItem)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
              >
                <option value="">-- Select Solution --</option>
                {solutions.map((solution) => (
                  <option key={solution.id} value={solution.id}>
                    {solution.name} ({solution.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Tier *</span>
              <select
                required
                value={form.tier}
                onChange={(event) => onChangeField('tier', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
              >
                <option value="Standard">Standard</option>
                <option value="Professional">Professional</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Status *</span>
              <select
                required
                value={form.status}
                onChange={(event) => onChangeField('status', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
              >
                <option value="DEPLOYING">DEPLOYING</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </label>
          </div>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">DB Connection String</span>
            <input
              value={form.dbConnectionString}
              onChange={(event) => onChangeField('dbConnectionString', event.target.value)}
              placeholder="postgresql://user:pass@host:port/db"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
            {getDbNamePreview() ? (
              <p className="text-xs text-slate-500">{`Preview: ${getDbNamePreview()}`}</p>
            ) : (
              <p className="text-xs text-slate-500">Kosongkan untuk auto-generate kredensial database.</p>
            )}
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">App URL</span>
            <input
              value={form.appUrl}
              onChange={(event) => onChangeField('appUrl', event.target.value)}
              placeholder="https://client-app.yourdomain.com"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Saving...' : editingItem ? 'Update Subscription' : 'Create Subscription'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingItem(null);
        }}
        onConfirm={onDelete}
        title="Delete Subscription"
        message={
          deletingItem
            ? `Hapus subscription ${deletingItem.tenant.name} - ${deletingItem.solution.code}?`
            : 'Hapus subscription ini?'
        }
        confirmText="Delete"
        variant="danger"
        isLoading={deleteSubmitting}
      />
    </section>
  );
}
