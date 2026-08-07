export type Client = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
};

export type Product = {
  id: string;
  name: string;
  defaultPrice: number;
};

export const SEED_CLIENTS: Client[] = [
  { id: '1006', name: 'MI Plus Roudlotul Jannah', email: 'kepsek@miplusroudlotul.sch.id', phone: '031-5550606' },
  { id: '1008', name: 'MA Negeri Program Keagamaan', email: 'operator@manprogramkeagamaan.sch.id', phone: '0271-5550808' },
  { id: '1003', name: 'SMK Negeri 20 Bandung', email: 'kepsek@smkn20bandung.sch.id', phone: '022-5550303' },
  { id: '1007', name: 'SMAN Plus Unggulan Aceh', email: 'kepsek@smanplusunggulanaceh.sch.id', phone: '0651-5550707' },
  { id: '1004', name: 'SMA Negeri 1 Model Medan', email: 'kepsek@sman1modelmedan.sch.id', phone: '061-5550404' },
  { id: '1002', name: 'SMPK BPK PENABUR Jakarta', email: 'keuangan@smpkpenaburjakarta.sch.id', phone: '021-5550202' },
  { id: '1001', name: 'SD Islam Al-Azhar', email: 'admin@sdislamalazhar.sch.id', phone: '021-5550101' },
  { id: '1005', name: 'TK Kartika Chandra Kirana', email: 'kepsek@tkkartikachandrakirana.sch.id', phone: '021-5550505' },
];

export const SEED_TENANT_CLIENTS: Client[] = [
  { id: 'seed-tenant-1001', name: 'SD Islam Al-Azhar Jakarta', email: 'admin@sdalislamalazharjkt.sch.id', phone: '021-5550101' },
  { id: 'seed-tenant-1002', name: 'SMPK BPK PENABUR Jakarta', email: 'kepsek@smpkpenaburjkt.sch.id', phone: '021-5550202' },
  { id: 'seed-tenant-1003', name: 'SMK Negeri 20 Bandung', email: 'kepsek@smkn20bdg.sch.id', phone: '022-5550303' },
  { id: 'seed-tenant-1004', name: 'SMA Negeri 1 Model Medan', email: 'kepsek@sman1modelmdn.sch.id', phone: '061-5550404' },
  { id: 'seed-tenant-1005', name: 'TK Kartika Chandra Kirana', email: 'kepsek@tkkartika.sch.id', phone: '021-5550505' },
  { id: 'seed-tenant-1006', name: 'MI Plus Roudlotul Jannah', email: 'operator@miplusroudlotul.sch.id', phone: '031-5550606' },
];

export const SEED_PRODUCTS: Product[] = [
  { id: 'buku-paket', name: 'Buku Paket & Alat Tulis', defaultPrice: 1250000 },
  { id: 'kegiatan-osis', name: 'Kegiatan OSIS / Study Tour', defaultPrice: 650000 },
  { id: 'praktik-lab', name: 'Uang Praktik / Lab & UKK', defaultPrice: 350000 },
  { id: 'psb', name: 'PSB (Penerimaan Siswa Baru)', defaultPrice: 2500000 },
  { id: 'seragam', name: 'Seragam Sekolah', defaultPrice: 950000 },
  { id: 'spp-bulanan', name: 'SPP Bulanan', defaultPrice: 750000 },
  { id: 'uang-gedung', name: 'Uang Gedung', defaultPrice: 5000000 },
  { id: 'uang-makan', name: 'Uang Makan / Catering', defaultPrice: 450000 },
];

export const SEED_LICENSE_PRODUCTS: Product[] = [
  { id: 'POS',        name: 'POS Ecosystem',      defaultPrice: 500000 },
  { id: 'ERP',        name: 'ERP Suite',          defaultPrice: 1500000 },
  { id: 'SCHOOL_ERP', name: 'School ERP',         defaultPrice: 2500000 },
  { id: 'CLINIC',     name: 'Clinic Management',  defaultPrice: 750000 },
];

export type PaymentStatus = 'Paid' | 'Not Paid';

export type CellPayment = {
  status: PaymentStatus;
  amountIDR: number;
  receiptImages: string[];
  notes?: string;
};

export type PaymentMatrix = Record<string, CellPayment>;

const receiptPool = [
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600',
  'https://images.unsplash.com/photo-1579621970588-a35d0e7ab9b6?w=600',
];

function paymentKey(clientId: string, productId: string, yearMonth: { month: number; year: number }) {
  return `${clientId}::${productId}::${yearMonth.year}::${yearMonth.month}`;
}

export function matrixKey(opts: {
  clientId: string;
  productId: string;
  periodMonth: number;
  periodYear: number;
}) {
  return paymentKey(opts.clientId, opts.productId, { month: opts.periodMonth, year: opts.periodYear });
}

export function buildSeedPaymentMatrix(): PaymentMatrix {
  const matrix: PaymentMatrix = {};
  const yearMonths = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, year: 2026 }));
  for (const client of SEED_CLIENTS) {
    for (const product of SEED_PRODUCTS) {
      for (const ym of yearMonths) {
        const key = paymentKey(client.id, product.id, ym);
        const isPaid = Math.random() < 0.5;
        matrix[key] = {
          status: isPaid ? 'Paid' : 'Not Paid',
          amountIDR: product.defaultPrice,
          receiptImages: isPaid ? [receiptPool[Math.floor(Math.random() * receiptPool.length)]] : [],
        };
      }
    }
  }
  return matrix;
}

