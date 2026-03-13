import httpClient from './httpClient';

export type DashboardMetrics = {
  totalTenants: number;
  activeSubscriptions: number;
  subscriptionsBySolution: Array<{
    solutionId: string;
    solutionName: string;
    count: number;
  }>;
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
