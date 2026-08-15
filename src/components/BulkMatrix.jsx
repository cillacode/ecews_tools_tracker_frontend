import { useMemo, useState } from 'react';
import { PackageCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardBody, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input, Field } from './ui/Input';
import { MultiSelect } from './ui/MultiSelect';

// Matrix bulk distribution: pick a set of tools (columns) and a set of
// destinations (rows), then fill a quantity grid. Empty cells send nothing.
// Works for both tiers — the parent supplies the destination list and handles
// the API + success. onSubmit receives items: [{ tool_id, dest_id, quantity }].
export function BulkMatrix({
  tools = [],
  areas = [],
  destinations = [],
  destinationLabel = 'Destination',
  destinationNoun = 'destinations',
  availableByTool,          // optional Map(String(toolId) -> { available, tool_name })
  submitting = false,
  onSubmit,
}) {
  const [selTools, setSelTools] = useState([]); // [{ id, name }]
  const [selDests, setSelDests] = useState([]); // [{ id, name }]
  const [qty,      setQty]      = useState({});  // `${destId}:${toolId}` -> string
  const [reference, setReference] = useState('');
  const [note,      setNote]      = useState('');

  // Tool <select> grouped by thematic area.
  const toolGroups = useMemo(() => {
    const groups = tools.reduce((acc, t) => {
      (acc[t.thematic_area_name] ??= []).push(t);
      return acc;
    }, {});
    const order = areas.map((a) => a.name);
    return Object.keys(groups)
      .sort((a, b) => order.indexOf(a) - order.indexOf(b))
      .map((name) => ({ name, tools: groups[name] }));
  }, [tools, areas]);

  // Destination <select> grouped by `group` (e.g. LGA) when present.
  const destGroups = useMemo(() => {
    if (!destinations.some((d) => d.group)) return [{ name: null, items: destinations }];
    const groups = destinations.reduce((acc, d) => {
      (acc[d.group] ??= []).push(d);
      return acc;
    }, {});
    return Object.keys(groups).sort().map((name) => ({ name, items: groups[name] }));
  }, [destinations]);

  const key = (destId, toolId) => `${destId}:${toolId}`;

  function addTool(id) {
    const t = tools.find((x) => String(x.id) === String(id));
    if (t && !selTools.some((x) => x.id === t.id)) setSelTools((p) => [...p, { id: t.id, name: t.name }]);
  }
  function addDest(id) {
    const d = destinations.find((x) => String(x.id) === String(id));
    if (d && !selDests.some((x) => x.id === d.id)) setSelDests((p) => [...p, { id: d.id, name: d.name }]);
  }
  function removeTool(id) {
    setSelTools((p) => p.filter((x) => x.id !== id));
    setQty((p) => {
      const next = { ...p };
      for (const k of Object.keys(next)) if (k.endsWith(`:${id}`)) delete next[k];
      return next;
    });
  }
  function removeDest(id) {
    setSelDests((p) => p.filter((x) => x.id !== id));
    setQty((p) => {
      const next = { ...p };
      for (const k of Object.keys(next)) if (k.startsWith(`${id}:`)) delete next[k];
      return next;
    });
  }
  const toggleTool = (id) => (selTools.some((x) => x.id === id) ? removeTool(id) : addTool(id));
  const toggleDest = (id) => (selDests.some((x) => x.id === id) ? removeDest(id) : addDest(id));
  const selToolIds = useMemo(() => new Set(selTools.map((t) => t.id)), [selTools]);
  const selDestIds = useMemo(() => new Set(selDests.map((d) => d.id)), [selDests]);
  const setCell = (destId, toolId, val) =>
    setQty((p) => ({ ...p, [key(destId, toolId)]: val.replace(/[^\d]/g, '') }));

  // Column total per tool, and whether it exceeds the state balance.
  const colTotal = (toolId) =>
    selDests.reduce((sum, d) => sum + (parseInt(qty[key(d.id, toolId)], 10) || 0), 0);

  const lines = useMemo(() => {
    const out = [];
    for (const d of selDests) {
      for (const t of selTools) {
        const n = parseInt(qty[key(d.id, t.id)], 10);
        if (n > 0) out.push({ tool_id: t.id, dest_id: d.id, quantity: n });
      }
    }
    return out;
  }, [selDests, selTools, qty]);

  const overTool = availableByTool
    ? selTools.find((t) => {
        const a = availableByTool.get(String(t.id));
        return a && colTotal(t.id) > a.available;
      })
    : null;

  function handleSubmit(e) {
    e.preventDefault();
    if (lines.length === 0) { toast.error('Enter at least one quantity in the grid'); return; }
    if (overTool) {
      const a = availableByTool.get(String(overTool.id));
      toast.error(`${overTool.name}: distributing ${colTotal(overTool.id)} exceeds the ${a.available} available in state stock`);
      return;
    }
    onSubmit(lines, { reference_no: reference || undefined, note: note || undefined });
  }

  const gridReady = selTools.length > 0 && selDests.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Pickers + reference/note */}
      <Card>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="tool-pick" label="Add tools (columns)" hint="Tick as many as you like — each becomes a column.">
              <MultiSelect
                placeholder="Select tools…"
                searchPlaceholder="Search tools…"
                groups={toolGroups.map((g) => ({ name: g.name, items: g.tools }))}
                selectedIds={selToolIds}
                onToggle={toggleTool}
              />
            </Field>
            <Field id="dest-pick" label={`Add ${destinationNoun} (rows)`} hint={`Tick as many as you like — each becomes a row.`}>
              <MultiSelect
                placeholder={`Select ${destinationNoun}…`}
                searchPlaceholder={`Search ${destinationNoun}…`}
                groups={destGroups}
                selectedIds={selDestIds}
                onToggle={toggleDest}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="reference_no" label="Reference / waybill" hint="Optional — applies to all lines.">
              <Input id="reference_no" placeholder="e.g. HQ-2026-010" value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
            <Field id="note" label="Note" hint="Optional.">
              <Input id="note" placeholder="e.g. Q3 distribution" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
        </CardBody>
      </Card>

      {/* The grid */}
      <Card>
        <CardHeader>
          <CardTitle>Quantities</CardTitle>
        </CardHeader>
        <CardBody>
          {!gridReady ? (
            <p className="py-8 text-center text-sm text-muted">
              Add at least one tool and one {destinationLabel.toLowerCase()} above to build the grid.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                      {destinationLabel}
                    </th>
                    {selTools.map((t) => {
                      const a = availableByTool?.get(String(t.id));
                      const over = a && colTotal(t.id) > a.available;
                      return (
                        <th key={t.id} className="min-w-[7rem] px-2 py-2 text-center align-bottom">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs font-medium text-ink">{t.name}</span>
                            <button type="button" onClick={() => removeTool(t.id)} className="text-muted hover:text-red-600" aria-label={`Remove ${t.name}`}>
                              <X size={12} />
                            </button>
                          </div>
                          {a && (
                            <div className={`mt-0.5 text-[10px] ${over ? 'font-semibold text-red-600' : 'text-muted'}`}>
                              {colTotal(t.id)} / {a.available} avail
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {selDests.map((d) => (
                    <tr key={d.id}>
                      <td className="sticky left-0 z-10 bg-white px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => removeDest(d.id)} className="text-muted hover:text-red-600" aria-label={`Remove ${d.name}`}>
                            <X size={12} />
                          </button>
                          <span className="font-medium text-ink">{d.name}</span>
                        </div>
                      </td>
                      {selTools.map((t) => (
                        <td key={t.id} className="px-1.5 py-1.5 text-center">
                          <Input
                            type="number" min="0" step="1" placeholder="—"
                            value={qty[key(d.id, t.id)] ?? ''}
                            onChange={(e) => setCell(d.id, t.id, e.target.value)}
                            className="w-20 text-center"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {gridReady && (
            <p className="mt-3 text-xs text-muted">
              {lines.length} line{lines.length !== 1 ? 's' : ''} ready across {selDests.length} {destinationNoun}.
            </p>
          )}
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={submitting} disabled={Boolean(overTool)} leftIcon={<PackageCheck size={16} />}>
          Submit distribution
        </Button>
      </div>
    </form>
  );
}
