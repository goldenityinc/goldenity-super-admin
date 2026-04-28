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
};

export type UpdateTenantPayload = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive?: boolean;
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
  logoUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TenantBranch = {
  id: string;
  tenantId: string;
  name: string;
  branchCode?: string | null;
  address?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTenantBranchPayload = {
  name: string;
  branchCode?: string;
  address?: string;
  phone?: string;
};

export type UpdateTenantBranchPayload = {
  branchCode?: string | null;
  address?: string | null;
  phone?: string | null;
};

export async function createTenant(
  payload: CreateTenantPayload
): Promise<{ tenant: Tenant; firstAdmin: TenantFirstAdminCredential | null }> {
  const response = await httpClient.post('/tenants', payload);
  return {
    tenant: response.data.data as Tenant,
    firstAdmin: (response.data.firstAdmin ?? null) as TenantFirstAdminCredential | null,
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

export async function uploadTenantLogo(tenantId: string, file: File): Promise<{ tenantId: string; logoUrl: string }> {
  const form = new FormData();
  form.append('file', file);

  const response = await httpClient.post(`/tenants/${encodeURIComponent(tenantId)}/logo`, form, {
    headers: { 'content-type': 'multipart/form-data' },
  });

  return response.data?.data as { tenantId: string; logoUrl: string };
}

export async function updateTenant(tenantId: string, payload: UpdateTenantPayload): Promise<Tenant> {
  const response = await httpClient.put(`/tenants/${encodeURIComponent(tenantId)}`, payload);
  return response.data?.data as Tenant;
}

export async function listTenantBranches(tenantId: string): Promise<TenantBranch[]> {
  const response = await httpClient.get(`/tenants/${encodeURIComponent(tenantId)}/branches`);
  return response.data?.data as TenantBranch[];
}

export async function createTenantBranch(tenantId: string, payload: CreateTenantBranchPayload): Promise<TenantBranch> {
  const response = await httpClient.post(`/tenants/${encodeURIComponent(tenantId)}/branches`, payload);
  return response.data?.data as TenantBranch;
}

export async function updateTenantBranch(
  tenantId: string,
  branchId: string,
  payload: UpdateTenantBranchPayload
): Promise<TenantBranch> {
  const response = await httpClient.put(
    `/tenants/${encodeURIComponent(tenantId)}/branches/${encodeURIComponent(branchId)}`,
    payload
  );
  return response.data?.data as TenantBranch;
}

export async function deleteTenantBranch(tenantId: string, branchId: string): Promise<void> {
  await httpClient.delete(`/tenants/${encodeURIComponent(tenantId)}/branches/${encodeURIComponent(branchId)}`);
}
