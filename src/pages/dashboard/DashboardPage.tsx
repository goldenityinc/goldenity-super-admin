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
import { getDashboardMetrics, type DashboardMetrics } from '../../lib/api/dashboardApi';
import { getApiErrorMessage } from '../../lib/utils/apiError';
import { toast } from 'sonner';

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