export const SEED_PAYMENT_MATRIX: PaymentMatrix = buildSeedPaymentMatrix();

export function generateSeedMatrix(
  clients: Client[],
  products: Product[],
  year: number
): PaymentMatrix {
  const matrix: PaymentMatrix = {};
  const yearMonths = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, year }));
  for (const client of clients) {
    for (const product of products) {
      for (const ym of yearMonths) {
        const key = paymentKey(client.id, product.id, ym);
        const isPaid = Math.random() < 0.4;
        matrix[key] = {
          status: isPaid ? 'Paid' : 'Not Paid',
          amountIDR: product.defaultPrice,
          receiptImages: isPaid ? [receiptPool[Math.floor(Math.random() * receiptPool.length)]] : [],
        };
      }
    }
  }
  return matrix;
}

export function formatCurrencyIDR(n: number) {
  if (!Number.isFinite(n)) n = 0;
  const abs = Math.abs(Math.round(n));
  const s = abs.toString();
  const withDots = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp ${withDots}`;
}

export function genId(prefix = 'ID'): string {
  const hex = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return `${prefix.toUpperCase()}-${hex.toLowerCase()}`;
}

const BULAN_ID: Record<number, string> = {
  1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April', 5: 'Mei', 6: 'Juni',
  7: 'Juli', 8: 'Agustus', 9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember',
};

export const MONTH_LABELS_ID: readonly string[] = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function formatDateID(iso: string): string {
  if (!iso) return '-';
  try {
    let d: Date;
    if (iso.length === 10) {
      const [y, m, day] = iso.split('-').map(Number);
      d = new Date(Number(y), Number(m) - 1, Number(day));
    } else {
      d = new Date(iso);
    }
    if (!Number.isFinite(d.getTime())) return iso;
    const day = String(d.getDate()).padStart(2, '0');
    const month = BULAN_ID[d.getMonth() + 1] ?? String(d.getMonth() + 1);
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return iso;
  }
}

export const SEED_EXPENSES: Array<{
  id: string;
  name: string;
  dateISO: string;
  picName: string;
  status: 'Paid' | 'Not Paid';
  description: string;
  proofImages: string[];
}> = [
  {
    id: 'EXP-00000001',
    name: 'Gaji Karyawan Januari 2026',
    dateISO: '2026-01-31',
    picName: 'Siti Nurhaliza (HRD)',
    status: 'Paid',
    description: 'Gaji bulanan seluruh staff operasional + guru untuk periode Januari 2026.',
    proofImages: [],
  },
  {
    id: 'EXP-00000002',
    name: 'Sewa Kantor',
    dateISO: '2026-02-05',
    picName: 'Budi Santoso (Keuangan)',
    status: 'Paid',
    description: 'Sewa gedung pusat administrasi Goldenity periode Februari 2026.',
    proofImages: [],
  },
  {
    id: 'EXP-00000003',
    name: 'Listrik PLN',
    dateISO: '2026-02-10',
    picName: 'Rina Wulandari (Umum)',
    status: 'Paid',
    description: 'Tagihan listrik PLN kantor pusat + server rack bulan Januari.',
    proofImages: [],
  },
  {
    id: 'EXP-00000004',
    name: 'Internet IndiHome',
    dateISO: '2026-02-12',
    picName: 'Andi Pratama (IT Support)',
    status: 'Paid',
    description: 'Langganan internet dedicated 100Mbps + backup link bulan Februari.',
    proofImages: [],
  },
  {
    id: 'EXP-00000005',
    name: 'ATK Kantor',
    dateISO: '2026-02-15',
    picName: 'Dewi Lestari (Admin)',
    status: 'Paid',
    description: 'Pembelian alat tulis kantor: kertas A4, pulpen, map, binder, dan amplop.',
    proofImages: [],
  },
  {
    id: 'EXP-00000006',
    name: 'Biaya Perbaikan AC',
    dateISO: '2026-02-18',
    picName: 'Joko Susilo (Facility)',
    status: 'Paid',
    description: 'Service AC 2 PK di ruang training dan freon tambah unit lantai 2.',
    proofImages: [],
  },
  {
    id: 'EXP-00000007',
    name: 'Konsumsi Rapat',
    dateISO: '2026-02-20',
    picName: 'Ayu Permatasari (GA)',
    status: 'Paid',
    description: 'Konsumsi rapat bulanan client gathering dengan kepala sekolah partner.',
    proofImages: [],
  },
  {
    id: 'EXP-00000008',
    name: 'Langganan Software',
    dateISO: '2026-02-22',
    picName: 'Fajar Nugraha (CTO)',
    status: 'Not Paid',
    description: 'Langganan tahunan SaaS: Google Workspace, Figma Business, GitHub Pro.',
    proofImages: [],
  },
  {
    id: 'EXP-00000009',
    name: 'Transportasi Dinas',
    dateISO: '2026-02-25',
    picName: 'Hendra Wijaya (Sales)',
    status: 'Paid',
    description: 'Reimburse bbm dan tol kunjungan client sekolah di wilayah Jabodetabek.',
    proofImages: [],
  },
  {
    id: 'EXP-00000010',
    name: 'Bonus THR Lebaran',
    dateISO: '2026-03-01',
    picName: 'Siti Nurhaliza (HRD)',
    status: 'Not Paid',
    description: 'Estimasi pembayaran THR Idul Fitri 1447 H untuk seluruh karyawan tetap.',
    proofImages: [],
  },
];

