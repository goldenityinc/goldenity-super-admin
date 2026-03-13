import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">Forbidden</p>
      <h1 className="text-3xl font-bold text-dark">Akses Ditolak</h1>
      <p className="max-w-md text-slate-600">
        Akun Anda login, tetapi belum memiliki role SUPER_ADMIN untuk membuka dashboard ini.
      </p>
      <Link
        to="/login"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Kembali ke Login
      </Link>
    </div>
  );
}
