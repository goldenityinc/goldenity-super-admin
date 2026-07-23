import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createAppInstance,
  deleteAppInstance,
  getAppInstanceModuleCatalog,
  listAppInstances,
  type SyncMode,
  updateAppInstance,
  updateSubscriptionTier,
  type AppInstance,
  type AppInstanceModuleCatalogItem,
  type AppInstanceStatus,
  type SubscriptionTier,
} from '../../lib/api/appInstanceApi';
import {
  mergeSubscriptionModuleCatalog,
  mapLegacyAddonsToModules,
  mapModulesToLegacyAddons,
  sanitizeSubscriptionModules,
  TIER_DEFAULT_MODULES,
  type SubscriptionModuleKey,
} from '../../lib/constants/subscriptionAddons';
import {
  getErpFeatureCatalog,
  getErpOrganizationEnabledFeatures,
  provisionErp,
  type ErpFeatureDefinition,
} from '../../lib/api/integrationApi';
import { listSolutions, type Solution } from '../../lib/api/solutionApi';
import { listTenants, type Tenant } from '../../lib/api/tenantApi';
import { getApiErrorMessage } from '../../lib/utils/apiError';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import TableSkeleton from '../../components/common/TableSkeleton';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

type FormState = {
  tenantId: string;
  solutionId: string;
  solutionCode: '' | SolutionCode;
  tier: SubscriptionTier;
  modules: SubscriptionModuleKey[];
  activeModules: SchoolErpModule[];
  syncMode: SyncMode;
  status: AppInstanceStatus;
  endDate: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
};

type SchoolErpModule = 'ACADEMICS' | 'FINANCE';
type SolutionCode = 'POS' | 'ERP' | 'MEDICAL' | 'SCHOOL_ERP';

const ERP_SOLUTION_CODE = 'ERP' as const;
const POS_SOLUTION_CODE = 'POS' as const;
const MEDICAL_SOLUTION_CODE = 'MEDICAL' as const;
const CLINIC_SOLUTION_CODE = 'CLINIC' as const;
const SCHOOL_ERP_SOLUTION_CODE = 'SCHOOL_ERP' as const;
const SOLUTION_OPTIONS: { code: SolutionCode; backendCodes: string[] }[] = [
  { code: POS_SOLUTION_CODE, backendCodes: [POS_SOLUTION_CODE] },
  { code: ERP_SOLUTION_CODE, backendCodes: [ERP_SOLUTION_CODE] },
  { code: MEDICAL_SOLUTION_CODE, backendCodes: [MEDICAL_SOLUTION_CODE, CLINIC_SOLUTION_CODE] },
  { code: SCHOOL_ERP_SOLUTION_CODE, backendCodes: [SCHOOL_ERP_SOLUTION_CODE] },
];
const EDIT_TAB_ORDER: SolutionCode[] = [
  POS_SOLUTION_CODE,
  SCHOOL_ERP_SOLUTION_CODE,
  ERP_SOLUTION_CODE,
  MEDICAL_SOLUTION_CODE,
];
const SCHOOL_ERP_MODULE_OPTIONS: SchoolErpModule[] = ['ACADEMICS', 'FINANCE'];
const ERP_WEB_ORIGIN = (import.meta.env.VITE_ERP_WEB_ORIGIN as string | undefined) ?? '';
const POS_WEB_ORIGIN = (import.meta.env.VITE_POS_WEB_ORIGIN as string | undefined) ?? '';
const CLINIC_WEB_ORIGIN = (import.meta.env.VITE_CLINIC_WEB_ORIGIN as string | undefined) ?? '';
const SCHOOL_ERP_WEB_ORIGIN = (import.meta.env.VITE_SCHOOL_ERP_WEB_ORIGIN as string | undefined) ?? '';

const ERP_TIER_FEATURES: Record<'Standard' | 'Professional' | 'Enterprise', string[]> = {
  Standard: ['sales'],
  Professional: ['sales', 'inventory', 'warehouse'],
  Enterprise: [
    'sales',
    'inventory',
    'warehouse',
    'purchasing',
    'accounting',
    'tax',
    'audit_trail',
    'fixed_asset',
  ],
};

