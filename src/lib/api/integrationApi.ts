import httpClient from './httpClient';

export type ErpFeatureDefinition = {
  key: string;
  label: string;
  description?: string;
};

export async function getErpFeatureCatalog(): Promise<ErpFeatureDefinition[]> {
  const response = await httpClient.get('/integrations/erp/features');
  const features = response.data?.data?.features;
  return Array.isArray(features) ? (features as ErpFeatureDefinition[]) : [];
}

export async function provisionErp(input: {
  tenantId: string;
  organizationId?: string;
  organizationName?: string;
  features?: string[];
}): Promise<unknown> {
  const response = await httpClient.post('/integrations/erp/provision', input);
  return response.data?.data;
}
