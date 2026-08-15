import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { getMovements } from '../api/movements';
import { getFacilities } from '../api/facilities';
import { useAuth } from '../auth/useAuth';
import StateMovements from './state/StateMovements';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Spinner } from '../components/ui/Spinner';
import { formatDateTime, MOVEMENT_LABELS, MOVEMENT_TONES } from '../lib/formatters';

const MOVEMENT_TYPES = [
  { value: '',                     label: 'All types' },
  { value: 'RECEIPT',              label: 'Receipt' },
  { value: 'ADJUSTMENT_INCREASE',  label: 'Adjustment +' },
  { value: 'ADJUSTMENT_DECREASE',  label: 'Adjustment −' },
  { value: 'TRANSFER_OUT',         label: 'Transfer Out' },
  { value: 'TRANSFER_IN',          label: 'Transfer In' },
];

const LIMIT = 50;

export default function Movements() {
  const { user } = useAuth();
  // HQ super-admin sees the STATE-tier distribution log.
  if (user?.role === 'super_admin') return <StateMovements />;
  return <FacilityMovements />;
}

function FacilityMovements() {
  const [page,        setPage]       = useState(1);
  const [facilityId,  setFacility]   = useState('');
  const [type,        setType]       = useState('');
  const [from,        setFrom]       = useState('');
  const [to,          setTo]         = useState('');

  const filters = { facility_id: facilityId || undefined, type: type || undefined, from: from || undefined, to: to || undefined, page, limit: LIMIT };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['movements', filters],
    queryFn: () => getMovements(filters),
    placeholderData: (prev) => prev,
  });

  const { data: facData } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => getFacilities({ limit: 200 }),
  });

  const rows      = data?.data ?? [];
  const meta      = data?.meta ?? { total: 0, page: 1, pages: 1 };
  const facilities = facData?.data ?? [];

  function clearFilters() {
    setFacility(''); setType(''); setFrom(''); setTo(''); setPage(1);
  }

  const hasFilters = facilityId || type || from || to;

  // Reset to page 1 whenever a filter changes
  function applyFilter(setter) {
    return (val) => { setter(val); setPage(1); };
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Stock movement"
        subtitle="Immutable audit ledger — every stock receipt, adjustment, and transfer."
      />

      {/* Filter bar */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Filter size={14} className="text-muted" />
              Filter
            </span>
          </CardTitle>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </CardHeader>
        <CardBody className="pt-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Select value={type} onChange={(e) => applyFilter(setType)(e.target.value)}>
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>

            <Select value={facilityId} onChange={(e) => applyFilter(setFacility)(e.target.value)}>
              <option value="">All facilities</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </Select>

            <Input
              type="date"
              value={from}
              onChange={(e) => applyFilter(setFrom)(e.target.value)}
              placeholder="From date"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => applyFilter(setTo)(e.target.value)}
              placeholder="To date"
            />
          </div>
        </CardBody>
      </Card>

      {/* Results */}
      <Card>
        {/* Table */}
        {isLoading ? (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <div className="grid place-items-center px-6 py-16 text-center">
            <p className="text-sm text-muted">
              {hasFilters ? 'No movements match your filters.' : 'No movements recorded yet.'}
            </p>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-stone-50/60 text-left">
                  <th className="px-5 py-3 font-medium text-muted whitespace-nowrap">Date / Time</th>
                  <th className="px-5 py-3 font-medium text-muted">Type</th>
                  <th className="px-5 py-3 font-medium text-muted">Facility</th>
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
                    <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-muted">
                      {formatDateTime(m.performed_at)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={MOVEMENT_TONES[m.movement_type]}>
                        {MOVEMENT_LABELS[m.movement_type]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-ink max-w-[160px] truncate">{m.facility_name}</td>
                    <td className="px-5 py-3 text-ink max-w-[200px] truncate">{m.tool_name}</td>
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

        {/* Pagination */}
        {meta.total > 0 && (
          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <p className="text-xs text-muted">
              Showing {((meta.page - 1) * LIMIT) + 1}–{Math.min(meta.page * LIMIT, meta.total)} of {meta.total} movements
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                leftIcon={<ChevronLeft size={14} />}
              >
                Prev
              </Button>
              <span className="text-xs text-muted num">
                {meta.page} / {meta.pages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                disabled={page >= meta.pages}
                rightIcon={<ChevronRight size={14} />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
