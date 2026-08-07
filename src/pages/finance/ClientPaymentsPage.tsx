import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Check,
  XCircle,
  Upload,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Loader2,
  FileText,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import Modal from '../../components/common/Modal';
import {
  MONTH_LABELS_ID,
  formatCurrencyIDR,
  SEED_CLIENTS,
  SEED_PRODUCTS,
  SEED_TENANT_CLIENTS,
  SEED_LICENSE_PRODUCTS,
  type Client as DemoClient,
  type Product as DemoProduct,
} from '../../lib/finance-demo';
import {
  getMatrix,
  upsertCell,
  matrixKey,
  listClientsAndProducts,
  type Client,
  type Product,
  type CellPayment,
} from '../../lib/api/clientPaymentsApi';
import { resolveMediaUrl } from '../../lib/api/httpClient';
import { listTenants, type Tenant } from '../../lib/api/tenantApi';
import { useAuth } from '../../context/useAuth';
import { getApiErrorMessage } from '../../lib/utils/apiError';

type PaymentMatrix = Record<string, CellPayment>;

function generateSeedMatrix(
  clients: Client[],
  products: Product[],
  year: number
): PaymentMatrix {
  const matrix: PaymentMatrix = {};
  const receiptPool = [
    'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800',
    'https://images.unsplash.com/photo-1588675647532-4be75a20e66a?w=800',
    'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800',
  ];
  for (const product of products) {
    for (const client of clients) {
      for (let monthIdx = 0; monthIdx <= 6; monthIdx++) {
        if (Math.random() < 0.5) {
          const key = matrixKey({
            clientId: client.id,
            productId: product.id,
            periodMonth: monthIdx + 1,
            periodYear: year,
          });
          matrix[key] = {
            status: 'Paid',
            amountIDR: product.defaultPrice,
            receiptImages: [receiptPool[Math.floor(Math.random() * receiptPool.length)]],
          };
        }
      }
    }
  }
  return matrix;
}

function adaptDemoClient(c: DemoClient): Client {
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? '',
    phone: c.phone ?? '',
  };
}

function adaptDemoProduct(p: DemoProduct): Product {
  return {
    id: p.id,
    name: p.name,
    defaultPrice: p.defaultPrice,
  };
}

function adaptBackendClientsProducts<T extends { id: any; name: any; price?: any; defaultPrice?: any; email?: any; phone?: any }>(
  raw: { clients: T[]; products: T[] }
): { clients: Client[]; products: Product[] } {
  const clients: Client[] = (raw.clients || []).map((c) => ({
    id: String((c as any).code ?? c.id ?? ''),
    name: String(c.name ?? ''),
    email: String((c as any).email ?? ''),
    phone: String(c.phone ?? ''),
  }));
  const products: Product[] = (raw.products || []).map((p) => ({
    id: String((p as any).code ?? p.id ?? ''),
    name: String(p.name ?? ''),
    defaultPrice: Number(p.price ?? p.defaultPrice ?? 0),
  }));
  return { clients, products };
}

interface EditModalState {
  isOpen: boolean;
  clientId: string | null;
  monthIdx: number | null;
}

