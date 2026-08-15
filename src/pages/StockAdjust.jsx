import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFacilities } from '../api/facilities';
import { getTools, getThematicAreas } from '../api/tools';
import { recordAdjustment } from '../api/movements';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Field, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

const schema = z.object({
  facility_id: z.coerce.number().int().positive('Please select a facility'),
  tool_id:     z.coerce.number().int().positive('Please select a tool'),
  type:        z.enum(['ADJUSTMENT_INCREASE', 'ADJUSTMENT_DECREASE']),
  quantity:    z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  reason:      z.string().trim().min(1, 'Reason is required'),
  note:        z.string().trim().optional(),
});

const REASONS = {
  ADJUSTMENT_INCREASE: ['Found during stock count', 'Returned from field', 'Error correction', 'Other'],
  ADJUSTMENT_DECREASE: ['Damaged / unusable', 'Lost / stolen', 'Used in programme', 'Error correction', 'Other'],
};

export default function StockAdjust() {
  const qc = useQueryClient();

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

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { type: 'ADJUSTMENT_DECREASE', facility_id: '', tool_id: '', quantity: '', reason: '', note: '' },
  });

  const adjType = watch('type');

  const mutation = useMutation({
    mutationFn: recordAdjustment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      qc.invalidateQueries({ queryKey: ['dashboard-recent'] });
      qc.invalidateQueries({ queryKey: ['dashboard-coverage'] });
      qc.invalidateQueries({ queryKey: ['facility-stock'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
      toast.success('Adjustment recorded');
      reset({ type: adjType, facility_id: '', tool_id: '', quantity: '', reason: '', note: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error ?? 'Failed to record adjustment'),
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Stock Adjustments"
        subtitle="Correct a facility's stock balance. A mandatory reason is recorded with every adjustment."
      />

      <div className="max-w-xl">
        <Card>
          <CardBody>
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">

              {/* Adjustment type — prominent toggle */}
              <div>
                <p className="mb-2 text-sm font-medium text-ink">Adjustment type <span className="text-red-600">*</span></p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'ADJUSTMENT_INCREASE', label: '＋ Increase', hint: 'Add to balance' },
                    { value: 'ADJUSTMENT_DECREASE', label: '－ Decrease', hint: 'Remove from balance' },
                  ].map((opt) => (
                    <label key={opt.value} className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border-2 px-4 py-3 transition-colors ${adjType === opt.value ? 'border-brand-700 bg-brand-50' : 'border-line hover:border-stone-300'}`}>
                      <input type="radio" value={opt.value} {...register('type')} className="sr-only" />
                      <span className="text-sm font-semibold text-ink">{opt.label}</span>
                      <span className="text-xs text-muted">{opt.hint}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Field id="facility_id" label="Facility" required error={errors.facility_id?.message}>
                <Select id="facility_id" {...register('facility_id')} error={errors.facility_id?.message}>
                  <option value="">Select facility…</option>
                  {Object.entries(facilityGroups).sort(([a],[b]) => a.localeCompare(b)).map(([lga, facs]) => (
                    <optgroup key={lga} label={lga}>
                      {facs.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </optgroup>
                  ))}
                </Select>
              </Field>

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

              <Field id="quantity" label="Quantity" required error={errors.quantity?.message}>
                <Input id="quantity" type="number" min="1" step="1" placeholder="e.g. 5" {...register('quantity')} error={errors.quantity?.message} />
              </Field>

              <Field id="reason" label="Reason" required error={errors.reason?.message}>
                <Select id="reason" {...register('reason')} error={errors.reason?.message}>
                  <option value="">Select reason…</option>
                  {(REASONS[adjType] ?? REASONS.ADJUSTMENT_DECREASE).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </Select>
              </Field>

              <Field id="note" label="Additional note" hint="Optional extra detail.">
                <Textarea id="note" placeholder="e.g. 3 registers found water-damaged during facility visit." {...register('note')} />
              </Field>

              <div className="flex justify-end pt-2">
                <Button type="submit" loading={isSubmitting} leftIcon={<SlidersHorizontal size={16} />}>
                  Record adjustment
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
