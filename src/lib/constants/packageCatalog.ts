// Harga daftar per outlet per bulan (sudah termasuk PPN). Harus sama dengan
// goldenity-admin-core-backend/src/constants/packageCatalog.ts. Usulan harga K3, belum final.
export const POS_TIER_PACKAGES: Record<string, { label: string; monthlyPricePerOutlet: number | null }> = {
  Standard: { label: 'POS Standard', monthlyPricePerOutlet: 149_000 },
  Professional: { label: 'POS Pro', monthlyPricePerOutlet: 249_000 },
  Enterprise: { label: 'POS + Produksi', monthlyPricePerOutlet: 499_000 },
  Custom: { label: 'Custom', monthlyPricePerOutlet: null },
};

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

export function formatRupiahShort(value: number): string {
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (value >= 1_000) return `Rp${Math.round(value / 1_000).toLocaleString('id-ID')} rb`;
  return `Rp${value.toLocaleString('id-ID')}`;
}

export function tierOptionLabel(tier: string): string {
  const pkg = POS_TIER_PACKAGES[tier];
  if (!pkg) return tier;
  if (pkg.monthlyPricePerOutlet === null) return `${tier} (harga khusus)`;
  return `${tier} · ${pkg.label} · ${formatRupiahShort(pkg.monthlyPricePerOutlet)}/outlet`;
}
