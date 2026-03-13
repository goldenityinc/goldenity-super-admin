import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { listSolutions, type Solution } from '../../lib/api/solutionApi';
import type { PaginationMeta } from '../../lib/api/tenantApi';
import { getApiErrorMessage } from '../../lib/utils/apiError';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import TableSkeleton from '../../components/common/TableSkeleton';

export default function SolutionsPage() {
  const [items, setItems] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const fetchSolutions = async () => {
    setLoading(true);
    setTableError(null);

    try {
      const result = await listSolutions({
        page,
        limit: meta.limit,
        search: search || undefined,
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      setTableError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSolutions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-dark">Solutions</h1>
        <p className="text-slate-600">
          Master data produk SaaS Goldenity yang ditawarkan ke klien (read-only).
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-dark">Solution Catalog</h2>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama/code solusi"
              className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-primary/30 focus:ring"
            />
            <button
              type="button"
              onClick={() => {
                setPage(1);
                void fetchSolutions();
              }}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Search
            </button>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : (
          <DataTable
            headers={['Name', 'Code', 'Description', 'Status', 'Created At']}
            hasData={items.length > 0}
            emptyMessage={tableError ?? 'Belum ada solution.'}
          >
            {items.map((solution) => (
              <tr key={solution.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-medium text-dark">{solution.name}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    {solution.code}
                  </span>
                </td>
                <td className="max-w-[360px] truncate px-4 py-3" title={solution.description ?? '-'}>
                  {solution.description ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={[
                      'rounded-full px-2 py-1 text-xs font-semibold',
                      solution.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
                    ].join(' ')}
                  >
                    {solution.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(solution.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </DataTable>
        )}

        <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
      </div>
    </section>
  );
}
