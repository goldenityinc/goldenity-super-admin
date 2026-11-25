import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { CalendarClock, ExternalLink, MessageCircle, Pencil, Plus, Trash2, Upload, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  LEAD_SEGMENTS,
  LEAD_SOURCES,
  LEAD_STAGES,
  createLead,
  deleteLead,
  getLeadSummary,
  importLeads,
  listLeads,
  segmentLabel,
  stageLabel,
  stageTone,
  updateLead,
  type Lead,
  type LeadInput,
  type LeadStage,
  type LeadSummary,
} from '../../lib/api/leadApi';
import { createTenant } from '../../lib/api/tenantApi';
import { businessCategoryFromLeadSegment } from '../../lib/constants/businessCategories';
import { csvToLeads, toWhatsAppLink } from '../../lib/utils/leadCsv';
import { getApiErrorMessage } from '../../lib/utils/apiError';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import TableSkeleton from '../../components/common/TableSkeleton';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const PAGE_SIZE = 25;

type FormState = {
  name: string;
  segment: string;
  stage: LeadStage;
  tier: string;
  area: string;
  address: string;
  phone: string;
  instagram: string;
  source: string;
  notes: string;
  lostReason: string;
  nextFollowUpAt: string;
};

const emptyForm: FormState = {
  name: '',
  segment: 'BAKERY',
  stage: 'NEW',
  tier: '',
  area: '',
  address: '',
  phone: '',
  instagram: '',
  source: 'VISIT',
  notes: '',
  lostReason: '',
  nextFollowUpAt: '',
};

function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function isDue(lead: Lead): boolean {
  if (!lead.nextFollowUpAt || lead.stage === 'WON' || lead.stage === 'LOST') return false;
  return new Date(lead.nextFollowUpAt).getTime() <= Date.now();
}

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-primary/30 focus:ring';

