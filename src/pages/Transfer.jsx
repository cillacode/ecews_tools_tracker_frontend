import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeftRight, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/useAuth';
import { getFacilities } from '../api/facilities';
import { getTools, getThematicAreas } from '../api/tools';
import { recordTransfer } from '../api/movements';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Field, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

const schema = z.object({
  source_facility_id: z.coerce.number().int().positive('Please select the source facility'),
  dest_facility_id:   z.coerce.number().int().positive('Please select the destination facility'),
  tool_id:            z.coerce.number().int().positive('Please select a tool'),
  quantity:           z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  reference_no:       z.string().trim().optional(),
  note:               z.string().trim().optional(),
}).refine((d) => String(d.source_facility_id) !== String(d.dest_facility_id), {
  message: 'Source and destination must be different facilities',
  path:    ['dest_facility_id'],
});

export default function Transfer() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isFacilityUser = user?.role === 'facility_user';

  const { data: facData  } = useQuery({ queryKey: ['facilities'],     queryFn: () => getFacilities({ limit: 200 }) });
  const { data: toolsData } = useQuery({ queryKey: ['tools'],          queryFn: () => getTools({ limit: 200 }) });
  const { data: areasData } = useQuery({ queryKey: ['thematic-areas'], queryFn: getThematicAreas });

  const facilities = facData?.data  ?? [];
  const tools      = toolsData?.data ?? [];
  const areas      = areasData?.data ?? [];

  const facilityGroups = facilities.reduce((acc, f) => {
    if (!acc[f.lga_name]) acc[f.lga_name] = [];
    acc[f.lga_name].push(f);
    return acc;
  }, {});

  const toolGroups = tools.reduce((acc, t) => {
    if (!acc[t.thematic_area_name]) acc[t.thematic_area_name] = [];
    acc[t.thematic_area_name].push(t);
    return acc;
  }, {});
  const areaOrder = areas.map((a) => a.name);
  const sortedToolGroupKeys = Object.keys(toolGroups).sort(
    (a, b) => areaOrder.indexOf(a) - areaOrder.indexOf(b)
  );

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      source_facility_id: isFacilityUser ? String(user?.facility_id ?? '') : '',
      dest_facility_id:   '',
      tool_id:            '',
      quantity:           '',
      reference_no:       '',
      note:               '',
    },
  });

  // Lock source for facility users — always their own facility.
  useEffect(() => {
    if (isFacilityUser && user?.facility_id) {
      setValue('source_facility_id', String(user.facility_id));
    }
  }, [isFacilityUser, user?.facility_id, setValue]);

  // Filter destination options to exclude the user's own facility.
  const destFacilityOptions = (
    <>
      <option value="">Select facility…</option>
      {Object.entries(facilityGroups).sort(([a],[b]) => a.localeCompare(b)).map(([lga, facs]) => {
        const filtered = isFacilityUser ? facs.filter((f) => f.id !== user?.facility_id) : facs;
        if (filtered.length === 0) return null;
        return (
          <optgroup key={lga} label={lga}>
            {filtered.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </optgroup>
        );
      })}
    </>
  );

  const facilityOptions = (
    <>
      <option value="">Select facility…</option>
      {Object.entries(facilityGroups).sort(([a],[b]) => a.localeCompare(b)).map(([lga, facs]) => (
        <optgroup key={lga} label={lga}>
          {facs.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </optgroup>
      ))}
    </>
  );

  const mutation = useMutation({
    mutationFn: recordTransfer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      qc.invalidateQueries({ queryKey: ['dashboard-recent'] });
      qc.invalidateQueries({ queryKey: ['dashboard-coverage'] });
      qc.invalidateQueries({ queryKey: ['facility-stock'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
      toast.success('Transfer recorded successfully');
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.error ?? 'Failed to record transfer'),
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inter-facility transfer"
        subtitle="Move stock from one facility to another. Both balances update atomically."
      />

      <div className="max-w-xl">
        <Card>
          <CardBody>
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">

              {/* Source → Destination in one visual row on desktop */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  id="source_facility_id"
                  label="From (source)"
                  required
                  hint={isFacilityUser ? 'Locked to your facility.' : undefined}
                  error={errors.source_facility_id?.message}
                >
                  <div className={`relative ${isFacilityUser ? 'pointer-events-none' : ''}`}>
                    <Select
                      id="source_facility_id"
                      {...register('source_facility_id')}
                      error={errors.source_facility_id?.message}
                      aria-disabled={isFacilityUser}
                      tabIndex={isFacilityUser ? -1 : undefined}
                      className={isFacilityUser ? 'bg-stone-50 text-muted pr-9' : ''}
                    >
                      {facilityOptions}
                    </Select>
                    {isFacilityUser && (
                      <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
                    )}
                  </div>
                </Field>
                <Field id="dest_facility_id" label="To (destination)" required error={errors.dest_facility_id?.message}>
                  <Select id="dest_facility_id" {...register('dest_facility_id')} error={errors.dest_facility_id?.message}>
                    {destFacilityOptions}
                  </Select>
                </Field>
              </div>

              <Field id="tool_id" label="Tool" required error={errors.tool_id?.message}>
                <Select id="tool_id" {...register('tool_id')} error={errors.tool_id?.message}>
                  <option value="">Select tool…</option>
                  {sortedToolGroupKeys.map((area) => (
                    <optgroup key={area} label={area}>
                      {toolGroups[area].map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </optgroup>
                  ))}
                </Select>
              </Field>

              <Field id="quantity" label="Quantity to transfer" required error={errors.quantity?.message}>
                <Input id="quantity" type="number" min="1" step="1" placeholder="e.g. 10" {...register('quantity')} error={errors.quantity?.message} />
              </Field>

              <Field id="reference_no" label="Reference / waybill number" hint="Optional.">
                <Input id="reference_no" placeholder="e.g. TRF-001" {...register('reference_no')} />
              </Field>

              <Field id="note" label="Note" hint="Optional extra context.">
                <Textarea id="note" placeholder="Reason for transfer…" {...register('note')} />
              </Field>

              <div className="flex justify-end pt-2">
                <Button type="submit" loading={isSubmitting} leftIcon={<ArrowLeftRight size={16} />}>
                  Record transfer
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
