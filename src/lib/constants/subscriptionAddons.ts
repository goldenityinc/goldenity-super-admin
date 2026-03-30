export const SUBSCRIPTION_ADDONS = [
  {
    key: 'service_note',
    label: 'Nota Servis',
    description: 'Aktifkan modul pencatatan dan manajemen nota servis.',
  },
] as const;

export type SubscriptionAddonKey = (typeof SUBSCRIPTION_ADDONS)[number]['key'];
