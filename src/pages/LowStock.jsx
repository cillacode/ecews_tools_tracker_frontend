import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { getLowStockFacilities } from '../api/dashboard';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { stockLevel } from '../lib/formatters';
import { cn } from '../lib/utils';

// Drill-down from the dashboard "Low stock" card: every facility with at
// least one tool at qty ≤ 10. Expanding a facility shows exactly which
// tools are low, colour-coded to match the facility stock report.
export default function LowStock() {
  const [openId, setOpenId] = useState(null);
  const { data, isLoading } = useQuery({
    queryKey: ['low-stock-facilities'],
    queryFn:  getLowStockFacilities,
  });
  const facilities = data?.data ?? [];

  const totalRestock = facilities.reduce((s, f) => s + f.restock_count, 0);
  const totalLow     = facilities.reduce((s, f) => s + f.low_count, 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Low stock"
        subtitle="Facilities holding tools at or below the low-stock threshold. Use this list to plan restocking and procurement."
      />

      {/* Legend + totals */}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-red-600" />
          <span className="text-muted">Restock tool (≤ 5)</span>
          <span className="font-semibold num text-ink">{totalRestock}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-amber-500" />
          <span className="text-muted">Low stock (6–10)</span>
          <span className="font-semibold num text-ink">{totalLow}</span>
        </span>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16"><Spinner /></div>
      ) : facilities.length === 0 ? (
        <Card>
          <CardBody>
            <div className="grid place-items-center px-6 py-16 text-center">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50">
                <AlertCircle size={22} className="text-brand-700" />
              </div>
              <p className="text-sm font-medium text-ink">No low stock anywhere</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Every tool at every facility is above the low-stock threshold.
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {facilities.map((f) => {
              const open = openId === f.facility_id;
              return (
                <li key={f.facility_id}>
                  {/* Facility summary row — click to expand */}
                  <button
                    onClick={() => setOpenId(open ? null : f.facility_id)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-stone-50/60"
                  >
                    {open
                      ? <ChevronDown size={16} className="shrink-0 text-muted" />
                      : <ChevronRight size={16} className="shrink-0 text-muted" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{f.facility_name}</p>
                      <p className="text-xs text-muted">{f.lga_name}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {f.restock_count > 0 && (
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white num">
                          {f.restock_count} restock
                        </span>
                      )}
                      {f.low_count > 0 && (
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white num">
                          {f.low_count} low
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Expanded: the specific low tools */}
                  {open && (
                    <div className="border-t border-line bg-stone-50/40 px-5 py-3">
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-line/60">
                          {f.tools.map((t) => {
                            const lvl = stockLevel(t.quantity);
                            return (
                              <tr key={t.tool_id}>
                                <td className="py-2 pr-3">
                                  <span className="text-ink">{t.tool_name}</span>
                                  <span className="ml-2 text-xs text-muted">{t.thematic_area_name}</span>
                                </td>
                                <td className="py-2 pr-3 text-right font-semibold num text-ink">{t.quantity}</td>
                                <td className="py-2 text-right">
                                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', lvl.badge)}>
                                    {lvl.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="mt-2 text-right">
                        <Link
                          to={`/facilities/${f.facility_id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                        >
                          Open facility page <ExternalLink size={12} />
                        </Link>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
