import httpClient from './httpClient';

export type ExpenseStatus = 'Paid' | 'Not Paid';

export type Expense = {
  id: string;
  name: string;
  dateISO: string;
  picName: string;
  status: ExpenseStatus;
  description: string;
  amountIDR: number;
  category: string;
  proofImages: string[];
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

function normalizePaymentStatus(value: unknown): ExpenseStatus {
  const str = toStringValue(value);
  if (str === 'Paid' || str === 'PAID' || str === 'paid') {
    return 'Paid';
  }
  if (str === 'NotPaid' || str === 'NOT_PAID' || str === 'not_paid' || str === 'Unpaid') {
    return 'Not Paid';
  }
  return str === 'Not Paid' ? 'Not Paid' : 'Not Paid';
}

function mapToApiPaymentStatus(status: ExpenseStatus): 'Paid' | 'NotPaid' {
  return status === 'Paid' ? 'Paid' : 'NotPaid';
}

function normalizeProofImages(value: unknown): string[] {
  const arr = toArray(value);
  return arr
    .map((item) => {
      const row = toRecord(item);
      const url = toStringValue(row.url ?? row.file_url ?? row.image_url ?? row.attachment_url ?? row.path);
      return typeof item === 'string' ? item : url;
    })
    .filter(Boolean);
}

function normalizeExpense(value: unknown): Expense {
  const row = toRecord(value);
  return {
    id: toStringValue(row.id),
    name: toStringValue(row.title ?? row.name ?? row.expense_name, '-'),
    dateISO: toStringValue(row.expense_date ?? row.dateISO ?? row.date ?? row.date_iso, ''),
    picName: toStringValue(row.pic_name ?? row.picName ?? row.pic ?? row.person_in_charge, ''),
    status: normalizePaymentStatus(row.payment_status ?? row.status),
    description: toStringValue(row.notes ?? row.description ?? row.desc, ''),
    amountIDR: toNumberValue(row.amount ?? row.amountIDR ?? row.total_amount ?? row.total, 0),
    category: toStringValue(row.category ?? row.expense_category, ''),
    proofImages: normalizeProofImages(row.attachments ?? row.proofImages ?? row.proof_images ?? row.files),
  };
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

export async function listExpenses(params?: { search?: string }): Promise<Expense[]> {
  const response = await httpClient.get('/v1/expenses', { params });
  const items = extractListItems(response.data);
  return items.map(normalizeExpense);
}

export async function createExpense(fd: FormData): Promise<Expense> {
  const response = await httpClient.post('/v1/expenses', fd, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  const body = toRecord(response.data);
  return normalizeExpense(body.data ?? body);
}

export async function updateExpense(id: string, fd: FormData): Promise<Expense> {
  const response = await httpClient.put(`/v1/expenses/${encodeURIComponent(id)}`, fd, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  const body = toRecord(response.data);
  return normalizeExpense(body.data ?? body);
}

export async function togglePaymentStatus(
  id: string,
  newStatus: ExpenseStatus
): Promise<Expense> {
  const response = await httpClient.patch(
    `/v1/expenses/${encodeURIComponent(id)}/payment-status`,
    {
      payment_status: mapToApiPaymentStatus(newStatus),
    }
  );
  const body = toRecord(response.data);
  return normalizeExpense(body.data ?? body);
}
