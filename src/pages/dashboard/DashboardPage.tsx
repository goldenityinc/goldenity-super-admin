import { useEffect, useState } from 'react';
import { Building2, Layers3, Link2, BarChart3 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import {
  getDashboardMetrics,
  type DashboardBusinessMetrics,
  type DashboardMetrics,
} from '../../lib/api/dashboardApi';
import { LEAD_STAGES } from '../../lib/api/leadApi';
import { formatRupiah, formatRupiahShort } from '../../lib/constants/packageCatalog';
import { getApiErrorMessage } from '../../lib/utils/apiError';
import { toast } from 'sonner';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function KpiTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'primary' | 'warning' | 'default';
}) {
  const toneClass =
    tone === 'primary'
      ? 'border-primary/40 bg-primary/5'
      : tone === 'warning'
        ? 'border-amber-300 bg-amber-50'
        : 'border-slate-200 bg-white';
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-bold text-dark">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function BusinessOverview({ business, loading }: { business?: DashboardBusinessMetrics; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!business) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
        Metrik bisnis (outlet berbayar, MRR, pipeline) belum tersedia. Perbarui backend admin core ke versi yang punya
        <code className="mx-1 rounded bg-slate-100 px-1">business</code>di <code className="rounded bg-slate-100 px-1">/dashboard/metrics</code>.
      </div>
    );
  }

  const stageCounts = LEAD_STAGES.map((stage) => ({
    ...stage,
    count: business.leads.byStage.find((row) => row.stage === stage.value)?.count ?? 0,
  }));
  const maxStage = Math.max(1, ...stageCounts.map((stage) => stage.count));
  const attentionCount = business.expiredButActiveCount + business.payments.unpaidCount;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Outlet berbayar aktif"
          value={business.activePaidOutlets}
          hint={`${business.activePayingTenants} tenant dengan langganan aktif`}
          tone="primary"
        />
        <KpiTile
          label="Estimasi MRR"
          value={formatRupiahShort(business.estimatedMrr)}
          hint={`Harga daftar × outlet${business.customSubscriptions ? ` · ${business.customSubscriptions} langganan custom tidak dihitung` : ''}`}
        />
        <KpiTile
          label="Akan habis ≤30 hari"
          value={business.expiringSoonCount}
          hint={business.expiredButActiveCount ? `${business.expiredButActiveCount} sudah lewat tapi masih aktif` : 'Hubungi untuk perpanjangan'}
          tone={business.expiringSoonCount + business.expiredButActiveCount > 0 ? 'warning' : 'default'}
        />
        <KpiTile
          label={`Belum lunas ${MONTH_NAMES[business.payments.periodMonth - 1]} ${business.payments.periodYear}`}
          value={business.payments.unpaidCount}
          hint={`${formatRupiah(business.payments.unpaidAmount)} belum masuk · ${formatRupiah(business.payments.paidAmount)} sudah lunas`}
          tone={business.payments.unpaidCount > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-dark">Pipeline lead</h2>
            <Link to="/dashboard/sales/leads" className="text-sm font-medium text-primary hover:underline">
              Buka pipeline
            </Link>
          </div>
          <p className="mb-3 text-sm text-slate-600">
            {business.leads.total} lead · {business.leads.newThisWeek} baru minggu ini ·{' '}
            <span className={business.leads.dueFollowUps ? 'font-semibold text-amber-700' : ''}>
              {business.leads.dueFollowUps} perlu ditindaklanjuti
            </span>
          </p>
          <div className="space-y-2">
            {stageCounts.map((stage) => (
              <div key={stage.value} className="flex items-center gap-3 text-sm">
                <span className="w-28 text-slate-600">{stage.label}</span>
                <div className="h-3 flex-1 rounded bg-slate-100">
                  <div
                    className={`h-3 rounded ${stage.value === 'WON' ? 'bg-emerald-500' : stage.value === 'LOST' ? 'bg-rose-300' : 'bg-primary'}`}
                    style={{ width: `${(stage.count / maxStage) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-right font-semibold text-dark">{stage.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-dark">Perlu perhatian</h2>
            <span className="text-sm text-slate-500">{attentionCount} item</span>
          </div>
          {business.attention.length === 0 ? (
            <p className="text-sm text-slate-500">Tidak ada langganan yang habis dalam 30 hari.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {business.attention.map((item) => (
                <li key={item.appInstanceId} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="font-medium text-dark">{item.tenantName}</p>
                    <p className="text-xs text-slate-500">
                      {item.solutionName} · {item.packageLabel}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      item.reason === 'EXPIRED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.reason === 'EXPIRED' ? 'Lewat' : 'Habis'}{' '}
                    {item.endDate ? new Date(item.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {business.packageBreakdown.length > 0 ? (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Per paket</p>
              <ul className="space-y-1 text-sm">
                {business.packageBreakdown.map((row) => (
                  <li key={row.packageLabel} className="flex justify-between gap-2">
                    <span className="text-slate-700">
                      {row.packageLabel} · {row.subscriptions} langganan · {row.outlets} outlet
                    </span>
                    <span className="font-medium text-dark">{formatRupiahShort(row.estimatedMrr)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type MetricCardProps = {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  unit?: string;
  color: 'blue' | 'purple' | 'cyan';
  isLoading?: boolean;
};

function MetricCard({ icon, title, value, unit, color, isLoading }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  };

  const iconColorClasses = {
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    cyan: 'text-cyan-600',
  };

  if (isLoading) {
    return (
      <div className={`rounded-xl border ${colorClasses[color]} p-5 shadow-sm`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 rounded bg-slate-300/50" />
          <div className="h-8 w-16 rounded bg-slate-300/50" />
          <div className="h-3 w-32 rounded bg-slate-300/50" />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${colorClasses[color]} p-5 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <div className="flex items-baseline gap-1">
            <p className="text-3xl font-bold text-dark">{value}</p>
            {unit && <span className="text-sm text-slate-600">{unit}</span>}
          </div>
        </div>
        <div className={`rounded-lg bg-white/50 p-3 ${iconColorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const chartColors = ['#136DAC', '#0EA5E9', '#7C3AED', '#F59E0B', '#10B981', '#EF4444'];
  const chartData = (metrics?.subscriptionsBySolution ?? []).map((item) => ({
    name: item.solutionName,
    subscriptions: item.count,
  }));

  const totalSolutions = metrics?.subscriptionsBySolution.length ?? 0;

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const data = await getDashboardMetrics();
        setMetrics(data);
      } catch (error: unknown) {
        const message = getApiErrorMessage(error);
        toast.error(`Gagal memuat metrik: ${message}`);
      } finally {
        setLoading(false);
      }
    };

    void fetchMetrics();
  }, []);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-dark">Dashboard</h1>
        <p className="text-slate-600">
          Ringkasan tenant dan performa langganan produk SaaS di control plane Goldenity.
        </p>
      </div>

      <BusinessOverview business={metrics?.business} loading={loading} />

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={<Building2 size={24} />}
          title="Total Tenants"
          value={metrics?.totalTenants ?? 0}
          unit="perusahaan"
          color="blue"
          isLoading={loading}
        />
        <MetricCard
          icon={<Layers3 size={24} />}
          title="Total Solutions"
          value={totalSolutions}
          unit="produk SaaS"
          color="purple"
          isLoading={loading}
        />
        <MetricCard
          icon={<Link2 size={24} />}
          title="Active Subscriptions"
          value={metrics?.activeSubscriptions ?? 0}
          unit="instance"
          color="cyan"
          isLoading={loading}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-dark">Subscriptions by Solution</h2>
          <p className="text-sm text-slate-600">Popularitas produk Goldenity berdasarkan jumlah tenant aktif berlangganan.</p>
        </div>

        {loading ? (
          <div className="h-[320px] animate-pulse rounded-lg bg-slate-100" />
        ) : chartData.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <BarChart3 size={32} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">Belum Ada Data Subscriptions</p>
            <p className="text-xs text-slate-500">Mulai buat subscription untuk tenant agar data muncul di chart ini.</p>
          </div>
        ) : (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0' }}
                  formatter={(value) => [`${Number(value ?? 0)} subscriptions`, 'Tenants']}
                />
                <Bar dataKey="subscriptions" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
