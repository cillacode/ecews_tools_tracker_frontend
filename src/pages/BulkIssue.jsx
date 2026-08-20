import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Printer, X, PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFacilities } from '../api/facilities';
import { getTools, getThematicAreas } from '../api/tools';
import { getStateStock } from '../api/stateMovements';
import { recordBulkReceipt } from '../api/movements';
import { downloadFacilitiesGatePass } from '../api/reports';
import { useAuth } from '../auth/useAuth';
import StateBulkIssue from './state/StateBulkIssue';
import { PageHeader } from '../components/layout/PageHeader';
import { BulkMatrix } from '../components/BulkMatrix';
import { Button } from '../components/ui/Button';

export default function BulkIssue() {
  const { user } = useAuth();
  // HQ super-admin bulk-issues to STATES; everyone else to facilities.
  if (user?.role === 'super_admin') return <StateBulkIssue />;
  return <FacilityBulkIssue />;
}

function FacilityBulkIssue() {
  const qc = useQueryClient();
  const [formKey,  setFormKey]  = useState(0);   // bump to reset the grid
  const [lastBulk, setLastBulk] = useState(null); // for the delivery-note banner
  const [printing, setPrinting] = useState(false);

  const { data: facData   } = useQuery({ queryKey: ['facilities'],     queryFn: () => getFacilities({ limit: 1000 }) });
  const { data: toolsData } = useQuery({ queryKey: ['tools'],          queryFn: () => getTools({ limit: 300 }) });
  const { data: areasData } = useQuery({ queryKey: ['thematic-areas'], queryFn: getThematicAreas });
  const { data: stockData } = useQuery({ queryKey: ['state-stock'],    queryFn: getStateStock });

  const facilities   = facData?.data  ?? [];
  const tools        = toolsData?.data ?? [];
  const areas        = areasData?.data ?? [];
  const availableByTool = new Map((stockData?.data ?? []).map((r) => [String(r.tool_id), r]));

  // Facilities as grid rows, grouped by LGA in the picker.
  const destinations = facilities.map((f) => ({ id: f.id, name: f.name, group: f.lga_name }));

  const mutation = useMutation({
    mutationFn: recordBulkReceipt,
    onSuccess: (data, variables) => {
      ['dashboard-kpis', 'dashboard-recent', 'dashboard-coverage', 'facility-stock', 'movements', 'state-stock', 'notification-summary']
        .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`Recorded ${data.count} distribution${data.count !== 1 ? 's' : ''}`);

      // Group the submitted lines by facility for a combined delivery note.
      const byFac = new Map();
      for (const it of variables.items) {
        if (!byFac.has(it.facility_id)) {
          const f = facilities.find((x) => x.id === it.facility_id);
          byFac.set(it.facility_id, {
            facility_id: it.facility_id,
            name:        f ? `${f.name} (${f.lga_name})` : `Facility #${it.facility_id}`,
            lines:       [],
          });
        }
        byFac.get(it.facility_id).lines.push({ tool_id: it.tool_id, quantity: it.quantity });
      }
      setLastBulk({
        reference:   variables.reference_no,
        facilities:  [...byFac.values()],
        toolCount:   new Set(variables.items.map((i) => i.tool_id)).size,
      });
      setFormKey((k) => k + 1); // reset the grid
    },
    onError: (err) => toast.error(err.response?.data?.error ?? 'Failed to record bulk distribution'),
  });

  function handleSubmit(lines, meta) {
    mutation.mutate({
      items:        lines.map((l) => ({ tool_id: l.tool_id, facility_id: l.dest_id, quantity: l.quantity })),
      reference_no: meta.reference_no,
      note:         meta.note,
    });
  }

  async function printDeliveryNotes() {
    if (!lastBulk) return;
    setPrinting(true);
    try {
      await downloadFacilitiesGatePass({
        reference_no: lastBulk.reference || undefined,
        facilities:   lastBulk.facilities.map((f) => ({ facility_id: f.facility_id, lines: f.lines })),
      });
      toast.success('Delivery notes downloaded');
    } catch {
      toast.error('Failed to generate delivery notes');
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Bulk distribution"
        subtitle="Send multiple tools to multiple facilities in one submission. Fill the quantity grid — leave a cell blank to send nothing."
      />

      <div className="max-w-4xl">
        {/* After a bulk distribution, offer a combined delivery note — one page per facility. */}
        {lastBulk && (
          <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <PackageCheck size={18} className="mt-0.5 shrink-0 text-brand-700" />
                <p className="text-sm text-ink">
                  Distributed <span className="font-semibold">{lastBulk.toolCount} tool{lastBulk.toolCount !== 1 ? 's' : ''}</span> to{' '}
                  <span className="font-semibold">{lastBulk.facilities.length} facilit{lastBulk.facilities.length !== 1 ? 'ies' : 'y'}</span>.
                  Print the delivery notes — one page per facility.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button size="sm" variant="secondary" loading={printing} leftIcon={<Printer size={15} />} onClick={printDeliveryNotes}>
                  Print delivery notes
                </Button>
                <button
                  type="button"
                  onClick={() => setLastBulk(null)}
                  className="rounded-md p-2 text-muted transition-colors hover:bg-white hover:text-ink"
                  aria-label="Dismiss"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        <BulkMatrix
          key={formKey}
          tools={tools}
          areas={areas}
          destinations={destinations}
          destinationLabel="Facility"
          destinationNoun="facilities"
          availableByTool={availableByTool}
          submitting={mutation.isPending}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
