import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, Printer, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFacilities } from '../api/facilities';
import { getTools, getThematicAreas } from '../api/tools';
import { getStateStock } from '../api/stateMovements';
import { recordReceipt } from '../api/movements';
import { downloadFacilityGatePass } from '../api/reports';
import { useAuth } from '../auth/useAuth';
import StateReceive from './state/StateReceive';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Field, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

const schema = z.object({
  facility_id:  z.coerce.number().int().positive('Please select a facility'),
  tool_id:      z.coerce.number().int().positive('Please select a tool'),
  quantity:     z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  reference_no: z.string().trim().optional(),
  note:         z.string().trim().optional(),
});

export default function ReceiveStock() {
  const { user } = useAuth();
  // HQ super-admin records at the STATE tier; everyone else at the facility tier.
  if (user?.role === 'super_admin') return <StateReceive />;
  return <FacilityReceive />;
}

function FacilityReceive() {
  const [searchParams] = useSearchParams();
  const qc             = useQueryClient();
  // The most recent distribution, so the admin can print its delivery note.
  const [lastDist, setLastDist] = useState(null);
  const [printing, setPrinting] = useState(false);

  async function printDeliveryNote() {
    if (!lastDist) return;
    setPrinting(true);
    try {
      await downloadFacilityGatePass({
        facility_id:  lastDist.facilityId,
        reference_no: lastDist.reference || undefined,
        lines:        [{ tool_id: lastDist.toolId, quantity: lastDist.quantity }],
      });
      toast.success('Delivery note downloaded');
    } catch {
      toast.error('Failed to generate delivery note');
    } finally {
      setPrinting(false);
    }
  }

  const { data: facData } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => getFacilities({ limit: 200 }),
  });

  const { data: toolsData } = useQuery({
    queryKey: ['tools'],
    queryFn: () => getTools({ limit: 200 }),
  });

  const { data: areasData } = useQuery({
    queryKey: ['thematic-areas'],
    queryFn: getThematicAreas,
  });

  // The state's per-tool balance, so we can show what's left before submitting.
  const { data: stockData } = useQuery({
    queryKey: ['state-stock'],
    queryFn:  getStateStock,
  });

  const facilities = facData?.data ?? [];
  const tools      = toolsData?.data ?? [];
  const areas      = areasData?.data ?? [];
  // tool_id → available balance in the state.
  const availableByTool = new Map((stockData?.data ?? []).map((r) => [String(r.tool_id), r]));

  // Group facilities by LGA for <optgroup>
  const facilityGroups = facilities.reduce((acc, f) => {
    if (!acc[f.lga_name]) acc[f.lga_name] = [];
    acc[f.lga_name].push(f);
    return acc;
  }, {});

  // Group tools by thematic area for <optgroup>
  const toolGroups = tools.reduce((acc, t) => {
    if (!acc[t.thematic_area_name]) acc[t.thematic_area_name] = [];
    acc[t.thematic_area_name].push(t);
    return acc;
  }, {});

  // Sort area keys by sort_order using areas list
  const areaOrder = areas.map((a) => a.name);
  const sortedToolGroupKeys = Object.keys(toolGroups).sort(
    (a, b) => areaOrder.indexOf(a) - areaOrder.indexOf(b)
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { facility_id: '', tool_id: '', quantity: '', reference_no: '', note: '' },
  });

  // Live view of the selected tool's state balance.
  const selectedToolId = watch('tool_id');
  const selectedQty    = parseInt(watch('quantity'), 10);
  const selectedStock  = selectedToolId ? availableByTool.get(String(selectedToolId)) : undefined;
  const overStock      = selectedStock && Number.isInteger(selectedQty) && selectedQty > selectedStock.available;

  // Pre-fill facility_id from URL param (set by "Record receipt" on facility detail)
  useEffect(() => {
    const fid = searchParams.get('facility_id');
    if (fid) setValue('facility_id', fid);
  }, [searchParams, setValue]);

  const mutation = useMutation({
    mutationFn: ({ payload }) => recordReceipt(payload),
    onSuccess: (_data, { meta }) => {
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      qc.invalidateQueries({ queryKey: ['dashboard-recent'] });
      qc.invalidateQueries({ queryKey: ['dashboard-coverage'] });
      qc.invalidateQueries({ queryKey: ['facility-stock'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['state-stock'] });
      qc.invalidateQueries({ queryKey: ['notification-summary'] });

      // Confirm exactly which facility the receipt was logged to —
      // important so the admin doesn't accidentally pick the wrong one.
      toast.success(
        `Recorded ${meta.quantity} × ${meta.toolName} for ${meta.facilityName}`,
        { duration: 4500 }
      );
      setLastDist({
        facilityId:   meta.facilityId,
        facilityName: meta.facilityName,
        toolId:       meta.toolId,
        toolName:     meta.toolName,
        quantity:     meta.quantity,
        reference:    meta.reference,
      });
      reset({
        facility_id:  searchParams.get('facility_id') ?? '',
        tool_id:      '',
        quantity:     '',
        reference_no: '',
        note:         '',
      });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error ?? 'Failed to record receipt');
    },
  });

  const onSubmit = (data) => {
    const facility = facilities.find((f) => String(f.id) === String(data.facility_id));
    const tool     = tools.find((t) => String(t.id) === String(data.tool_id));
    mutation.mutate({
      payload: data,
      meta:    {
        facilityId:   Number(data.facility_id),
        facilityName: facility ? `${facility.name} (${facility.lga_name})` : 'facility',
        toolId:       Number(data.tool_id),
        toolName:     tool?.name ?? 'tool',
        quantity:     data.quantity,
        reference:    data.reference_no,
      },
    });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Single distribution"
        subtitle="Send one tool to one facility. Each submission creates a permanent audit record and awaits the facility's physical confirmation."
      />

      <div className="max-w-xl">
        {/* After a distribution, offer its delivery note for printing. */}
        {lastDist && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <CheckCircle size={18} className="mt-0.5 shrink-0 text-brand-700" />
              <p className="text-sm text-ink">
                Recorded <span className="font-semibold">{lastDist.quantity} × {lastDist.toolName}</span> for{' '}
                <span className="font-semibold">{lastDist.facilityName}</span>. Print a delivery note for the facility to sign.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="sm"
                variant="secondary"
                loading={printing}
                leftIcon={<Printer size={15} />}
                onClick={printDeliveryNote}
              >
                Print delivery note
              </Button>
              <button
                type="button"
                onClick={() => setLastDist(null)}
                className="rounded-md p-2 text-muted transition-colors hover:bg-white hover:text-ink"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Facility */}
              <Field id="facility_id" label="Facility" required error={errors.facility_id?.message}>
                <Select id="facility_id" {...register('facility_id')} error={errors.facility_id?.message}>
                  <option value="">Select facility…</option>
                  {Object.entries(facilityGroups)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([lgaName, facs]) => (
                      <optgroup key={lgaName} label={lgaName}>
                        {facs.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </optgroup>
                    ))}
                </Select>
              </Field>

              {/* Tool */}
              <Field id="tool_id" label="Tool" required error={errors.tool_id?.message}>
                <Select id="tool_id" {...register('tool_id')} error={errors.tool_id?.message}>
                  <option value="">Select tool…</option>
                  {sortedToolGroupKeys.map((areaName) => (
                    <optgroup key={areaName} label={areaName}>
                      {toolGroups[areaName].map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
                {selectedToolId && (
                  selectedStock ? (
                    <p className={`mt-1.5 text-xs ${selectedStock.available === 0 ? 'text-red-600' : 'text-muted'}`}>
                      State balance:{' '}
                      <span className={`font-semibold num ${selectedStock.available === 0 ? 'text-red-600' : 'text-accent-700'}`}>
                        {selectedStock.available}
                      </span>{' '}
                      available ({selectedStock.received} received, {selectedStock.distributed} distributed)
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-red-600">
                      Not in your state stock yet — request it from HQ before distributing.
                    </p>
                  )
                )}
              </Field>

              {/* Quantity */}
              <Field id="quantity" label="Quantity received" required error={errors.quantity?.message}>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 50"
                  {...register('quantity')}
                  error={errors.quantity?.message}
                />
              </Field>

              {/* Reference number */}
              <Field
                id="reference_no"
                label="Reference / waybill number"
                hint="Optional — for linking to a physical document."
              >
                <Input
                  id="reference_no"
                  placeholder="e.g. WB-2025-001"
                  {...register('reference_no')}
                />
              </Field>

              {/* Note */}
              <Field id="note" label="Note" hint="Optional — any extra context about this receipt.">
                <Textarea
                  id="note"
                  placeholder="e.g. Partial delivery — remainder expected next week."
                  {...register('note')}
                />
              </Field>

              {/* Over-distribution guard — mirrors the backend check. */}
              {overStock && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Only <span className="font-semibold num">{selectedStock.available}</span> of{' '}
                  <span className="font-semibold">{selectedStock.tool_name}</span> available in your state stock —
                  you cannot distribute {selectedQty}. Reduce the quantity or request more from HQ.
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <Link to="/movements" className="text-sm text-muted hover:text-ink transition-colors">
                  View movement log →
                </Link>
                <Button
                  type="submit"
                  loading={isSubmitting}
                  disabled={overStock}
                  leftIcon={<CheckCircle size={16} />}
                >
                  Record receipt
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
