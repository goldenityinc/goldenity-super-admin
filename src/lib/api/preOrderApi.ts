import httpClient from './httpClient';
import type { PaginationMeta } from './tenantApi';

export type PreOrderStatus = 'PENDING_DP' | 'PROCESSING' | 'READY' | 'COMPLETED' | string;

export type PreOrderSalesItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  itemNote?: string | null;
};

export type PreOrder = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  dpAmount: number;
  pickupDate?: string | null;
  status: PreOrderStatus;
  salesItems: PreOrderSalesItem[];
  raw: Record<string, unknown>;
};

type ApiListPayload = {
  data?: unknown;
  items?: unknown;
  meta?: unknown;
};

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function toStringValue(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return fallback;
}

function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[,_\s]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  return [];
}

function normalizeSalesItem(value: unknown, index: number): PreOrderSalesItem {
  const row = toRecord(value);

  const quantity = toNumberValue(row.qty ?? row.quantity ?? row.item_qty, 0);
  const unitPrice = toNumberValue(row.unit_price ?? row.unitPrice ?? row.price, 0);
  const subtotal = toNumberValue(row.subtotal ?? row.line_total ?? quantity * unitPrice, quantity * unitPrice);

  return {
    id: toStringValue(row.id ?? row.item_id ?? row.product_id, `row-${index + 1}`),
    productName: toStringValue(row.product_name ?? row.productName ?? row.item_name ?? row.name, '-'),
    quantity,
    unitPrice,
    subtotal,
    itemNote: toStringValue(row.item_note ?? row.itemNote ?? row.note, '') || null,
  };
}

function normalizePreOrder(value: unknown): PreOrder {
  const row = toRecord(value);
  const customer = toRecord(row.customer);

  return {
    id: toStringValue(row.id),
    invoiceNumber: toStringValue(
      row.invoice_number ?? row.invoiceNumber ?? row.invoice ?? row.order_code ?? row.code,
      '-'
    ),
    customerName: toStringValue(
      row.customer_name ?? row.customerName ?? row.member_name ?? row.memberName ?? customer.name,
      '-'
    ),
    totalAmount: toNumberValue(
      row.total_amount ?? row.totalAmount ?? row.total_order ?? row.totalOrder ?? row.total,
      0
    ),
    dpAmount: toNumberValue(
      row.dp_amount ?? row.dpAmount ?? row.down_payment ?? row.downPayment ?? row.dp,
      0
    ),
    pickupDate: toStringValue(row.pickup_date ?? row.pickupDate ?? row.pickup_at ?? row.pickupAt, '') || null,
    status: toStringValue(row.status, 'PENDING_DP'),
    salesItems: toArray(row.sales_items ?? row.salesItems).map(normalizeSalesItem),
    raw: row,
  };
}

function extractListData(payload: unknown): { items: unknown[]; meta: PaginationMeta } {
  const body = toRecord(payload) as ApiListPayload;

  const dataNode = body.data;
  const dataRecord = toRecord(dataNode);

  const itemsSource = Array.isArray(dataNode)
    ? dataNode
    : toArray(dataRecord.items ?? body.items ?? dataRecord.data);

  const metaNode = body.meta ?? dataRecord.meta;
  const metaRecord = toRecord(metaNode);

  return {
    items: itemsSource,
    meta: {
      page: toNumberValue(metaRecord.page, 1),
      limit: toNumberValue(metaRecord.limit, 10),
      total: toNumberValue(metaRecord.total, itemsSource.length),
      totalPages: toNumberValue(metaRecord.totalPages ?? metaRecord.total_pages, 1),
    },
  };
}

export async function listPreOrders(params: {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}): Promise<{ items: PreOrder[]; meta: PaginationMeta }> {
  const response = await httpClient.get('/v1/sales/pre-orders', { params });
  const parsed = extractListData(response.data);

  return {
    items: parsed.items.map(normalizePreOrder),
    meta: parsed.meta,
  };
}

export async function getPreOrderDetail(id: string): Promise<PreOrder> {
  const response = await httpClient.get(`/v1/sales/pre-orders/${encodeURIComponent(id)}`);
  const body = toRecord(response.data);
  return normalizePreOrder(body.data ?? body);
}
