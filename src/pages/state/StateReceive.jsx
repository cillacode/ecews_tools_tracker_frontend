import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getStates } from '../../api/facilities';
import { getTools, getThematicAreas } from '../../api/tools';
import { recordStateReceipt } from '../../api/stateMovements';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Field, Textarea } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

const schema = z.object({
  state_id:     z.coerce.number().int().positive('Please select a state'),
  tool_id:      z.coerce.number().int().positive('Please select a tool'),
  quantity:     z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  reference_no: z.string().trim().optional(),
  note:         z.string().trim().optional(),
});

// HQ → State receive. Super-admin records tools sent to a state.
export default function StateReceive() {
  const qc = useQueryClient();

  const { data: stateData } = useQuery({ queryKey: ['states'], queryFn: getStates });
  const { data: toolsData } = useQuery({ queryKey: ['tools'],  queryFn: () => getTools({ limit: 300 }) });
  const { data: areasData } = useQuery({ queryKey: ['thematic-areas'], queryFn: getThematicAreas });

  const states = stateData?.data ?? [];
  const tools  = toolsData?.data ?? [];
  const areas  = areasData?.data ?? [];

  // Group tools by thematic area for the picker.
  const toolGroups = tools.reduce((acc, t) => {
    (acc[t.thematic_area_name] ??= []).push(t);
    return acc;
  }, {});
  const areaOrder = areas.map((a) => a.name);
  const sortedGroupKeys = Object.keys(toolGroups).sort((a, b) => areaOrder.indexOf(a) - areaOrder.indexOf(b));

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { state_id: '', tool_id: '', quantity: '', reference_no: '', note: '' },
  });

  const mutation = useMutation({
    mutationFn: recordStateReceipt,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['state-movements'] });
      qc.invalidateQueries({ queryKey: ['state-coverage'] });
      const state = states.find((s) => String(s.id) === String(vars.state_id));
      const tool  = tools.find((t) => String(t.id) === String(vars.tool_id));
      toast.success(`Recorded ${vars.quantity} × ${tool?.name ?? 'tool'} for ${state?.name ?? 'state'}`, { duration: 4500 });
      reset({ state_id: '', tool_id: '', quantity: '', reference_no: '', note: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error ?? 'Failed to record receipt'),
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Single distribution"
        subtitle="Send one tool to one state. Each submission creates a permanent state-level record awaiting the state's acknowledgement."
      />

      <div className="max-w-xl">
        <Card>
          <CardBody>
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
              <Field id="state_id" label="State" required error={errors.state_id?.message}>
                <Select id="state_id" {...register('state_id')} error={errors.state_id?.message}>
                  <option value="">Select state…</option>
                  {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>

              <Field id="tool_id" label="Tool" required error={errors.tool_id?.message}>
                <Select id="tool_id" {...register('tool_id')} error={errors.tool_id?.message}>
                  <option value="">Select tool…</option>
                  {sortedGroupKeys.map((area) => (
                    <optgroup key={area} label={area}>
                      {toolGroups[area].map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </optgroup>
                  ))}
                </Select>
              </Field>

              <Field id="quantity" label="Quantity sent" required error={errors.quantity?.message}>
                <Input id="quantity" type="number" min="1" step="1" placeholder="e.g. 500" {...register('quantity')} error={errors.quantity?.message} />
              </Field>

              <Field id="reference_no" label="Reference / waybill number" hint="Optional — for linking to a physical document.">
                <Input id="reference_no" placeholder="e.g. HQ-2026-001" {...register('reference_no')} />
              </Field>

              <Field id="note" label="Note" hint="Optional — any extra context.">
                <Textarea id="note" placeholder="e.g. Q3 national distribution to Lagos." {...register('note')} />
              </Field>

              <div className="flex justify-end pt-2">
                <Button type="submit" loading={isSubmitting} leftIcon={<CheckCircle size={16} />}>
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
