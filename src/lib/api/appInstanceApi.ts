import httpClient from './httpClient';
import type { PaginationMeta } from './tenantApi';
import { mapModulesToLegacyAddons, type SubscriptionModuleKey } from '../constants/subscriptionAddons';

export type SubscriptionTier = 'Standard' | 'Professional' | 'Enterprise' | 'Custom';
export type AppInstanceStatus = 'ACTIVE' | 'SUSPENDED';
export type SyncMode = 'CLOUD_FIRST' | 'LOCAL_FIRST' | 'LOCAL_SERVER';

export type AppInstance = {
  id: string;
  tenantId: string;
  solutionId: string;
  tier: SubscriptionTier;
  addons: string[];
  moduleKeys?: string[];
  syncMode: SyncMode;
  status: AppInstanceStatus;
  dbConnectionString?: string | null;
  appUrl?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  solution: {
    id: string;
    name: string;
    code: string;
  };
};

export type CreateAppInstancePayload = {
  tenantId: string;
  solutionId: string;
  tier: SubscriptionTier;
  moduleKeys?: SubscriptionModuleKey[];
  addons?: string[];
  syncMode?: SyncMode;
  status?: AppInstanceStatus;
  dbConnectionString?: string | null;
  appUrl?: string | null;
  endDate?: string | null;
};

export type UpdateAppInstancePayload = {
  tier?: SubscriptionTier;
  moduleKeys?: SubscriptionModuleKey[];
  addons?: string[];
  syncMode?: SyncMode;
  status?: AppInstanceStatus;
  dbConnectionString?: string | null;
  appUrl?: string | null;
  endDate?: string | null;
};

export async function listAppInstances(params: {
  page: number;
  limit: number;
  tenantId?: string;
  solutionId?: string;
  status?: AppInstanceStatus;
  tier?: SubscriptionTier;
}): Promise<{ items: AppInstance[]; meta: PaginationMeta }> {
  const response = await httpClient.get('/app-instances', { params });

  return {
    items: response.data.data as AppInstance[],
    meta: response.data.meta as PaginationMeta,
  };
}

export async function createAppInstance(payload: CreateAppInstancePayload): Promise<AppInstance> {
  const response = await httpClient.post('/app-instances', {
    ...payload,
    addons: payload.addons ?? mapModulesToLegacyAddons(payload.moduleKeys ?? []),
  });
  return response.data.data as AppInstance;
}

export async function updateAppInstance(
  id: string,
  payload: UpdateAppInstancePayload
): Promise<AppInstance> {
  const response = await httpClient.put(`/app-instances/${id}`, {
    ...payload,
    addons: payload.addons ?? mapModulesToLegacyAddons(payload.moduleKeys ?? []),
  });
  return response.data.data as AppInstance;
}

export async function updateSubscriptionTier(
  id: string,
  tier: SubscriptionTier
): Promise<AppInstance> {
  const response = await httpClient.patch(`/app-instances/${id}`, { tier });
  return response.data.data as AppInstance;
}

export async function deleteAppInstance(id: string): Promise<void> {
  await httpClient.delete(`/app-instances/${id}`);
}
