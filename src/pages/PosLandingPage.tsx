import { useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Coffee,
  Download,
  Globe,
  Layers3,
  Minus,
  Printer,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Wrench,
  WifiOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type MetricCard = {
  label: string;
  value: string;
};

type FeatureItem = {
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  badge: string;
  badgeSubtext: string;
};

type SectorCard = {
  category: string;
  title: string;
  description: string;
  client: string;
  icon: LucideIcon;
  tone: string;
};

type Tier = {
  name: string;
  eyebrow: string;
  price: string;
  description: string;
  highlight?: boolean;
  premium?: boolean;
  features: string[];
};

type ComparisonRow = {
  feature: string;
  standard: boolean;
  professional: boolean;
  enterprise: boolean;
};

const heroStats = [
  { value: '14 Hari', label: 'Offline Tanpa Gangguan' },
  { value: '∞', label: 'Cabang Multi-Outlet' },
  { value: '99.9%', label: 'Uptime Target' },
  { value: '3+', label: 'Sektor Terbukti' },
];

const offlineMetrics: MetricCard[] = [
  { value: 'Hingga 14 hari', label: 'Transaksi Offline' },
  { value: 'Otomatis', label: 'Mode Sync' },
  { value: '100% Terjaga', label: 'Integritas Data' },
  { value: 'Tidak Diperlukan', label: 'Setup Internet' },
];

const ecosystemFeatures: FeatureItem[] = [
  {
    title: 'Transaksi Tanpa Internet',
    eyebrow: 'Offline-First',
    description:
      'Kasir tetap beroperasi meski koneksi terputus. Semua transaksi tersimpan aman di perangkat lalu tersinkron saat jaringan pulih.',
    icon: WifiOff,
    tone: 'bg-amber-50 text-amber-500',
    badge: '14 Hari',
    badgeSubtext: 'Offline Penuh',
  },
  {
    title: 'Kelola Semua Cabang dari Satu Tempat',
    eyebrow: 'Multi-Tenant',
    description:
      'Pantau banyak outlet, pindah antar-cabang dengan cepat, dan tetap menjaga setiap cabang dalam struktur data yang rapi.',
    icon: Building2,
    tone: 'bg-sky-50 text-sky-500',
    badge: '∞ Cabang',
    badgeSubtext: 'Tanpa Batas',
  },
  {
    title: 'Hak Akses Berlapis & Aman',
    eyebrow: 'Role Presisi',
    description:
      'Atur akses untuk owner, admin, kasir, hingga peran operasional lain. Setiap orang hanya melihat data yang relevan.',
    icon: ShieldCheck,
    tone: 'bg-emerald-50 text-emerald-500',
    badge: '5 Level',
    badgeSubtext: 'Role Akses',
  },
  {
    title: 'Berjalan di Perangkat Apa Saja',
    eyebrow: 'Adaptive UI',
    description:
      'Tampilan kasir menyesuaikan tablet, laptop, atau smartphone tanpa perlu perangkat khusus. Cukup gunakan perangkat yang sudah ada.',
    icon: Smartphone,
    tone: 'bg-violet-50 text-violet-500',
    badge: '3 Platform',
    badgeSubtext: 'Tablet · PC · HP',
  },
  {
    title: 'Hardware Langsung Terhubung',
    eyebrow: 'Plug & Play',
    description:
      'Printer thermal 58mm dan 56mm siap dipakai dengan konfigurasi minim. Struk juga bisa disesuaikan dengan identitas bisnis.',
    icon: Printer,
    tone: 'bg-rose-50 text-rose-500',
    badge: '58 & 56mm',
    badgeSubtext: 'Thermal Printer',
  },
];

const sectorCards: SectorCard[] = [
  {
    category: 'F&B',
    title: 'Kafe & Restoran',
    description:
      'Kelola menu, meja, dan pesanan secara efisien. Tetap buka dan bertransaksi meski internet kafe sedang bermasalah.',
    client: 'Volcan Coffee & Space',
    icon: Coffee,
    tone: 'bg-amber-50 border-amber-200/70',
  },
  {
    category: 'OTOMOTIF',
    title: 'Jasa & Bengkel',
    description:
      'Catat servis, sparepart, dan pembayaran dalam satu sistem terintegrasi yang mudah digunakan mekanik sekalipun.',
    client: 'Tanto Pink Bengkel',
    icon: Wrench,
    tone: 'bg-sky-50 border-sky-200/70',
  },
  {
    category: 'RETAIL',
    title: 'Toko & Bakery',
    description:
      'Manajemen stok real-time, laporan harian, dan struk profesional yang meningkatkan kepercayaan pelanggan.',
    client: 'Bakery / Sparepart',
    icon: Store,
    tone: 'bg-emerald-50 border-emerald-200/70',
  },
];

const pricingTiers: Tier[] = [
  {
    name: 'Standard',
    eyebrow: 'Satu toko, penuh kendali',
    price: '1 Admin',
    description:
      'Kasir inti tanpa kompleksitas. Ideal untuk usaha kecil yang ingin memastikan transaksi tetap berjalan.',
    features: [
      'Login & Offline Mode (14 hari)',
      'Penjualan / Kasir',
      'Inventaris',
      'Daftar Belanja / Restock',
      'Riwayat Transaksi',
      'Cetak Struk Thermal',
    ],
  },
  {
    name: 'Professional',
    eyebrow: 'Tim operasional lengkap',
    price: 'Maks. 10 user',
    description:
      'Upgrade paling pas ke sistem operasional penuh. Semua untuk bisnis aktif dengan alur kerja lebih rapi.',
    highlight: true,
    features: [
      'Semua fitur Standard',
      'Multi User (maks. 10 user)',
      'Role: Admin, Kasir, dll.',
      'Kas Bon & Piutang',
      'Data Supplier',
      'Pengeluaran Operasional',
      'Laporan Keuangan',
      'Laporan Pajak',
      'Kirim Struk ke WhatsApp',
    ],
  },
  {
    name: 'Enterprise',
    eyebrow: 'Brand eksklusif & premium',
    price: 'Maks. 10 user',
    description:
      'Semua fitur Professional plus identitas brand toko yang eksklusif di aplikasi dan dokumen.',
    premium: true,
    features: [
      'Semua fitur Professional',
      'Upload Logo Toko',
      'Hapus Branding Logo Toko',
      'Logo pada Struk & Dokumen',
      'Tampilan Sistem Premium',
    ],
  },
];

const comparisonRows: ComparisonRow[] = [
  { feature: 'Login & Offline Mode', standard: true, professional: true, enterprise: true },
  { feature: 'Penjualan / Kasir', standard: true, professional: true, enterprise: true },
  { feature: 'Inventaris', standard: true, professional: true, enterprise: true },
  { feature: 'Daftar Belanja / Restock', standard: true, professional: true, enterprise: true },
  { feature: 'Riwayat Transaksi', standard: true, professional: true, enterprise: true },
  { feature: 'Cetak Struk', standard: true, professional: true, enterprise: true },
  { feature: 'Multi-User (maks. 10)', standard: false, professional: true, enterprise: true },
  { feature: 'Role Selain Admin', standard: false, professional: true, enterprise: true },
  { feature: 'Kas Bon', standard: false, professional: true, enterprise: true },
  { feature: 'Data Supplier', standard: false, professional: true, enterprise: true },
  { feature: 'Pengeluaran Operasional', standard: false, professional: true, enterprise: true },
  { feature: 'Laporan Keuangan', standard: false, professional: true, enterprise: true },
  { feature: 'Laporan Pajak', standard: false, professional: true, enterprise: true },
  { feature: 'Kirim Struk ke WhatsApp', standard: false, professional: true, enterprise: true },
  { feature: 'Upload & Branding Logo Toko', standard: false, professional: false, enterprise: true },
];

const activeFeatureMockups = [
  'bg-gradient-to-br from-amber-100 to-white text-amber-500',
  'bg-gradient-to-br from-sky-100 to-white text-sky-500',
  'bg-gradient-to-br from-emerald-100 to-white text-emerald-500',
  'bg-gradient-to-br from-violet-100 to-white text-violet-500',
  'bg-gradient-to-br from-rose-100 to-white text-rose-500',
];

function CheckCell({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
      <Check className="h-4 w-4" />
    </span>
  ) : (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-300">
      <Minus className="h-4 w-4" />
    </span>
  );
}

export default function PosLandingPage() {
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const activeFeature = ecosystemFeatures[activeFeatureIndex];

  return (
    <main className="scroll-smooth bg-[radial-gradient(circle_at_top,_rgba(255,194,82,0.14),_transparent_34%),linear-gradient(180deg,_#fffdf7_0%,_#ffffff_24%,_#ffffff_100%)] text-[#101822]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pb-10">
        <header className="flex items-center justify-between py-2 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-white/80 shadow-[0_0_30px_rgba(245,158,11,0.14)] backdrop-blur">
              <span className="text-xl font-black leading-none bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 bg-clip-text text-transparent">
                G
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-[#101822] sm:text-base">Goldenity POS</p>
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500 sm:text-[11px]">Kasir Cerdas · Anti-Putus · AI</p>
            </div>
          </div>

          <a
            href="https://goldenity.web.id"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-medium text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-200 hover:text-amber-700 hover:shadow-md"
          >
            <Globe className="h-3.5 w-3.5" />
            goldenity.web.id
          </a>
        </header>

        <section id="hero" className="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden py-14 text-center sm:py-20 lg:py-24">
          <div className="absolute inset-x-0 top-0 -z-10 mx-auto h-[420px] max-w-6xl rounded-full bg-[radial-gradient(circle,_rgba(245,158,11,0.11),_transparent_65%)] blur-3xl" />

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/85 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700 shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Solusi kasir generasi terbaru - berbasis AI
          </div>

          <h1 className="max-w-4xl text-4xl font-black leading-[0.92] tracking-tight text-[#101822] sm:text-6xl lg:text-7xl">
            Kasir Cerdas,
            <span className="block bg-gradient-to-r from-amber-600 via-amber-500 to-orange-400 bg-clip-text text-transparent">
              Tangguh & Anti-Putus.
            </span>
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
            Tinggalkan sistem kasir lama yang bergantung penuh pada internet. Goldenity POS dirancang agar transaksi Anda{' '}
            <span className="font-semibold text-[#101822]">tetap berjalan di kondisi apa pun</span> — dari satu toko hingga puluhan cabang.
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-400 px-6 py-4 text-sm font-semibold text-[#101822] shadow-[0_16px_40px_rgba(245,158,11,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(245,158,11,0.34)]"
            >
              Jadwalkan Demo Gratis
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-200 hover:text-amber-700 hover:shadow-md"
            >
              Lihat Semua Fitur
            </a>
          </div>

          <div className="relative mt-14 w-full max-w-5xl rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="grid gap-px overflow-hidden rounded-[2rem] bg-slate-100 md:grid-cols-4">
              {heroStats.map((stat) => (
                <article key={stat.label} className="bg-white px-5 py-6 text-center sm:px-6">
                  <p className="text-3xl font-black tracking-tight text-amber-500 sm:text-4xl">{stat.value}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-slate-500">{stat.label}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="offline-first" className="grid gap-8 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
              <WifiOff className="h-3.5 w-3.5" />
              Teknologi Offline-First
            </div>

            <h2 className="mt-5 max-w-2xl text-4xl font-black leading-[0.95] tracking-tight text-[#101822] sm:text-5xl">
              Internet Mati?
              <span className="block">Kasir Tetap Jalan.</span>
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Arsitektur offline-first menyimpan semua transaksi secara lokal di perangkat. Tidak ada jeda, tidak ada kerugian.
              Begitu jaringan kembali, sistem otomatis menyinkronkan semua data ke Cloud dengan urutan yang sempurna.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {offlineMetrics.map((metric) => (
                <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">{metric.label}</p>
                  <p className="mt-2 text-lg font-bold text-[#101822]">{metric.value}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_22px_80px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Status Koneksi</p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-[#101822]">Rp 4.215.000</p>
                  <p className="mt-1 text-sm text-slate-500">18 transaksi tersimpan di perangkat lokal</p>
                </div>

                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-500">
                  <WifiOff className="h-3.5 w-3.5" />
                  OFFLINE
                </span>
              </div>

              <div className="mt-7">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Kapasitas Penyimpanan Lokal</span>
                  <span>54% digunakan</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[54%] rounded-full bg-gradient-to-r from-amber-400 to-amber-500" />
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-500 shadow-sm">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-600">Koneksi pulih — sinkronisasi dimulai</p>
                  <p className="text-sm text-emerald-600/80">18 transaksi sedang dikirim ke Cloud...</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-16 lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Fitur Unggulan - Modul Utama
            </div>
            <h2 className="mt-5 text-4xl font-black leading-[0.95] tracking-tight text-[#101822] sm:text-5xl">
              Lima Modul yang Bekerja
              <span className="block">Sebagai Satu Ekosistem</span>
            </h2>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-[280px_1fr] lg:items-start">
            <aside className="space-y-3">
              {ecosystemFeatures.map((feature, index) => {
                const Icon = feature.icon;
                const isActive = index === activeFeatureIndex;

                return (
                  <button
                    key={feature.title}
                    type="button"
                    onClick={() => setActiveFeatureIndex(index)}
                    className={[
                      'flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all duration-300',
                      isActive
                        ? 'border-current/20 bg-white shadow-[0_16px_30px_rgba(15,23,42,0.06)]'
                        : 'border-transparent bg-transparent hover:border-slate-200 hover:bg-white hover:shadow-sm',
                      isActive ? 'text-[#101822]' : 'text-slate-500',
                    ].join(' ')}
                  >
                    <div className={[
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300',
                      isActive ? feature.tone : 'bg-slate-50 text-slate-400',
                    ].join(' ')}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className={['truncate text-sm font-semibold transition-colors duration-300', isActive ? 'text-[#101822]' : 'text-slate-600'].join(' ')}>
                        {feature.title}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{feature.eyebrow}</p>
                    </div>
                  </button>
                );
              })}
            </aside>

            <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)] sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className={[
                    'inline-flex items-center justify-center rounded-2xl p-3 shadow-sm',
                    activeFeature.tone,
                  ].join(' ')}>
                    <activeFeature.icon className="h-6 w-6" />
                  </div>
                  <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-500">{activeFeature.eyebrow} · {activeFeature.badgeSubtext}</p>
                  <h3 className="mt-3 text-3xl font-black tracking-tight text-[#101822] sm:text-4xl">{activeFeature.title}</h3>
                  <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">{activeFeature.description}</p>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className={[
                    'flex min-w-[120px] items-center justify-center rounded-2xl px-4 py-3 text-center shadow-sm',
                    activeFeatureMockups[activeFeatureIndex],
                  ].join(' ')}>
                    <div>
                      <p className="text-2xl font-black leading-none">{activeFeature.badge}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em]">{activeFeature.badgeSubtext}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 h-1.5 w-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-400" />
            </article>
          </div>
        </section>

        <section id="industries" className="py-16 lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Terbukti di lapangan
            </div>
            <h2 className="mt-5 text-4xl font-black leading-[0.95] tracking-tight text-[#101822] sm:text-5xl">
              Cocok untuk Bisnis Anda,
              <span className="block">Apa pun Sektornya</span>
            </h2>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {sectorCards.map((sector) => {
              const Icon = sector.icon;

              return (
                <article
                  key={sector.title}
                  className={[
                    'rounded-[1.75rem] border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)]',
                    sector.tone,
                  ].join(' ')}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                    <Icon className="h-5 w-5 text-amber-500" />
                  </div>
                  <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-500">{sector.category}</p>
                  <h3 className="mt-3 text-3xl font-black tracking-tight text-[#101822]">{sector.title}</h3>
                  <p className="mt-4 text-base leading-8 text-slate-600">{sector.description}</p>

                  <div className="mt-8 border-t border-black/10 pt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">Klien Referensi</p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#101822]">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      {sector.client}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="pricing" className="py-16 lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Pilihan Paket Berlangganan
            </div>
            <h2 className="mt-5 text-4xl font-black leading-[0.95] tracking-tight text-[#101822] sm:text-5xl">
              Kami Berkembang
              <span className="block bg-gradient-to-r from-amber-600 via-amber-500 to-orange-400 bg-clip-text text-transparent">
                Bersama Bisnis Anda
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Mulai dari toko tunggal hingga jaringan multi-cabang — ada paket yang tepat untuk Anda.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {pricingTiers.map((tier) => {
              const isProfessional = tier.highlight;
              const isEnterprise = tier.premium;

              return (
                <article
                  key={tier.name}
                  className={[
                    'flex h-full flex-col rounded-[2rem] border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1',
                    isProfessional
                      ? 'border-amber-200 bg-[linear-gradient(180deg,_rgba(17,24,39,0.98),_rgba(28,36,57,0.98))] text-white shadow-[0_24px_70px_rgba(245,158,11,0.18)]'
                      : isEnterprise
                        ? 'border-slate-800 bg-[linear-gradient(180deg,_rgba(12,16,31,0.98),_rgba(23,28,46,0.98))] text-white'
                        : 'border-slate-200 bg-white text-[#101822]'
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={['text-[11px] font-semibold uppercase tracking-[0.32em]', isProfessional ? 'text-amber-300' : isEnterprise ? 'text-violet-300' : 'text-slate-400'].join(' ')}>
                        {tier.eyebrow}
                      </p>
                      <h3 className="mt-3 text-3xl font-black tracking-tight">{tier.name}</h3>
                      <p className={['mt-1 text-sm', isProfessional || isEnterprise ? 'text-white/70' : 'text-slate-500'].join(' ')}>{tier.price}</p>
                    </div>

                    {isProfessional ? (
                      <span className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-[0.28em] text-[#101822] shadow-sm">
                        Populer
                      </span>
                    ) : null}
                  </div>

                  <p className={['mt-4 text-base leading-8', isProfessional || isEnterprise ? 'text-white/75' : 'text-slate-600'].join(' ')}>
                    {tier.description}
                  </p>

                  <ul className="mt-7 space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm leading-7">
                        <span className={[
                          'mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                          isProfessional ? 'bg-amber-400/20 text-amber-300' : isEnterprise ? 'bg-emerald-400/15 text-emerald-300' : 'bg-emerald-50 text-emerald-500',
                        ].join(' ')}>
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span className={isProfessional || isEnterprise ? 'text-white/80' : 'text-slate-700'}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href="#contact"
                    className={[
                      'mt-8 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold transition-all duration-300',
                      isProfessional
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-[#101822] shadow-[0_16px_38px_rgba(245,158,11,0.25)] hover:-translate-y-0.5'
                        : isEnterprise
                          ? 'border border-violet-400/20 bg-violet-500/10 text-violet-200 hover:bg-violet-500/15'
                          : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-200 hover:text-amber-700',
                    ].join(' ')}
                  >
                    Hubungi Tim Kami
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </article>
              );
            })}
          </div>

          <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th scope="col" className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Fitur
                    </th>
                    <th scope="col" className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Standard
                    </th>
                    <th scope="col" className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-[0.24em] text-amber-600">
                      Professional
                    </th>
                    <th scope="col" className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-[0.24em] text-violet-500">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {comparisonRows.map((row) => (
                    <tr key={row.feature} className="transition-colors duration-300 hover:bg-slate-50/60">
                      <td className="px-5 py-4 text-sm text-[#101822]">{row.feature}</td>
                      <td className="px-5 py-4 text-center">
                        <CheckCell value={row.standard} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <CheckCell value={row.professional} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <CheckCell value={row.enterprise} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="contact" className="flex flex-col items-center justify-center py-16 text-center lg:py-24">
          <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-amber-200 bg-white shadow-[0_0_50px_rgba(245,158,11,0.28)]">
            <span className="text-4xl font-black leading-none bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 bg-clip-text text-transparent">
              G
            </span>
          </div>

          <h2 className="mt-8 text-4xl font-black leading-[0.95] tracking-tight text-[#101822] sm:text-5xl lg:text-6xl">
            Tingkatkan Efisiensi
            <span className="block bg-gradient-to-r from-amber-600 via-amber-500 to-orange-400 bg-clip-text text-transparent">
              Bisnis Anda Hari Ini.
            </span>
          </h2>

          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Amankan data transaksi, pangkas waktu operasional, dan kelola semua cabang tanpa batas — semuanya dalam satu platform kasir yang tangguh.
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <a
              href="#hero"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-400 px-6 py-4 text-sm font-semibold text-[#101822] shadow-[0_16px_40px_rgba(245,158,11,0.28)] transition-all duration-300 hover:-translate-y-0.5"
            >
              Jadwalkan Demo Gratis
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="https://drive.google.com/file/d/1Gq6Mqud8io-WH9O_CjZI3_g-xYRke6F5/view?usp=drive_link"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-200 hover:text-amber-700 hover:shadow-md"
            >
              <Download className="h-4 w-4" />
              Download Brosur
            </a>
          </div>

          <p className="mt-4 text-xs font-medium tracking-wide text-slate-500">
            Tanpa biaya setup • Onboarding dipandu • Dukungan langsung
          </p>

          <footer className="mt-16 w-full border-t border-slate-200 pt-6">
            <div className="flex flex-col items-center justify-between gap-5 text-sm text-slate-500 md:flex-row">
              <div className="flex items-center gap-3 text-left">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-white shadow-sm">
                  <span className="text-lg font-black leading-none bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 bg-clip-text text-transparent">
                    G
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-[#101822]">Goldenity POS</p>
                  <p className="text-xs">Inovasi Perangkat Lunak Berbasis AI</p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>goldenity.web.id</span>
              </div>

              <p>© 2026 Goldenity. All rights reserved.</p>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}