const ERP_FEATURE_CATALOG_FALLBACK: ErpFeatureDefinition[] = [
  { key: 'sales', label: 'Sales' },
  { key: 'inventory', label: 'Inventory', description: 'Produk, kategori, stok, dan penyesuaian inventory.' },
  { key: 'warehouse', label: 'Warehouse', description: 'Warehouse CRUD, transfer gudang, dan stock opname.' },
  { key: 'purchasing', label: 'Purchasing', description: 'Purchase order, penerimaan barang, dan invoice pembelian.' },
  { key: 'accounting', label: 'Accounting', description: 'General ledger, jurnal, dan financial report.' },
  { key: 'tax', label: 'Tax', description: 'Pajak, VAT report, dan e-faktur.' },
  { key: 'audit_trail', label: 'Audit Trail', description: 'Audit log dan pelacakan aktivitas perubahan data.' },
  { key: 'fixed_asset', label: 'Fixed Asset', description: 'Manajemen fixed asset dan depresiasi.' },
];

const POS_MODULE_CATALOG_FALLBACK: AppInstanceModuleCatalogItem[] = mergeSubscriptionModuleCatalog([
  { key: 'module_dashboard', name: 'Dashboard', description: 'Ringkasan operasional POS.', status: 'FALLBACK' },
  { key: 'module_sales', name: 'Sales', description: 'Kasir dan transaksi penjualan.', status: 'FALLBACK' },
  { key: 'module_inventory', name: 'Inventory', description: 'Stok, mutasi, dan penyesuaian barang.', status: 'FALLBACK' },
  { key: 'module_procurement', name: 'Procurement', description: 'Belanja dan restock barang.', status: 'FALLBACK' },
  { key: 'module_sales_history', name: 'Sales History', description: 'Riwayat dan rekap transaksi.', status: 'FALLBACK' },
  { key: 'module_debt_management', name: 'Debt Management', description: 'Kasbon dan piutang pelanggan.', status: 'FALLBACK' },
  {
    key: 'module_customer_management',
    name: 'Customer Management',
    description: 'Data pelanggan dan histori pelanggan.',
    status: 'FALLBACK',
  },
  {
    key: 'module_finance_reports',
    name: 'Finance Reports',
    description: 'Laporan keuangan dan performa penjualan.',
    status: 'FALLBACK',
  },
  {
    key: 'module_expense_management',
    name: 'Expense Management',
    description: 'Pencatatan biaya operasional.',
    status: 'FALLBACK',
  },
  {
    key: 'module_supplier_management',
    name: 'Supplier Management',
    description: 'Data supplier dan pembelian.',
    status: 'FALLBACK',
  },
  { key: 'module_tax_reports', name: 'Tax Reports', description: 'Pelaporan pajak transaksi.', status: 'FALLBACK' },
  { key: 'module_user_management', name: 'User Management', description: 'Manajemen user POS.', status: 'FALLBACK' },
  { key: 'module_role_management', name: 'Role Management', description: 'Role dan hak akses.', status: 'FALLBACK' },
  { key: 'module_custom_rbac', name: 'Custom RBAC', description: 'Hak akses per modul/aksi.', status: 'FALLBACK' },
  {
    key: 'module_hardware_devices',
    name: 'Hardware Devices',
    description: 'Konfigurasi printer, scanner, dan device POS.',
    status: 'FALLBACK',
  },
  {
    key: 'module_realtime_sync',
    name: 'Realtime Sync',
    description: 'Sinkronisasi data antar device dan cloud.',
    status: 'FALLBACK',
  },
  { key: 'module_settings', name: 'Settings', description: 'Pengaturan aplikasi POS.', status: 'FALLBACK' },
  {
    key: 'module_receipt_printing',
    name: 'Receipt Printing',
    description: 'Cetak struk transaksi dan invoice.',
    status: 'FALLBACK',
  },
  { key: 'module_offline_mode', name: 'Offline Mode', description: 'Mode transaksi offline.', status: 'FALLBACK' },
  {
    key: 'module_service_orders',
    name: 'Service Orders',
    description: 'Service note dan pekerjaan servis.',
    status: 'FALLBACK',
  },
  { key: 'module_pre_order', name: 'Pre-Order', description: 'Pesanan dengan jadwal/uang muka.', status: 'FALLBACK' },
  { key: 'module_fnb', name: 'Table Management', description: 'Meja dan alur order F&B.', status: 'FALLBACK' },
  { key: 'module_shift_history', name: 'Shift History', description: 'Riwayat aktivitas shift kasir.', status: 'FALLBACK' },
  { key: 'module_hr_payroll', name: 'Payroll', description: 'Payroll dan komponen gaji.', status: 'FALLBACK' },
  {
    key: 'module_category_management',
    name: 'Category Management',
    description: 'Kategori produk dan pengelompokan item.',
    status: 'FALLBACK',
  },
  { key: 'module_multi_store', name: 'Multi Store', description: 'Akses lintas cabang/store.', status: 'FALLBACK' },
]);

