import httpClient from './httpClient';

export type BusinessCategory = 'GENERAL' | 'RETAIL_FNB' | 'SERVICES_AUTOMOTIVE';

export type TaxSettings = {
  enabled?: boolean | null;
  includeTaxInPrice?: boolean | null;
  rate?: number | null;
  name?: string | null;
  taxId?: string | null;
  raw?: Record<string, unknown>;
};

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
  firstBranchName?: string;
  address?: string;
  businessCategory?: BusinessCategory;
  taxSettings?: TaxSettings | null;
};

export type UpdateTenantPayload = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  businessCategory?: BusinessCategory;
  taxSettings?: TaxSettings | null;
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
  businessCategory?: BusinessCategory;
  taxSettings?: TaxSettings | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type RawTenant = Tenant & {
  business_category?: BusinessCategory;
  tax_settings?: TaxSettings | null;
};

function normalizeTenant(raw: RawTenant): Tenant {
  return {
    ...raw,
    businessCategory: raw.businessCategory ?? raw.business_category,
    taxSettings: raw.taxSettings ?? raw.tax_settings ?? null,
  };
}

export type TenantBranch = {
  id: string;
  tenantId: string;
  name: string;
  branchCode?: string | null;
  address?: string | null;
  phone?: string | null;
  isMainBranch?: boolean;
  isBlindCloseEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateTenantBranchPayload = {
  name: string;
  branchCode?: string;
  address?: string;
  phone?: string;
  isMainBranch?: boolean;
  isBlindCloseEnabled?: boolean;
};

export type UpdateTenantBranchPayload = {
  branchCode?: string | null;
  address?: string | null;
  phone?: string | null;
  isMainBranch?: boolean;
  isBlindCloseEnabled?: boolean;
};

export async function createTenant(
  payload: CreateTenantPayload
): Promise<{ tenant: Tenant; firstAdmin: TenantFirstAdminCredential | null }> {
  const response = await httpClient.post('/tenants', {
    ...payload,
    ...(payload.businessCategory ? { businessCategory: payload.businessCategory } : {}),
    ...(payload.taxSettings !== undefined ? { taxSettings: payload.taxSettings } : {}),
  });
  return {
    tenant: normalizeTenant(response.data.data as RawTenant),
    firstAdmin: (response.data.firstAdmin ?? null) as TenantFirstAdminCredential | null,
  };
}

export async function listTenants(params: {
  page: number;
  limit: number;
  search?: string;
}): Promise<{ items: Tenant[]; meta: PaginationMeta }> {
  try {
    const response = await httpClient.get('/tenants', { params });
    return {
      items: ((response.data.data ?? []) as RawTenant[]).map((item) => normalizeTenant(item)),
      meta: response.data.meta as PaginationMeta,
    };
  } catch (error) {
    console.error('GET /tenants failed', {
      params,
      error,
      response: (error as any)?.response?.data,
      status: (error as any)?.response?.status,
    });
    throw error;
  }
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
  const response = await httpClient.put(`/tenants/${encodeURIComponent(tenantId)}`, {
    ...payload,
    ...(payload.businessCategory ? { businessCategory: payload.businessCategory } : {}),
    ...(payload.taxSettings !== undefined ? { taxSettings: payload.taxSettings } : {}),
  });
  return normalizeTenant(response.data?.data as RawTenant);
}

export async function listTenantBranches(tenantId: string): Promise<TenantBranch[]> {
  const response = await httpClient.get(`/tenants/${encodeURIComponent(tenantId)}/branches`);

  const payload = response.data?.data ?? response.data;

  if (Array.isArray(payload)) {
    return payload as TenantBranch[];
  }

  if (Array.isArray(payload?.branches)) {
    return payload.branches as TenantBranch[];
  }

  if (Array.isArray(payload?.items)) {
    return payload.items as TenantBranch[];
  }

  return [];
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
