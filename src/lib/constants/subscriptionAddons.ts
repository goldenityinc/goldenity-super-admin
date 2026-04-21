export type SubscriptionModuleKey = string;

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
