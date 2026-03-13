import type { ReactNode } from 'react';

type DataTableProps = {
  headers: string[];
  children: ReactNode;
  emptyMessage: string;
  hasData: boolean;
};

export default function DataTable({ headers, children, emptyMessage, hasData }: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">{children}</tbody>
        </table>
      </div>

      {!hasData ? <p className="px-4 py-5 text-sm text-slate-500">{emptyMessage}</p> : null}
    </div>
  );
}
