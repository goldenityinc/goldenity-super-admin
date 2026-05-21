import { useEffect, useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { toast } from 'sonner';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import TableSkeleton from '../../components/common/TableSkeleton';
import { getPreOrderDetail, listPreOrders, type PreOrder } from '../../lib/api/preOrderApi';
import { getApiErrorMessage } from '../../lib/utils/apiError';

const PAGE_SIZE = 10;

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString('id-ID');
}

function normalizeStatus(status: string): string {
  return status.trim().toUpperCase().replace(/[-\s]/g, '_');
}

function getStatusLabel(status: string): string {
  const normalized = normalizeStatus(status);

  if (normalized === 'PENDING_DP' || normalized === 'MENUNGGU_DP') {
    return 'Menunggu DP';
  }

  if (normalized === 'PROCESSING' || normalized === 'DIPROSES') {
    return 'Diproses';
  }

  if (normalized === 'READY' || normalized === 'SIAP') {
    return 'Siap';
  }

  if (normalized === 'COMPLETED' || normalized === 'SELESAI') {
    return 'Selesai';
  }

  return status || '-';
}

function getStatusClass(status: string): string {
  const normalized = normalizeStatus(status);

  if (normalized === 'PENDING_DP' || normalized === 'MENUNGGU_DP') {
    return 'bg-amber-100 text-amber-700';
  }

  if (normalized === 'PROCESSING' || normalized === 'DIPROSES') {
    return 'bg-sky-100 text-sky-700';
  }

  if (normalized === 'READY' || normalized === 'SIAP') {
    return 'bg-violet-100 text-violet-700';
  }

  if (normalized === 'COMPLETED' || normalized === 'SELESAI') {
    return 'bg-emerald-100 text-emerald-700';
  }

  return 'bg-slate-100 text-slate-700';
}

export default function PreOrdersPage() {
  const [items, setItems] = useState<PreOrder[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const [selected, setSelected] = useState<PreOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchPreOrders = async (nextPage: number, status: string) => {
    setLoadingTable(true);
    setTableError(null);

    try {
      const result = await listPreOrders({
        page: nextPage,
        limit: PAGE_SIZE,
        status: status || undefined,
      });
      setItems(result.items);
      setTotalPages(Math.max(1, result.meta.totalPages || 1));
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      setTableError(message);
      toast.error(`Gagal memuat daftar pre-order: ${message}`);
      setItems([]);
      setTotalPages(1);
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    void fetchPreOrders(page, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const onViewDetails = async (item: PreOrder) => {
    setIsDetailOpen(true);
    setLoadingDetail(true);
    setSelected(item);

    try {
      const detailed = await getPreOrderDetail(item.id);
      setSelected(detailed);
    } catch {
      // Keep list payload as fallback when detail endpoint is unavailable.
      setSelected(item);
    } finally {
      setLoadingDetail(false);
    }
  };

  const detailItems = useMemo(() => selected?.salesItems ?? [], [selected]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-dark">Manajemen Pre-Order</h1>
          <p className="text-slate-600">Pantau daftar PO, status proses, dan detail item pesanan pelanggan.</p>
        </div>

        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Filter Status</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="min-w-48 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-primary/30 focus:ring"
          >
            <option value="">Semua Status</option>
            <option value="PENDING_DP">Menunggu DP</option>
            <option value="PROCESSING">Diproses</option>
            <option value="READY">Siap</option>
            <option value="COMPLETED">Selesai</option>
          </select>
        </label>
      </div>

      {loadingTable ? (
        <TableSkeleton rows={6} columns={7} />
      ) : (
        <DataTable
          headers={[
            'ID / Invoice',
            'Nama Pelanggan',
            'Total Pesanan',
            'Uang Muka / DP',
            'Tanggal Pengambilan',
            'Status PO',
            'Aksi',
          ]}
          hasData={items.length > 0}
          emptyMessage={tableError ?? 'Belum ada data pre-order.'}
        >
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/70">
              <td className="px-4 py-3">
                <div className="space-y-0.5">
                  <p className="font-medium text-dark">{item.invoiceNumber}</p>
                  <p className="text-xs text-slate-500">{item.id}</p>
                </div>
              </td>
              <td className="px-4 py-3">{item.customerName}</td>
              <td className="px-4 py-3 font-medium text-dark">{formatCurrency(item.totalAmount)}</td>
              <td className="px-4 py-3">{formatCurrency(item.dpAmount)}</td>
              <td className="px-4 py-3">{formatDate(item.pickupDate)}</td>
              <td className="px-4 py-3">
                <span
                  className={[
                    'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                    getStatusClass(item.status),
                  ].join(' ')}
                >
                  {getStatusLabel(item.status)}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onViewDetails(item)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Eye size={14} />
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelected(null);
        }}
        title="Detail Pre-Order"
        size="lg"
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Invoice</p>
                <p className="font-medium text-dark">{selected.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Pelanggan</p>
                <p className="font-medium text-dark">{selected.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="font-medium text-dark">{formatCurrency(selected.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">DP</p>
                <p className="font-medium text-dark">{formatCurrency(selected.dpAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tanggal Pengambilan</p>
                <p className="font-medium text-dark">{formatDate(selected.pickupDate)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <span
                  className={[
                    'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                    getStatusClass(selected.status),
                  ].join(' ')}
                >
                  {getStatusLabel(selected.status)}
                </span>
              </div>
            </div>

            {loadingDetail ? (
              <p className="text-sm text-slate-600">Memuat detail item...</p>
            ) : detailItems.length === 0 ? (
              <p className="text-sm text-slate-600">Tidak ada item pada transaksi ini.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Nama Item</th>
                      <th className="px-4 py-3 font-semibold">Qty</th>
                      <th className="px-4 py-3 font-semibold">Harga</th>
                      <th className="px-4 py-3 font-semibold">Subtotal</th>
                      <th className="px-4 py-3 font-semibold">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailItems.map((salesItem) => (
                      <tr key={salesItem.id}>
                        <td className="px-4 py-3">{salesItem.productName}</td>
                        <td className="px-4 py-3">{salesItem.quantity}</td>
                        <td className="px-4 py-3">{formatCurrency(salesItem.unitPrice)}</td>
                        <td className="px-4 py-3 font-medium text-dark">{formatCurrency(salesItem.subtotal)}</td>
                        <td className="px-4 py-3 text-slate-600">{salesItem.itemNote || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
