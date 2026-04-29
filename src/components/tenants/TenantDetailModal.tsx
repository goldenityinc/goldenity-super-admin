import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import {
  createTenantBranch,
  deleteTenantBranch,
  listTenantBranches,
  updateTenantBranch,
  type CreateTenantBranchPayload,
  type Tenant,
  type TenantBranch,
} from '../../lib/api/tenantApi';
import { getApiErrorMessage } from '../../lib/utils/apiError';

type BranchFormState = CreateTenantBranchPayload;

const initialBranchForm: BranchFormState = {
  name: '',
  branchCode: '',
  address: '',
  phone: '',
  isMainBranch: false,
};

type TenantDetailModalProps = {
  isOpen: boolean;
  tenant: Tenant | null;
  onClose: () => void;
  onBranchCountChange?: (tenantId: string, count: number) => void;
};

export default function TenantDetailModal({ isOpen, tenant, onClose, onBranchCountChange }: TenantDetailModalProps) {
  const [branches, setBranches] = useState<TenantBranch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState<string | null>(null);

  const [isBranchFormOpen, setIsBranchFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<TenantBranch | null>(null);
  const [branchForm, setBranchForm] = useState<BranchFormState>(initialBranchForm);
  const [branchSubmitting, setBranchSubmitting] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);

  const [deletingBranch, setDeletingBranch] = useState<TenantBranch | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const resetBranchForm = () => {
    setBranchForm(initialBranchForm);
    setEditingBranch(null);
    setBranchError(null);
  };

  const closeBranchForm = () => {
    setIsBranchFormOpen(false);
    resetBranchForm();
  };

  const fetchBranches = async (tenantId: string) => {
    setBranchesLoading(true);
    setBranchesError(null);

    try {
      const tenantBranches = await listTenantBranches(tenantId);
      setBranches(tenantBranches);
      onBranchCountChange?.(tenantId, tenantBranches.length);
    } catch (fetchError: unknown) {
      const message = getApiErrorMessage(fetchError);
      setBranchesError(message);
      toast.error(message);
    } finally {
      setBranchesLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !tenant) {
      setBranches([]);
      setBranchesError(null);
      setBranchesLoading(false);
      setIsBranchFormOpen(false);
      setDeletingBranch(null);
      resetBranchForm();
      return;
    }

    void fetchBranches(tenant.id);
  }, [isOpen, tenant]);

  const updateBranchField = <K extends keyof BranchFormState>(field: K, value: BranchFormState[K]) => {
    setBranchForm((prev) => ({ ...prev, [field]: value }));
  };

  const openCreateBranch = () => {
    resetBranchForm();
    setIsBranchFormOpen(true);
  };

  const openEditBranch = (branch: TenantBranch) => {
    setEditingBranch(branch);
    setBranchForm({
      name: branch.name,
      branchCode: branch.branchCode ?? '',
      address: branch.address ?? '',
      phone: branch.phone ?? '',
      isMainBranch: Boolean(branch.isMainBranch),
    });
    setBranchError(null);
    setIsBranchFormOpen(true);
  };

  const currentMainBranch = branches.find((branch) => branch.isMainBranch);
  const hasOtherMainBranch =
    branchForm.isMainBranch &&
    Boolean(
      currentMainBranch && (!editingBranch || currentMainBranch.id !== editingBranch.id)
    );

  const handleSubmitBranch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!tenant) {
      return;
    }

    setBranchSubmitting(true);
    setBranchError(null);

    try {
      if (editingBranch) {
        await updateTenantBranch(tenant.id, editingBranch.id, {
          branchCode: branchForm.branchCode || null,
          address: branchForm.address || null,
          phone: branchForm.phone || null,
          isMainBranch: branchForm.isMainBranch,
        });
        toast.success('Cabang berhasil diperbarui');
      } else {
        await createTenantBranch(tenant.id, {
          name: branchForm.name,
          branchCode: branchForm.branchCode || undefined,
          address: branchForm.address || undefined,
          phone: branchForm.phone || undefined,
          isMainBranch: branchForm.isMainBranch,
        });
        toast.success('Cabang berhasil ditambahkan');
      }

      closeBranchForm();
      await fetchBranches(tenant.id);
    } catch (submitError: unknown) {
      const message = getApiErrorMessage(submitError);
      setBranchError(message);
      toast.error(message);
    } finally {
      setBranchSubmitting(false);
    }
  };

  const handleDeleteBranch = async () => {
    if (!tenant || !deletingBranch) {
      return;
    }

    setDeleteSubmitting(true);
    try {
      await deleteTenantBranch(tenant.id, deletingBranch.id);
      toast.success('Cabang berhasil dihapus');
      setDeletingBranch(null);
      await fetchBranches(tenant.id);
    } catch (deleteError: unknown) {
      toast.error(getApiErrorMessage(deleteError));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const branchCountLabel = `${branches.length} Cabang`;

  return (
    <>
      <Modal
        isOpen={isOpen}
        title={tenant ? `Atur Cabang Tenant: ${tenant.name}` : 'Atur Cabang Tenant'}
        onClose={onClose}
        size="xl"
      >
        {tenant ? (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-5 py-5 text-white">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Tenant Profile</p>
                    <h3 className="mt-2 text-2xl font-semibold">{tenant.name}</h3>
                    <p className="mt-1 text-sm text-slate-300">Slug: {tenant.slug}</p>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    {branchCountLabel}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
                  <p className="mt-1 text-sm text-slate-700">{tenant.email ?? '-'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Telepon</p>
                  <p className="mt-1 text-sm text-slate-700">{tenant.phone ?? '-'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alamat</p>
                  <p className="mt-1 text-sm text-slate-700">{tenant.address ?? '-'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-dark">Daftar Cabang</h3>
                  <p className="text-sm text-slate-500">Siapkan data cabang untuk sinkronisasi POS dan operasional tenant.</p>
                </div>
                <button
                  type="button"
                  onClick={openCreateBranch}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                >
                  <Plus size={16} />
                  Tambah Cabang
                </button>
              </div>

              {branchesLoading ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
                  Memuat daftar cabang...
                </div>
              ) : branches.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-left text-sm text-slate-700">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Nama Cabang</th>
                          <th className="px-4 py-3 font-semibold">Tipe</th>
                          <th className="px-4 py-3 font-semibold">Kode</th>
                          <th className="px-4 py-3 font-semibold">Alamat</th>
                          <th className="px-4 py-3 font-semibold">Telepon</th>
                          <th className="px-4 py-3 font-semibold">Dibuat</th>
                          <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {branches.map((branch) => (
                          <tr key={branch.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3">
                              <p className="font-medium text-dark">{branch.name}</p>
                            </td>
                            <td className="px-4 py-3">
                              {branch.isMainBranch ? (
                                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                  Pusat
                                </span>
                              ) : (
                                <span className="text-slate-400">Biasa</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                {branch.branchCode ?? '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3">{branch.address ?? '-'}</td>
                            <td className="px-4 py-3">{branch.phone ?? '-'}</td>
                            <td className="px-4 py-3 text-slate-500">{new Date(branch.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditBranch(branch)}
                                  className="rounded-md p-2 text-amber-600 transition-colors hover:bg-amber-50"
                                  title="Edit cabang"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingBranch(branch)}
                                  className="rounded-md p-2 text-red-600 transition-colors hover:bg-red-50"
                                  title="Hapus cabang"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
                  {branchesError ?? 'Belum ada cabang untuk tenant ini.'}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={isBranchFormOpen}
        title={editingBranch ? `Edit Cabang: ${editingBranch.name}` : tenant ? `Tambah Cabang - ${tenant.name}` : 'Tambah Cabang'}
        onClose={closeBranchForm}
      >
        <form onSubmit={handleSubmitBranch} className="space-y-4">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Nama Cabang *</span>
            <input
              required
              disabled={Boolean(editingBranch)}
              value={branchForm.name}
              onChange={(event) => updateBranchField('name', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
            />
            {editingBranch ? <p className="text-xs text-slate-500">Nama cabang dibuat tetap agar identitas operasional tidak berubah.</p> : null}
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Branch Code</span>
            <input
              value={branchForm.branchCode}
              onChange={(event) => updateBranchField('branchCode', event.target.value.toUpperCase())}
              placeholder="Contoh: JKT-01"
              className="w-full rounded-md border border-slate-300 px-3 py-2 uppercase outline-none ring-primary/30 focus:ring"
            />
            <p className="text-xs text-slate-500">Kode unik yang bisa dipakai oleh aplikasi POS untuk identitas cabang.</p>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Alamat</span>
            <textarea
              value={branchForm.address}
              onChange={(event) => updateBranchField('address', event.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Telepon</span>
            <input
              value={branchForm.phone}
              onChange={(event) => updateBranchField('phone', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
          </label>

          <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <input
              type="checkbox"
              checked={branchForm.isMainBranch}
              onChange={(event) => updateBranchField('isMainBranch', event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
            />
            <span>
              <span className="text-sm font-medium text-slate-700">Jadikan sebagai Cabang Pusat</span>
              <p className="text-xs text-slate-500">Cabang pusat akan ditandai khusus pada daftar cabang tenant.</p>
            </span>
          </label>

          {hasOtherMainBranch ? (
            <p className="text-sm text-amber-600">
              Sudah ada cabang pusat ({currentMainBranch?.name}). Jika backend mengizinkan hanya satu pusat, status pusat cabang lain perlu dinonaktifkan.
            </p>
          ) : null}

          {branchError ? <p className="text-sm text-red-600">{branchError}</p> : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeBranchForm}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={branchSubmitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {branchSubmitting ? 'Menyimpan...' : editingBranch ? 'Simpan Perubahan' : 'Simpan Cabang'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingBranch)}
        title="Hapus cabang"
        message={deletingBranch ? `Cabang ${deletingBranch.name} akan dihapus dari tenant ini.` : ''}
        onClose={() => setDeletingBranch(null)}
        onConfirm={handleDeleteBranch}
        confirmText="Hapus"
        variant="danger"
        isLoading={deleteSubmitting}
      />
    </>
  );
}