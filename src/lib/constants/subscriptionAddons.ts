export type SubscriptionModuleKey = string;

export const TIER_DEFAULT_MODULES: Record<
  'Standard' | 'Professional' | 'Enterprise',
  SubscriptionModuleKey[]
> = {
  Standard: [
    'module_sales',
    'module_inventory',
    'module_customer_management',
  ],
  Professional: [
    'module_sales',
    'module_inventory',
    'module_customer_management',
    'module_finance_reports',
    'module_user_management',
    'module_debt_management',
    'module_role_management',
  ],
  Enterprise: [
    'module_sales',
    'module_inventory',
    'module_customer_management',
    'module_finance_reports',
    'module_user_management',
    'module_debt_management',
    'module_role_management',
    'module_service_orders',
    'module_custom_rbac',
    'module_sales_history',
    'module_procurement',
    'module_supplier_management',
    'module_expense_management',
    'module_tax_reports',
    'module_hardware_devices',
    'module_realtime_sync',
    'module_category_management',
    'module_receipt_printing',
    'module_service_receipt_printing',
  ],
};

const LEGACY_ADDON_TO_MODULE_MAP = {
  service_note: 'module_service_orders',
} as const;

const MODULE_TO_LEGACY_ADDON_MAP = {
  module_service_orders: 'service_note',
} as const;

export function mapLegacyAddonsToModules(addons: string[] | null | undefined): SubscriptionModuleKey[] {
  if (!Array.isArray(addons) || addons.length === 0) {
    return [];
  }

  const mapped: SubscriptionModuleKey[] = [];
  for (const addon of addons) {
    const moduleKey = LEGACY_ADDON_TO_MODULE_MAP[addon as keyof typeof LEGACY_ADDON_TO_MODULE_MAP];
    if (moduleKey) {
      mapped.push(moduleKey);
    }
  }

  return [...new Set(mapped)];
}

export function mapModulesToLegacyAddons(modules: SubscriptionModuleKey[]): string[] {
  if (modules.length === 0) {
    return [];
  }

  const mapped: string[] = [];
  for (const moduleKey of modules) {
    const addon = MODULE_TO_LEGACY_ADDON_MAP[moduleKey as keyof typeof MODULE_TO_LEGACY_ADDON_MAP];
    if (addon) {
      mapped.push(addon);
    }
  }

  return [...new Set(mapped)];
}
