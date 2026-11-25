import httpClient from './httpClient';

export type DashboardAttentionItem = {
  appInstanceId: string;
  tenantId: string;
  tenantName: string;
  solutionName: string;
  packageLabel: string;
  endDate: string | null;
  reason: 'EXPIRED' | 'EXPIRING_SOON';
};

export type DashboardBusinessMetrics = {
  activePaidOutlets: number;
  activePayingTenants: number;
  estimatedMrr: number;
  customSubscriptions: number;
  packageBreakdown: Array<{ packageLabel: string; subscriptions: number; outlets: number; estimatedMrr: number }>;
  expiringSoonCount: number;
  expiredButActiveCount: number;
  attention: DashboardAttentionItem[];
  payments: {
    periodMonth: number;
    periodYear: number;
    paidAmount: number;
    unpaidCount: number;
    unpaidAmount: number;
  };
  leads: {
    total: number;
    newThisWeek: number;
    dueFollowUps: number;
    byStage: Array<{ stage: string; count: number }>;
  };
};

export type DashboardMetrics = {
  totalTenants: number;
  activeSubscriptions: number;
  subscriptionsBySolution: Array<{
    solutionId: string;
    solutionName: string;
    count: number;
  }>;
  /** Tidak ada jika backend belum diperbarui. */
  business?: DashboardBusinessMetrics;
};

/**
 * Fetch dashboard metrics from backend
 * GET /api/dashboard/metrics
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const response = await httpClient.get<{ success: boolean; data: DashboardMetrics }>(
    '/dashboard/metrics'
  );
  return response.data.data;
}