const SYNC_MODE_LABELS: Record<SyncMode, string> = {
  CLOUD_FIRST: 'Cloud First',
  LOCAL_FIRST: 'Local First',
  LOCAL_SERVER: 'Local Server',
};

function isValidErpOrgIdCandidate(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value) && value.length >= 2 && value.length <= 50;
}

const initialForm: FormState = {
  tenantId: '',
  solutionId: '',
  solutionCode: '',
  tier: 'Standard',
  modules: [],
  activeModules: [],
  syncMode: 'CLOUD_FIRST',
  status: 'ACTIVE',
  endDate: '',
  adminEmail: '',
  adminPassword: '',
  adminName: '',
};

type TenantSubscriptionRow = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  instances: AppInstance[];
  primary: AppInstance;
  aggregatedStatus: AppInstanceStatus;
};

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  // Use UTC date portion for stability.
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatEndDate(value: string | null | undefined): string {
  const raw = typeof value === 'string' ? value : '';
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function formatRemaining(value: string | null | undefined): string {
  if (!value) return '—';
  const end = new Date(value);
  if (Number.isNaN(end.getTime())) return '—';
  const ms = end.getTime() - Date.now();
  const days = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  if (days >= 365) {
    const years = Math.floor(days / 365);
    return `${years} tahun`;
  }
  if (days >= 60) {
    const months = Math.floor(days / 30);
    return `${months} bulan`;
  }
  return `${days} hari`;
}

function isSubscriptionExpired(value: string | null | undefined): boolean {
  if (!value) return false;
  const end = new Date(value);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() < Date.now();
}

function isNonPosClientProvisionedSolution(code: '' | SolutionCode): boolean {
  return Boolean(code && code !== POS_SOLUTION_CODE);
}

function normalizeSchoolErpModules(value: unknown): SchoolErpModule[] {
  const toModule = (item: unknown): SchoolErpModule | null => {
    if (typeof item !== 'string') return null;
    const normalized = item.trim().toUpperCase();
    if (normalized === 'ACADEMICS' || normalized === 'FINANCE') {
      return normalized;
    }
    return null;
  };

  const fromArray = Array.isArray(value) ? value : [];
  const parsed = fromArray
    .map((item) => toModule(item))
    .filter((item): item is SchoolErpModule => item !== null);

  if (parsed.length > 0) {
    return [...new Set(parsed)];
  }

  if (typeof value === 'string') {
    const fromString = value
      .split(',')
      .map((item) => toModule(item))
      .filter((item): item is SchoolErpModule => item !== null);
    return [...new Set(fromString)];
  }

  return [];
}

function getSyncModeBadgeClass(mode: SyncMode): string {
  if (mode === 'CLOUD_FIRST') {
    return 'bg-sky-100 text-sky-700';
  }

  if (mode === 'LOCAL_FIRST') {
    return 'bg-amber-100 text-amber-700';
  }

  return 'bg-emerald-100 text-emerald-700';
}

function getTierTemplateModules(tier: SubscriptionTier): SubscriptionModuleKey[] {
  if (tier === 'Custom') {
    return [];
  }

  return sanitizeSubscriptionModules(TIER_DEFAULT_MODULES[tier]);
}

function normalizeSolutionCode(code: string | undefined): '' | SolutionCode {
  if (!code) return '';

  if (code === POS_SOLUTION_CODE) return POS_SOLUTION_CODE;
  if (code === ERP_SOLUTION_CODE) return ERP_SOLUTION_CODE;
  if (code === SCHOOL_ERP_SOLUTION_CODE) return SCHOOL_ERP_SOLUTION_CODE;
  if (code === MEDICAL_SOLUTION_CODE || code === CLINIC_SOLUTION_CODE) return MEDICAL_SOLUTION_CODE;

  return '';
}

function findSolutionByCode(solutions: Solution[], code: SolutionCode | ''): Solution | undefined {
  if (!code) return undefined;
  const option = SOLUTION_OPTIONS.find((item) => item.code === code);
  if (!option) return undefined;
  return solutions.find((solution) => option.backendCodes.includes(solution.code));
}

function getSchoolErpModulesFromInstance(instance: AppInstance): SchoolErpModule[] {
  return normalizeSchoolErpModules(instance.activeModules ?? instance.modules ?? instance.moduleKeys);
}

function buildFormStateFromInstance(instance: AppInstance, solutionCode: SolutionCode): FormState {
  return {
    tenantId: instance.tenantId,
    solutionId: instance.solutionId,
    solutionCode,
    tier: instance.tier,
    modules: sanitizeSubscriptionModules(
      Array.isArray(instance.moduleKeys) ? instance.moduleKeys : mapLegacyAddonsToModules(instance.addons)
    ),
    activeModules: getSchoolErpModulesFromInstance(instance),
    syncMode: instance.syncMode ?? 'CLOUD_FIRST',
    status: instance.status,
    endDate: toDateInputValue(instance.endDate ?? null),
    adminEmail: instance.adminEmail ?? '',
    adminPassword: '',
    adminName: instance.adminName ?? '',
  };
}

export default function AppInstancesPage() {
  const [items, setItems] = useState<AppInstance[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 10;

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
  const [moduleCatalog, setModuleCatalog] = useState<AppInstanceModuleCatalogItem[]>([]);
  const [moduleCatalogLoading, setModuleCatalogLoading] = useState(false);

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
      // Fetch all app instances so we can group by tenant without splitting tenants across pages.
      const limit = 100;
      const first = await listAppInstances({ page: 1, limit });
      let all = first.items;
      for (let nextPage = 2; nextPage <= first.meta.totalPages; nextPage += 1) {
        const pageResult = await listAppInstances({ page: nextPage, limit });
        all = all.concat(pageResult.items);
      }
      setItems(all);
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
  }, []);

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
    const solutionCode = normalizeSolutionCode(item.solution.code);
    if (!solutionCode) {
      setForm(initialForm);
    } else {
      setForm(buildFormStateFromInstance(item, solutionCode));
    }

    setErpSelectedFeatures([]);
    setIsModalOpen(true);
  };

  const onChangeField = (field: keyof FormState, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value as FormState[typeof field] };
      if (field === 'tier' && value !== 'Custom') {
        next.modules = getTierTemplateModules(value as SubscriptionTier);
        setErpSelectedFeatures([]);
      }
      if (field === 'solutionId' && value !== prev.solutionId) {
        next.modules = [];
        next.activeModules = [];
        setErpSelectedFeatures([]);
      }
      return next;
    });
  };

  const onChangeSolutionCode = (solutionCode: '' | SolutionCode) => {
    const matchedSolution = findSolutionByCode(solutions, solutionCode);

    if (!solutionCode) {
      setForm((prev) => ({
        ...prev,
        solutionCode,
        solutionId: '',
        modules: [],
        activeModules: [],
      }));
      setErpSelectedFeatures([]);
      return;
    }

    if (editingItem) {
      const targetInstance = items.find(
        (instance) =>
          instance.tenantId === editingItem.tenantId && normalizeSolutionCode(instance.solution.code) === solutionCode
      );

      if (targetInstance) {
        setEditingItem(targetInstance);
        setForm(buildFormStateFromInstance(targetInstance, solutionCode));
        setErpSelectedFeatures([]);
        return;
      }

      toast.warning(`Subscription ${solutionCode} untuk tenant ini belum tersedia.`);
      return;
    }

    setForm((prev) => ({
      ...prev,
      solutionCode,
      solutionId: matchedSolution?.id ?? '',
      tier: solutionCode === POS_SOLUTION_CODE ? prev.tier : 'Standard',
      syncMode: solutionCode === POS_SOLUTION_CODE ? prev.syncMode : 'CLOUD_FIRST',
      modules: solutionCode === POS_SOLUTION_CODE ? getTierTemplateModules(prev.tier) : [],
      activeModules: [],
    }));
    setErpSelectedFeatures(solutionCode === ERP_SOLUTION_CODE ? [...ERP_TIER_FEATURES.Standard] : []);
  };

  const toggleSchoolErpModule = (moduleKey: SchoolErpModule) => {
    setForm((prev) => {
      const hasModule = prev.activeModules.includes(moduleKey);
      return {
        ...prev,
        activeModules: hasModule
          ? prev.activeModules.filter((item) => item !== moduleKey)
          : [...prev.activeModules, moduleKey],
      };
    });
  };

  const toggleModule = (moduleKey: SubscriptionModuleKey) => {
    setForm((prev) => {
      const hasModule = prev.modules.includes(moduleKey);
      return {
        ...prev,
        modules: hasModule ? prev.modules.filter((item) => item !== moduleKey) : [...prev.modules, moduleKey],
      };
    });
  };

  const isErpSolution = form.solutionCode === ERP_SOLUTION_CODE;
  const isPosSolution = form.solutionCode === POS_SOLUTION_CODE;
  const isSchoolErpSolution = form.solutionCode === SCHOOL_ERP_SOLUTION_CODE;
  const needsErpFeaturePicker = Boolean(isErpSolution);
  const editSolutionTabs = useMemo(() => {
    if (!editingItem) return [] as SolutionCode[];

    const availableCodes = new Set<SolutionCode>();
    for (const instance of items) {
      if (instance.tenantId !== editingItem.tenantId) continue;
      const code = normalizeSolutionCode(instance.solution.code);
      if (code) availableCodes.add(code);
    }

    return EDIT_TAB_ORDER.filter((code) => availableCodes.has(code));
  }, [editingItem, items]);

  const resolveErpOrganizationId = () => {
    const fromEditing = editingItem?.tenant?.slug;
    const fromRefs = tenants.find((t) => t.id === form.tenantId)?.slug;
    const slug = (fromEditing ?? fromRefs ?? '').trim();
    return slug && isValidErpOrgIdCandidate(slug) ? slug : undefined;
  };

  useEffect(() => {
    const loadModuleCatalog = async () => {
      if (!isModalOpen || !isPosSolution) {
        return;
      }

      setModuleCatalogLoading(true);
      try {
        const items = await getAppInstanceModuleCatalog({
          solutionId: form.solutionId || undefined,
          solutionCode: form.solutionCode || undefined,
        });
        const nextCatalog = items.length > 0 ? items : POS_MODULE_CATALOG_FALLBACK;
        setModuleCatalog(mergeSubscriptionModuleCatalog(nextCatalog));
      } catch {
        setModuleCatalog(POS_MODULE_CATALOG_FALLBACK);
      } finally {
        setModuleCatalogLoading(false);
      }
    };

    void loadModuleCatalog();
  }, [form.solutionCode, form.solutionId, isModalOpen, isPosSolution]);

  useEffect(() => {
    const load = async () => {
      if (!isModalOpen || !needsErpFeaturePicker) return;
      if (erpFeatureCatalog.length) return;

      setErpFeatureLoading(true);
      try {
        const features = await getErpFeatureCatalog();
        const byKey = new Map<string, ErpFeatureDefinition>();

        for (const f of ERP_FEATURE_CATALOG_FALLBACK) {
          byKey.set(f.key, f);
        }

        for (const f of features) {
          if (!f?.key) continue;
          const existing = byKey.get(f.key);
          byKey.set(f.key, {
            key: f.key,
            label: f.label || existing?.label || f.key,
            description: f.description ?? existing?.description,
          });
        }

        const merged = Array.from(byKey.values()).sort((a, b) => a.label.localeCompare(b.label));
        setErpFeatureCatalog(merged);
      } catch (error: unknown) {
        setErpFeatureCatalog(ERP_FEATURE_CATALOG_FALLBACK);
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
      erpSelectedFeatures.length > 0
        ? erpSelectedFeatures
        : ERP_TIER_FEATURES[
            (tier === 'Professional' || tier === 'Enterprise' ? tier : 'Standard') as
              'Standard' | 'Professional' | 'Enterprise'
          ];

    await provisionErp({
      tenantId: form.tenantId,
      organizationId,
      organizationName: tenant?.name,
      features,
      adminEmail: form.adminEmail.trim() || undefined,
      adminPassword: form.adminPassword.trim() || undefined,
      adminName: form.adminName.trim() || tenant?.name || undefined,
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

  const getSolutionBadgeClasses = (solutionCode: string): string => {
    if (solutionCode === POS_SOLUTION_CODE) {
      return 'bg-blue-100 text-blue-700';
    }

    if (solutionCode === SCHOOL_ERP_SOLUTION_CODE) {
      return 'bg-emerald-100 text-emerald-700';
    }

    return 'bg-slate-100 text-slate-700';
  };

  const getInstanceActiveModules = (instance: AppInstance): string[] => {
    if (instance.solution.code !== SCHOOL_ERP_SOLUTION_CODE) {
      return [];
    }

      return getSchoolErpModulesFromInstance(instance);
  };

  const openSolutionApp = (item: AppInstance) => {
    if (item.status !== 'ACTIVE') {
      toast.message('Subscription ini sedang tidak aktif.');
      return;
    }

    if (isSubscriptionExpired(item.endDate ?? null)) {
      toast.message('Subscription ini sudah melewati end date dan aksesnya dimatikan.');
      return;
    }

    const code = item.solution.code;
    const configuredOrigin =
      code === 'ERP'
        ? ERP_WEB_ORIGIN
        : code === 'POS'
          ? POS_WEB_ORIGIN
          : code === 'CLINIC'
            ? CLINIC_WEB_ORIGIN
            : code === 'SCHOOL_ERP'
              ? SCHOOL_ERP_WEB_ORIGIN
              : '';

    let origin = configuredOrigin.trim();
    if (!origin && item.appUrl) {
      try {
        origin = new URL(item.appUrl).origin;
      } catch {
        // ignore invalid appUrl, we'll show an error below
      }
    }

    if (!origin) {
      if (item.appUrl) {
        window.open(item.appUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      toast.message('Link aplikasi belum tersedia untuk subscription ini.');
      return;
    }

    const urlToOpen =
      code === 'ERP'
        ? `${origin}/erp/${item.tenant.slug}/login`
        : code === 'POS' || code === 'CLINIC'
          ? `${origin}/t/${item.tenant.slug}/login`
          : code === 'SCHOOL_ERP'
            ? `${origin}/login?tenantSlug=${encodeURIComponent(item.tenant.slug)}`
            : item.appUrl ?? origin;

    window.open(urlToOpen, '_blank', 'noopener,noreferrer');
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.solutionId) {
      toast.error('Solution belum tersedia. Pastikan solusi POS / ERP / MEDICAL / SCHOOL_ERP sudah aktif.');
      return;
    }

    if (isNonPosClientProvisionedSolution(form.solutionCode)) {
      if (!form.adminEmail.trim()) {
        toast.error('Email admin produk wajib diisi untuk subscription non-POS.');
        return;
      }

      if (!editingItem && !form.adminPassword.trim()) {
        toast.error('Password admin produk wajib diisi saat membuat subscription non-POS.');
        return;
      }
    }

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
        const moduleKeys = isPosSolution
          ? sanitizeSubscriptionModules(form.modules)
          : isSchoolErpSolution
            ? [...form.activeModules]
            : [];
        const schoolModules = isSchoolErpSolution ? [...form.activeModules] : [];
        await updateAppInstance(editingItem.id, {
          solution: form.solutionCode,
          tier: form.tier,
          moduleKeys,
          modules: schoolModules,
          activeModules: schoolModules,
          addons: mapModulesToLegacyAddons(moduleKeys),
          syncMode: form.syncMode,
          status: form.status,
          adminEmail: isNonPosClientProvisionedSolution(form.solutionCode) ? form.adminEmail.trim() : null,
          adminPassword: isNonPosClientProvisionedSolution(form.solutionCode)
            ? (form.adminPassword.trim() || undefined)
            : null,
          adminName: isNonPosClientProvisionedSolution(form.solutionCode) ? (form.adminName.trim() || null) : null,
          endDate: form.endDate ? form.endDate : null,
        });

        if (isErpSolution) {
          await applyErpFeaturesForTier(form.tier);
        }
        toast.success('Subscription berhasil diupdate');
      } else {
        const moduleKeys = isPosSolution
          ? sanitizeSubscriptionModules(form.modules)
          : isSchoolErpSolution
            ? [...form.activeModules]
            : [];
        const schoolModules = isSchoolErpSolution ? [...form.activeModules] : [];
        const created = await createAppInstance({
          tenantId: form.tenantId,
          solutionId: form.solutionId,
          solution: form.solutionCode,
          tier: form.tier,
          moduleKeys,
          modules: schoolModules,
          activeModules: schoolModules,
          addons: mapModulesToLegacyAddons(moduleKeys),
          syncMode: form.syncMode,
          status: form.status,
          adminEmail: isNonPosClientProvisionedSolution(form.solutionCode) ? form.adminEmail.trim() : null,
          adminPassword: isNonPosClientProvisionedSolution(form.solutionCode) ? form.adminPassword.trim() : null,
          adminName: isNonPosClientProvisionedSolution(form.solutionCode) ? (form.adminName.trim() || null) : null,
          endDate: form.endDate ? form.endDate : null,
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

  const groupedRows = useMemo((): TenantSubscriptionRow[] => {
    const map = new Map<string, AppInstance[]>();
    for (const item of items) {
      const key = item.tenantId;
      const prev = map.get(key);
      if (prev) prev.push(item);
      else map.set(key, [item]);
    }

    const rows: TenantSubscriptionRow[] = [];
    for (const [tenantId, instances] of map.entries()) {
      const sortedInstances = [...instances].sort((a, b) =>
        a.solution.code.localeCompare(b.solution.code)
      );
      const primary =
        sortedInstances.find((i) => i.solution.code === ERP_SOLUTION_CODE) ?? sortedInstances[0];
      const aggregatedStatus: AppInstanceStatus = sortedInstances.some((i) => i.status !== 'ACTIVE')
        ? 'SUSPENDED'
        : 'ACTIVE';

      const hasBlockedAccess = sortedInstances.some(
        (instance) => instance.status !== 'ACTIVE' || isSubscriptionExpired(instance.endDate ?? null)
      );

      rows.push({
        tenantId,
        tenantName: primary.tenant.name,
        tenantSlug: primary.tenant.slug,
        instances: sortedInstances,
        primary,
        aggregatedStatus: hasBlockedAccess ? 'SUSPENDED' : aggregatedStatus,
      });
    }

    rows.sort((a, b) => a.tenantName.localeCompare(b.tenantName));
    return rows;
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(groupedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = groupedRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

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
                    {item.solution.code === POS_SOLUTION_CODE ? (
                      <>
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
                      </>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                        Tier: {item.tier}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>

      {loadingTable ? (
        <TableSkeleton rows={6} columns={5} />
      ) : (
        <DataTable
          headers={['Client', 'Solution', 'Subscription', 'Status', 'Actions']}
          hasData={groupedRows.length > 0}
          emptyMessage={tableError ?? 'Belum ada subscription/app instance.'}
        >
          {pagedRows.map((row) => (
            <tr key={row.tenantId} className="hover:bg-slate-50/70">
              <td className="px-4 py-3 font-medium text-dark">{row.tenantName}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {row.instances.map((instance) => (
                    <span
                      key={instance.id}
                      className={[
                        'rounded-full px-2 py-0.5 text-xs font-semibold',
                        getSolutionBadgeClasses(instance.solution.code),
                      ].join(' ')}
                      title={instance.solution.name}
                    >
                      {instance.solution.code}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="space-y-2">
                  {row.instances.map((instance) => (
                    <div key={instance.id} className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {instance.solution.code}: {instance.tier}
                        </span>
                        {instance.solution.code === POS_SOLUTION_CODE ? (
                          <span
                            className={[
                              'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                              getSyncModeBadgeClass(instance.syncMode ?? 'CLOUD_FIRST'),
                            ].join(' ')}
                          >
                            Sync: {SYNC_MODE_LABELS[instance.syncMode ?? 'CLOUD_FIRST']}
                          </span>
                        ) : null}
                      </div>
                      {instance.solution.code === SCHOOL_ERP_SOLUTION_CODE ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-xs text-slate-500">Modules:</span>
                          {getInstanceActiveModules(instance).length > 0 ? (
                            getInstanceActiveModules(instance).map((module) => (
                              <span
                                key={`${instance.id}-${module}`}
                                className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                              >
                                {module}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">-</span>
                          )}
                        </div>
                      ) : null}
                      <div className="text-xs text-slate-500">
                        Sisa: {formatRemaining(instance.endDate ?? null)} • End:{' '}
                        {formatEndDate(instance.endDate ?? null)}
                      </div>
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={[
                    'rounded-full px-2 py-1 text-xs font-semibold',
                    row.aggregatedStatus === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700',
                  ].join(' ')}
                >
                  {row.aggregatedStatus}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {row.instances.map((instance) => (
                    <button
                      key={instance.id}
                      type="button"
                      onClick={() => openSolutionApp(instance)}
                      disabled={instance.status !== 'ACTIVE' || isSubscriptionExpired(instance.endDate ?? null)}
                      className={[
                        getSolutionButtonClasses(instance.solution.code),
                        instance.status !== 'ACTIVE' || isSubscriptionExpired(instance.endDate ?? null)
                          ? 'cursor-not-allowed opacity-50'
                          : '',
                      ].join(' ')}
                      title={
                        instance.status !== 'ACTIVE'
                          ? `${instance.solution.code} sedang nonaktif`
                          : isSubscriptionExpired(instance.endDate ?? null)
                            ? `${instance.solution.code} sudah expired`
                            : `Buka ${instance.solution.code}`
                      }
                    >
                      {instance.solution.code}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => openEditModal(row.primary)}
                    className="rounded-md p-1.5 text-yellow-600 hover:bg-yellow-50"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingItem(row.primary);
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

      <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />

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
          {editingItem ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Solution</p>
              <div className="flex flex-wrap gap-2">
                {editSolutionTabs.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onChangeSolutionCode(code)}
                    className={[
                      'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                      form.solutionCode === code
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

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

            {!editingItem ? (
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Solution *</span>
                <select
                  required
                  value={form.solutionCode}
                  onChange={(event) =>
                    onChangeSolutionCode(event.target.value as '' | SolutionCode)
                  }
                  disabled={loadingRefs}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
                >
                  <option value="">-- Select Solution --</option>
                  {SOLUTION_OPTIONS.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.code}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {isPosSolution ? (
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
                  <option value="Custom">Custom</option>
                </select>
              </label>
            ) : null}

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Status *</span>
              <select
                required
                value={form.status}
                onChange={(event) => onChangeField('status', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </label>

            {isPosSolution ? (
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Mode Sinkronisasi (POS)</span>
                <select
                  value={form.syncMode}
                  onChange={(event) => onChangeField('syncMode', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
                >
                  <option value="CLOUD_FIRST">Cloud First (Full Online)</option>
                  <option value="LOCAL_FIRST">Local First (Offline Mandiri)</option>
                  <option value="LOCAL_SERVER">Local Server (Multi-Device Offline)</option>
                </select>
              </label>
            ) : null}

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">End Date</span>
              <input
                type="date"
                value={form.endDate}
                onChange={(event) => onChangeField('endDate', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
              />
              <p className="text-xs text-slate-500">Kosongkan jika subscription tidak memiliki batas akhir.</p>
            </label>
          </div>

          {isNonPosClientProvisionedSolution(form.solutionCode) ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-dark">Admin Produk</p>
              <p className="text-xs text-slate-600">
                Email dan password ini dipakai sebagai superadmin awal untuk produk non-POS yang dikelola client.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Nama Admin</span>
                  <input
                    type="text"
                    value={form.adminName}
                    onChange={(event) => onChangeField('adminName', event.target.value)}
                    placeholder="Admin Company"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Email Admin *</span>
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(event) => onChangeField('adminEmail', event.target.value)}
                    placeholder="admin@company.com"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">
                    Password Admin {editingItem ? '(isi hanya jika ingin mengganti)' : '*'}
                  </span>
                  <input
                    type="text"
                    value={form.adminPassword}
                    onChange={(event) => onChangeField('adminPassword', event.target.value)}
                    placeholder={editingItem ? 'Kosongkan jika tidak ingin mengubah password' : 'Masukkan password admin'}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {isPosSolution ? (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-dark">Active Modules (POS)</p>
              <p className="text-xs text-slate-600">
                Tier akan mengisi template default modul POS. Pilih `Custom` jika ingin mengatur modul secara manual.
              </p>
              {moduleCatalogLoading ? (
                <p className="text-sm text-slate-600">Memuat katalog modul...</p>
              ) : moduleCatalog.length === 0 ? (
                <p className="text-sm text-slate-600">Katalog modul belum tersedia.</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {moduleCatalog.map((moduleOption) => (
                    <label
                      key={moduleOption.key}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 bg-white p-2"
                    >
                      <input
                        type="checkbox"
                        checked={form.modules.includes(moduleOption.key)}
                        onChange={() => toggleModule(moduleOption.key)}
                        className="mt-1"
                      />
                      <span className="block">
                        <span className="flex items-center gap-2 text-sm font-medium text-dark">
                          <span>{moduleOption.name}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            {moduleOption.status}
                          </span>
                        </span>
                        <span className="block text-xs text-slate-500">{moduleOption.key}</span>
                        {moduleOption.description ? (
                          <span className="block text-xs text-slate-500">{moduleOption.description}</span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {isSchoolErpSolution ? (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-dark">Active Modules (SCHOOL_ERP)</p>
              <p className="text-xs text-slate-600">Pilih modul SCHOOL_ERP yang diaktifkan untuk tenant ini.</p>
              <div className="grid gap-2 md:grid-cols-2">
                {SCHOOL_ERP_MODULE_OPTIONS.map((moduleOption) => (
                  <label
                    key={moduleOption}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white p-2"
                  >
                    <input
                      type="checkbox"
                      checked={form.activeModules.includes(moduleOption)}
                      onChange={() => toggleSchoolErpModule(moduleOption)}
                    />
                    <span className="text-sm font-medium text-dark">{moduleOption}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : form.solutionCode && !isPosSolution ? (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-dark">Modules</p>
              <p className="text-sm text-slate-600">
                Solution ini tidak memakai katalog modul POS. Jika solution adalah ERP, gunakan checklist fitur ERP yang mengikuti modul/RBAC aplikasi ERP.
              </p>
            </div>
          ) : null}

          {needsErpFeaturePicker ? (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-dark">ERP Features</p>
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
