import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Inbox, Check, AlertTriangle, PackagePlus, ArrowLeftRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getIncoming, acknowledge } from '../api/movements';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Field, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { formatDateTime, DISPUTE_REASON_LABELS } from '../lib/formatters';

// ── Dispute modal ─────────────────────────────────────────────────────────────
const disputeSchema = z.object({
  dispute_reason:    z.enum(['INCOMPLETE', 'DAMAGED', 'WRONG_TOOL', 'OTHER']),
  disputed_quantity: z.coerce.number().int().min(0, 'Cannot be negative'),
  dispute_note:      z.string().trim().optional(),
}).refine((d) => d.dispute_reason !== 'OTHER' || (d.dispute_note && d.dispute_note.length > 0), {
  message: 'A note is required when reason is "Other"',
  path:    ['dispute_note'],
});

const QTY_HINT = {
  INCOMPLETE: 'How many did you actually receive?',
  DAMAGED:    'How many usable copies did you receive?',
  WRONG_TOOL: 'Usually 0 — none of the right tool was sent.',
  OTHER:      'Actual usable quantity received.',
};

function DisputeModal({ open, onClose, movement, onSubmit, loading }) {
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(disputeSchema),
    defaultValues: { dispute_reason: 'INCOMPLETE', disputed_quantity: '', dispute_note: '' },
  });

  const reason = watch('dispute_reason');

  function handleClose() { reset(); onClose(); }

  if (!movement) return null;

  return (
    <Modal open={open} onClose={handleClose} title={`Dispute — ${movement.tool_name}`}>
      <form onSubmit={handleSubmit((d) => onSubmit(d))} className="space-y-4">
        {/* Recap */}
        <div className="rounded-lg border border-line bg-stone-50/60 p-3 text-sm">
          <p className="text-muted">Recorded quantity</p>
          <p className="font-serif text-2xl italic num text-ink">{movement.quantity}</p>
        </div>

        <Field id="dispute_reason" label="Reason" required error={errors.dispute_reason?.message}>
          <Select id="dispute_reason" {...register('dispute_reason')} error={errors.dispute_reason?.message}>
            {Object.entries(DISPUTE_REASON_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </Select>
        </Field>

        <Field
          id="disputed_quantity"
          label="Actual quantity received"
          required
          hint={QTY_HINT[reason]}
          error={errors.disputed_quantity?.message}
        >
          <Input
            id="disputed_quantity"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 47"
            {...register('disputed_quantity')}
            error={errors.disputed_quantity?.message}
          />
        </Field>

        <Field
          id="dispute_note"
          label="Note"
          required={reason === 'OTHER'}
          hint={reason === 'OTHER' ? 'Required — please describe the issue.' : 'Optional extra detail.'}
          error={errors.dispute_note?.message}
        >
          <Textarea
            id="dispute_note"
            placeholder="e.g. Box was opened on arrival; 3 registers missing."
            {...register('dispute_note')}
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="danger" loading={loading} leftIcon={<AlertTriangle size={15} />}>
            Submit dispute
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Single incoming row ───────────────────────────────────────────────────────
function IncomingRow({ movement, onAccept, onDispute, accepting }) {
  const isTransfer = movement.movement_type === 'TRANSFER_IN';
  const Icon       = isTransfer ? ArrowLeftRight : PackagePlus;
  const sender     = isTransfer
    ? `From ${movement.related_facility_name}`
    : `From ${movement.performed_by_name ?? 'admin'}`;

  return (
    <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
      {/* Icon + identity */}
      <div className="flex items-center gap-3 sm:flex-1 min-w-0">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{movement.tool_name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            <Badge tone="neutral" className="text-[10px]">{movement.thematic_area_name}</Badge>
            <span>·</span>
            <span>{sender}</span>
          </p>
          {movement.reference_no && (
            <p className="mt-0.5 font-mono text-[11px] text-muted">Ref: {movement.reference_no}</p>
          )}
          {movement.note && (
            <p className="mt-0.5 text-xs italic text-muted">"{movement.note}"</p>
          )}
        </div>
      </div>

      {/* Quantity */}
      <div className="flex shrink-0 items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0">
        <span className="font-serif text-3xl italic num text-ink">{movement.quantity}</span>
        <span className="text-xs text-muted">{formatDateTime(movement.performed_at)}</span>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onDispute(movement)}
          leftIcon={<AlertTriangle size={14} />}
        >
          Dispute
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={accepting}
          onClick={() => onAccept(movement)}
          leftIcon={<Check size={14} />}
        >
          Accept
        </Button>
      </div>
    </div>
  );
}

// ── Physical-receipt confirmation modal ──────────────────────────────────────
// Stock is only credited once the facility confirms the tools were physically
// received and counted — this modal is that confirmation step.
function ConfirmReceiptModal({ movement, onClose, onConfirm, loading }) {
  if (!movement) return null;
  return (
    <Modal open onClose={onClose} title="Confirm physical receipt">
      <div className="space-y-4">
        <div className="rounded-lg border border-line bg-stone-50/60 p-3 text-sm">
          <p className="text-muted">Recorded quantity</p>
          <p className="font-serif text-2xl italic num text-ink">{movement.quantity}</p>
          <p className="mt-1 text-xs text-muted">{movement.tool_name}</p>
        </div>
        <p className="text-sm text-ink">
          Have these tools been <span className="font-semibold">physically received and counted</span> at
          your facility? Accepting will add <span className="font-semibold num">{movement.quantity}</span> to
          your stock balance.
        </p>
        <p className="text-xs text-muted">
          If the count doesn't match what arrived, cancel and use <span className="font-medium">Dispute</span> instead.
        </p>
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} leftIcon={<Check size={15} />} onClick={onConfirm}>
            Yes — received physically
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Incoming() {
  const qc = useQueryClient();
  const [disputeMov,  setDisputeMov]   = useState(null);
  const [confirmMov,  setConfirmMov]   = useState(null);
  const [acceptingId, setAcceptingId]  = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['incoming'],
    queryFn:  getIncoming,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const items = data?.data ?? [];

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['incoming'] });
    qc.invalidateQueries({ queryKey: ['movements'] });
    qc.invalidateQueries({ queryKey: ['facility-kpis'] });
    qc.invalidateQueries({ queryKey: ['facility-recent'] });
    qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    qc.invalidateQueries({ queryKey: ['disputes'] });
  }

  const acceptMutation = useMutation({
    mutationFn: (movement) => acknowledge(movement.id, { decision: 'ACCEPTED' }),
    onMutate:   (movement) => setAcceptingId(movement.id),
    onSettled:  () => setAcceptingId(null),
    onSuccess:  () => {
      toast.success('Receipt confirmed — stock added to your balance');
      setConfirmMov(null);
      invalidateAll();
      qc.invalidateQueries({ queryKey: ['facility-stock'] });
      qc.invalidateQueries({ queryKey: ['facility-stock-summary'] });
      qc.invalidateQueries({ queryKey: ['usage-tracker'] });
    },
    onError:    (err) => toast.error(err.response?.data?.error ?? 'Failed to accept'),
  });

  const disputeMutation = useMutation({
    mutationFn: ({ id, body }) => acknowledge(id, body),
    onSuccess: () => {
      toast.success('Dispute submitted — admin will review');
      setDisputeMov(null);
      invalidateAll();
    },
    onError: (err) => toast.error(err.response?.data?.error ?? 'Failed to submit dispute'),
  });

  function handleDisputeSubmit(formData) {
    disputeMutation.mutate({
      id:   disputeMov.id,
      body: { decision: 'DISPUTED', ...formData },
    });
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Incoming stock"
        subtitle="Tools sent to your facility — confirm them as received or open a dispute if anything is off."
      />

      {isLoading ? (
        <div className="grid place-items-center py-16"><Spinner /></div>
      ) : items.length === 0 ? (
        <Card>
          <CardBody>
            <div className="grid place-items-center px-6 py-16 text-center">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50">
                <Inbox size={22} className="text-brand-700" />
              </div>
              <p className="text-sm font-medium text-ink">All caught up</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                No tools awaiting acknowledgement. New incoming items will appear here automatically.
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink num">{items.length}</span> item{items.length !== 1 ? 's' : ''} awaiting your acknowledgement
          </p>

          <Card>
            <ul className="divide-y divide-line">
              {items.map((m) => (
                <li key={m.id}>
                  <IncomingRow
                    movement={m}
                    onAccept={setConfirmMov}
                    onDispute={setDisputeMov}
                    accepting={acceptingId === m.id}
                  />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <ConfirmReceiptModal
        movement={confirmMov}
        onClose={() => setConfirmMov(null)}
        onConfirm={() => acceptMutation.mutate(confirmMov)}
        loading={acceptMutation.isPending}
      />

      <DisputeModal
        open={Boolean(disputeMov)}
        onClose={() => setDisputeMov(null)}
        movement={disputeMov}
        onSubmit={handleDisputeSubmit}
        loading={disputeMutation.isPending}
      />
    </div>
  );
}
