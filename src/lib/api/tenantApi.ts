import httpClient from './httpClient';

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CreateTenantPayload = {
  name: string;
  slug?: string;
  email?: string;
  phone?: string;
  address?: string;
  adminEmail: string;
  adminPassword: string;
};

export type TenantFirstAdminCredential = {
  id: string;
  email: string;
  role: string;
  password: string;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function createTenant(
  payload: CreateTenantPayload
): Promise<{ tenant: Tenant; firstAdmin: TenantFirstAdminCredential }> {
  const response = await httpClient.post('/tenants', payload);
  return {
    tenant: response.data.data as Tenant,
    firstAdmin: response.data.firstAdmin as TenantFirstAdminCredential,
  };
}

export async function listTenants(params: {
  page: number;
  limit: number;
  search?: string;
}): Promise<{ items: Tenant[]; meta: PaginationMeta }> {
  const response = await httpClient.get('/tenants', { params });
  return {
    items: response.data.data as Tenant[],
    meta: response.data.meta as PaginationMeta,
  };
}
