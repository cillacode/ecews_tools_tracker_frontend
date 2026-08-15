import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, FileDown, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/useAuth';
import { getLowTools, downloadProcurementPdf } from '../api/procurement';
import { getStates } from '../api/facilities';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Spinner } from '../components/ui/Spinner';
import { cn } from '../lib/utils';

const DEFAULT_THRESHOLD = 20;

// State-level procurement module: every tool whose TOTAL across the state's
// facilities is at/below the re-order level, grouped by thematic area, with
// a printable PDF request to send to HQ.
export default function Procurement() {
  const { user } = useAuth();
  const isSuper = user?.role === 'super_admin';

  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [stateId, setStateId] = useState(''); // super_admin only
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data: stateData } = useQuery({
    queryKey: ['states'],
    queryFn:  getStates,
    enabled:  isSuper,
  });
  const states = stateData?.data ?? [];

  const params = {
    threshold,
    ...(isSuper ? { state_id: stateId || undefined } : {}),
  };
  const enabled = !isSuper || Boolean(stateId);

  const { data, isLoading } = useQuery({
    queryKey: ['procurement-low-tools', params],
    queryFn:  () => getLowTools(params),
    enabled,
  });

  const rows = data?.data ?? [];
  const stateName = data?.state?.name;

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

  async function handlePdf() {
    setPdfLoading(true);
    try {
      await downloadProcurementPdf(params);
      toast.success('Procurement request PDF downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={isSuper ? 'Procurement' : 'Tools request'}
        subtitle={`Tools whose balance left in ${stateName ? `${stateName} State` : 'the state'} has fallen to the re-order level — grouped by thematic area, ready to request from HQ.`}
        actions={
          <Button
            variant="primary"
            leftIcon={<FileDown size={16} />}
            loading={pdfLoading}
            onClick={handlePdf}
            disabled={!enabled || rows.length === 0}
          >
            Download request PDF
          </Button>
        }
      />

      {/* Controls */}
      <Card className="mb-4">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {isSuper && (
            <div className="w-full sm:w-56">
              <p className="mb-1.5 text-sm font-medium text-ink">State</p>
              <Select value={stateId} onChange={(e) => setStateId(e.target.value)}>
                <option value="">Select state…</option>
                {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
          )}
          <div className="w-full sm:w-44">
            <p className="mb-1.5 text-sm font-medium text-ink">Re-order level</p>
            <Input
              type="number" min="0" step="1"
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
          </div>
          <p className="flex items-start gap-1.5 pb-2 text-xs text-muted sm:pb-2.5">
            <Info size={13} className="mt-0.5 shrink-0 text-brand-700" />
            A tool is flagged when the state's balance left (received from HQ − distributed to facilities) is at or below this number — the same figure shown on State inventory.
          </p>
        </CardBody>
      </Card>

      {!enabled ? (
        <Card><CardBody>
          <div className="grid place-items-center px-6 py-16 text-center">
            <p className="text-sm text-muted">Select a state to view its procurement needs.</p>
          </div>
        </CardBody></Card>
      ) : isLoading ? (
        <div className="grid place-items-center py-16"><Spinner /></div>
      ) : rows.length === 0 ? (
        <Card><CardBody>
          <div className="grid place-items-center px-6 py-16 text-center">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50">
              <ShoppingCart size={22} className="text-brand-700" />
            </div>
            <p className="text-sm font-medium text-ink">Nothing to request</p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              No tool's state-wide balance is at or below {threshold}.
            </p>
          </div>
        </CardBody></Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink num">{rows.length}</span> tool{rows.length !== 1 ? 's' : ''} at
            or below the re-order level of <span className="font-semibold text-ink num">{threshold}</span>
          </p>

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
                      <th className="px-5 py-3 font-medium text-muted text-right">Balance left</th>
                      <th className="px-5 py-3 font-medium text-muted text-right">Facilities holding</th>
                      <th className="px-5 py-3 font-medium text-muted text-right">HQ sent to date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {group.tools.map((t) => {
                      const urgent = t.state_total <= Math.floor(threshold / 2);
                      return (
                        <tr key={t.tool_id} className="hover:bg-stone-50/60 transition-colors">
                          <td className="px-5 py-3 font-medium text-ink">{t.tool_name}</td>
                          <td className={cn('px-5 py-3 text-right font-semibold num', urgent ? 'text-red-600' : 'text-accent-700')}>
                            {t.state_total}
                          </td>
                          <td className="px-5 py-3 text-right num text-muted">{t.facilities_holding}</td>
                          <td className="px-5 py-3 text-right num text-muted">{t.hq_sent_total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
