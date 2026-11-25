import type { BusinessCategory } from '../api/tenantApi';

export type { BusinessCategory };

// Harus sama dengan enum BusinessCategory di goldenity-admin-core-backend.
export const BUSINESS_CATEGORY_OPTIONS: { value: BusinessCategory; label: string }[] = [
  { value: 'RETAIL_FNB', label: 'Retail & F&B' },
  { value: 'BAKERY', label: 'Bakery, toko kue & oleh-oleh' },
  { value: 'CATERING', label: 'Katering' },
  { value: 'FLORIST', label: 'Florist & toko bunga' },
  { value: 'FROZEN_FOOD', label: 'Frozen food & makanan olahan' },
  { value: 'SERVICES_AUTOMOTIVE', label: 'Jasa & Bengkel' },
  { value: 'GENERAL', label: 'Umum' },
];

export function getBusinessCategoryLabel(value: string | null | undefined): string {
  return BUSINESS_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value ?? '-';
}

/** Segmen lead → kategori tenant saat lead dijadikan tenant. */
export function businessCategoryFromLeadSegment(segment: string | null | undefined): BusinessCategory {
  switch ((segment ?? '').toUpperCase()) {
    case 'BAKERY':
    case 'OLEH_OLEH':
      return 'BAKERY';
    case 'CATERING':
      return 'CATERING';
    case 'FLORIST':
      return 'FLORIST';
    case 'FROZEN_FOOD':
      return 'FROZEN_FOOD';
    default:
      return 'RETAIL_FNB';
  }
}
