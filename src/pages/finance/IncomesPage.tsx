import { useState, useMemo, useRef, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  Plus,
  Pencil,
  Check,
  XCircle,
  Search,
  ArrowUpDown,
  Upload,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  FileText,
  Paperclip,
  X,
  Loader2,
  Tag,
  Banknote,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import {
  formatDateID,
  formatCurrencyIDR,
  MONTH_LABELS_ID,
} from '../../lib/finance-demo';
import {
  listIncomes,
  createIncome,
  updateIncome,
  togglePaymentStatus,
  deleteIncome,
  type Income,
  type IncomeStatus,
} from '../../lib/api/incomeApi';
import { resolveMediaUrl } from '../../lib/api/httpClient';
import { getApiErrorMessage } from '../../lib/utils/apiError';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

type SortOption = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc';

const CATEGORY_OPTIONS = [
  'Penjualan Produk',
  'Penjualan Jasa / Layanan',
  'Pendapatan Sewa',
  'Dividen & Investasi',
  'Komisi & Royalti',
  'Bunga Tabungan / Deposito',
  'Hibah / Donasi',
  'Pengembalian Dana',
  'Lainnya',
] as const;

type IncomeCategory = (typeof CATEGORY_OPTIONS)[number];

type IncomeFormState = {
  name: string;
  dateISO: string;
  picName: string;
  description: string;
  proofImages: string[];
  category: IncomeCategory;
  amountIDR: number;
  amountStr: string;
};

const todayISO = () => new Date().toISOString().split('T')[0];

const initialForm: IncomeFormState = {
  name: '',
  dateISO: todayISO(),
  picName: '',
  description: '',
  proofImages: [],
  category: 'Penjualan Produk',
  amountIDR: 0,
  amountStr: '',
};

function sanitizeAmountInput(raw: string): string {
  const digitsOnly = raw.replace(/[^\d]/g, '');
  return digitsOnly.replace(/^0+(?=\d)/, '');
}

export default function IncomesPage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('date_desc');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IncomeFormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const [viewingIncome, setViewingIncome] = useState<Income | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [previewImageIdx, setPreviewImageIdx] = useState(0);

  const [brokenFormImages, setBrokenFormImages] = useState<Set<number>>(new Set());
  const [brokenViewImages, setBrokenViewImages] = useState<Set<number>>(new Set());
  const [brokenAttachImages, setBrokenAttachImages] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const proofFilesRef = useRef<File[]>([]);

  function isValidImageUrl(url: string): boolean {
    const normalized = resolveMediaUrl(url);
    if (!normalized || typeof normalized !== 'string') return false;
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

  function handleBrokenImg(area: 'form' | 'view' | 'attach', idx: number) {
    const setState =
      area === 'form' ? setBrokenFormImages :
      area === 'view' ? setBrokenViewImages :
      setBrokenAttachImages;
    setState((prev) => {
      if (prev.has(idx)) return prev;
      const n = new Set(prev);
      n.add(idx);
      return n;
    });
  }

  useEffect(() => {
    setBrokenFormImages(new Set());
    proofFilesRef.current = [];
  }, [isModalOpen, modalMode, editingId]);

  useEffect(() => {
    setBrokenViewImages(new Set());
  }, [isViewModalOpen, viewingIncome]);

  useEffect(() => {
    setBrokenAttachImages(new Set());
  }, [isAttachmentModalOpen, viewingIncome]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const data = await listIncomes();
        if (cancelled) return;
        setIncomes(data);
      } catch (err: unknown) {
        if (cancelled) return;
        setIncomes([]);
        if (import.meta.env.DEV) {
          toast.warning(
            `Gagal ambil data pemasukan dari server: ${getApiErrorMessage(err)}`
          );
        } else {
          toast.error(
            `Gagal memuat data pemasukan: ${getApiErrorMessage(err)}`
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  const filteredSorted = useMemo(() => {
    let result = [...incomes];

    result = result.filter((e) => {
      if (!e?.dateISO) return false;
      const year = new Date(e.dateISO).getFullYear();
      return Number.isFinite(year) && year === selectedYear;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.picName.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
      );
    }

    switch (sort) {
      case 'date_desc':
        result.sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
        break;
      case 'date_asc':
        result.sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));
        break;
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name, 'id-ID'));
        break;
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name, 'id-ID'));
        break;
    }

    return result;
  }, [incomes, search, sort, selectedYear]);

  const availableYears = useMemo<number[]>(() => {
    const years = new Set<number>();
    for (const e of incomes) {
      if (!e?.dateISO) continue;
      const y = new Date(e.dateISO).getFullYear();
      if (Number.isFinite(y) && y > 2000 && y < 2200) years.add(y);
    }
    const current = new Date().getFullYear();
    years.add(current);
    years.add(current - 1);
    years.add(current - 2);
    years.add(current + 1);
    return Array.from(years).sort((a, b) => b - a);
  }, [incomes]);

  const monthSummary = useMemo<Array<{ monthIdx: number; month: string; total: number }>>(() => {
    const totals = new Array(12).fill(0);
    const entries = [...incomes];
    for (const e of entries) {
      if (!e?.dateISO) continue;
      const d = new Date(e.dateISO);
      const year = d.getFullYear();
      if (year !== selectedYear) continue;
      const month = d.getMonth();
      if (month < 0 || month > 11) continue;
      const amt = Number(e.amountIDR ?? 0);
      if (!Number.isFinite(amt) || amt <= 0) continue;
      totals[month] += amt;
    }
    return totals.map((total, idx) => ({
      monthIdx: idx,
      month: MONTH_LABELS_ID[idx] ?? `Bulan ${idx + 1}`,
      total,
    }));
  }, [incomes, selectedYear]);

  const yearGrandTotal = useMemo(() => {
    return monthSummary.reduce((acc, m) => acc + (Number(m.total) || 0), 0);
  }, [monthSummary]);

  function prevYear() {
    setSelectedYear((y) => y - 1);
  }
  function nextYear() {
    setSelectedYear((y) => y + 1);
  }

  const openCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setForm({ ...initialForm, dateISO: todayISO() });
    proofFilesRef.current = [];
    setIsModalOpen(true);
  };

  const openEditModal = (row: Income) => {
    setModalMode('edit');
    setEditingId(row.id);
    const numeric = row.amountIDR ?? 0;
    setForm({
      name: row.name,
      dateISO: row.dateISO,
      picName: row.picName,
      description: row.description,
      proofImages: [...row.proofImages],
      category:
        (CATEGORY_OPTIONS.includes(row.category as IncomeCategory)
          ? (row.category as IncomeCategory)
          : 'Lainnya') ?? 'Lainnya',
      amountIDR: numeric,
      amountStr: numeric > 0 ? String(numeric) : '',
    });
    proofFilesRef.current = [];
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setSubmitting(false);
  };

  const openViewModal = (row: Income) => {
    setViewingIncome(row);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setViewingIncome(null);
  };

  const openAttachmentModal = (row: Income, startIdx = 0) => {
    if (row.proofImages.length === 0) return;
    setViewingIncome(row);
    setPreviewImageIdx(startIdx);
    setIsAttachmentModalOpen(true);
  };

  const closeAttachmentModal = () => {
    setIsAttachmentModalOpen(false);
    setViewingIncome(null);
    setPreviewImageIdx(0);
  };

  const toggleStatus = async (id: string) => {
    const target = incomes.find((e) => e.id === id);
    if (!target) return;
    const newStatus: IncomeStatus = target.status === 'Paid' ? 'Not Paid' : 'Paid';

    try {
      const updated = await togglePaymentStatus(id, newStatus);
      setIncomes((prev) => prev.map((e) => (e.id === id ? updated : e)));
      toast.success('Status diperbarui');
    } catch (err: unknown) {
      toast.error('Gagal memperbarui status: ' + getApiErrorMessage(err));
    }
  };

  const handleDeleteIncome = async (row: Income) => {
    if (!row?.id) return;
    const confirmMsg = `Hapus permanen pemasukan "${row.name ?? '-'} — ${formatCurrencyIDR(row.amountIDR ?? 0)} (${formatDateID(row.dateISO)})"?\n\nTindakan ini tidak bisa dibatalkan.`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await deleteIncome(row.id);
      setIncomes((prev) => prev.filter((e) => e.id !== row.id));
      toast.success('Pemasukan berhasil dihapus permanen.');
      if (viewingIncome?.id === row.id) closeViewModal();
      if (editingId === row.id) closeModal();
    } catch (err: unknown) {
      toast.error('Gagal menghapus pemasukan: ' + getApiErrorMessage(err));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      proofFilesRef.current.push(file);
      const url = URL.createObjectURL(file);
      newUrls.push(url);
    }

    setForm((prev) => ({
      ...prev,
      proofImages: [...prev.proofImages, ...newUrls],
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeProofImage = (index: number) => {
    setForm((prev) => {
      const next = [...prev.proofImages];
      const removed = next[index];
      next.splice(index, 1);
      if (removed && removed.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(removed);
        } catch {
          /* noop */
        }
        const fileIdx = proofFilesRef.current.findIndex(
          () => prev.proofImages.indexOf(removed) === index
        );
        if (fileIdx >= 0) {
          proofFilesRef.current.splice(fileIdx, 1);
        }
      }
      return { ...prev, proofImages: next };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Nama Pemasukan tidak boleh kosong');
      return;
    }
    if (!form.dateISO) {
      toast.error('Tanggal tidak boleh kosong');
      return;
    }
    if (!form.picName.trim()) {
      toast.error('PIC (Nama) tidak boleh kosong');
      return;
    }
    if (form.amountIDR < 0) {
      toast.error('Jumlah tidak boleh negatif');
      return;
    }
    if (form.amountIDR <= 0) {
      toast.error('Jumlah (Rp) harus diisi');
      return;
    }

    try {
      setSubmitting(true);

      const isoWithTime = `${form.dateISO}T00:00:00.000Z`;
      const existingRemoteUrls = form.proofImages.filter(
        (u) => !u.startsWith('blob:')
      );
      const newFiles = proofFilesRef.current;

      const fd = new FormData();
      fd.append('title', form.name.trim());
      fd.append('category', form.category);
      fd.append('income_date', isoWithTime);
      fd.append('amount', String(form.amountIDR));
      fd.append('pic_name', form.picName.trim());
      fd.append('notes', form.description.trim());
      fd.append('status', 'ACTIVE');
      if (existingRemoteUrls.length > 0) {
        fd.append('attachments', JSON.stringify(existingRemoteUrls));
      }
      newFiles.forEach((file) => {
        fd.append('attachments', file);
      });

      if (modalMode === 'create') {
        const created = await createIncome(fd);
        setIncomes((prev) => [created, ...prev]);
        toast.success('Pemasukan berhasil ditambahkan.');
      } else if (modalMode === 'edit' && editingId) {
        const updated = await updateIncome(editingId, fd);
        setIncomes((prev) => prev.map((e) => (e.id === editingId ? updated : e)));
        toast.success('Pemasukan berhasil diperbarui.');
      }

      closeModal();
    } catch (err: unknown) {
      const message = getApiErrorMessage(err);
      toast.error(
        (modalMode === 'create' ? 'Gagal menambah pemasukan: ' : 'Gagal memperbarui pemasukan: ') + message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle =
    modalMode === 'create' ? 'Tambah Pemasukan Baru' : 'Edit Pemasukan';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Manajemen Pemasukan (Income / Revenue)
          </h1>
          <p className="text-slate-600">
            Kelola daftar pemasukan operasional, status penerimaan, dan arsip
            bukti transaksi.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pemasukan Baru
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
            <button
              type="button"
              onClick={prevYear}
              aria-label="Tahun sebelumnya"
              className="inline-flex h-9 w-9 items-center justify-center text-slate-600 transition hover:bg-slate-50 active:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex h-9 min-w-[110px] items-center justify-center gap-2 px-3 border-x border-slate-200">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedYear}
                onChange={(e) =>
                  setSelectedYear(
                    Number.isFinite(Number(e.target.value))
                      ? Number(e.target.value)
                      : selectedYear
                  )
                }
                className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={nextYear}
              aria-label="Tahun berikutnya"
              className="inline-flex h-9 w-9 items-center justify-center text-slate-600 transition hover:bg-slate-50 active:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-emerald-600/10 px-3 py-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Total Pemasukan {selectedYear}
              </span>
              <span className="text-sm font-bold text-emerald-700">
                {formatCurrencyIDR(yearGrandTotal)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama / PIC / kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 pl-9 text-sm outline-none focus:ring focus:ring-emerald-500/30"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              <ArrowUpDown className="h-4 w-4" />
              Urutkan
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring focus:ring-emerald-500/30"
            >
              <option value="date_desc">Terbaru (Tanggal)</option>
              <option value="date_asc">Terlama (Tanggal)</option>
              <option value="name_asc">Nama A-Z</option>
              <option value="name_desc">Nama Z-A</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm">Memuat data pemasukan...</p>
          </div>
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
            <div className="mb-3 flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-slate-800">
                Grafik Pemasukan per Bulan ({selectedYear})
              </h2>
              <p className="text-xs text-slate-500">
                Total seluruh pemasukan {selectedYear}:{' '}
                <span className="font-semibold text-emerald-700">
                  {formatCurrencyIDR(yearGrandTotal)}
                </span>
              </p>
            </div>
            <div className="w-full overflow-x-auto" style={{ minWidth: '100%' }}>
              <div style={{ width: '100%', minWidth: 420, height: 340 }}>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart
                    data={monthSummary}
                    margin={{ top: 20, right: 24, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                      allowDecimals={false}
                      tickFormatter={(v) => {
                        const n = Number(v) || 0;
                        if (n === 0) return '0';
                        if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(0)}M`;
                        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}Jt`;
                        if (n >= 1_000) return `${(n / 1_000).toFixed(0)}Rb`;
                        return String(n);
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(16,185,129,0.05)' }}
                      contentStyle={{
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 8px 30px rgba(15,23,42,0.08)',
                        fontSize: 12,
                        padding: '10px 12px',
                      }}
                      formatter={(value: unknown) => {
                        const n = Number(value) || 0;
                        return formatCurrencyIDR(n);
                      }}
                      labelFormatter={(label: unknown) => `Bulan ${label}`}
                    />
                    <Bar
                      dataKey="total"
                      radius={[8, 8, 0, 0]}
                      fill="#059669"
                      barSize={36}
                      activeBar={{ fill: '#047857' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <DataTable
            headers={[
              'Nama Pemasukan',
              'Tanggal',
              'PIC',
              'Kategori',
              'Jumlah (Rp)',
              'Status',
              'Aksi',
            ]}
            emptyMessage={`Tidak ada data pemasukan tahun ${selectedYear}. Klik Tambah Pemasukan Baru untuk mulai.`}
            hasData={filteredSorted.length > 0}
          >
          {filteredSorted.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 align-top">
                <button
                  type="button"
                  onClick={() => openViewModal(row)}
                  className="group text-left"
                >
                  <p className="flex items-center gap-1.5 font-semibold text-emerald-700 transition group-hover:underline">
                    <FileText className="h-4 w-4 opacity-70 transition group-hover:opacity-100" />
                    {row.name}
                  </p>
                </button>
                {row.description ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {row.description.length > 80
                      ? `${row.description.slice(0, 80)}...`
                      : row.description}
                  </p>
                ) : null}
                {row.proofImages.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => openAttachmentModal(row, 0)}
                    className="mt-1 inline-flex cursor-zoom-in items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200 hover:text-dark"
                    title="Lihat lampiran foto bukti"
                  >
                    <Paperclip className="h-3 w-3" />
                    {row.proofImages.length} foto
                  </button>
                ) : null}
              </td>
              <td className="px-4 py-3 align-top">
                <div className="flex items-center gap-1.5 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>{formatDateID(row.dateISO)}</span>
                </div>
              </td>
              <td className="px-4 py-3 align-top">
                <div className="flex items-center gap-1.5 text-sm">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>{row.picName}</span>
                </div>
              </td>
              <td className="px-4 py-3 align-top">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <Tag className="h-3 w-3" />
                  {row.category ?? '-'}
                </span>
              </td>
              <td className="px-4 py-3 align-top text-right font-mono text-sm font-semibold text-emerald-700">
                {formatCurrencyIDR(row.amountIDR ?? 0)}
              </td>
              <td className="px-4 py-3 align-top">
                {row.status === 'Paid' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <Check className="h-3 w-3" />
                    Paid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    <XCircle className="h-3 w-3" />
                    Not Paid
                  </span>
                )}
              </td>
              <td className="px-4 py-3 align-top">
                <div className="inline-flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(row)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteIncome(row)}
                    title="Hapus pemasukan ini permanen"
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus
                  </button>
                  {row.status === 'Paid' ? (
                    <button
                      type="button"
                      onClick={() => toggleStatus(row.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Tandai Belum Diterima
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleStatus(row.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Tandai Sudah Diterima
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalTitle}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nama Pemasukan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Contoh: Penjualan Produk Januari"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring focus:ring-emerald-500/30"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Tanggal <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.dateISO}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dateISO: e.target.value }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring focus:ring-emerald-500/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                PIC (Nama) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.picName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, picName: e.target.value }))
                }
                placeholder="Contoh: Budi Santoso / Keuangan"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring focus:ring-emerald-500/30"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Kategori <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    category: e.target.value as IncomeCategory,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring focus:ring-emerald-500/30"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Jumlah (Rp) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={form.amountStr}
                  onChange={(e) => {
                    const cleaned = sanitizeAmountInput(e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      amountStr: cleaned,
                      amountIDR: cleaned ? Number(cleaned) : 0,
                    }));
                  }}
                  placeholder="Contoh: 5000000"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 pl-9 text-sm outline-none focus:ring focus:ring-emerald-500/30"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Deskripsi Pemasukan
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Keterangan tambahan..."
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Foto Bukti Pemasukan
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center rounded-md border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Upload className="mr-2 h-4 w-4" />
              Unggah Foto Bukti (Multiple)
            </button>

            {form.proofImages.length > 0 ? (
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                {form.proofImages.map((url, idx) => {
                  const resolved = resolveMediaUrl(url);
                  const valid = isValidImageUrl(resolved);
                  const isBroken = brokenFormImages.has(idx) || !valid || !resolved;
                  return (
                    <div
                      key={`${url}-${idx}`}
                      className="relative rounded-md border overflow-hidden"
                    >
                      {isBroken ? (
                        <div className="w-full aspect-video bg-slate-50 flex flex-col items-center justify-center p-2 text-center">
                          <FileText className="h-6 w-6 text-slate-400 mb-0.5" />
                          <p className="text-[11px] font-medium text-slate-500">Bukti {idx + 1}</p>
                        </div>
                      ) : (
                        <img
                          src={resolved}
                          alt={`Bukti ${idx + 1}`}
                          loading="lazy"
                          onError={() => handleBrokenImg('form', idx)}
                          className="w-full max-h-32 rounded-md object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeProofImage(idx)}
                        className="absolute right-1 top-1 rounded-full bg-white p-1 text-red-600 shadow-sm hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            {modalMode === 'edit' && editingId ? (
              <button
                type="button"
                onClick={() => {
                  const row = incomes.find((e) => e.id === editingId);
                  if (row) handleDeleteIncome(row);
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                disabled={submitting}
              >
                <Trash2 className="h-4 w-4" />
                Hapus Pemasukan
              </button>
            ) : (
              <div />
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-70"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {modalMode === 'create' ? 'Simpan' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isViewModalOpen}
        onClose={closeViewModal}
        title="Detail Pemasukan"
        size="lg"
      >
        {viewingIncome ? (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Nama Pemasukan
                </p>
                <p className="mt-1 font-semibold text-dark text-base">
                  {viewingIncome.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status
                </p>
                <p className="mt-1">
                  {viewingIncome.status === 'Paid' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <Check className="h-3 w-3" />
                      Sudah Diterima
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      <XCircle className="h-3 w-3" />
                      Belum Diterima
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Tanggal
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-800">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  {formatDateID(viewingIncome.dateISO)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  PIC (Penanggung Jawab)
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-800">
                  <User className="h-4 w-4 text-slate-500" />
                  {viewingIncome.picName}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Kategori
                </p>
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <Tag className="h-3 w-3" />
                  {viewingIncome.category ?? '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Jumlah (Rp)
                </p>
                <p className="mt-1 flex items-center gap-1.5 font-mono text-base font-bold text-emerald-700">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  {formatCurrencyIDR(viewingIncome.amountIDR ?? 0)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Deskripsi Pemasukan
              </p>
              <div className="mt-1 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {viewingIncome.description.trim() ? (
                  viewingIncome.description
                ) : (
                  <span className="italic text-slate-400">
                    Tidak ada deskripsi.
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Foto Bukti Pemasukan ({viewingIncome.proofImages.length})
                </p>
                {viewingIncome.proofImages.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => openAttachmentModal(viewingIncome, 0)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Galeri
                  </button>
                ) : null}
              </div>
              {viewingIncome.proofImages.length > 0 ? (
                <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                  {viewingIncome.proofImages.map((url, idx) => {
                    const resolved = resolveMediaUrl(url);
                    const valid = isValidImageUrl(resolved);
                    const isBroken = brokenViewImages.has(idx) || !valid || !resolved;
                    return (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        onClick={() => openAttachmentModal(viewingIncome, idx)}
                        className="group relative cursor-zoom-in rounded-md border overflow-hidden shadow-sm transition hover:ring-2 hover:ring-emerald-500/40"
                      >
                        {isBroken ? (
                          <div className="w-full aspect-[4/3] bg-slate-50 flex flex-col items-center justify-center">
                            <FileText className="h-7 w-7 text-slate-400 mb-0.5" />
                            <p className="text-[11px] font-medium text-slate-500">Bukti {idx + 1}</p>
                          </div>
                        ) : (
                          <img
                            src={resolved}
                            alt={`Bukti pemasukan ${idx + 1}`}
                            loading="lazy"
                            onError={() => handleBrokenImg('view', idx)}
                            className="w-full aspect-[4/3] object-cover transition group-hover:scale-[1.03]"
                          />
                        )}
                        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          #{idx + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-1 rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs italic text-slate-400">
                  Tidak ada lampiran foto bukti.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={isAttachmentModalOpen}
        onClose={closeAttachmentModal}
        title={
          viewingIncome
            ? `Lampiran · ${viewingIncome.name}`
            : 'Lampiran Bukti'
        }
        size="xl"
      >
        {viewingIncome && viewingIncome.proofImages.length > 0 ? (
          <div className="space-y-4">
            <div className="relative rounded-xl border border-slate-200 bg-slate-900 overflow-hidden shadow-md">
              {(() => {
                const url = viewingIncome.proofImages[previewImageIdx];
                const resolved = resolveMediaUrl(url);
                const valid = isValidImageUrl(resolved);
                const isBroken = brokenAttachImages.has(previewImageIdx) || !valid || !resolved;
                if (isBroken) {
                  return (
                    <div className="w-full max-h-[65vh] aspect-[4/3] flex flex-col items-center justify-center bg-slate-800">
                      <FileText className="h-16 w-16 text-slate-500 mb-3" />
                      <p className="text-sm font-medium text-slate-300">Bukti {previewImageIdx + 1} / {viewingIncome.proofImages.length}</p>
                      <p className="text-xs text-slate-500 mt-1">File tidak dapat dimuat</p>
                    </div>
                  );
                }
                return (
                  <img
                    src={resolved}
                    alt={`Bukti ${previewImageIdx + 1} / ${viewingIncome.proofImages.length}`}
                    onError={() => handleBrokenImg('attach', previewImageIdx)}
                    className="w-full max-h-[65vh] object-contain bg-black"
                  />
                );
              })()}
              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                <Paperclip className="h-3.5 w-3.5" />
                {previewImageIdx + 1} / {viewingIncome.proofImages.length}
              </div>
              {viewingIncome.proofImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewImageIdx((i) =>
                        i === 0 ? viewingIncome.proofImages.length - 1 : i - 1
                      )
                    }
                    className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur hover:bg-white"
                    aria-label="Gambar sebelumnya"
                  >
                    <X className="rotate-90 h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewImageIdx((i) =>
                        i === viewingIncome.proofImages.length - 1 ? 0 : i + 1
                      )
                    }
                    className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur hover:bg-white"
                    aria-label="Gambar selanjutnya"
                  >
                    <X className="-rotate-90 h-5 w-5" />
                  </button>
                </>
              ) : null}
            </div>

            {viewingIncome.proofImages.length > 1 ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                {viewingIncome.proofImages.map((url, idx) => {
                  const resolved = resolveMediaUrl(url);
                  const valid = isValidImageUrl(resolved);
                  const isBroken = brokenAttachImages.has(idx) || !valid || !resolved;
                  return (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => setPreviewImageIdx(idx)}
                      className={[
                        'relative flex-shrink-0 overflow-hidden rounded-lg border-2 transition',
                        idx === previewImageIdx
                          ? 'border-emerald-600 ring-2 ring-emerald-500/30 scale-[0.98]'
                          : 'border-slate-200 opacity-75 hover:opacity-100',
                      ].join(' ')}
                    >
                      {isBroken ? (
                        <div className="h-16 w-16 flex flex-col items-center justify-center bg-slate-100">
                          <FileText className="h-5 w-5 text-slate-400" />
                        </div>
                      ) : (
                        <img
                          src={resolved}
                          alt={`Thumbnail bukti ${idx + 1}`}
                          loading="lazy"
                          onError={() => handleBrokenImg('attach', idx)}
                          className="h-16 w-16 object-cover"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
