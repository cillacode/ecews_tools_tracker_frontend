import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Inbox, Check, PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { getStateIncoming, getStateHistory, acknowledgeReceipt } from '../../api/stateReceipts';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Field, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { formatDateTime } from '../../lib/formatters';

const ackSchema = z.object({
  receiver_names: z.string().trim().min(1, 'Enter who received the tools'),
  note:           z.string().trim().optional(),
});

function AcceptModal({ open, onClose, receipt, onSubmit, loading }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(ackSchema),
    defaultValues: { receiver_names: '', note: '' },
  });
  function close() { reset(); onClose(); }
  if (!receipt) return null;

  return (
    <Modal open={open} onClose={close} title={`Accept — ${receipt.tool_name}`}>
      <form onSubmit={handleSubmit((d) => onSubmit(d))} className="space-y-4">
        <div className="rounded-lg border border-line bg-stone-50/60 p-3 text-sm">
          <p className="text-muted">Sent by HQ</p>
          <p className="font-serif text-2xl italic num text-ink">{receipt.quantity}</p>
          <p className="mt-1 text-xs text-muted">{receipt.tool_name} · {receipt.thematic_area_name}</p>
        </div>

        <p className="text-sm text-ink">Confirm these tools were physically received in your state.</p>

        <Field id="receiver_names" label="Received by (name/s)" required hint="Who physically took delivery." error={errors.receiver_names?.message}>
          <Input id="receiver_names" {...register('receiver_names')} placeholder="e.g. Amaka Okonkwo, John Bassey" error={errors.receiver_names?.message} />
        </Field>

        <Field id="note" label="Note" hint="Optional." error={errors.note?.message}>
          <Textarea id="note" {...register('note')} placeholder="Any condition notes on arrival…" />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
          <Button type="submit" loading={loading} leftIcon={<Check size={15} />}>Accept receipt</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function HqReceipts() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [accepting, setAccepting] = useState(null);

  const { data: incoming, isLoading: incLoading } = useQuery({ queryKey: ['state-incoming'], queryFn: getStateIncoming });
  const { data: history,  isLoading: histLoading } = useQuery({ queryKey: ['state-history'],  queryFn: getStateHistory });

  const pending = incoming?.data ?? [];
  const done    = history?.data  ?? [];

  const mutation = useMutation({
    mutationFn: ({ id, body }) => acknowledgeReceipt(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['state-incoming'] });
      qc.invalidateQueries({ queryKey: ['state-history'] });
      qc.invalidateQueries({ queryKey: ['notification-summary'] });
      toast.success('Receipt acknowledged');
      setAccepting(null);
    },
    onError: (err) => toast.error(err.response?.data?.error ?? 'Failed to acknowledge'),
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Incoming stock"
        subtitle="Tools sent to your state by HQ. Confirm physical receipt, then distribute to facilities."
      />

      {/* Tabs */}
      <div className="mb-5 flex gap-3">
        <button
          onClick={() => setTab('pending')}
          className={`rounded-lg border px-6 py-3 text-sm font-bold transition-colors ${tab === 'pending' ? 'bg-brand-900 text-white border-brand-900 shadow-soft' : 'border-line bg-white text-ink hover:bg-stone-50'}`}
        >
          Pending {pending.length > 0 && `(${pending.length})`}
        </button>
        <button
          onClick={() => setTab('history')}
          className={`rounded-lg border px-6 py-3 text-sm font-bold transition-colors ${tab === 'history' ? 'bg-brand-900 text-white border-brand-900 shadow-soft' : 'border-line bg-white text-ink hover:bg-stone-50'}`}
        >
          Acknowledged
        </button>
      </div>

      {tab === 'pending' ? (
        incLoading ? (
          <div className="grid place-items-center py-16"><Spinner /></div>
        ) : pending.length === 0 ? (
          <Card><CardBody>
            <div className="grid place-items-center px-6 py-16 text-center">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50">
                <Inbox size={22} className="text-brand-700" />
              </div>
              <p className="text-sm font-medium text-ink">All caught up</p>
              <p className="mt-1 max-w-sm text-sm text-muted">No HQ receipts awaiting acknowledgement.</p>
            </div>
          </CardBody></Card>
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {pending.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3 sm:flex-1 min-w-0">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                      <PackageCheck size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{r.tool_name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                        <Badge tone="neutral" className="text-[10px]">{r.thematic_area_name}</Badge>
                        <span>· from HQ ({r.performed_by_name ?? 'admin'})</span>
                      </p>
                      {r.reference_no && <p className="mt-0.5 font-mono text-[11px] text-muted">Ref: {r.reference_no}</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0">
                    <span className="font-serif text-3xl italic num text-ink">{r.quantity}</span>
                    <span className="text-xs text-muted">{formatDateTime(r.performed_at)}</span>
                  </div>
                  <div className="shrink-0">
                    <Button variant="primary" className="font-bold" leftIcon={<Check size={15} />} onClick={() => setAccepting(r)}>
                      Accept
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )
      ) : (
        histLoading ? (
          <div className="grid place-items-center py-16"><Spinner /></div>
        ) : done.length === 0 ? (
          <Card><CardBody>
            <div className="grid place-items-center px-6 py-16 text-center">
              <p className="text-sm text-muted">Nothing acknowledged yet.</p>
            </div>
          </CardBody></Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-stone-50/60 text-left">
                    <th className="px-5 py-3 font-medium text-muted">Tool</th>
                    <th className="px-5 py-3 font-medium text-muted text-right">Qty</th>
                    <th className="px-5 py-3 font-medium text-muted">Received by</th>
                    <th className="px-5 py-3 font-medium text-muted">Ref</th>
                    <th className="px-5 py-3 font-medium text-muted">Acknowledged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {done.map((r) => (
                    <tr key={r.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-5 py-3 text-ink">{r.tool_name}</td>
                      <td className="px-5 py-3 text-right num text-ink">{r.quantity}</td>
                      <td className="px-5 py-3 text-muted">{r.receiver_names}</td>
                      <td className="px-5 py-3 font-mono text-xs text-muted">{r.reference_no ?? '—'}</td>
                      <td className="px-5 py-3 text-xs text-muted">{formatDateTime(r.ack_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      <AcceptModal
        open={Boolean(accepting)}
        onClose={() => setAccepting(null)}
        receipt={accepting}
        loading={mutation.isPending}
        onSubmit={(body) => mutation.mutate({ id: accepting.id, body })}
      />
    </div>
  );
}
