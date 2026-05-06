export type RoleModule = {
  key: string;
  label: string;
};

export const ROLE_MODULES: RoleModule[] = [
  { key: 'dashboard', label: 'Dasbor' },
  { key: 'sales', label: 'Penjualan' },
  { key: 'cash_advance', label: 'Kas Bon' },
  { key: 'inventory', label: 'Inventaris' },
  { key: 'shopping_list', label: 'Daftar Belanja' },
  { key: 'history', label: 'Riwayat' },
  { key: 'customer_data', label: 'Data Pelanggan' },
  { key: 'financial_report', label: 'Laporan Keuangan' },
  { key: 'shift_report', label: 'Laporan Shift' },
  { key: 'expenses', label: 'Pengeluaran' },
  { key: 'supplier_data', label: 'Data Supplier' },
  { key: 'settings', label: 'Pengaturan' },
  { key: 'user_management', label: 'Manajemen User' },
  { key: 'tax_report', label: 'Laporan Pajak' },
  { key: 'category_management', label: 'Manajemen Kategori' },
  { key: 'role_management', label: 'Manajemen Role' },
  { key: 'service_repair', label: 'Servis & Perbaikan' },
];

export type RolePermissions = Record<string, boolean>;

export function createDefaultRolePermissions(): RolePermissions {
  return ROLE_MODULES.reduce<RolePermissions>((acc, moduleItem) => {
    acc[moduleItem.key] = true;
    return acc;
  }, {});
}
