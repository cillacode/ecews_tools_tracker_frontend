import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

// A checkbox dropdown for picking many items at once. `groups` is
// [{ name, items: [{ id, name }] }] (name may be null for an ungrouped list).
// `selectedIds` is a Set; `onToggle(id)` flips one item. Closes on outside click.
export function MultiSelect({
  placeholder = 'Select…',
  groups = [],
  selectedIds,
  onToggle,
  searchable = true,
  searchPlaceholder = 'Search…',
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const count = selectedIds?.size ?? 0;

  const filtered = useMemo(() => {
    if (!q.trim()) return groups;
    const s = q.toLowerCase();
    return groups
      .map((g) => ({ ...g, items: g.items.filter((it) => it.name.toLowerCase().includes(s)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, q]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-line bg-white px-3 py-2.5 text-left text-sm transition-colors hover:bg-stone-50"
      >
        <span className={count ? 'text-ink' : 'text-muted'}>
          {count ? `${count} selected` : placeholder}
        </span>
        <ChevronDown size={16} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-line bg-white shadow-card">
          {searchable && (
            <div className="relative border-b border-line p-2">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="w-full rounded-md border border-line py-1.5 pl-8 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-700"
              />
            </div>
          )}
          <div className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted">No matches</p>
            ) : (
              filtered.map((g, gi) => (
                <div key={g.name ?? gi}>
                  {g.name && (
                    <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{g.name}</p>
                  )}
                  {g.items.map((it) => {
                    const sel = selectedIds?.has(it.id);
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => onToggle(it.id)}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-stone-50"
                      >
                        <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${sel ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-white'}`}>
                          {sel && <Check size={11} strokeWidth={3} />}
                        </span>
                        <span className="text-ink">{it.name}</span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
