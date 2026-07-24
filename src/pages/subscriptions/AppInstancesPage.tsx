import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ChevronDown, ChevronRight, Copy, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createAppInstance,
  deleteAppInstance,
  getAppInstanceModuleCatalog,
  listAppInstances,
  type SyncMode,
  updateAppInstance,
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

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
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
  const [tenantSearch, setTenantSearch] = useState('');
  const [selectedSolutionFilters, setSelectedSolutionFilters] = useState<string[]>([]);
  const [expandedTenantIds, setExpandedTenantIds] = useState<string[]>([]);

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

  useEffect(() => {
    void fetchAppInstances();
  }, []);

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

  const getSolutionLoginUrl = (item: AppInstance): string | null => {
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
        origin = normalizeOrigin(new URL(item.appUrl).origin);
      } catch {
        // ignore invalid appUrl, we'll show an error below
      }
    }

    if (!origin) {
      return item.appUrl ?? null;
    }

    return (
      code === 'ERP'
        ? `${origin}/erp/${item.tenant.slug}/login`
        : code === 'POS' || code === 'CLINIC'
          ? `${origin}/t/${item.tenant.slug}/login`
          : code === 'SCHOOL_ERP'
            ? `${origin}/school-erp/${encodeURIComponent(item.tenant.slug)}/login`
            : item.appUrl ?? origin
    );
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

    const urlToOpen = getSolutionLoginUrl(item);
    if (!urlToOpen) {
      toast.message('Link aplikasi belum tersedia untuk subscription ini.');
      return;
    }

    window.open(urlToOpen, '_blank', 'noopener,noreferrer');
  };

  const copyLoginUrl = async (item: AppInstance) => {
    const url = getSolutionLoginUrl(item);
    if (!url) {
      toast.message('Link login belum tersedia untuk subscription ini.');
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success(`URL login ${item.solution.code} berhasil disalin`);
    } catch {
      toast.error('Gagal menyalin URL login.');
    }
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

  const availableSolutionFilters = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.solution.code)))
        .sort((a, b) => a.localeCompare(b))
        .map((code) => ({
          code,
          label: solutions.find((solution) => solution.code === code)?.name ?? code,
        })),
    [items, solutions]
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = tenantSearch.trim().toLowerCase();

    return groupedRows.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        row.tenantName.toLowerCase().includes(normalizedSearch) ||
        row.tenantSlug.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      if (selectedSolutionFilters.length === 0) {
        return true;
      }

      const rowSolutionCodes = new Set(row.instances.map((instance) => instance.solution.code));
      return selectedSolutionFilters.every((code) => rowSolutionCodes.has(code));
    });
  }, [groupedRows, selectedSolutionFilters, tenantSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [PAGE_SIZE, filteredRows, safePage]
  );

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  useEffect(() => {
    setPage(1);
  }, [tenantSearch, selectedSolutionFilters]);

  useEffect(() => {
    setExpandedTenantIds((current) => {
      const visibleIds = new Set(pagedRows.map((row) => row.tenantId));
      const kept = current.filter((tenantId) => visibleIds.has(tenantId));
      if (kept.length > 0) {
        return kept;
      }

      const firstTenantId = pagedRows[0]?.tenantId;
      return firstTenantId ? [firstTenantId] : [];
    });
  }, [pagedRows]);

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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <p className="text-base font-semibold text-dark">Filter Subscriptions</p>
            <p className="mt-1 text-sm text-slate-600">
              Cari tenant berdasarkan nama atau slug, lalu filter tenant yang berlangganan kombinasi produk tertentu.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setTenantSearch('');
              setSelectedSolutionFilters([]);
            }}
            className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Reset Filter
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Cari Tenant</span>
            <input
              type="text"
              value={tenantSearch}
              onChange={(event) => setTenantSearch(event.target.value)}
              placeholder="Cari nama tenant atau slug..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
          </label>

          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Filter Produk</span>
            <div className="flex min-h-[42px] flex-wrap items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
              {availableSolutionFilters.length === 0 ? (
                <span className="text-sm text-slate-500">Belum ada produk.</span>
              ) : (
                availableSolutionFilters.map((solution) => {
                  const isSelected = selectedSolutionFilters.includes(solution.code);

                  return (
                    <button
                      key={solution.code}
                      type="button"
                      onClick={() =>
                        setSelectedSolutionFilters((current) =>
                          current.includes(solution.code)
                            ? current.filter((code) => code !== solution.code)
                            : [...current, solution.code]
                        )
                      }
                      className={[
                        'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200/70',
                      ].join(' ')}
                    >
                      {solution.code}
                    </button>
                  );
                })
              )}
            </div>
            <p className="text-xs text-slate-500">
              Jika memilih beberapa produk, hanya tenant yang memiliki semua produk tersebut yang akan tampil.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>
            Menampilkan {filteredRows.length} tenant dari {groupedRows.length} tenant
          </span>
          {selectedSolutionFilters.map((code) => (
            <span
              key={code}
              className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700"
            >
              {code}
            </span>
          ))}
        </div>
      </div>

      {loadingTable ? (
        <TableSkeleton rows={6} columns={5} />
      ) : groupedRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          {tableError ?? 'Belum ada subscription/app instance.'}
        </div>
      ) : (
        <div className="space-y-4">
          {pagedRows.map((row) => {
            const isExpanded = expandedTenantIds.includes(row.tenantId);

            return (
              <div key={row.tenantId} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedTenantIds((current) =>
                      current.includes(row.tenantId)
                        ? current.filter((tenantId) => tenantId !== row.tenantId)
                        : [...current, row.tenantId]
                    )
                  }
                  className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-dark">{row.tenantName}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {row.tenantSlug}
                      </span>
                      <span
                        className={[
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          row.aggregatedStatus === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700',
                        ].join(' ')}
                      >
                        {row.aggregatedStatus}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {row.instances.length} produk tersubscribe
                      </span>
                      {row.instances.map((instance) => (
                        <span
                          key={instance.id}
                          className={[
                            'rounded-full px-2 py-0.5 text-xs font-semibold',
                            getSolutionBadgeClasses(instance.solution.code),
                          ].join(' ')}
                        >
                          {instance.solution.code}
                        </span>
                      ))}
                    </div>
                  </div>

                  <span className="mt-1 rounded-md border border-slate-200 bg-white p-1 text-slate-500">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                </button>

                {isExpanded ? (
                  <div className="border-t border-slate-200 bg-slate-50/50 p-4">
                    <div className="space-y-3">
                      {row.instances.map((instance) => {
                        const loginUrl = getSolutionLoginUrl(instance);
                        const isBlocked =
                          instance.status !== 'ACTIVE' || isSubscriptionExpired(instance.endDate ?? null);

                        return (
                          <div
                            key={instance.id}
                            className="rounded-xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={[
                                      'rounded-full px-2.5 py-1 text-xs font-semibold',
                                      getSolutionBadgeClasses(instance.solution.code),
                                    ].join(' ')}
                                  >
                                    {instance.solution.code}
                                  </span>
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                    Tier: {instance.tier}
                                  </span>
                                  {instance.solution.code === POS_SOLUTION_CODE ? (
                                    <span
                                      className={[
                                        'rounded-full px-2.5 py-1 text-xs font-semibold',
                                        getSyncModeBadgeClass(instance.syncMode ?? 'CLOUD_FIRST'),
                                      ].join(' ')}
                                    >
                                      Sync: {SYNC_MODE_LABELS[instance.syncMode ?? 'CLOUD_FIRST']}
                                    </span>
                                  ) : null}
                                  <span
                                    className={[
                                      'rounded-full px-2.5 py-1 text-xs font-semibold',
                                      instance.status === 'ACTIVE'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-red-100 text-red-700',
                                    ].join(' ')}
                                  >
                                    {instance.status}
                                  </span>
                                  {isSubscriptionExpired(instance.endDate ?? null) ? (
                                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                      Expired
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

                                <div className="space-y-1">
                                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    URL Login
                                  </div>
                                  <div className="flex flex-col gap-2 md:flex-row">
                                    <input
                                      readOnly
                                      value={loginUrl ?? 'Link belum tersedia'}
                                      className="min-w-0 flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700"
                                    />
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => copyLoginUrl(instance)}
                                        disabled={!loginUrl}
                                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        <Copy size={14} />
                                        Copy URL
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openSolutionApp(instance)}
                                        disabled={isBlocked}
                                        className={[
                                          getSolutionButtonClasses(instance.solution.code),
                                          'inline-flex items-center gap-1',
                                          isBlocked ? 'cursor-not-allowed opacity-50' : '',
                                        ].join(' ')}
                                      >
                                        <ExternalLink size={14} />
                                        Buka
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-start">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(instance)}
                                  className="rounded-md border border-yellow-200 p-2 text-yellow-600 hover:bg-yellow-50"
                                  title={`Edit ${instance.solution.code}`}
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingItem(instance);
                                    setIsDeleteOpen(true);
                                  }}
                                  className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                                  title={`Delete ${instance.solution.code}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
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
