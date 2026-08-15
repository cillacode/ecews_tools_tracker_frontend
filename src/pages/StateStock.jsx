import { useQuery } from '@tanstack/react-query';
import { Boxes, PackageCheck, PackageX } from 'lucide-react';
import { getStateStock } from '../api/stateMovements';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { cn } from '../lib/utils';

// Standalone page wrapper (kept for direct use). The state admin reaches this
// content through the "State inventory" tabs — see StateInventory.jsx.
export default function StateStock() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="State inventory"
        subtitle="What HQ has sent to your state, what you've distributed to facilities, and the balance you can still distribute."
      />
      <StateStockView />
    </div>
  );
}

// The state admin's own tool ledger: for every tool HQ has sent to the state,
// how much was received, how much has been distributed to facilities, and the
// balance left. The balance is what the Distribution page checks against —
// distributing more than the balance is blocked.
export function StateStockView() {
  const { data, isLoading } = useQuery({
    queryKey: ['state-stock'],
    queryFn:  getStateStock,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta ?? { received: 0, distributed: 0, available: 0 };

  // Group by thematic area (rows arrive ordered by sort_order already).
  const grouped = [];
  const seen = new Map();
  for (const r of rows) {
    if (!seen.has(r.thematic_area_id)) {
      seen.set(r.thematic_area_id, { id: r.thematic_area_id, name: r.thematic_area_name, tools: [] });
      grouped.push(seen.get(r.thematic_area_id));
    }
    seen.get(r.thematic_area_id).tools.push(r);
  }

  return (
    <div>
      {isLoading ? (
        <div className="grid place-items-center py-16"><Spinner /></div>
      ) : rows.length === 0 ? (
        <Card><CardBody>
          <div className="grid place-items-center px-6 py-16 text-center">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50">
              <Boxes size={22} className="text-brand-700" />
            </div>
            <p className="text-sm font-medium text-ink">No tools received yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              HQ has not sent any tools to your state. Once they do — and you accept them on HQ Receipts — they'll show here.
            </p>
          </div>
        </CardBody></Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Card>
              <CardBody className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Received from HQ</p>
                <p className="mt-1 font-serif text-3xl italic num text-ink">{meta.received}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Distributed</p>
                <p className="mt-1 font-serif text-3xl italic num text-brand-700">{meta.distributed}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Balance left</p>
                <p className={cn('mt-1 font-serif text-3xl italic num', meta.available === 0 ? 'text-red-600' : 'text-accent-700')}>
                  {meta.available}
                </p>
              </CardBody>
            </Card>
          </div>

          <div className="space-y-4">
            {grouped.map((group) => (
              <Card key={group.id}>
                <div className="flex items-center gap-3 border-b border-line px-5 py-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted">{group.name}</span>
                  <span className="pill border-line bg-stone-50 text-muted">{group.tools.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-stone-50/60 text-left">
                        <th className="px-5 py-3 font-medium text-muted">Tool</th>
                        <th className="px-5 py-3 font-medium text-muted text-right">Received from HQ</th>
                        <th className="px-5 py-3 font-medium text-muted text-right">Distributed</th>
                        <th className="px-5 py-3 font-medium text-muted text-right">Balance left</th>
                        <th className="px-5 py-3 font-medium text-muted">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {group.tools.map((t) => {
                        const empty = t.available === 0;
                        return (
                          <tr key={t.tool_id} className="hover:bg-stone-50/60 transition-colors">
                            <td className="px-5 py-3 font-medium text-ink">{t.tool_name}</td>
                            <td className="px-5 py-3 text-right num text-muted">{t.received}</td>
                            <td className="px-5 py-3 text-right num text-muted">{t.distributed}</td>
                            <td className={cn('px-5 py-3 text-right font-semibold num', empty ? 'text-red-600' : 'text-accent-700')}>
                              {t.available}
                            </td>
                            <td className="px-5 py-3">
                              {empty ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                                  <PackageX size={12} /> Fully distributed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                                  <PackageCheck size={12} /> Available
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
