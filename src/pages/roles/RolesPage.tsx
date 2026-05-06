import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  createRole,
  listRoles,
  updateRole,
  type Role,
} from '../../lib/api/roleApi';
import {
  ROLE_MODULES,
  createDefaultRolePermissions,
  type RolePermissions,
} from '../../lib/constants/roleModules';
import { getApiErrorMessage } from '../../lib/utils/apiError';

type RoleFormState = {
  name: string;
  description: string;
  permissions: RolePermissions;
};

function createInitialRoleForm(): RoleFormState {
  return {
    name: '',
    description: '',
    permissions: createDefaultRolePermissions(),
  };
}

function normalizePermissions(input?: RolePermissions | null): RolePermissions {
  const defaults = createDefaultRolePermissions();
  const result: RolePermissions = { ...defaults };

  if (!input) {
    return result;
  }

  for (const moduleItem of ROLE_MODULES) {
    result[moduleItem.key] = input[moduleItem.key] ?? true;
  }

  return result;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<RoleFormState>(createInitialRoleForm);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const checkedCount = useMemo(
    () => Object.values(form.permissions).filter(Boolean).length,
    [form.permissions],
  );

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listRoles();
      setRoles(result);
    } catch (fetchError: unknown) {
      const message = getApiErrorMessage(fetchError);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRoles();
  }, []);

  const resetForm = () => {
    setForm(createInitialRoleForm());
    setEditingRole(null);
  };

  const updatePermission = (key: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: checked,
      },
    }));
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description ?? '',
      permissions: normalizePermissions(role.permissions),
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      permissions: form.permissions,
    };

    try {
      if (editingRole) {
        await updateRole(editingRole.id, payload);
        toast.success('Role berhasil diperbarui');
      } else {
        await createRole(payload);
        toast.success('Role berhasil dibuat');
      }

      resetForm();
      await fetchRoles();
    } catch (submitError: unknown) {
      toast.error(getApiErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-dark">Manajemen Role</h1>
        <p className="text-slate-600">Atur role beserta izin modul untuk pengguna tenant.</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Nama Role *</span>
            <input
              required
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Contoh: Supervisor"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Deskripsi (opsional)</span>
            <input
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Catatan singkat role"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
          </label>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Izin Modul</h2>
            <span className="text-xs text-slate-500">{checkedCount}/{ROLE_MODULES.length} aktif</span>
          </div>

          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {ROLE_MODULES.map((moduleItem) => (
              <label
                key={moduleItem.key}
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={form.permissions[moduleItem.key] ?? true}
                  onChange={(event) => updatePermission(moduleItem.key, event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                />
                <span className="text-sm text-slate-700">{moduleItem.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Menyimpan...' : editingRole ? 'Simpan Perubahan Role' : 'Simpan Role'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </form>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark">Daftar Role</h2>
          <button
            type="button"
            onClick={() => void fetchRoles()}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Memuat daftar role...</p>
        ) : roles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Modul Aktif</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {roles.map((role) => {
                  const activeModules = ROLE_MODULES.filter(
                    (moduleItem) => role.permissions?.[moduleItem.key] ?? true,
                  ).length;

                  return (
                    <tr key={role.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-medium text-dark">{role.name}</p>
                        <p className="text-xs text-slate-500">{role.description ?? '-'}</p>
                      </td>
                      <td className="px-4 py-3">{activeModules}/{ROLE_MODULES.length}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleEdit(role)}
                            className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{error ?? 'Belum ada role yang dibuat.'}</p>
        )}
      </div>
    </section>
  );
}
