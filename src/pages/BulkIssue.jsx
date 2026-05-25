import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PackageCheck, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFacilities } from '../api/facilities';
import { getTools, getThematicAreas } from '../api/tools';
import { recordBulkReceipt } from '../api/movements';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Field } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

const schema = z.object({
  tool_id:      z.coerce.number().int().positive('Please select a tool'),
  reference_no: z.string().trim().optional(),
  note:         z.string().trim().optional(),
});

export default function BulkIssue() {
  const qc = useQueryClient();
  // Items = [{ facility_id: string, quantity: string }]
  const [items, setItems] = useState([{ facility_id: '', quantity: '' }]);

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

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { tool_id: '', reference_no: '', note: '' },
  });

  function addRow()          { setItems((p) => [...p, { facility_id: '', quantity: '' }]); }
  function removeRow(i)      { setItems((p) => p.filter((_, idx) => idx !== i)); }
  function updateRow(i, key, val) {
    setItems((p) => p.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  }

  const mutation = useMutation({
    mutationFn: recordBulkReceipt,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      qc.invalidateQueries({ queryKey: ['dashboard-recent'] });
      qc.invalidateQueries({ queryKey: ['dashboard-coverage'] });
      qc.invalidateQueries({ queryKey: ['facility-stock'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
      toast.success(`Recorded ${data.count} receipts`);
      reset();
      setItems([{ facility_id: '', quantity: '' }]);
    },
    onError: (err) => toast.error(err.response?.data?.error ?? 'Failed to record bulk receipt'),
  });

  function onSubmit(formData) {
    const validItems = items.filter((i) => i.facility_id && i.quantity);
    if (validItems.length === 0) {
      toast.error('Add at least one facility with a quantity');
      return;
    }
    const invalidQty = validItems.some((i) => parseInt(i.quantity, 10) <= 0);
    if (invalidQty) {
      toast.error('All quantities must be at least 1');
      return;
    }
    mutation.mutate({
      tool_id:      formData.tool_id,
      items:        validItems.map((i) => ({ facility_id: parseInt(i.facility_id, 10), quantity: parseInt(i.quantity, 10) })),
      reference_no: formData.reference_no || undefined,
      note:         formData.note         || undefined,
    });
  }

  const facilityOptions = Object.entries(facilityGroups)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([lga, facs]) => (
      <optgroup key={lga} label={lga}>
        {facs.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </optgroup>
    ));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Bulk issue"
        subtitle="Distribute one tool to multiple facilities in a single submission."
      />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Tool + ref */}
          <Card>
            <CardBody className="space-y-4">
              <Field id="tool_id" label="Tool to distribute" required error={errors.tool_id?.message}>
                <Select id="tool_id" {...register('tool_id')} error={errors.tool_id?.message}>
                  <option value="">Select tool…</option>
                  {sortedToolGroupKeys.map((area) => (
                    <optgroup key={area} label={area}>
                      {toolGroups[area].map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </optgroup>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="reference_no" label="Reference / waybill" hint="Optional — applies to all rows.">
                  <Input id="reference_no" placeholder="e.g. WB-2025-010" {...register('reference_no')} />
                </Field>
                <Field id="note" label="Note" hint="Optional.">
                  <Input id="note" placeholder="e.g. Q2 distribution" {...register('note')} />
                </Field>
              </div>
            </CardBody>
          </Card>

          {/* Facility rows */}
          <Card>
            <CardHeader action={
              <Button type="button" variant="secondary" size="sm" leftIcon={<Plus size={14} />} onClick={addRow}>
                Add facility
              </Button>
            }>
              <CardTitle>Facilities & quantities</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="flex-1">
                    {i === 0 && <p className="mb-1.5 text-sm font-medium text-ink">Facility <span className="text-red-600">*</span></p>}
                    <Select
                      value={item.facility_id}
                      onChange={(e) => updateRow(i, 'facility_id', e.target.value)}
                    >
                      <option value="">Select facility…</option>
                      {facilityOptions}
                    </Select>
                  </div>
                  <div className="w-28">
                    {i === 0 && <p className="mb-1.5 text-sm font-medium text-ink">Qty <span className="text-red-600">*</span></p>}
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateRow(i, 'quantity', e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={items.length === 1}
                    className="mb-0.5 rounded-md p-2 text-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                    aria-label="Remove row"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}

              <p className="text-xs text-muted">
                {items.filter((i) => i.facility_id && i.quantity).length} of {items.length} row{items.length !== 1 ? 's' : ''} ready
              </p>
            </CardBody>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting} leftIcon={<PackageCheck size={16} />}>
              Submit bulk issue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
