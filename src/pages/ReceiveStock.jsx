import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFacilities } from '../api/facilities';
import { getTools, getThematicAreas } from '../api/tools';
import { recordReceipt } from '../api/movements';
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
  const [searchParams] = useSearchParams();
  const qc             = useQueryClient();

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

  const facilities = facData?.data ?? [];
  const tools      = toolsData?.data ?? [];
  const areas      = areasData?.data ?? [];

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
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { facility_id: '', tool_id: '', quantity: '', reference_no: '', note: '' },
  });

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

      // Confirm exactly which facility the receipt was logged to —
      // important so the admin doesn't accidentally pick the wrong one.
      toast.success(
        `Recorded ${meta.quantity} × ${meta.toolName} for ${meta.facilityName}`,
        { duration: 4500 }
      );
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
        facilityName: facility ? `${facility.name} (${facility.lga_name})` : 'facility',
        toolName:     tool?.name ?? 'tool',
        quantity:     data.quantity,
      },
    });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Record receipt"
        subtitle="Log stock arriving at a facility. Each submission creates a permanent audit record."
      />

      <div className="max-w-xl">
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

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <Link to="/movements" className="text-sm text-muted hover:text-ink transition-colors">
                  View movement log →
                </Link>
                <Button
                  type="submit"
                  loading={isSubmitting}
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
