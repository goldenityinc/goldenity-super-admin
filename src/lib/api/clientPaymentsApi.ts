import httpClient from './httpClient';

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type Product = {
  id: string;
  name: string;
  defaultPrice: number;
};

export type CellPayment = {
  status: 'Paid' | 'Not Paid';
  amountIDR: number;
  receiptImages: string[];
  notes?: string;
};

export function matrixKey(params: {
  clientId: string;
  productId: string;
  periodMonth: number;
  periodYear: number;
}): string {
  const { clientId, productId, periodMonth, periodYear } = params;
  return `${clientId}:${productId}:${periodMonth}:${periodYear}`;
}

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

function normalizePaymentStatus(value: unknown): 'Paid' | 'Not Paid' {
  const str = toStringValue(value);
  if (str === 'Paid' || str === 'PAID' || str === 'paid') {
    return 'Paid';
  }
  return 'Not Paid';
}

function mapToApiPaymentStatus(status: 'Paid' | 'Not Paid'): 'Paid' | 'NotPaid' {
  return status === 'Paid' ? 'Paid' : 'NotPaid';
}

function normalizeReceiptImages(value: unknown): string[] {
  const arr = toArray(value);
  return arr
    .map((item) => {
      const row = toRecord(item);
      const url = toStringValue(
        row.url ?? row.file_url ?? row.image_url ?? row.attachment_url ?? row.path ?? row.receipt_url
      );
      return typeof item === 'string' ? item : url;
    })
    .filter(Boolean);
}

function extractListItems(payload: unknown): unknown[] {
  const body = toRecord(payload);
  const dataNode = body.data;
  if (Array.isArray(dataNode)) {
    return dataNode;
  }
  const dataRecord = toRecord(dataNode);
  return toArray(dataRecord.items ?? body.items ?? dataRecord.data);
}

function normalizeClient(value: unknown): Client {
  const row = toRecord(value);
  return {
    id: toStringValue(row.id ?? row.customer_id ?? row.client_id),
    name: toStringValue(row.name ?? row.customer_name ?? row.client_name ?? row.full_name, '-'),
    email: toStringValue(row.email ?? row.customer_email ?? row.client_email, ''),
    phone: toStringValue(row.phone ?? row.phone_number ?? row.mobile ?? row.contact ?? row.whatsapp ?? row.wa, ''),
  };
}

function normalizeProduct(value: unknown): Product {
  const row = toRecord(value);
  return {
    id: toStringValue(row.id ?? row.product_id),
    name: toStringValue(row.name ?? row.product_name ?? row.title, '-'),
    defaultPrice: toNumberValue(
      row.default_price ?? row.defaultPrice ?? row.price ?? row.unit_price ?? row.selling_price ?? row.base_price,
      0
    ),
  };
}

export async function listClientsAndProducts(params?: { tenantId?: string }): Promise<{
  clients: Client[];
  products: Product[];
}> {
  const queryParams = params?.tenantId ? { tenantId: params.tenantId, limit: 200 } : { limit: 200 };
  const [productsResponse, clientsResponse] = await Promise.all([
    httpClient.get('/v1/products', { params: queryParams }),
    httpClient.get('/v1/sales/customers', { params: queryParams }),
  ]);

  const productItems = extractListItems(productsResponse.data);
  const clientItems = extractListItems(clientsResponse.data);

  return {
    clients: clientItems.map(normalizeClient),
    products: productItems.map(normalizeProduct),
  };
}

