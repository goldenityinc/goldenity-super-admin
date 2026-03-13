import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { changeSuperAdminPassword } from '../../lib/api/settingsApi';
import { getApiErrorMessage } from '../../lib/utils/apiError';

type PasswordForm = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const emptyForm: PasswordForm = {
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function SettingsPage() {
  const [form, setForm] = useState<PasswordForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateField = (field: keyof PasswordForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(false);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (form.newPassword.length < 8) {
      setError('Password baru minimal 8 karakter.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('Konfirmasi password baru tidak cocok.');
      return;
    }

    setSubmitting(true);
    try {
      await changeSuperAdminPassword({
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      setSuccess(true);
      setForm(emptyForm);
      toast.success('Password berhasil diubah');
    } catch (err: unknown) {
      const message = getApiErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-dark">Settings</h1>
        <p className="text-slate-600">Pengaturan global aplikasi Super Admin Goldenity.</p>
      </div>

      {/* Change Password Card */}
      <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-dark">Keamanan Akun Super Admin</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ubah password login akun Super Admin. Perubahan langsung berlaku di Firebase.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Password Lama *</span>
            <input
              type="password"
              required
              value={form.oldPassword}
              onChange={(e) => updateField('oldPassword', e.target.value)}
              autoComplete="current-password"
              placeholder="Password saat ini"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Password Baru *</span>
            <input
              type="password"
              required
              minLength={8}
              value={form.newPassword}
              onChange={(e) => updateField('newPassword', e.target.value)}
              autoComplete="new-password"
              placeholder="Minimal 8 karakter"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Konfirmasi Password Baru *</span>
            <input
              type="password"
              required
              minLength={8}
              value={form.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              autoComplete="new-password"
              placeholder="Ulangi password baru"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-primary/30 focus:ring"
            />
          </label>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          ) : null}

          {success ? (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              ✅ Password berhasil diubah. Gunakan password baru untuk login berikutnya.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Menyimpan...' : 'Ubah Password'}
          </button>
        </form>
      </div>
    </section>
  );
}

