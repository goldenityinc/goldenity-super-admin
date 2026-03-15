import { Download, MonitorDown, Pencil, X, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const STORAGE_KEY = 'goldenity_download_url_v1';
const DEFAULT_URL = '[MASUKKAN_LINK_GDRIVE_DI_SINI]';

function getSavedUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_URL;
  } catch {
    return DEFAULT_URL;
  }
}

export default function DownloadsPage() {
  const [downloadUrl, setDownloadUrl] = useState<string>(getSavedUrl);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const openEdit = () => {
    setDraft(downloadUrl);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft('');
  };

  const saveEdit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error('URL tidak boleh kosong.');
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
      toast.error('Gagal menyimpan ke localStorage.');
      return;
    }
    setDownloadUrl(trimmed);
    setEditing(false);
    setDraft('');
    toast.success('Link download berhasil diperbarui.');
  };

  const isPlaceholder = downloadUrl === DEFAULT_URL;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-dark">Downloads / Releases</h1>
        <p className="text-slate-600">
          Halaman ini digunakan oleh tim Sales untuk mengunduh file instalasi aplikasi POS terbaru.
        </p>
      </div>

      <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md sm:max-w-sm">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
          <MonitorDown className="h-7 w-7 text-primary" />
        </div>

        <div className="flex-1 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Windows &bull; .exe
          </p>
          <h2 className="text-lg font-bold text-dark">POS v1.0.0</h2>
          <p className="text-sm text-slate-500">
            Installer POS Desktop untuk Windows 10/11 (64-bit)
          </p>
        </div>

        {/* URL Editor */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-slate-500">Link Download</p>
          {editing ? (
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
                placeholder="https://drive.google.com/..."
                className="w-full rounded-md border border-primary px-3 py-2 text-xs outline-none ring-primary/30 focus:ring"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveEdit}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  <Check className="h-3 w-3" />
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  <X className="h-3 w-3" />
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p
                className={[
                  'flex-1 truncate rounded-md border px-3 py-2 text-xs',
                  isPlaceholder
                    ? 'border-red-200 bg-red-50 text-red-500'
                    : 'border-slate-200 bg-slate-50 text-slate-600',
                ].join(' ')}
                title={downloadUrl}
              >
                {isPlaceholder ? '⚠ Link belum diisi' : downloadUrl}
              </p>
              <button
                type="button"
                onClick={openEdit}
                title="Edit link"
                className="shrink-0 rounded-md border border-slate-300 p-2 text-slate-500 hover:bg-slate-50 hover:text-dark"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <a
          href={isPlaceholder ? '#' : downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={isPlaceholder ? (e) => { e.preventDefault(); toast.warning('Isi link download terlebih dahulu.'); } : undefined}
          className={[
            'mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-95',
            isPlaceholder
              ? 'cursor-not-allowed bg-slate-400'
              : 'bg-primary hover:opacity-90',
          ].join(' ')}
        >
          <Download className="h-4 w-4" />
          Download POS v1.0.0 (Windows .exe)
        </a>
      </div>

      <p className="text-xs text-slate-400">
        Butuh versi lain atau mengalami masalah instalasi? Hubungi tim teknis Goldenity.
      </p>
    </section>
  );
}
