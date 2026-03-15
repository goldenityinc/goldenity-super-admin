import httpClient from './httpClient';
import type { PaginationMeta } from './tenantApi';

export type CreateUserPayload = {
  tenantId: string;
  username?: string;
  email?: string;
  password: string;
  name: string;
  role?: 'TENANT_ADMIN';
};

export type UserListItem = {
  id: string;
  username?: string | null;
  email?: string | null;
  name: string;
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'CRM_MANAGER' | 'CRM_STAFF' | 'READ_ONLY';
  tenantId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
};

export async function createUser(payload: CreateUserPayload): Promise<UserListItem> {
  const response = await httpClient.post('/users', payload);
  return response.data.data as UserListItem;
}

export async function listUsers(params: {
  page: number;
  limit: number;
  search?: string;
  tenantId?: string;
}): Promise<{ items: UserListItem[]; meta: PaginationMeta }> {
  const response = await httpClient.get('/users', {
    params: {
      ...params,
      // Backward-compatible alias if backend expects snake_case.
      tenant_id: params.tenantId,
    },
  });

  const payload = response.data as {
    data?: unknown;
    items?: unknown;
    meta?: PaginationMeta;
  };

  const items = Array.isArray(payload.data)
    ? (payload.data as UserListItem[])
    : Array.isArray(payload.items)
      ? (payload.items as UserListItem[])
      : [];

  return {
    items,
    meta: payload.meta ?? {
      page: params.page,
      limit: params.limit,
      total: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / params.limit)),
    },
  };
}

export async function resetUserPassword(
  userId: string,
  newPassword: string,
): Promise<void> {
  await httpClient.patch(`/users/${userId}/reset-password`, { newPassword });
}

export async function toggleUserActive(
  userId: string,
  isActive: boolean,
): Promise<UserListItem> {
  const response = await httpClient.patch(`/users/${userId}/status`, { isActive });
  return response.data.data as UserListItem;
}

export async function deleteUser(userId: string): Promise<void> {
  await httpClient.delete(`/users/${userId}`);
}
