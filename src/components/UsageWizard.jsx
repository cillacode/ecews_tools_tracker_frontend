import { useState } from 'react';
import { AlertTriangle, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Field } from './ui/Input';
import { MultiSelect } from './ui/MultiSelect';

// Guided usage entry with a physical-count validation gate.
//   ask     → "Did you give out this tool this week?"  No = cancel, Yes = next
//   details → quantity given + service point(s) (checkboxes + "Others") + note
//   balance → physically counted balance; must reconcile with (on-hand − given)
// onComplete({ count, service_point_ids, service_point_other, service_point_label, physical_balance, note }).
export function UsageWizard({ tool, servicePoints = [], onClose, onComplete }) {
  const onHand = tool?.ending_balance ?? 0;

  const [step, setStep]   = useState('ask');
  const [qty, setQty]     = useState('');
  const [spIds, setSpIds] = useState(() => new Set()); // service point ids + '__other__'
  const [spOther, setSpOther] = useState('');
  const [note, setNote]   = useState('');
  const [physical, setPhysical] = useState('');
  const [tallyError, setTallyError] = useState(false);

  if (!tool) return null;

  const count     = parseInt(qty, 10);
  const hasOther  = spIds.has('__other__');
  const knownIds  = [...spIds].filter((id) => id !== '__other__');
  const spValid   = spIds.size > 0 && (!hasOther || spOther.trim().length > 0);
  const detailsValid = Number.isInteger(count) && count > 0 && count <= onHand && spValid;

  // Service points as one checkbox group, with a synthetic "Others" option.
  const spGroups = [{
    name: null,
    items: [...servicePoints.map((s) => ({ id: s.id, name: s.name })), { id: '__other__', name: 'Others' }],
  }];

  function toggleSp(id) {
    setSpIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function serviceLabel() {
    const names = knownIds.map((id) => servicePoints.find((s) => s.id === id)?.name).filter(Boolean);
    if (hasOther && spOther.trim()) names.push(`Others: ${spOther.trim()}`);
    return names.join(', ');
  }

  function confirmBalance() {
    const phys = parseInt(physical, 10);
    if (!Number.isInteger(phys) || phys < 0) return;
    const expected = onHand - count;
    if (phys !== expected) {
      setTallyError(true);   // hard block — they must recount
      return;
    }
    onComplete({
      count,
      service_point_ids:   knownIds.map(Number),
      service_point_other: hasOther ? spOther.trim() : undefined,
      service_point_label: serviceLabel(),
      physical_balance:    phys,
      note:                note.trim() || undefined,
    });
  }

  return (
    <Modal open onClose={onClose} title={tool.tool_name}>
      {step === 'ask' && (
        <div className="space-y-5">
          <p className="text-sm text-ink">
            Did you give out <span className="font-semibold">{tool.tool_name}</span> this week?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>No</Button>
            <Button rightIcon={<ArrowRight size={15} />} onClick={() => setStep('details')}>Yes</Button>
          </div>
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-4">
          <p className="text-xs text-muted">On hand now: <span className="font-semibold text-ink num">{onHand}</span></p>

          <Field id="qty" label="Quantity given out" required hint={`Cannot exceed the ${onHand} on hand.`}>
            <Input
              id="qty" type="number" min="1" step="1" max={onHand}
              placeholder="e.g. 2" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus
            />
          </Field>

          <Field id="sp" label="Service point(s)" required hint="Tick every point the tools went to.">
            <MultiSelect
              placeholder="Select service point(s)…"
              searchable={false}
              groups={spGroups}
              selectedIds={spIds}
              onToggle={toggleSp}
            />
          </Field>

          {hasOther && (
            <Field id="sp-other" label="Specify other service point(s)" required>
              <Input id="sp-other" placeholder="e.g. Outreach / Community" value={spOther} onChange={(e) => setSpOther(e.target.value)} />
            </Field>
          )}

          <Field id="note" label="Tool unique ID" hint="Optional.">
            <Input id="note" placeholder="Optional reference" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>

          {count > onHand && (
            <p className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertTriangle size={12} /> Only {onHand} on hand — you cannot give out {count}.
            </p>
          )}

          <div className="flex justify-between gap-3 pt-1">
            <Button variant="ghost" leftIcon={<ArrowLeft size={15} />} onClick={() => setStep('ask')}>Back</Button>
            <Button rightIcon={<ArrowRight size={15} />} disabled={!detailsValid} onClick={() => { setTallyError(false); setStep('balance'); }}>
              Next
            </Button>
          </div>
        </div>
      )}

      {step === 'balance' && (
        <div className="space-y-4">
          <p className="text-sm text-ink">
            Now physically count the <span className="font-semibold">{tool.tool_name}</span> remaining and enter the balance.
          </p>

          <Field id="physical" label="Physical stock balance" required>
            <Input
              id="physical" type="number" min="0" step="1"
              placeholder="Count and enter" value={physical}
              onChange={(e) => { setPhysical(e.target.value); setTallyError(false); }}
              autoFocus
              error={tallyError ? 'over' : undefined}
            />
          </Field>

          {tallyError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <p>The tool count does not tally — kindly recount the physical tool and enter the correct balance.</p>
            </div>
          )}

          <div className="flex justify-between gap-3 pt-1">
            <Button variant="ghost" leftIcon={<ArrowLeft size={15} />} onClick={() => setStep('details')}>Back</Button>
            <Button leftIcon={<Check size={15} />} disabled={physical === ''} onClick={confirmBalance}>
              Confirm entry
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
