import { useState, useMemo, useRef } from 'react';
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
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import {
  formatDateID,
  genId,
  SEED_EXPENSES as seedExpenses,
  type Expense,
  type ExpenseStatus,
} from '../../lib/finance-demo';

type SortOption = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc';

type ExpenseFormState = {
  name: string;
  dateISO: string;
  picName: string;
  description: string;
  proofImages: string[];
};

const todayISO = () => new Date().toISOString().split('T')[0];

const initialForm: ExpenseFormState = {
  name: '',
  dateISO: todayISO(),
  picName: '',
  description: '',
  proofImages: [],
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([...seedExpenses]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('date_desc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseFormState>(initialForm);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredSorted = useMemo(() => {
    let result = [...expenses];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(q));
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
  }, [expenses, search, sort]);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setForm({ ...initialForm, dateISO: todayISO() });
    setIsModalOpen(true);
  };

  const openEditModal = (row: Expense) => {
    setModalMode('edit');
    setEditingId(row.id);
    setForm({
      name: row.name,
      dateISO: row.dateISO,
      picName: row.picName,
      description: row.description,
      proofImages: [...row.proofImages],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const toggleStatus = (id: string) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const newStatus: ExpenseStatus = e.status === 'Paid' ? 'Not Paid' : 'Paid';
        return { ...e, status: newStatus };
      })
    );
    toast.success('Status diperbarui');
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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
      next.splice(index, 1);
      return { ...prev, proofImages: next };
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Nama Pengeluaran tidak boleh kosong');
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

    if (modalMode === 'create') {
      const newExpense: Expense = {
        id: genId('EXP'),
        name: form.name.trim(),
        dateISO: form.dateISO,
        picName: form.picName.trim(),
        status: 'Not Paid',
        description: form.description.trim(),
        proofImages: [...form.proofImages],
      };
      setExpenses((prev) => [newExpense, ...prev]);
      toast.success('Pengeluaran berhasil ditambahkan.');
    } else if (modalMode === 'edit' && editingId) {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === editingId
            ? {
                ...e,
                name: form.name.trim(),
                dateISO: form.dateISO,
                picName: form.picName.trim(),
                description: form.description.trim(),
                proofImages: [...form.proofImages],
              }
            : e
        )
      );
      toast.success('Pengeluaran berhasil diperbarui.');
    }

    closeModal();
  };

  const modalTitle =
    modalMode === 'create' ? 'Tambah Pengeluaran Baru' : 'Edit Pengeluaran';

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Manajemen Pengeluaran (Expenses)
          </h1>
          <p className="text-slate-600">
            Kelola daftar pengeluaran operasional, status pembayaran, dan arsip
            bukti transaksi.
          </p>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-white hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pengeluaran Baru
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama pengeluaran..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 pl-9 text-sm outline-none focus:ring focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <ArrowUpDown className="h-4 w-4" />
            Urutkan
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring focus:ring-primary/30"
          >
            <option value="date_desc">Terbaru (Tanggal)</option>
            <option value="date_asc">Terlama (Tanggal)</option>
            <option value="name_asc">Nama A-Z</option>
            <option value="name_desc">Nama Z-A</option>
          </select>
        </div>
      </div>

      {/* DATA TABLE */}
      <DataTable
        headers={['Nama Pengeluaran', 'Tanggal', 'PIC', 'Status', 'Aksi']}
        emptyMessage="Belum ada data pengeluaran. Klik Tambah Pengeluaran Baru."
        hasData={filteredSorted.length > 0}
      >
        {filteredSorted.map((row) => (
          <tr key={row.id} className="hover:bg-slate-50">
            <td className="px-4 py-3 align-top">
              <p className="font-semibold text-slate-800">{row.name}</p>
              {row.description ? (
                <p className="mt-0.5 text-xs text-slate-500">
                  {row.description.length > 80
                    ? `${row.description.slice(0, 80)}...`
                    : row.description}
                </p>
              ) : null}
              {row.proofImages.length > 0 ? (
                <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  📎 {row.proofImages.length} foto
                </span>
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
              {row.status === 'Paid' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <Check className="h-3 w-3" />
                  Paid
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
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
                {row.status === 'Paid' ? (
                  <button
                    type="button"
                    onClick={() => toggleStatus(row.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Tandai Belum Bayar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleStatus(row.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Tandai Sudah Dibayar
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      {/* MODAL FORM */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalTitle}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nama Pengeluaran <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Contoh: Sewa Kantor Pusat"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring focus:ring-primary/30"
            />
          </div>

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
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring focus:ring-primary/30"
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
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Deskripsi Pengeluaran
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Keterangan tambahan..."
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Foto Bukti Pengeluaran
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
                {form.proofImages.map((url, idx) => (
                  <div
                    key={`${url}-${idx}`}
                    className="relative rounded-md border"
                  >
                    <img
                      src={url}
                      alt={`Bukti ${idx + 1}`}
                      className="w-full max-h-32 rounded-md object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeProofImage(idx)}
                      className="absolute right-1 top-1 rounded-full bg-white p-1 text-red-600 shadow-sm hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Check className="h-4 w-4" />
              {modalMode === 'create' ? 'Simpan' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
