import httpClient from './httpClient';
import type { PaginationMeta } from './tenantApi';

export type Solution = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function listSolutions(params: {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
}): Promise<{ items: Solution[]; meta: PaginationMeta }> {
  const response = await httpClient.get('/solutions', { params });

  return {
    items: response.data.data as Solution[],
    meta: response.data.meta as PaginationMeta,
  };
}
