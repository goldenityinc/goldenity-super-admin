import httpClient from './httpClient';
import type { PaginationMeta } from './tenantApi';

export type LeadStage = 'NEW' | 'CONTACTED' | 'INTERVIEW' | 'DEMO' | 'TRIAL' | 'WON' | 'LOST';

export const LEAD_STAGES: { value: LeadStage; label: string; tone: string }[] = [
  { value: 'NEW', label: 'Baru', tone: 'bg-slate-100 text-slate-700' },
  { value: 'CONTACTED', label: 'Dihubungi', tone: 'bg-sky-100 text-sky-700' },
  { value: 'INTERVIEW', label: 'Wawancara', tone: 'bg-indigo-100 text-indigo-700' },
  { value: 'DEMO', label: 'Demo', tone: 'bg-violet-100 text-violet-700' },
  { value: 'TRIAL', label: 'Coba 30 hari', tone: 'bg-amber-100 text-amber-800' },
  { value: 'WON', label: 'Bayar', tone: 'bg-emerald-100 text-emerald-700' },
  { value: 'LOST', label: 'Batal', tone: 'bg-rose-100 text-rose-700' },
];

export const LEAD_SEGMENTS: { value: string; label: string }[] = [
  { value: 'BAKERY', label: 'Bakery & toko kue' },
  { value: 'OLEH_OLEH', label: 'Oleh-oleh' },
  { value: 'CATERING', label: 'Katering' },
  { value: 'FLORIST', label: 'Florist' },
  { value: 'FROZEN_FOOD', label: 'Frozen food' },
  { value: 'CAFE', label: 'Kafe' },
  { value: 'HOSPITAL', label: 'Rumah sakit (virtual tour)' },
  { value: 'OTHER', label: 'Lainnya' },
];

export const LEAD_SOURCES: { value: string; label: string }[] = [
  { value: 'MAPS', label: 'Google/Bing Maps' },
  { value: 'THREADS', label: 'Threads' },
  { value: 'INSTAGRAM', label: 'Instagram/TikTok' },
  { value: 'WHATSAPP', label: 'WhatsApp masuk' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'REFERRAL', label: 'Rujukan' },
  { value: 'VISIT', label: 'Kunjungan' },
  { value: 'PARTNER', label: 'Mitra' },
  { value: 'OTHER', label: 'Lainnya' },
];

export function stageLabel(stage: string): string {
  return LEAD_STAGES.find((item) => item.value === stage)?.label ?? stage;
}

export function stageTone(stage: string): string {
  return LEAD_STAGES.find((item) => item.value === stage)?.tone ?? 'bg-slate-100 text-slate-700';
}

export function segmentLabel(segment: string): string {
  return LEAD_SEGMENTS.find((item) => item.value === segment)?.label ?? segment;
}

export type Lead = {
  id: string;
  name: string;
  segment: string;
  stage: LeadStage;
  tier?: string | null;
  score?: number | null;
  area?: string | null;
  address?: string | null;
  phone?: string | null;
  instagram?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  outletCount?: number | null;
  source?: string | null;
  mapsUrl?: string | null;
  notes?: string | null;
  lostReason?: string | null;
  nextFollowUpAt?: string | null;
  lastContactedAt?: string | null;
  tenantId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadInput = {
  name: string;
  segment: string;
  stage?: LeadStage;
  tier?: string | null;
  score?: number | null;
  area?: string | null;
  address?: string | null;
  phone?: string | null;
  instagram?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  outletCount?: number | null;
  source?: string | null;
  mapsUrl?: string | null;
  notes?: string | null;
  lostReason?: string | null;
  nextFollowUpAt?: string | null;
  lastContactedAt?: string | null;
  tenantId?: string | null;
};

export type LeadSummary = {
  total: number;
  newThisWeek: number;
  dueFollowUps: number;
  byStage: { stage: LeadStage; count: number }[];
  bySegment: { segment: string; count: number }[];
};

export type LeadImportResult = {
  received: number;
  created: number;
  skippedExisting: number;
  duplicatesInFile: number;
};

export async function listLeads(params: {
  page: number;
  limit: number;
  stage?: LeadStage;
  segment?: string;
  tier?: string;
  search?: string;
  dueOnly?: boolean;
}): Promise<{ items: Lead[]; meta: PaginationMeta }> {
  const response = await httpClient.get('/leads', { params });
  return {
    items: (response.data.data ?? []) as Lead[],
    meta: response.data.meta as PaginationMeta,
  };
}

export async function getLeadSummary(): Promise<LeadSummary> {
  const response = await httpClient.get('/leads/summary');
  return response.data.data as LeadSummary;
}

export async function createLead(payload: LeadInput): Promise<Lead> {
  const response = await httpClient.post('/leads', payload);
  return response.data.data as Lead;
}

export async function updateLead(id: string, payload: Partial<LeadInput>): Promise<Lead> {
  const response = await httpClient.patch(`/leads/${id}`, payload);
  return response.data.data as Lead;
}

export async function deleteLead(id: string): Promise<void> {
  await httpClient.delete(`/leads/${id}`);
}

export async function importLeads(leads: LeadInput[]): Promise<LeadImportResult> {
  const response = await httpClient.post('/leads/import', { leads }, { timeout: 60000 });
  return response.data.data as LeadImportResult;
}