export default function LeadsPage() {
  const [items, setItems] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [stageFilter, setStageFilter] = useState<LeadStage | ''>('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [dueOnly, setDueOnly] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importDefaults, setImportDefaults] = useState({ segment: 'BAKERY', source: 'MAPS' });
  const [importPreview, setImportPreview] = useState<{ fileName: string; leads: LeadInput[]; skipped: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState('');

  const [deleting, setDeleting] = useState<Lead | null>(null);
  const [converting, setConverting] = useState<Lead | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [result, nextSummary] = await Promise.all([
        listLeads({
          page,
          limit: PAGE_SIZE,
          stage: stageFilter || undefined,
          segment: segmentFilter || undefined,
          tier: tierFilter || undefined,
          search: search || undefined,
          dueOnly: dueOnly || undefined,
        }),
        getLeadSummary(),
      ]);
      setItems(result.items);
      setTotalPages(Math.max(1, result.meta?.totalPages || 1));
      setTotal(result.meta?.total ?? result.items.length);
      setSummary(nextSummary);
    } catch (error: unknown) {
      toast.error(`Gagal memuat lead: ${getApiErrorMessage(error)}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, stageFilter, segmentFilter, tierFilter, search, dueOnly]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const stageCount = (stage: LeadStage) => summary?.byStage.find((row) => row.stage === stage)?.count ?? 0;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setForm({
      name: lead.name,
      segment: lead.segment,
      stage: lead.stage,
      tier: lead.tier ?? '',
      area: lead.area ?? '',
      address: lead.address ?? '',
      phone: lead.phone ?? '',
      instagram: lead.instagram ?? '',
      source: lead.source ?? '',
      notes: lead.notes ?? '',
      lostReason: lead.lostReason ?? '',
      nextFollowUpAt: toDateInput(lead.nextFollowUpAt),
    });
    setIsFormOpen(true);
  };

  const onSubmitForm = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload: LeadInput = {
      name: form.name,
      segment: form.segment,
      stage: form.stage,
      tier: form.tier || null,
      area: form.area || null,
      address: form.address || null,
      phone: form.phone || null,
      instagram: form.instagram || null,
      source: form.source || null,
      notes: form.notes || null,
      lostReason: form.stage === 'LOST' ? form.lostReason || null : null,
      nextFollowUpAt: form.nextFollowUpAt ? new Date(`${form.nextFollowUpAt}T09:00:00`).toISOString() : null,
    };
    try {
      if (editing) {
        await updateLead(editing.id, payload);
        toast.success('Lead diperbarui');
      } else {
        await createLead(payload);
        toast.success('Lead ditambahkan');
      }
      setIsFormOpen(false);
      await fetchData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const onChangeStage = async (lead: Lead, stage: LeadStage) => {
    try {
      await updateLead(lead.id, { stage });
      toast.success(`${lead.name}: ${stageLabel(stage)}`);
      await fetchData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const onChangeFollowUp = async (lead: Lead, value: string) => {
    try {
      await updateLead(lead.id, { nextFollowUpAt: value ? new Date(`${value}T09:00:00`).toISOString() : null });
      await fetchData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const onPickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const text = await file.text();
    setImportText(text);
    const parsed = csvToLeads(text, importDefaults);
    setImportPreview({ fileName: file.name, ...parsed });
  };

  useEffect(() => {
    if (!importText || !importPreview) return;
    const parsed = csvToLeads(importText, importDefaults);
    setImportPreview((prev) => (prev ? { ...prev, ...parsed } : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importDefaults]);

  const onImport = async () => {
    if (!importPreview || importPreview.leads.length === 0) return;
    setImporting(true);
    try {
      let created = 0;
      let skippedExisting = 0;
      let duplicatesInFile = 0;
      for (let i = 0; i < importPreview.leads.length; i += 500) {
        const result = await importLeads(importPreview.leads.slice(i, i + 500));
        created += result.created;
        skippedExisting += result.skippedExisting;
        duplicatesInFile += result.duplicatesInFile;
      }
      toast.success(
        `${created} lead baru diimpor` +
          (skippedExisting ? `, ${skippedExisting} sudah ada` : '') +
          (duplicatesInFile ? `, ${duplicatesInFile} dobel di file` : ''),
      );
      setIsImportOpen(false);
      setImportPreview(null);
      setImportText('');
      setPage(1);
      await fetchData();
    } catch (error: unknown) {
      toast.error(`Impor gagal: ${getApiErrorMessage(error)}`);
    } finally {
      setImporting(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!deleting) return;
    setBusyAction(true);
    try {
      await deleteLead(deleting.id);
      toast.success('Lead dihapus');
      setDeleting(null);
      await fetchData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setBusyAction(false);
    }
  };

  const onConfirmConvert = async () => {
    if (!converting) return;
    setBusyAction(true);
    try {
      const { tenant } = await createTenant({
        name: converting.name,
        phone: converting.phone ?? undefined,
        address: converting.address ?? undefined,
        firstBranchName: converting.name,
        businessCategory: businessCategoryFromLeadSegment(converting.segment),
      });
      await updateLead(converting.id, { stage: 'WON', tenantId: tenant.id });
      toast.success(`Tenant "${tenant.name}" dibuat. Lanjutkan atur langganan di menu Subscriptions.`);
      setConverting(null);
      await fetchData();
    } catch (error: unknown) {
      toast.error(`Gagal membuat tenant: ${getApiErrorMessage(error)}`);
    } finally {
      setBusyAction(false);
    }
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-dark">Lead & Pipeline</h1>
          <p className="text-slate-600">
            Calon klien dari peta, Threads, WhatsApp, dan kunjungan. Pindahkan tahap setiap kali ada kontak.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-dark hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" /> Impor CSV
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Tambah lead
          </button>
        </div>
      </div>

      {/* Ringkasan pipeline */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <button
          type="button"
          onClick={() => {
            setStageFilter('');
            setDueOnly(false);
            setPage(1);
          }}
          className={`rounded-lg border px-3 py-2 text-left ${!stageFilter && !dueOnly ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white'}`}
        >
          <p className="text-xs text-slate-500">Semua</p>
          <p className="text-xl font-bold text-dark">{summary?.total ?? '–'}</p>
        </button>
        {LEAD_STAGES.map((stage) => (
          <button
            key={stage.value}
            type="button"
            onClick={() => {
              setStageFilter(stage.value);
              setDueOnly(false);
              setPage(1);
            }}
            className={`rounded-lg border px-3 py-2 text-left ${stageFilter === stage.value ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white'}`}
          >
            <p className="text-xs text-slate-500">{stage.label}</p>
            <p className="text-xl font-bold text-dark">{summary ? stageCount(stage.value) : '–'}</p>
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center">
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Cari nama, telepon, wilayah, catatan…"
          className={`${inputClass} lg:max-w-xs`}
        />
        <select
          value={segmentFilter}
          onChange={(event) => {
            setSegmentFilter(event.target.value);
            setPage(1);
          }}
          className={`${inputClass} lg:max-w-[200px]`}
        >
          <option value="">Semua segmen</option>
          {LEAD_SEGMENTS.map((segment) => (
            <option key={segment.value} value={segment.value}>
              {segment.label}
            </option>
          ))}
        </select>
        <select
          value={tierFilter}
          onChange={(event) => {
            setTierFilter(event.target.value);
            setPage(1);
          }}
          className={`${inputClass} lg:max-w-[140px]`}
        >
          <option value="">Semua tier</option>
          <option value="A">Tier A</option>
          <option value="B">Tier B</option>
          <option value="C">Tier C</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={dueOnly}
            onChange={(event) => {
              setDueOnly(event.target.checked);
              setPage(1);
            }}
          />
          Perlu ditindaklanjuti hari ini
          {summary?.dueFollowUps ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              {summary.dueFollowUps}
            </span>
          ) : null}
        </label>
        <p className="text-sm text-slate-500 lg:ml-auto">{total} lead</p>
      </div>

      {loading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : (
        <DataTable
          headers={['Usaha', 'Segmen', 'Kontak', 'Tahap', 'Tindak lanjut', 'Aksi']}
          hasData={items.length > 0}
          emptyMessage={
            summary?.total === 0
              ? 'Belum ada lead. Impor prospek-solo-raya-v2.csv atau prospek-katering-florist.csv untuk mulai.'
              : 'Tidak ada lead yang cocok dengan filter.'
          }
        >
          {items.map((lead) => {
            const waLink = toWhatsAppLink(lead.phone);
            return (
              <tr key={lead.id} className={isDue(lead) ? 'bg-amber-50/60' : undefined}>
                <td className="px-4 py-3 align-top">
                  <p className="font-medium text-dark">{lead.name}</p>
                  <p className="text-xs text-slate-500">
                    {[lead.area, lead.outletCount ? `${lead.outletCount} lokasi` : null, lead.rating ? `★ ${lead.rating} (${lead.reviewCount ?? 0})` : null]
                      .filter(Boolean)
                      .join(' · ') || '-'}
                  </p>
                  {lead.notes ? <p className="mt-1 line-clamp-2 max-w-sm text-xs text-slate-500">{lead.notes}</p> : null}
                </td>
                <td className="px-4 py-3 align-top">
                  <p>{segmentLabel(lead.segment)}</p>
                  <p className="text-xs text-slate-500">
                    {lead.tier ? `Tier ${lead.tier}` : ''}
                    {lead.score !== null && lead.score !== undefined ? ` · skor ${lead.score}` : ''}
                  </p>
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="whitespace-nowrap">{lead.phone || '-'}</p>
                  <div className="mt-1 flex gap-2 text-xs">
                    {waLink ? (
                      <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline">
                        <MessageCircle className="h-3.5 w-3.5" /> WA
                      </a>
                    ) : null}
                    {lead.mapsUrl ? (
                      <a href={lead.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" /> Maps
                      </a>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <select
                    value={lead.stage}
                    onChange={(event) => void onChangeStage(lead, event.target.value as LeadStage)}
                    className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold ${stageTone(lead.stage)}`}
                  >
                    {LEAD_STAGES.map((stage) => (
                      <option key={stage.value} value={stage.value}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                  {lead.lastContactedAt ? (
                    <p className="mt-1 text-xs text-slate-500">Kontak: {formatDate(lead.lastContactedAt)}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex items-center gap-1">
                    <CalendarClock className={`h-4 w-4 ${isDue(lead) ? 'text-amber-600' : 'text-slate-400'}`} />
                    <input
                      type="date"
                      value={toDateInput(lead.nextFollowUpAt)}
                      onChange={(event) => void onChangeFollowUp(lead, event.target.value)}
                      className="rounded border border-slate-200 px-1.5 py-1 text-xs"
                      aria-label={`Tanggal tindak lanjut ${lead.name}`}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => openEdit(lead)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Ubah">
                      <Pencil className="h-4 w-4" />
                    </button>
                    {!lead.tenantId ? (
                      <button
                        type="button"
                        onClick={() => setConverting(lead)}
                        className="rounded p-1.5 text-emerald-700 hover:bg-emerald-50"
                        title="Jadikan tenant"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="self-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Tenant</span>
                    )}
                    <button type="button" onClick={() => setDeleting(lead)} className="rounded p-1.5 text-rose-600 hover:bg-rose-50" title="Hapus">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Form tambah/ubah */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editing ? 'Ubah lead' : 'Tambah lead'} size="lg">
        <form onSubmit={onSubmitForm} className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Nama usaha *</span>
            <input required value={form.name} onChange={(event) => setField('name', event.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Segmen *</span>
            <select value={form.segment} onChange={(event) => setField('segment', event.target.value)} className={inputClass}>
              {LEAD_SEGMENTS.map((segment) => (
                <option key={segment.value} value={segment.value}>
                  {segment.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Tahap</span>
            <select value={form.stage} onChange={(event) => setField('stage', event.target.value as LeadStage)} className={inputClass}>
              {LEAD_STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Telepon / WA</span>
            <input value={form.phone} onChange={(event) => setField('phone', event.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Instagram</span>
            <input value={form.instagram} onChange={(event) => setField('instagram', event.target.value)} className={inputClass} placeholder="@namausaha" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Wilayah</span>
            <input value={form.area} onChange={(event) => setField('area', event.target.value)} className={inputClass} placeholder="Surakarta, Karanganyar…" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Tier</span>
            <select value={form.tier} onChange={(event) => setField('tier', event.target.value)} className={inputClass}>
              <option value="">-</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Alamat</span>
            <input value={form.address} onChange={(event) => setField('address', event.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Sumber</span>
            <select value={form.source} onChange={(event) => setField('source', event.target.value)} className={inputClass}>
              <option value="">-</option>
              {LEAD_SOURCES.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Tindak lanjut berikutnya</span>
            <input type="date" value={form.nextFollowUpAt} onChange={(event) => setField('nextFollowUpAt', event.target.value)} className={inputClass} />
          </label>
          {form.stage === 'LOST' ? (
            <label className="space-y-1 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Alasan batal</span>
              <input value={form.lostReason} onChange={(event) => setField('lostReason', event.target.value)} className={inputClass} placeholder="Harga, sudah pakai aplikasi lain, belum butuh…" />
            </label>
          ) : null}
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Catatan</span>
            <textarea rows={4} value={form.notes} onChange={(event) => setField('notes', event.target.value)} className={inputClass} placeholder="Hasil wawancara, sistem kasir yang dipakai, keberatan…" />
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm">
              Batal
            </button>
            <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Impor CSV */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          setImportPreview(null);
          setImportText('');
        }}
        title="Impor lead dari CSV"
        size="lg"
      >
        <div className="space-y-4 text-sm">
          <p className="text-slate-600">
            Mendukung file <b>prospek-solo-raya-v2.csv</b> dan <b>prospek-katering-florist.csv</b>, atau CSV dengan kolom nama, segmen, telepon, wilayah, alamat. Lead yang sama
            (tempat Maps, telepon, atau nama) tidak akan dobel.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="font-medium text-slate-700">Segmen jika kolom kosong</span>
              <select
                value={importDefaults.segment}
                onChange={(event) => setImportDefaults((prev) => ({ ...prev, segment: event.target.value }))}
                className={inputClass}
              >
                {LEAD_SEGMENTS.map((segment) => (
                  <option key={segment.value} value={segment.value}>
                    {segment.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-medium text-slate-700">Sumber</span>
              <select
                value={importDefaults.source}
                onChange={(event) => setImportDefaults((prev) => ({ ...prev, source: event.target.value }))}
                className={inputClass}
              >
                {LEAD_SOURCES.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <input type="file" accept=".csv,text/csv" onChange={(event) => void onPickFile(event)} className="block w-full text-sm" />

          {importPreview ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-medium text-dark">{importPreview.fileName}</p>
              <p className="text-slate-600">
                {importPreview.leads.length} lead siap diimpor
                {importPreview.skipped ? `, ${importPreview.skipped} baris tanpa nama dilewati` : ''}.
              </p>
              <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                {importPreview.leads.slice(0, 5).map((lead, index) => (
                  <li key={`${lead.name}-${index}`}>
                    {lead.name} · {segmentLabel(lead.segment)} {lead.tier ? `· Tier ${lead.tier}` : ''} {lead.phone ? `· ${lead.phone}` : ''}
                  </li>
                ))}
                {importPreview.leads.length > 5 ? <li>…dan {importPreview.leads.length - 5} lainnya</li> : null}
              </ul>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={!importPreview || importPreview.leads.length === 0 || importing}
              onClick={() => void onImport()}
              className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {importing ? 'Mengimpor…' : 'Impor sekarang'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => void onConfirmDelete()}
        title="Hapus lead?"
        message={`Lead "${deleting?.name ?? ''}" dan catatannya akan dihapus permanen.`}
        confirmText="Hapus"
        isLoading={busyAction}
      />

      <ConfirmDialog
        isOpen={Boolean(converting)}
        onClose={() => setConverting(null)}
        onConfirm={() => void onConfirmConvert()}
        title="Jadikan tenant?"
        message={`Membuat tenant baru "${converting?.name ?? ''}" (kategori ${converting ? segmentLabel(converting.segment) : ''}) dan menandai lead sebagai Bayar. Langganan diatur setelahnya di menu Subscriptions.`}
        confirmText="Buat tenant"
        variant="info"
        isLoading={busyAction}
      />
    </section>
  );
}
