import { useState, useMemo, useRef } from 'react';
import {
  Check,
  XCircle,
  Upload,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import Modal from '../../components/common/Modal';
import {
  MONTH_LABELS_ID,
  formatCurrencyIDR,
  paymentKey,
  type ClientPaymentCell,
  type PaymentStatus,
  type Product,
  type Client,
  type PaymentMatrix,
} from '../../lib/finance-demo';

const seedProducts: Product[] = [
  { id: 'prod-psb', name: 'PSB EduCore', defaultPrice: 5000000 },
  { id: 'prod-erp', name: 'ERP EduCore', defaultPrice: 8500000 },
  { id: 'prod-training', name: 'Training Workshop', defaultPrice: 3000000 },
  { id: 'prod-konsultasi', name: 'Konsultasi IT', defaultPrice: 2500000 },
];

const seedClients: Client[] = [
  { id: 'cli-1', name: 'CV Mulia Jaya', email: 'admin@muliajaya.co.id', phone: '0812-3456-7890' },
  { id: 'cli-2', name: 'PT Anggi Sejahtera', email: 'finance@anggisejahtera.com', phone: '0813-9876-5432' },
  { id: 'cli-3', name: 'Toko Sumber Rejeki', email: 'sumber.rejeki@email.com', phone: '0821-1111-2222' },
  { id: 'cli-4', name: 'SD Harapan Bangsa', email: 'keuangan@sdharapanbangsa.sch.id', phone: '0822-3333-4444' },
  { id: 'cli-5', name: 'SMP Cendekia', email: 'bendahara@smpcendekia.sch.id', phone: '0823-5555-6666' },
  { id: 'cli-6', name: 'SMA Negeri 1 Model', email: 'keuangan@sman1model.sch.id', phone: '0824-7777-8888' },
  { id: 'cli-7', name: 'Klinik Sehat Sentosa', email: 'admin@kliniksehatsentosa.com', phone: '0852-1212-3434' },
  { id: 'cli-8', name: 'Resto Sari Laut', email: 'owner@restosarilaut.id', phone: '0853-5656-7878' },
  { id: 'cli-9', name: 'Bengkel Mobil Jaya', email: 'cs@bengkelmobiljaya.com', phone: '0854-9090-1212' },
  { id: 'cli-10', name: 'CV Logistik Nusantara', email: 'finance@logistiknusantara.co.id', phone: '0855-3434-5656' },
];

function generateSeedMatrix(): PaymentMatrix {
  const matrix: PaymentMatrix = {};
  for (const product of seedProducts) {
    for (const client of seedClients) {
      for (let monthIdx = 0; monthIdx <= 6; monthIdx++) {
        if (Math.random() < 0.5) {
          const yearMonth = `2026-${String(monthIdx + 1).padStart(2, '0')}`;
          const key = paymentKey(client.id, product.id, yearMonth);
          matrix[key] = {
            status: 'Paid',
            amountIDR: product.defaultPrice,
            receiptImages: [],
          };
        }
      }
    }
  }
  return matrix;
}

interface EditModalState {
  isOpen: boolean;
  clientId: string | null;
  monthIdx: number | null;
}

export default function ClientPaymentsPage() {
  const [currentYear, setCurrentYear] = useState(2026);
  const [activeProductId, setActiveProductId] = useState(seedProducts[0].id);
  const [matrix, setMatrix] = useState<PaymentMatrix>(() => generateSeedMatrix());
  const [editModal, setEditModal] = useState<EditModalState>({
    isOpen: false,
    clientId: null,
    monthIdx: null,
  });

  const [formStatus, setFormStatus] = useState<PaymentStatus>('Not Paid');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formReceipts, setFormReceipts] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeProduct = useMemo(
    () => seedProducts.find((p) => p.id === activeProductId) ?? seedProducts[0],
    [activeProductId]
  );

  const editingClient = useMemo(
    () => (editModal.clientId ? seedClients.find((c) => c.id === editModal.clientId) ?? null : null),
    [editModal.clientId]
  );

  const editingCellKey = useMemo(() => {
    if (!editModal.clientId || editModal.monthIdx === null) return null;
    const yearMonth = `${currentYear}-${String(editModal.monthIdx + 1).padStart(2, '0')}`;
    return paymentKey(editModal.clientId, activeProductId, yearMonth);
  }, [editModal.clientId, editModal.monthIdx, currentYear, activeProductId]);

  function handlePrevYear() {
    if (currentYear > 2024) setCurrentYear((y) => y - 1);
  }

  function handleNextYear() {
    if (currentYear < 2027) setCurrentYear((y) => y + 1);
  }

  function openEditModal(clientId: string, monthIdx: number) {
    const yearMonth = `${currentYear}-${String(monthIdx + 1).padStart(2, '0')}`;
    const key = paymentKey(clientId, activeProductId, yearMonth);
    const existing = matrix[key];

    if (existing) {
      setFormStatus(existing.status);
      setFormAmount(existing.amountIDR);
      setFormReceipts(existing.receiptImages.length > 0 ? [...existing.receiptImages] : []);
    } else {
      setFormStatus('Not Paid');
      setFormAmount(activeProduct.defaultPrice);
      setFormReceipts([]);
    }

    setEditModal({ isOpen: true, clientId, monthIdx });
  }

  function closeEditModal() {
    setEditModal({ isOpen: false, clientId: null, monthIdx: null });
    setFormReceipts([]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newUrls.push(URL.createObjectURL(file));
      }
    }
    setFormReceipts((prev) => [...prev, ...newUrls]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeReceipt(index: number) {
    setFormReceipts((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  }

  function handleSave() {
    if (!editingCellKey) return;

    let finalAmount = formAmount;
    if (finalAmount === 0) {
      finalAmount = activeProduct.defaultPrice;
    }

    const newCell: ClientPaymentCell = {
      status: formStatus,
      amountIDR: finalAmount,
      receiptImages: [...formReceipts],
    };

    setMatrix((prev) => ({
      ...prev,
      [editingCellKey]: newCell,
    }));

    toast.success('Data pembayaran disimpan.');
    closeEditModal();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-dark">Client Payment Matrix</h1>
          <p className="text-slate-600 mt-1">
            Pantau status pembayaran setiap client per produk, per bulan. Klik cell untuk input
            status pembayaran, nominal, dan lampiran nota.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevYear}
            disabled={currentYear <= 2024}
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
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleNextYear}
            disabled={currentYear >= 2027}
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
        {seedProducts.map((product) => {
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
                {formatCurrencyIDR(product.defaultPrice)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
              {seedClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/60">
                  <td className="sticky left-0 z-10 bg-white px-5 py-3 text-sm font-medium text-dark min-w-[16rem]">
                    {client.name}
                    <br />
                    <span className="text-xs text-slate-500">
                      {client.email ?? '-'} · {client.phone ?? '-'}
                    </span>
                  </td>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const yearMonth = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
                    const cellKey = paymentKey(client.id, activeProductId, yearMonth);
                    const cell = matrix[cellKey];

                    if (!cell) {
                      return (
                        <td
                          key={`${client.id}-${idx}`}
                          onClick={() => openEditModal(client.id, idx)}
                          className="px-2 py-3 text-center cursor-pointer hover:bg-slate-100/70 min-w-[88px]"
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
                            {cell.amountIDR > 0 ? formatCurrencyIDR(cell.amountIDR) : '-'}
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
        isOpen={editModal.isOpen && editingClient !== null && editModal.monthIdx !== null}
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
              type="number"
              min={0}
              step={1000}
              placeholder="0"
              value={formAmount}
              onChange={(e) => setFormAmount(Number(e.target.value) || 0)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Default harga produk aktif: {formatCurrencyIDR(activeProduct.defaultPrice)}
              {formAmount === 0 && (
                <span className="block text-amber-600 mt-0.5">
                  Nilai 0 akan otomatis menggunakan default harga produk saat disimpan.
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
                {formReceipts.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-100"
                  >
                    <img
                      src={url}
                      alt={`nota-${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeReceipt(idx)}
                      className="absolute top-1 right-1 p-1.5 rounded-md bg-red-600 text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
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
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            Simpan
          </button>
        </div>
      </Modal>
    </div>
  );
}
