import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ChevronLeft, ChevronRight, CalendarDays, Info, CalendarClock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/useAuth';
import { submitDailyUsage, getUsageTracker } from '../api/usage';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';

// ── Date helpers ─────────────────────────────────────────────────────────────
// Build the date string from local parts to avoid UTC shift issues.
const BACK_DATING_DAYS = 14;

function isoDateLocal(d = new Date()) {
  const date = new Date(d);
  const yyyy = date.getFullYear();
  const mm   = String(date.getMonth() + 1).padStart(2, '0');
  const dd   = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function mondayOf(d) {
  const date = new Date(d);
  const day  = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return isoDateLocal(date);
}

function shiftDays(isoDate, deltaDays) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + deltaDays);
  return isoDateLocal(d);
}

function formatWeekRange(mondayISO) {
  const monday = new Date(mondayISO + 'T00:00:00');
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(monday)} – ${fmt(sunday)} ${sunday.getFullYear()}`;
}

function formatDateLong(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function minRecordableDate() {
  return shiftDays(isoDateLocal(), -BACK_DATING_DAYS);
}

// ── Tiny inline stat for the tracker row ─────────────────────────────────────
function Stat({ label, value, tone }) {
  const colour =
    tone === 'pos'  ? 'text-brand-700' :
    tone === 'neg'  ? 'text-red-600'   :
    tone === 'end'  ? 'text-ink font-semibold' :
                      'text-ink';
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
      <span className={`font-mono text-sm num ${colour}`}>{value ?? 0}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Usage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const today        = isoDateLocal();
  const todayMonday  = useMemo(() => mondayOf(new Date()), []);
  const minRecordISO = useMemo(() => minRecordableDate(), []);

  // The week being viewed in the tracker (controls what the user sees).
  const [weekStart, setWeekStart] = useState(todayMonday);
  // The date being recorded against (defaults to today, can be back-dated).
  const [recordDate, setRecordDate] = useState(today);

  // `addCounts[tool_id]` holds the new amount to ADD for this submission.
  // Inputs clear after save (the saved total shows in the tracker columns).
  const [addCounts, setAddCounts] = useState({});
  const [notes,     setNotes]     = useState({});

  const isFutureWeek      = weekStart  > todayMonday;
  const recordDateInWeek  = recordDate >= weekStart && recordDate < shiftDays(weekStart, 7);
  const recordDateInvalid = recordDate > today || recordDate < minRecordISO;

  const { data: trackerData, isLoading } = useQuery({
    queryKey: ['usage-tracker', user?.facility_id, weekStart],
    queryFn:  () => getUsageTracker({ week_start_date: weekStart }),
    enabled:  Boolean(user?.facility_id),
    staleTime: 0,
  });

  const tools = trackerData?.data ?? [];

  const grouped = useMemo(() => {
    const map = new Map();
    for (const t of tools) {
      if (!map.has(t.thematic_area_id)) {
        map.set(t.thematic_area_id, { name: t.thematic_area_name, tools: [] });
      }
      map.get(t.thematic_area_id).tools.push(t);
    }
    return Array.from(map.values());
  }, [tools]);

  const totalToAdd = useMemo(() => Object.values(addCounts).reduce((s, v) => {
    const n = parseInt(v, 10);
    return s + (isNaN(n) ? 0 : n);
  }, 0), [addCounts]);

  // Tools where the typed value would exceed available stock (Ending).
  // Used to block submission client-side and show inline warnings.
  const overDraws = useMemo(() => {
    const list = [];
    for (const t of tools) {
      const raw = addCounts[t.tool_id];
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n > 0 && n > t.ending_balance) {
        list.push({ tool_id: t.tool_id, tool_name: t.tool_name, attempting: n, available: t.ending_balance });
      }
    }
    return list;
  }, [tools, addCounts]);
  const hasOverDraw = overDraws.length > 0;

  const mutation = useMutation({
    mutationFn: submitDailyUsage,
    onSuccess: () => {
      // Refetch the active week's tracker AND any other usage caches —
      // a back-dated submission may belong to a different week.
      qc.invalidateQueries({ queryKey: ['usage-tracker'] });
      qc.invalidateQueries({ queryKey: ['facility-stock', user?.facility_id] });
      qc.invalidateQueries({ queryKey: ['facility-kpis'] });
      qc.invalidateQueries({ queryKey: ['facility-recent'] });
      qc.invalidateQueries({ queryKey: ['facility-stock-summary'] });
      toast.success(`Saved usage for ${formatDateLong(recordDate)} — stock updated`);
      setAddCounts({});
      setNotes({});
    },
    onError: (err) => toast.error(err.response?.data?.error ?? 'Failed to save usage'),
  });

  function handleSave() {
    if (recordDateInvalid) {
      toast.error(`Pick a date between ${minRecordISO} and ${today}`);
      return;
    }
    if (hasOverDraw) {
      const first = overDraws[0];
      toast.error(
        first.available === 0
          ? `${first.tool_name} is out of stock — cannot record usage.`
          : `Not enough ${first.tool_name}: only ${first.available} available.`
      );
      return;
    }
    const entries = tools
      .map((t) => {
        const raw = addCounts[t.tool_id];
        const n = raw === '' || raw === undefined ? 0 : parseInt(raw, 10);
        return {
          tool_id: t.tool_id,
          count:   isNaN(n) ? 0 : n,
          note:    notes[t.tool_id]?.trim() || undefined,
        };
      })
      .filter((e) => e.count > 0);

    if (entries.length === 0) {
      toast.error('Enter usage for at least one tool');
      return;
    }
    mutation.mutate({ usage_date: recordDate, entries });
  }

  // Jump the tracker view to the week that contains the record date.
  function viewRecordDateWeek() {
    setWeekStart(mondayOf(new Date(recordDate + 'T00:00:00')));
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Tool usage"
        subtitle="Record daily tool usage at your facility. The tracker above shows the week’s running totals."
        actions={
          <Button variant="primary" leftIcon={<Save size={16} />} loading={mutation.isPending} onClick={handleSave}>
            Save usage
          </Button>
        }
      />

      {/* Week selector (controls what the tracker shows) */}
      <Card className="mb-4">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50">
              <CalendarDays size={18} className="text-brand-700" />
            </div>
            <div>
              <p className="font-serif text-2xl italic text-ink">{formatWeekRange(weekStart)}</p>
              <p className="text-xs text-muted">Tracker view · week starting Monday {weekStart}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" leftIcon={<ChevronLeft size={14} />} onClick={() => setWeekStart((w) => shiftDays(w, -7))}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setWeekStart(todayMonday)} disabled={weekStart === todayMonday}>
              This week
            </Button>
            <Button variant="secondary" size="sm" rightIcon={<ChevronRight size={14} />} onClick={() => setWeekStart((w) => shiftDays(w, 7))} disabled={isFutureWeek}>
              Next
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* How-to strip */}
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-line bg-stone-50/60 px-4 py-3 text-xs text-muted">
        <Info size={14} className="mt-0.5 shrink-0 text-brand-700" />
        <p>
          <span className="font-medium text-ink">Beginning</span> is stock at week start.
          <span className="font-medium text-ink"> Supplied</span> = receipts in the week.
          <span className="font-medium text-ink"> Utilized</span> = sum of daily usage recorded for the week.
          <span className="font-medium text-ink"> Adj +/−</span> = transfers in/out and admin corrections.
          <span className="font-medium text-ink"> Ending</span> = stock at week end.
        </p>
      </div>

      {/* Record-date picker — separate from tracker view, gates what gets saved */}
      <Card className="mb-4">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50">
              <CalendarClock size={18} className="text-accent-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">
                Recording usage for <span className="font-semibold">{formatDateLong(recordDate)}</span>
              </p>
              <p className="text-xs text-muted">You can back-date up to {BACK_DATING_DAYS} days to catch up on missed days.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={recordDate}
              min={minRecordISO}
              max={today}
              onChange={(e) => setRecordDate(e.target.value)}
              className="w-44"
            />
            <Button variant="secondary" size="sm" onClick={() => setRecordDate(today)} disabled={recordDate === today}>
              Today
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Helper banner: record date in a different week than the tracker view */}
      {!recordDateInWeek && !recordDateInvalid && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <p className="text-accent-700">
            You're recording for <span className="font-semibold">{recordDate}</span>, which falls in a different week from the tracker view above.
          </p>
          <button onClick={viewRecordDateWeek} className="shrink-0 text-xs font-medium text-accent-700 underline hover:text-accent-700/80">
            View that week
          </button>
        </div>
      )}

      {recordDateInvalid && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          The record date must be between {minRecordISO} and {today}.
        </div>
      )}

      {hasOverDraw && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{overDraws.length} entr{overDraws.length === 1 ? 'y exceeds' : 'ies exceed'} available stock</p>
            <p className="mt-0.5 text-xs">
              {overDraws.slice(0, 3).map((o) => `${o.tool_name} (${o.attempting} vs ${o.available} available)`).join(' · ')}
              {overDraws.length > 3 && ` · and ${overDraws.length - 3} more`}
            </p>
          </div>
        </div>
      )}

      {/* Tools */}
      {isLoading ? (
        <div className="grid place-items-center py-16"><Spinner /></div>
      ) : tools.length === 0 ? (
        <Card>
          <CardBody>
            <div className="grid place-items-center py-12 text-center">
              <p className="max-w-md text-sm text-muted">
                Your facility has no tools on record yet. Tools will appear here once stock is received.
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <Card key={group.name}>
              <div className="flex items-center gap-3 border-b border-line px-5 py-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted">{group.name}</span>
                <span className="pill border-line bg-stone-50 text-muted">{group.tools.length}</span>
              </div>

              <div className="divide-y divide-line">
                {group.tools.map((t) => {
                  const typed = parseInt(addCounts[t.tool_id], 10);
                  const typedValid = !isNaN(typed) && typed > 0;
                  const isOverDraw = typedValid && typed > t.ending_balance;
                  const outOfStock = t.ending_balance === 0;
                  return (
                    <div key={t.tool_id} className="px-5 py-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-ink">{t.tool_name}</span>
                        {outOfStock && (
                          <span className="pill border-red-200 bg-red-50 text-red-700 text-[10px]">Out of stock</span>
                        )}
                      </div>

                      {/* Weekly tracker row */}
                      <div className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                        <Stat label="Beginning" value={t.beginning_balance} />
                        <Stat label="Supplied"  value={t.quantity_supplied}    tone="pos" />
                        <Stat label="Utilized"  value={t.quantity_utilized}    tone="neg" />
                        <Stat label="Adj +"     value={t.adjustment_positive}  tone="pos" />
                        <Stat label="Adj −"     value={t.adjustment_negative}  tone="neg" />
                        <Stat label="Ending"    value={t.ending_balance}       tone="end" />
                      </div>

                      {/* Daily entry row */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="w-full sm:w-36">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            max={t.ending_balance}
                            placeholder="Add usage"
                            value={addCounts[t.tool_id] ?? ''}
                            onChange={(e) => setAddCounts((c) => ({ ...c, [t.tool_id]: e.target.value }))}
                            disabled={recordDateInvalid || outOfStock}
                            error={isOverDraw ? 'over' : undefined}
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="Note (optional)"
                            value={notes[t.tool_id] ?? ''}
                            onChange={(e) => setNotes((n) => ({ ...n, [t.tool_id]: e.target.value }))}
                            disabled={recordDateInvalid || outOfStock}
                          />
                        </div>
                      </div>

                      {/* Inline over-draw warning */}
                      {isOverDraw && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                          <AlertTriangle size={12} />
                          Only {t.ending_balance} available — your entry exceeds stock.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}

          {/* Footer summary */}
          <div className="flex items-center justify-between rounded-xl border border-line bg-white px-5 py-4 shadow-soft">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Adding this submission</p>
              <p className="font-serif text-3xl italic num text-ink">{totalToAdd}</p>
              <p className="mt-0.5 text-xs text-muted">For {formatDateLong(recordDate)}</p>
            </div>
            <Button
              variant="primary"
              leftIcon={<Save size={16} />}
              loading={mutation.isPending}
              onClick={handleSave}
              disabled={recordDateInvalid || totalToAdd === 0 || hasOverDraw}
            >
              Save usage
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
