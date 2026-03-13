import httpClient from './httpClient';
import type { PaginationMeta } from './tenantApi';

export type CreateUserPayload = {
  tenantId: string;
  username: string;
  password: string;
  name: string;
  role?: 'TENANT_ADMIN';
};

export type UserListItem = {
  id: string;
  username?: string | null;
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
  const response = await httpClient.get('/users', { params });
  return {
    items: response.data.data as UserListItem[],
    meta: response.data.meta as PaginationMeta,
  };
}

export async function resetUserPassword(
  userId: string,
  newPassword: string,
): Promise<void> {
  await httpClient.patch(`/users/${userId}/reset-password`, { newPassword });
}
