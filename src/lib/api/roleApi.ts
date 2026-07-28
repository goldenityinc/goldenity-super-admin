import httpClient from './httpClient';

export type RolePermissions = Record<string, boolean>;

export type Role = {
  id: string;
  name: string;
  description?: string | null;
  permissions: RolePermissions;
  createdAt?: string;
  updatedAt?: string;
};

export type UpsertRolePayload = {
  name: string;
  description?: string;
  permissions: RolePermissions;
};

export async function listRoles(params?: { tenantId?: string }): Promise<Role[]> {
  const response = await httpClient.get('/roles', {
    params: params?.tenantId ? { tenantId: params.tenantId } : undefined,
  });
  const payload = response.data as { data?: unknown; items?: unknown };

  if (Array.isArray(payload.data)) {
    return payload.data as Role[];
  }

  if (Array.isArray(payload.items)) {
    return payload.items as Role[];
  }

  return [];
}

export async function createRole(payload: UpsertRolePayload, params?: { tenantId?: string }): Promise<Role> {
  const response = await httpClient.post('/roles', {
    ...payload,
    ...(params?.tenantId ? { tenantId: params.tenantId } : {}),
  });
  return response.data.data as Role;
}

export async function updateRole(
  roleId: string,
  payload: UpsertRolePayload,
  params?: { tenantId?: string }
): Promise<Role> {
  const response = await httpClient.put(`/roles/${encodeURIComponent(roleId)}`, {
    ...payload,
    ...(params?.tenantId ? { tenantId: params.tenantId } : {}),
  });
  return response.data.data as Role;
}