export default function ClientPaymentsPage() {
  const { isSuperAdmin } = useAuth();
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeProductId, setActiveProductId] = useState<string>('');
  const [matrix, setMatrix] = useState<PaymentMatrix>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editModal, setEditModal] = useState<EditModalState>({
    isOpen: false,
    clientId: null,
    monthIdx: null,
  });

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('clientPayment.activeTenantId') ?? '';
  });

  const [formStatus, setFormStatus] = useState<'Paid' | 'Not Paid'>('Not Paid');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [displayAmount, setDisplayAmount] = useState<string>('0');
  const [formReceipts, setFormReceipts] = useState<string[]>([]);
  const [brokenReceipts, setBrokenReceipts] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptFilesRef = useRef<File[]>([]);

  const activeProduct = useMemo(() => {
    if (products.length === 0) return { id: '', name: '', defaultPrice: 0 };
    return products.find((p) => p.id === activeProductId) ?? products[0];
  }, [products, activeProductId]);

  const editingClient = useMemo(
    () =>
      editModal.clientId
        ? clients.find((c) => c.id === editModal.clientId) ?? null
        : null,
    [editModal.clientId, clients]
  );

  useEffect(() => {
    if (!isSuperAdmin) return;
    let isActive = true;
    setLoadingTenants(true);
    listTenants({ page: 1, limit: 100 })
      .then((result) => {
        if (!isActive) return;
        setTenants(result.items ?? []);
        if (!activeTenantId && (result.items ?? []).length > 0) {
          const firstId = String((result.items ?? [])[0].id);
          setActiveTenantId(firstId);
          window.localStorage.setItem('clientPayment.activeTenantId', firstId);
        }
      })
      .catch((e) => {
        if (!isActive) return;
        toast.error(`Gagal memuat daftar tenant: ${getApiErrorMessage(e)}`);
      })
      .finally(() => {
        if (!isActive) return;
        setLoadingTenants(false);
      });
    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  const editingCellKey = useMemo(() => {
    if (!editModal.clientId || editModal.monthIdx === null) return null;
    return matrixKey({
      clientId: editModal.clientId,
      productId: activeProductId,
      periodMonth: editModal.monthIdx + 1,
      periodYear: currentYear,
    });
  }, [editModal.clientId, editModal.monthIdx, currentYear, activeProductId]);

  const totalsByProduct = useMemo<Record<string, number>>(() => {
    const acc: Record<string, number> = {};
    const entries = Object.entries(matrix || {});
    for (const [key, cell] of entries) {
      if (!cell || cell.status !== 'Paid') continue;
      const parts = key.split(':');
      if (parts.length < 4) continue;
      const productId = String(parts[1] || '').trim();
      if (!productId) continue;
      const year = Number(parts[3]);
      if (!Number.isFinite(year) || year !== currentYear) continue;
      const amt = Number(cell.amountIDR || 0);
      if (!Number.isFinite(amt) || amt <= 0) continue;
      acc[productId] = (acc[productId] || 0) + amt;
    }
    if (import.meta.env.DEV) {
      const keys = Object.keys(matrix || {});
      console.debug('[totalsByProduct] debug:', {
        currentYear,
        matrixKeys: keys.length,
        keys: keys.slice(0, 5),
        paidEntries: Object.values(matrix || {}).filter((c: any) => c?.status === 'Paid').length,
        totals: acc,
      });
    }
    return acc;
  }, [matrix, currentYear]);

  async function loadAll(year: number, productId: string) {
    if (isSuperAdmin && !activeTenantId) {
      setIsLoading(false);
      setClients([]);
      setProducts([]);
      setMatrix({});
      setActiveProductId('');
      return;
    }
    setIsLoading(true);
    try {
      let finalClients: Client[] = [];
      let finalProducts: Product[] = [];
      let apiMatrix: PaymentMatrix = {};

      const tenantParams = isSuperAdmin && activeTenantId ? { tenantId: activeTenantId } : undefined;

      try {
        const firstMatrix = await getMatrix(year, productId || '', tenantParams);
        apiMatrix = firstMatrix.matrix || {};
        const refs = firstMatrix.references || { clients: [], products: [] };
        if (refs.clients.length > 0 || refs.products.length > 0) {
          const adapted = adaptBackendClientsProducts(refs as any);
          finalClients = adapted.clients;
          finalProducts = adapted.products;
        }
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn('[ClientPaymentsPage] getMatrix references failed, using static seed fallback', e);
        }
      }

      if (finalClients.length === 0 || finalProducts.length === 0) {
        try {
          const fetched = await listClientsAndProducts(tenantParams);
          if (finalClients.length === 0) finalClients = fetched.clients || [];
          if (finalProducts.length === 0) finalProducts = fetched.products || [];
        } catch (e2) {
          if (import.meta.env.DEV) {
            console.warn('[ClientPaymentsPage] listClientsAndProducts fallback failed, using DEV-only seed', e2);
          }
        }
      }

      if (finalClients.length === 0 && import.meta.env.DEV) {
        finalClients = SEED_TENANT_CLIENTS.length > 0
          ? SEED_TENANT_CLIENTS.map(adaptDemoClient)
          : SEED_CLIENTS.map(adaptDemoClient);
      }
      if (finalProducts.length === 0 && import.meta.env.DEV) {
        finalProducts = SEED_LICENSE_PRODUCTS.length > 0
          ? SEED_LICENSE_PRODUCTS.map(adaptDemoProduct)
          : SEED_PRODUCTS.map(adaptDemoProduct);
      }

      setClients(finalClients);
      setProducts(finalProducts);
      if (!finalProducts.find((p) => p.id === productId)) {
        setActiveProductId(finalProducts[0]?.id ?? '');
      } else {
        setActiveProductId(productId);
      }

      const targetProductId = finalProducts.find((p) => p.id === productId)
        ? productId
        : (finalProducts[0]?.id ?? productId);

      if (Object.keys(apiMatrix || {}).length === 0 && productId && productId !== targetProductId) {
        try {
          const res = await getMatrix(year, targetProductId, tenantParams);
          apiMatrix = res.matrix || {};
        } catch {
          apiMatrix = {};
        }
      }

      setIsOffline(Object.keys(apiMatrix || {}).length === 0 && import.meta.env.DEV);
      if (Object.keys(apiMatrix || {}).length > 0) {
        setMatrix((prev) => ({ ...(prev || {}), ...apiMatrix }));
      } else if (import.meta.env.DEV && finalClients.length > 0 && finalProducts.length > 0) {
        const seed = generateSeedMatrix(finalClients, finalProducts, year);
        setMatrix((prev) => ({ ...(prev || {}), ...seed }));
      } else {
        setMatrix((prev) => ({ ...(prev || {}) }));
      }
    } catch {
      if (import.meta.env.DEV) {
        toast.warning(
          'Gagal ambil data dari server, pakai data demo offline'
        );
        const fallbackClients = SEED_TENANT_CLIENTS.length > 0
          ? SEED_TENANT_CLIENTS.map(adaptDemoClient)
          : SEED_CLIENTS.map(adaptDemoClient);
        const fallbackProducts = SEED_LICENSE_PRODUCTS.length > 0
          ? SEED_LICENSE_PRODUCTS.map(adaptDemoProduct)
          : SEED_PRODUCTS.map(adaptDemoProduct);
        setClients(fallbackClients);
        setProducts(fallbackProducts);
        setActiveProductId(fallbackProducts[0]?.id ?? '');
        setMatrix(generateSeedMatrix(fallbackClients, fallbackProducts, year));
        setIsOffline(true);
      } else {
        setClients([]);
        setProducts([]);
        setActiveProductId('');
        setMatrix({});
        setIsOffline(false);
        toast.error('Gagal memuat data pembayaran client, hubungi admin.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMatrixOnly(year: number, productId: string) {
    if (!productId) return;
    if (isSuperAdmin && !activeTenantId) return;
    setIsLoading(true);
    try {
      const tenantParams = isSuperAdmin && activeTenantId ? { tenantId: activeTenantId } : undefined;
      const { matrix: apiMatrix } = await getMatrix(year, productId, tenantParams);
      setIsOffline(false);
      setMatrix((prev) => ({ ...(prev || {}), ...(apiMatrix || {}) }));
    } catch {
      if (import.meta.env.DEV) {
        toast.warning(
          'Gagal ambil data dari server, pakai data demo offline'
        );
        const seed = generateSeedMatrix(clients, products, year);
        setMatrix((prev) => ({ ...(prev || {}), ...seed }));
        setIsOffline(true);
      } else {
        setIsOffline(false);
        toast.error('Gagal memuat data matrix tahun ini, hubungi admin.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAll(currentYear, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear, activeTenantId]);

  useEffect(() => {
    if (products.length === 0 || !activeProductId) return;
    loadMatrixOnly(currentYear, activeProductId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear, activeProductId]);

  function handlePrevYear() {
    setCurrentYear((y) => y - 1);
  }

  function handleNextYear() {
    setCurrentYear((y) => y + 1);
  }

  function openEditModal(clientId: string, monthIdx: number) {
    const key = matrixKey({
      clientId,
      productId: activeProductId,
      periodMonth: monthIdx + 1,
      periodYear: currentYear,
    });
    const existing = matrix[key];

    if (existing) {
      setFormStatus(existing.status);
      setFormAmount(existing.amountIDR);
      setDisplayAmount(String(existing.amountIDR ?? 0));
      setFormReceipts(
        existing.receiptImages.length > 0 ? [...existing.receiptImages] : []
      );
    } else {
      setFormStatus('Not Paid');
      setFormAmount(activeProduct.defaultPrice);
      setDisplayAmount(String(activeProduct.defaultPrice ?? 0));
      setFormReceipts([]);
    }

    setBrokenReceipts(new Set());
    receiptFilesRef.current = [];
    setEditModal({ isOpen: true, clientId, monthIdx });
  }

  function closeEditModal() {
    setEditModal({ isOpen: false, clientId: null, monthIdx: null });
    setFormReceipts((prev) => {
      prev.forEach((url) => {
        if (url && url.startsWith('blob:')) {
          try { URL.revokeObjectURL(url); } catch { /* noop */ }
        }
      });
      return [];
    });
    receiptFilesRef.current = [];
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newUrls: string[] = [];
    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newUrls.push(URL.createObjectURL(file));
        newFiles.push(file);
      }
    }
    setFormReceipts((prev) => [...prev, ...newUrls]);
    receiptFilesRef.current = [...receiptFilesRef.current, ...newFiles];

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeReceipt(index: number) {
    setFormReceipts((prev) => {
      const next = [...prev];
      const target = next[index];
      next.splice(index, 1);
      if (target && target.startsWith('blob:')) {
        try { URL.revokeObjectURL(target); } catch { /* noop */ }
        const blobIdx = receiptFilesRef.current.findIndex(
          (_f, i) => {
            const candidate = URL.createObjectURL(receiptFilesRef.current[i]);
            try { return candidate === target; } finally { try { URL.revokeObjectURL(candidate); } catch { /* noop */ } }
          }
        );
        if (blobIdx >= 0) {
          receiptFilesRef.current.splice(blobIdx, 1);
        }
      }
      return next;
    });
  }

  function handleAmountChange(rawValue: string) {
    const digitsOnly = rawValue.replace(/[^0-9]/g, '');
    let stripped = digitsOnly.replace(/^0+(?=\d)/, '');
    if (stripped === '') stripped = '0';
    setDisplayAmount(stripped);
    setFormAmount(Number(stripped) || 0);
  }

  function handleAmountFocus(e: React.FocusEvent<HTMLInputElement>) {
    const v = (e.target.value || '').trim();
    if (v === '' || v === '0') {
      setDisplayAmount('');
      setFormAmount(0);
    }
    if (typeof e.target.select === 'function') {
      try { e.target.select(); } catch { /* noop */ }
    }
  }

  function handleReceiptImgError(idx: number) {
    setBrokenReceipts((prev) => {
      if (prev.has(idx)) return prev;
      const n = new Set(prev);
      n.add(idx);
      return n;
    });
  }

  function normalizeReceiptUrl(raw: string): string {
    return resolveMediaUrl(raw);
  }

  function isValidReceiptUrl(url: string): boolean {
    const normalized = normalizeReceiptUrl(url);
    if (!normalized) return false;
    const s = normalized.trim();
    if (!s) return false;
    return (
      s.startsWith('http://') ||
      s.startsWith('https://') ||
      s.startsWith('blob:') ||
      s.startsWith('data:') ||
      s.startsWith('/')
    );
  }

  async function handleSave() {
    if (!editingCellKey || !editModal.clientId || editModal.monthIdx === null)
      return;

    let finalAmount = formAmount;
    if (finalAmount === 0) {
      finalAmount = activeProduct.defaultPrice;
    }

    const newCell: CellPayment = {
      status: formStatus,
      amountIDR: finalAmount,
      receiptImages: [...formReceipts],
    };

    if (isOffline) {
      setMatrix((prev) => ({
        ...prev,
        [editingCellKey]: newCell,
      }));
      toast.success('Data pembayaran disimpan (offline).');
      closeEditModal();
      return;
    }

    setIsSaving(true);
    try {
      const saved = await upsertCell({
        clientId: editModal.clientId,
        productId: activeProductId,
        periodMonth: editModal.monthIdx + 1,
        periodYear: currentYear,
        status: formStatus,
        amountIDR: finalAmount,
        receiptImages: formReceipts,
        receiptFiles: [...receiptFilesRef.current],
        ...(isSuperAdmin && activeTenantId ? { tenantId: activeTenantId } : {}),
      });

      const mergedReceipts = [...formReceipts].filter((r) => !r.startsWith('blob:'));
      const savedReceiptSet = new Set(saved.receiptImages.map((r) => r.trim()).filter(Boolean));
      saved.receiptImages.forEach((u) => {
        if (!mergedReceipts.includes(u)) mergedReceipts.push(u);
      });
      (saved.receiptImages || []).forEach((r) => savedReceiptSet.add(r));
      const finalReceiptImages = [
        ...saved.receiptImages,
        ...mergedReceipts.filter((u) => !savedReceiptSet.has(u.trim())),
      ].filter((u) => u && !u.startsWith('blob:'));

      const localMerged: CellPayment = {
        ...saved,
        receiptImages: finalReceiptImages.length > 0 ? finalReceiptImages : saved.receiptImages,
      };

      setMatrix((prev) => ({
        ...prev,
        [editingCellKey]: localMerged,
      }));

      receiptFilesRef.current = [];
      toast.success('Data pembayaran disimpan.');
      closeEditModal();
    } catch {
      toast.error('Gagal simpan data ke server.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading && products.length === 0) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-dark">
              Client Payment Matrix
            </h1>
            <p className="text-slate-600 mt-1">
              Pantau status pembayaran setiap client per produk, per bulan. Klik
              cell untuk input status pembayaran, nominal, dan lampiran nota.
            </p>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="p-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-slate-500">
                Memuat data pembayaran...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isSuperAdmin ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Tenant *
              </span>
              <select
                value={activeTenantId}
                onChange={(event) => {
                  const value = event.target.value;
                  setActiveTenantId(value);
                  window.localStorage.setItem('clientPayment.activeTenantId', value);
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/30 focus:ring disabled:bg-slate-100"
                disabled={loadingTenants}
              >
                <option value="">
                  {loadingTenants ? 'Memuat tenant...' : 'Pilih tenant untuk melihat pembayaran client'}
                </option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={String(tenant.id)}>
                    {tenant.name} ({tenant.slug})
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <p className="text-xs text-slate-500">
                Data pembayaran, client, dan produk akan ditampilkan untuk tenant yang dipilih.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-dark">
            Client Payment Matrix
          </h1>
          <p className="text-slate-600 mt-1">
            Pantau status pembayaran setiap client per produk, per bulan. Klik
            cell untuk input status pembayaran, nominal, dan lampiran nota.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevYear}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Tahun sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-dark">
            <Calendar className="h-4 w-4 text-slate-500" />
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
              className="bg-transparent outline-none cursor-pointer"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 3 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleNextYear}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Tahun berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        role="tablist"
        className="flex items-center gap-2 flex-wrap border-b border-slate-200 pb-2 mb-2"
      >
        {products.map((product) => {
          const isActive = activeProductId === product.id;
          return (
            <button
              key={product.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveProductId(product.id)}
              className={
                isActive
                  ? 'rounded-md px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5 transition-colors bg-primary text-white shadow-sm'
                  : 'rounded-md px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5 transition-colors border border-slate-300 text-slate-700 hover:bg-slate-50'
              }
            >
              <Receipt className="h-4 w-4" />
              <span>{product.name}</span>
              <span
                className={
                  isActive
                    ? 'inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold'
                    : 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600'
                }
              >
                {formatCurrencyIDR(totalsByProduct[product.id] ?? 0)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 z-30 flex items-center justify-center rounded-xl">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <span className="text-sm text-slate-600">Memuat matrix...</span>
            </div>
          </div>
        )}
        <div className="overflow-x-auto max-w-full">
          <table className="min-w-max border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 sticky top-0 z-10">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-20 bg-slate-50 px-5 py-3 text-left font-semibold w-64 min-w-[16rem]"
                >
                  Nama Client
                </th>
                {MONTH_LABELS_ID.map((month) => (
                  <th
                    key={month}
                    className="px-2 py-3 text-center font-semibold min-w-[88px]"
                  >
                    {month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/60">
                  <td className="sticky left-0 z-10 bg-white px-5 py-3 text-sm font-medium text-dark min-w-[16rem]">
                    {client.name}
                    <br />
                    <span className="text-xs text-slate-500">
                      {client.email ?? '-'} · {client.phone ?? '-'}
                    </span>
                  </td>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const cellKey = matrixKey({
                      clientId: client.id,
                      productId: activeProductId,
                      periodMonth: idx + 1,
                      periodYear: currentYear,
                    });
                    const cell = matrix[cellKey];

                    if (!cell) {
                      return (
                        <td
                          key={`${client.id}-${idx}`}
                          onClick={() => openEditModal(client.id, idx)}
                          className="px-2 py-3 text-center cursor-pointer hover:bg-slate-100/70 min-w-[88px] bg-slate-100"
                        >
                          <span className="inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-400 text-[10px] px-2 py-0.5">
                            -
                          </span>
                        </td>
                      );
                    }

                    if (cell.status === 'Paid') {
                      return (
                        <td
                          key={`${client.id}-${idx}`}
                          onClick={() => openEditModal(client.id, idx)}
                          className="px-2 py-3 text-center cursor-pointer hover:bg-emerald-100/70 bg-emerald-50 border-l-2 border-l-emerald-500 min-w-[88px]"
                        >
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 rounded-full bg-emerald-200/50 px-2 py-0.5">
                              <Check className="h-3 w-3" /> Lunas
                            </span>
                            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                              {formatCurrencyIDR(cell.amountIDR)}
                            </span>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={`${client.id}-${idx}`}
                        onClick={() => openEditModal(client.id, idx)}
                        className="px-2 py-3 text-center cursor-pointer hover:bg-red-100/70 bg-red-50 border-l-2 border-l-red-500 min-w-[88px]"
                      >
                        <div className="inline-flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 rounded-full bg-red-200/50 px-2 py-0.5">
                            <XCircle className="h-3 w-3" /> Belum
                          </span>
                          <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                            {cell.amountIDR > 0
                              ? formatCurrencyIDR(cell.amountIDR)
                              : '-'}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={
          editModal.isOpen && editingClient !== null && editModal.monthIdx !== null
        }
        onClose={closeEditModal}
        size="lg"
        title={
          editingClient && editModal.monthIdx !== null
            ? `Update Pembayaran · ${editingClient.name} · ${MONTH_LABELS_ID[editModal.monthIdx]} ${currentYear}`
            : 'Update Pembayaran'
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status Pembayaran <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border p-1 bg-slate-50">
              <button
                type="button"
                onClick={() => setFormStatus('Not Paid')}
                className={
                  formStatus === 'Not Paid'
                    ? 'flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold border-2 border-red-300 bg-red-50 text-red-700 transition-colors'
                    : 'flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium text-slate-500 hover:bg-white transition-colors'
                }
              >
                <XCircle className="h-4 w-4" />
                Belum Bayar
              </button>
              <button
                type="button"
                onClick={() => setFormStatus('Paid')}
                className={
                  formStatus === 'Paid'
                    ? 'flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold border-2 border-emerald-300 bg-emerald-50 text-emerald-700 transition-colors'
                    : 'flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium text-slate-500 hover:bg-white transition-colors'
                }
              >
                <Check className="h-4 w-4" />
                Lunas
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nominal Pembayaran (IDR)
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={displayAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              onFocus={handleAmountFocus}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Default harga produk aktif:{' '}
              {formatCurrencyIDR(activeProduct.defaultPrice)}
              {formAmount === 0 && (
                <span className="block text-amber-600 mt-0.5">
                  Nilai 0 akan otomatis menggunakan default harga produk saat
                  disimpan.
                </span>
              )}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Foto Nota Pembayaran
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors w-full justify-center"
            >
              <Upload className="h-4 w-4" />
              Upload Nota (Multiple Image)
            </button>

            {formReceipts.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {formReceipts.map((url, idx) => {
                  const resolved = normalizeReceiptUrl(url);
                  const validUrl = isValidReceiptUrl(resolved);
                  const isBroken = brokenReceipts.has(idx) || !validUrl || !resolved;
                  return (
                    <div
                      key={idx}
                      className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-100"
                    >
                      {isBroken ? (
                        <div className="w-full h-full flex flex-col items-center justify-center px-2 text-center">
                          <div className="text-2xl text-slate-400 mb-1">
                            <FileText className="h-7 w-7" />
                          </div>
                          <p className="text-xs font-medium text-slate-500">
                            nota-{idx + 1}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Tidak dapat dimuat
                          </p>
                        </div>
                      ) : (
                        <img
                          src={resolved}
                          alt={`nota-${idx + 1}`}
                          loading="lazy"
                          onError={() => handleReceiptImgError(idx)}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeReceipt(idx)}
                        className="absolute top-1 right-1 p-1.5 rounded-md bg-red-600 text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-6 mt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={closeEditModal}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isSaving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
