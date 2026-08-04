export type ExpenseStatus = 'Paid' | 'Not Paid';

export type Expense = {
  id: string;
  name: string;
  dateISO: string;
  picName: string;
  status: ExpenseStatus;
  description: string;
  proofImages: string[];
};

export type Product = {
  id: string;
  name: string;
  defaultPrice: number;
};

export type Client = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
};

export type PaymentStatus = 'Paid' | 'Not Paid';

export type ClientPaymentCell = {
  status: PaymentStatus;
  amountIDR: number;
  receiptImages: string[];
};

export type PaymentMatrix = Record<string, ClientPaymentCell>;

export const MONTH_LABELS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatCurrencyIDR(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDateID(dateISO: string): string {
  return new Date(dateISO).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function paymentKey(
  clientId: string,
  productId: string,
  yearMonth: string
): string {
  return `${clientId}__${productId}__${yearMonth}`;
}

export function genId(prefix: string): string {
  const randomHex = Array.from(
    { length: 8 },
    () => Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return `${prefix}-${randomHex}`;
}

export const SEED_EXPENSES: Expense[] = [
  {
    id: genId('EXP'),
    name: 'Gaji Karyawan Januari 2026',
    dateISO: '2026-01-05',
    picName: 'Siti Nurhaliza',
    status: 'Paid',
    description: 'Pembayaran gaji bulanan seluruh karyawan periode Januari 2026',
    proofImages: [
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
    ],
  },
  {
    id: genId('EXP'),
    name: 'Sewa Kantor',
    dateISO: '2026-01-10',
    picName: 'Budi Santoso',
    status: 'Paid',
    description: 'Sewa gedung kantor lantai 3 untuk periode Januari 2026',
    proofImages: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
    ],
  },
  {
    id: genId('EXP'),
    name: 'Listrik PLN',
    dateISO: '2026-01-15',
    picName: 'Dewi Lestari',
    status: 'Paid',
    description: 'Tagihan listrik kantor bulan Desember 2025',
    proofImages: [
      'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800',
    ],
  },
  {
    id: genId('EXP'),
    name: 'Internet IndiHome',
    dateISO: '2026-01-20',
    picName: 'Andi Pratama',
    status: 'Paid',
    description: 'Tagihan internet fiber optic 100Mbps bulan Januari 2026',
    proofImages: [
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
    ],
  },
  {
    id: genId('EXP'),
    name: 'ATK Kantor',
    dateISO: '2026-02-03',
    picName: 'Maya Putri',
    status: 'Paid',
    description: 'Pembelian kertas A4, pulpen, map, dan perlengkapan kantor lainnya',
    proofImages: [
      'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800',
    ],
  },
  {
    id: genId('EXP'),
    name: 'Biaya Perbaikan AC',
    dateISO: '2026-02-12',
    picName: 'Rizky Hakim',
    status: 'Paid',
    description: 'Service dan perbaikan AC ruang meeting yang bocor freon',
    proofImages: [
      'https://images.unsplash.com/photo-1581093458791-9f3c3250a8b0?w=800',
    ],
  },
  {
    id: genId('EXP'),
    name: 'Konsumsi Rapat',
    dateISO: '2026-03-08',
    picName: 'Linda Sari',
    status: 'Not Paid',
    description: 'Konsumsi snack dan kopi untuk rapat tahunan dengan client',
    proofImages: [],
  },
  {
    id: genId('EXP'),
    name: 'Langganan Software',
    dateISO: '2026-04-01',
    picName: 'Fajar Nugroho',
    status: 'Not Paid',
    description: 'Perpanjangan langganan tahunan Notion, Figma, dan Slack',
    proofImages: [],
  },
  {
    id: genId('EXP'),
    name: 'Transportasi Dinas',
    dateISO: '2026-05-18',
    picName: 'Ayu Permata',
    status: 'Not Paid',
    description: 'Reimburse tiket pesawat dan taksi kunjungan client ke Surabaya',
    proofImages: [],
  },
  {
    id: genId('EXP'),
    name: 'Bonus THR Lebaran',
    dateISO: '2026-04-10',
    picName: 'Hendra Wijaya',
    status: 'Not Paid',
    description: 'Pembayaran Tunjangan Hari Raya Idul Fitri 1447 H seluruh karyawan',
    proofImages: [],
  },
];

export const SEED_PRODUCTS: Product[] = [
  {
    id: genId('PRD'),
    name: 'PSB EduCore',
    defaultPrice: 1000000,
  },
  {
    id: genId('PRD'),
    name: 'ERP EduCore',
    defaultPrice: 2500000,
  },
  {
    id: genId('PRD'),
    name: 'Training Workshop',
    defaultPrice: 500000,
  },
  {
    id: genId('PRD'),
    name: 'Konsultasi IT',
    defaultPrice: 3000000,
  },
];

export const SEED_CLIENTS: Client[] = [
  {
    id: genId('CLI'),
    name: 'CV Mulia Jaya',
    email: 'admin@muliajaya.co.id',
    phone: '021-5550101',
  },
  {
    id: genId('CLI'),
    name: 'PT Anggi Sejahtera',
    email: 'keuangan@anggisejahtera.com',
    phone: '021-5550202',
  },
  {
    id: genId('CLI'),
    name: 'Toko Sumber Rejeki',
    email: 'sumberrejeki@gmail.com',
    phone: '021-5550303',
  },
  {
    id: genId('CLI'),
    name: 'SD Harapan Bangsa',
    email: 'kepsek@sdharapanbangsa.sch.id',
    phone: '022-5550404',
  },
  {
    id: genId('CLI'),
    name: 'SMP Cendekia',
    email: 'operator@smpcendekia.sch.id',
    phone: '022-5550505',
  },
  {
    id: genId('CLI'),
    name: 'SMA Negeri 1 Model',
    email: 'humas@sman1model.sch.id',
    phone: '031-5550606',
  },
  {
    id: genId('CLI'),
    name: 'Klinik Sehat Sentosa',
    email: 'admin@kliniksehatsentosa.com',
    phone: '031-5550707',
  },
  {
    id: genId('CLI'),
    name: 'Resto Sari Laut',
    email: 'owner@restosarilaut.com',
    phone: '0361-5550808',
  },
  {
    id: genId('CLI'),
    name: 'Bengkel Mobil Jaya',
    email: 'cs@bengkelmobiljaya.com',
    phone: '024-5550909',
  },
  {
    id: genId('CLI'),
    name: 'CV Logistik Nusantara',
    email: 'finance@logistiknusantara.co.id',
    phone: '021-5551010',
  },
];

function buildSeedPaymentMatrix(): PaymentMatrix {
  const matrix: PaymentMatrix = {};
  const yearMonths = [
    '2026-01',
    '2026-02',
    '2026-03',
    '2026-04',
    '2026-05',
    '2026-06',
    '2026-07',
  ];
  const receiptPool = [
    'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800',
    'https://images.unsplash.com/photo-1588675647532-4be75a20e66a?w=800',
    'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800',
  ];

  for (const client of SEED_CLIENTS) {
    for (const product of SEED_PRODUCTS) {
      for (const ym of yearMonths) {
        const key = paymentKey(client.id, product.id, ym);
        const isPaid = Math.random() < 0.5;
        matrix[key] = {
          status: isPaid ? 'Paid' : 'Not Paid',
          amountIDR: product.defaultPrice,
          receiptImages: isPaid
            ? [receiptPool[Math.floor(Math.random() * receiptPool.length)]]
            : [],
        };
      }
    }
  }

  return matrix;
}

export const SEED_PAYMENT_MATRIX: PaymentMatrix = buildSeedPaymentMatrix();
