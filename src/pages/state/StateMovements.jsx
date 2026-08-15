import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { getStateMovements } from '../../api/stateMovements';
import { getStates } from '../../api/facilities';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { formatDateTime } from '../../lib/formatters';

const LIMIT = 50;

// HQ → State distribution log. Super-admin only.
export default function StateMovements() {
  const [page,    setPage]    = useState(1);
  const [stateId, setStateId] = useState('');
  const [from,    setFrom]    = useState('');
  const [to,      setTo]      = useState('');

  const filters = { state_id: stateId || undefined, from: from || undefined, to: to || undefined, page, limit: LIMIT };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['state-movements', filters],
    queryFn:  () => getStateMovements(filters),
    placeholderData: (prev) => prev,
  });
  const { data: stateData } = useQuery({ queryKey: ['states'], queryFn: getStates });

  const rows   = data?.data ?? [];
  const meta   = data?.meta ?? { total: 0, page: 1, pages: 1 };
  const states = stateData?.data ?? [];

  const hasFilters = stateId || from || to;
  const applyFilter = (setter) => (val) => { setter(val); setPage(1); };
  function clearFilters() { setStateId(''); setFrom(''); setTo(''); setPage(1); }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="State inventory"
        subtitle="Distribution log — tools HQ has sent to each state."
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2"><Filter size={14} className="text-muted" />Filter</span>
          </CardTitle>
          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}
        </CardHeader>
        <CardBody className="pt-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Select value={stateId} onChange={(e) => applyFilter(setStateId)(e.target.value)}>
              <option value="">All states</option>
              {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Input type="date" value={from} onChange={(e) => applyFilter(setFrom)(e.target.value)} />
            <Input type="date" value={to}   onChange={(e) => applyFilter(setTo)(e.target.value)} />
          </div>
        </CardBody>
      </Card>

      <Card>
        {isLoading ? (
          <div className="grid place-items-center py-16"><Spinner /></div>
        ) : rows.length === 0 ? (
          <div className="grid place-items-center px-6 py-16 text-center">
            <p className="text-sm text-muted">
              {hasFilters ? 'No movements match your filters.' : 'No state distributions recorded yet.'}
            </p>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-stone-50/60 text-left">
                  <th className="px-5 py-3 font-medium text-muted whitespace-nowrap">Date / Time</th>
                  <th className="px-5 py-3 font-medium text-muted">State</th>
                  <th className="px-5 py-3 font-medium text-muted">Tool</th>
                  <th className="px-5 py-3 font-medium text-muted">Thematic area</th>
                  <th className="px-5 py-3 font-medium text-muted text-right">Qty</th>
                  <th className="px-5 py-3 font-medium text-muted">Ref no.</th>
                  <th className="px-5 py-3 font-medium text-muted">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((m) => (
                  <tr key={m.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-muted">{formatDateTime(m.performed_at)}</td>
                    <td className="px-5 py-3">
                      <Badge tone="brand">{m.state_name}</Badge>
                    </td>
                    <td className="px-5 py-3 text-ink max-w-[220px] truncate">{m.tool_name}</td>
                    <td className="px-5 py-3 text-muted text-xs">{m.thematic_area_name}</td>
                    <td className="px-5 py-3 text-right font-semibold num text-ink">{m.quantity}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted">{m.reference_no ?? '—'}</td>
                    <td className="px-5 py-3 text-muted text-xs whitespace-nowrap">{m.performed_by_name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta.total > 0 && (
          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <p className="text-xs text-muted">
              Showing {((meta.page - 1) * LIMIT) + 1}–{Math.min(meta.page * LIMIT, meta.total)} of {meta.total}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} leftIcon={<ChevronLeft size={14} />}>Prev</Button>
              <span className="text-xs text-muted num">{meta.page} / {meta.pages}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(meta.pages, p + 1))} disabled={page >= meta.pages} rightIcon={<ChevronRight size={14} />}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
