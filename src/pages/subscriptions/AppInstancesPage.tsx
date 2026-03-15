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
import {
  getErpFeatureCatalog,
  getErpOrganizationEnabledFeatures,
  provisionErp,
  type ErpFeatureDefinition,
} from '../../lib/api/integrationApi';
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

const ERP_SOLUTION_CODE = 'ERP' as const;

const ERP_TIER_FEATURES: Record<'Standard' | 'Professional' | 'Enterprise', string[]> = {
  Standard: ['crm', 'sales'],
  Professional: ['crm', 'sales', 'inventory', 'purchasing'],
  Enterprise: ['crm', 'sales', 'inventory', 'purchasing', 'accounting', 'hr'],
};

function isValidErpOrgIdCandidate(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value) && value.length >= 2 && value.length <= 50;
}

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

  const [erpFeatureCatalog, setErpFeatureCatalog] = useState<ErpFeatureDefinition[]>([]);
  const [erpFeatureLoading, setErpFeatureLoading] = useState(false);
  const [erpSelectedFeatures, setErpSelectedFeatures] = useState<string[]>([]);
  const [erpPrefillLoading, setErpPrefillLoading] = useState(false);

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
    setErpSelectedFeatures([]);
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

    // Preload happens via effect when ERP + Custom.
    setErpSelectedFeatures([]);
    setIsModalOpen(true);
  };

  const onChangeField = (field: keyof FormState, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value as FormState[typeof field] };
      if (field === 'tier' && value !== 'Custom') {
        setErpSelectedFeatures([]);
      }
      if (field === 'solutionId' && value !== prev.solutionId) {
        setErpSelectedFeatures([]);
      }
      return next;
    });
  };

  const selectedSolution = solutions.find((s) => s.id === form.solutionId);
  const isErpSolution = selectedSolution?.code === ERP_SOLUTION_CODE;
  const canUseCustomTier = Boolean(isErpSolution);
  const needsErpFeaturePicker = Boolean(isErpSolution && form.tier === 'Custom');

  const resolveErpOrganizationId = () => {
    const fromEditing = editingItem?.tenant?.slug;
    const fromRefs = tenants.find((t) => t.id === form.tenantId)?.slug;
    const slug = (fromEditing ?? fromRefs ?? '').trim();
    return slug && isValidErpOrgIdCandidate(slug) ? slug : undefined;
  };

  useEffect(() => {
    const load = async () => {
      if (!isModalOpen || !needsErpFeaturePicker) return;
      if (erpFeatureCatalog.length) return;

      setErpFeatureLoading(true);
      try {
        const features = await getErpFeatureCatalog();
        setErpFeatureCatalog(features);
      } catch (error: unknown) {
        toast.error(`Gagal memuat daftar fitur ERP: ${getApiErrorMessage(error)}`);
      } finally {
        setErpFeatureLoading(false);
      }
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, needsErpFeaturePicker]);

  useEffect(() => {
    const prefill = async () => {
      if (!isModalOpen || !needsErpFeaturePicker) return;
      if (!editingItem) return;
      if (erpSelectedFeatures.length > 0) return;

      const organizationId = resolveErpOrganizationId();
      if (!organizationId) return;

      setErpPrefillLoading(true);
      try {
        const enabled = await getErpOrganizationEnabledFeatures(organizationId);
        setErpSelectedFeatures(enabled);
      } catch (error: unknown) {
        toast.error(`Gagal memuat fitur aktif ERP: ${getApiErrorMessage(error)}`);
      } finally {
        setErpPrefillLoading(false);
      }
    };

    void prefill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, needsErpFeaturePicker, editingItem?.id]);

  const toggleErpFeature = (key: string) => {
    setErpSelectedFeatures((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      return [...prev, key];
    });
  };

  const applyErpFeaturesForTier = async (tier: SubscriptionTier) => {
    if (!isErpSolution) return;

    const tenant = tenants.find((t) => t.id === form.tenantId);
    const organizationId = resolveErpOrganizationId();

    const features =
      tier === 'Custom'
        ? erpSelectedFeatures
        : ERP_TIER_FEATURES[tier as 'Standard' | 'Professional' | 'Enterprise'];

    await provisionErp({
      tenantId: form.tenantId,
      organizationId,
      organizationName: tenant?.name,
      features,
    });
  };

  const getSolutionButtonClasses = (solutionCode: string) => {
    const base =
      'rounded-md px-2.5 py-1 text-xs font-semibold border transition-colors focus:outline-none focus:ring ring-primary/30';

    if (solutionCode === 'ERP') {
      return `${base} border-primary/20 bg-primary/10 text-primary hover:bg-primary/15`;
    }

    if (solutionCode === 'POS') {
      return `${base} border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200/60`;
    }

    if (solutionCode === 'CLINIC') {
      return `${base} border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-200/60`;
    }

    return `${base} border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200/60`;
  };

  const openSolutionApp = (item: AppInstance) => {
    const code = item.solution.code;
    if (!item.appUrl) {
      toast.error('App URL belum tersedia untuk subscription ini.');
      return;
    }

    let urlToOpen = item.appUrl;
    if (code === 'ERP') {
      try {
        const origin = new URL(item.appUrl).origin;
        urlToOpen = `${origin}/t/${item.tenant.slug}/login`;
      } catch {
        toast.error('App URL tidak valid untuk subscription ERP ini.');
        return;
      }
    }

    window.open(urlToOpen, '_blank', 'noopener,noreferrer');
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
      // If ERP + Custom, ensure catalog loaded so admin isn't selecting blind.
      if (needsErpFeaturePicker && !erpFeatureCatalog.length && !erpFeatureLoading) {
        setErpFeatureLoading(true);
        try {
          const features = await getErpFeatureCatalog();
          setErpFeatureCatalog(features);
        } finally {
          setErpFeatureLoading(false);
        }
      }

      if (editingItem) {
        await updateAppInstance(editingItem.id, {
          tier: form.tier,
          status: form.status,
          dbConnectionString: form.dbConnectionString || null,
          appUrl: form.appUrl || null,
        });

        if (isErpSolution) {
          await applyErpFeaturesForTier(form.tier);
        }
        toast.success('Subscription berhasil diupdate');
      } else {
        const created = await createAppInstance({
          tenantId: form.tenantId,
          solutionId: form.solutionId,
          tier: form.tier,
          status: form.status,
        });

        try {
          if (isErpSolution) {
            await applyErpFeaturesForTier(form.tier);
          }
        } catch (error: unknown) {
          // Avoid partial state where subscription exists but ERP provisioning/features failed.
          try {
            await deleteAppInstance(created.id);
          } catch {
            // ignore rollback failure
          }
          throw error;
        }
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

  const onSaveTier = async (item: AppInstance, nextTier: SubscriptionTier) => {
    setSavingTierId(item.id);
    try {
      await updateSubscriptionTier(item.id, nextTier);

      if (item.solution.code === ERP_SOLUTION_CODE && nextTier !== 'Custom') {
        const organizationId = item.tenant.slug && isValidErpOrgIdCandidate(item.tenant.slug)
          ? item.tenant.slug
          : undefined;
        await provisionErp({
          tenantId: item.tenantId,
          organizationId,
          organizationName: item.tenant.name,
          features: ERP_TIER_FEATURES[nextTier],
        });
      }

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
            Atur langganan tenant ke masing-masing solution termasuk tier dan status.
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
                      onClick={() => onSaveTier(item, item.tier)}
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
                    onClick={() => openSolutionApp(item)}
                    className={getSolutionButtonClasses(item.solution.code)}
                    title={`Buka ${item.solution.code}`}
                  >
                    {item.solution.code}
                  </button>
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
                {canUseCustomTier ? <option value="Custom">Custom</option> : null}
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

          {needsErpFeaturePicker ? (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-dark">ERP Features (Custom)</p>
              {erpPrefillLoading ? (
                <p className="text-sm text-slate-600">Memuat fitur aktif...</p>
              ) : null}
              {erpFeatureLoading ? (
                <p className="text-sm text-slate-600">Loading fitur...</p>
              ) : erpFeatureCatalog.length === 0 ? (
                <p className="text-sm text-slate-600">Daftar fitur belum tersedia.</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {erpFeatureCatalog.map((f) => (
                    <label
                      key={f.key}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 bg-white p-2"
                    >
                      <input
                        type="checkbox"
                        checked={erpSelectedFeatures.includes(f.key)}
                        onChange={() => toggleErpFeature(f.key)}
                        className="mt-1"
                      />
                      <span className="block">
                        <span className="block text-sm font-medium text-dark">{f.label}</span>
                        {f.description ? (
                          <span className="block text-xs text-slate-500">{f.description}</span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {editingItem ? (
            <>
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
            </>
          ) : null}

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