export async function getMatrix(
  year: number,
  productId: string,
  params?: { tenantId?: string }
): Promise<{
  matrix: Record<string, CellPayment>;
  clients: string[];
  months: number[];
  references: { clients: Client[]; products: Product[] };
}> {
  const queryParams: any = { year, productId };
  if (params?.tenantId) queryParams.tenantId = params.tenantId;
  const response = await httpClient.get('/v1/client-payments/matrix', {
    params: queryParams,
  });
  const body = toRecord(response.data);
  const data = toRecord(body.data ?? body);
  const rawReferences = toRecord(body.references ?? data.references);

  const rawMatrix = toRecord(data.matrix ?? data.cells ?? data.payments);
  const matrix: Record<string, CellPayment> = {};

  for (const key of Object.keys(rawMatrix)) {
    const raw = toRecord(rawMatrix[key]);
    if (Object.keys(raw).length === 0 && typeof rawMatrix[key] !== 'object') {
      continue;
    }
    matrix[key] = {
      status: normalizePaymentStatus(raw.status ?? raw.payment_status),
      amountIDR: toNumberValue(raw.amountIDR ?? raw.amount ?? raw.amount_idr ?? raw.total, 0),
      receiptImages: normalizeReceiptImages(
        raw.receiptImages ?? raw.receipt_images ?? raw.receipts ?? raw.attachments ?? raw.files ?? raw.images
      ),
      notes: toStringValue(raw.notes ?? raw.note ?? raw.description, '') || undefined,
    };
  }

  const flatRecords = toArray(data);
  if (flatRecords.length > 0 && Object.keys(matrix).length === 0) {
    for (const item of flatRecords) {
      const row = toRecord(item);
      const rawStatus = row.status ?? row.payment_status;
      const clientId = toStringValue(row.client_id ?? row.clientId ?? row.customer_id ?? row.customerId);
      const productId = toStringValue(row.product_id ?? row.productId ?? row.item_id ?? row.itemId);
      const periodMonth = toNumberValue(row.period_month ?? row.periodMonth ?? row.month, 0);
      const periodYear = toNumberValue(row.period_year ?? row.periodYear ?? row.year, 0);
      if (!clientId || !productId || periodMonth <= 0 || periodYear <= 0) continue;
      const key = matrixKey({ clientId, productId, periodMonth, periodYear });
      if (matrix[key]) continue;
      matrix[key] = {
        status: normalizePaymentStatus(rawStatus),
        amountIDR: toNumberValue(row.amountIDR ?? row.amount ?? row.amount_idr ?? row.total, 0),
        receiptImages: normalizeReceiptImages(
          row.receiptImages ?? row.receipt_images ?? row.receipts ?? row.attachments ?? row.files ?? row.images
        ),
        notes: toStringValue(row.notes ?? row.note ?? row.description, '') || undefined,
      };
    }
  }

  const clients = toArray(data.clients ?? data.clientIds ?? data.customerIds).map((c) => toStringValue(c));
  const months = toArray(data.months ?? data.periodMonths).map((m) => toNumberValue(m, 0)).filter((m) => m > 0);

  const rawRefClients = toArray(rawReferences.clients ?? rawReferences.customers);
  const rawRefProducts = toArray(rawReferences.products ?? rawReferences.items);

  return {
    matrix,
    clients,
    months,
    references: {
      clients: rawRefClients.map(normalizeClient),
      products: rawRefProducts.map(normalizeProduct),
    },
  };
}

type UpsertCellPayload = {
  clientId: string;
  productId: string;
  periodMonth: number;
  periodYear: number;
  status: 'Paid' | 'Not Paid';
  amountIDR: number;
  receiptImages: string[];
  receiptFiles?: File[];
  notes?: string;
  tenantId?: string;
};

export async function upsertCell(payload: UpsertCellPayload): Promise<CellPayment> {
  const remoteReceiptUrls = (payload.receiptImages ?? []).filter(
    (url) => typeof url === 'string' && !url.startsWith('blob:') && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('/'))
  );
  const files = Array.isArray(payload.receiptFiles) ? payload.receiptFiles.filter((f) => f instanceof File) : [];

  const hasFiles = files.length > 0;

  let response;

  const queryParams: Record<string, string> = {};
  if (payload.tenantId) queryParams.tenantId = payload.tenantId;

  if (hasFiles) {
    const fd = new FormData();
    fd.append('client_id', payload.clientId);
    fd.append('product_id', payload.productId);
    fd.append('period_month', String(payload.periodMonth));
    fd.append('period_year', String(payload.periodYear));
    fd.append('payment_status', mapToApiPaymentStatus(payload.status));
    fd.append('amount', String(payload.amountIDR));
    fd.append('receipt_images', JSON.stringify(remoteReceiptUrls));
    if (payload.tenantId) fd.append('tenantId', payload.tenantId);
    if (payload.notes !== undefined && payload.notes !== null) {
      fd.append('notes', String(payload.notes));
    } else {
      fd.append('notes', '');
    }
    files.forEach((file) => {
      fd.append('receipt_images', file);
    });

    response = await httpClient.put('/v1/client-payments/cell', fd, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
  } else {
    const body = {
      client_id: payload.clientId,
      product_id: payload.productId,
      period_month: payload.periodMonth,
      period_year: payload.periodYear,
      payment_status: mapToApiPaymentStatus(payload.status),
      amount: payload.amountIDR,
      receipt_images: remoteReceiptUrls,
      notes: payload.notes ?? null,
      ...(payload.tenantId ? { tenantId: payload.tenantId } : {}),
    };
    response = await httpClient.put('/v1/client-payments/cell', body, {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
  }

  const respBody = toRecord(response.data);
  const data = toRecord(respBody.data ?? respBody);

  return {
    status: normalizePaymentStatus(data.status ?? data.payment_status ?? payload.status),
    amountIDR: toNumberValue(
      data.amountIDR ?? data.amount ?? data.amount_idr ?? data.total ?? payload.amountIDR,
      payload.amountIDR
    ),
    receiptImages: normalizeReceiptImages(
      data.receiptImages ?? data.receipt_images ?? data.receipts ?? data.attachments ?? payload.receiptImages
    ),
    notes: toStringValue(data.notes ?? data.note ?? payload.notes ?? '', '') || undefined,
  };
}
