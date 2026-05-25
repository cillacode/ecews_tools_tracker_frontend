import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { getTools, getThematicAreas, createTool } from '../api/tools';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Field, Label } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { cn } from '../lib/utils';

// ── Add Tool form schema ───────────────────────────────────────────────────────
const addToolSchema = z.object({
  name:              z.string().trim().min(1, 'Name is required'),
  thematic_area_id:  z.coerce.number().int().positive('Thematic area is required'),
  status:            z.enum(['NEW_MODIFIED', 'RETAINED']),
  is_new_indicator:  z.boolean().optional().default(false),
  is_ip_retained:    z.boolean().optional().default(false),
  description:       z.string().trim().optional(),
});

function AddToolModal({ open, onClose }) {
  const qc = useQueryClient();
  const { data: areasData } = useQuery({ queryKey: ['thematic-areas'], queryFn: getThematicAreas });
  const areas = areasData?.data ?? [];

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(addToolSchema),
    defaultValues: { status: 'NEW_MODIFIED', is_new_indicator: false, is_ip_retained: false },
  });

  const mutation = useMutation({
    mutationFn: createTool,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tools'] });
      toast.success('Tool added successfully');
      reset();
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error ?? 'Failed to add tool');
    },
  });

  const onSubmit = (data) => mutation.mutate(data);

  return (
    <Modal open={open} onClose={onClose} title="Add new tool">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field id="name" label="Tool name" required error={errors.name?.message}>
          <Input id="name" {...register('name')} placeholder="e.g. ART register" error={errors.name?.message} />
        </Field>

        <Field id="thematic_area_id" label="Thematic area" required error={errors.thematic_area_id?.message}>
          <Select id="thematic_area_id" {...register('thematic_area_id')} error={errors.thematic_area_id?.message}>
            <option value="">Select thematic area…</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </Field>

        <Field id="status" label="Status" required error={errors.status?.message}>
          <Select id="status" {...register('status')} error={errors.status?.message}>
            <option value="NEW_MODIFIED">New / Modified</option>
            <option value="RETAINED">Retained</option>
          </Select>
        </Field>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" {...register('is_new_indicator')} className="rounded border-line accent-brand-700" />
            <span>[N] New indicator</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" {...register('is_ip_retained')} className="rounded border-line accent-brand-700" />
            <span>[IP] IP retained</span>
          </label>
        </div>

        <Field id="description" label="Description" error={errors.description?.message}>
          <Input id="description" {...register('description')} placeholder="Optional notes about this tool" error={errors.description?.message} />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Add tool</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Tool row ──────────────────────────────────────────────────────────────────
function ToolRow({ tool }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50/60 transition-colors">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-ink">{tool.name}</span>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {tool.is_new_indicator && <Badge tone="amber" className="text-[10px]">[N]</Badge>}
          {tool.is_ip_retained   && <Badge tone="neutral" className="text-[10px]">[IP]</Badge>}
        </div>
      </div>
      <Badge tone={tool.status === 'NEW_MODIFIED' ? 'brand' : 'neutral'}>
        {tool.status === 'NEW_MODIFIED' ? 'New / Modified' : 'Retained'}
      </Badge>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Tools() {
  const { user } = useAuth();
  const [search, setSearch]         = useState('');
  const [selectedArea, setArea]     = useState(null); // null = All
  const [addOpen, setAddOpen]       = useState(false);

  const { data: toolsData, isLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: () => getTools({ limit: 200 }),
  });

  const { data: areasData } = useQuery({
    queryKey: ['thematic-areas'],
    queryFn: getThematicAreas,
  });

  const allTools  = toolsData?.data ?? [];
  const areas     = areasData?.data ?? [];

  // Filter by search + active thematic area tab
  const filtered = useMemo(() => {
    let list = allTools;
    if (selectedArea) list = list.filter((t) => t.thematic_area_id === selectedArea);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }
    return list;
  }, [allTools, selectedArea, search]);

  // Group by thematic area (preserving sort_order from API)
  const grouped = useMemo(() => {
    const map = new Map();
    for (const tool of filtered) {
      const key = tool.thematic_area_id;
      if (!map.has(key)) {
        map.set(key, { id: key, name: tool.thematic_area_name, code: tool.thematic_area_code, tools: [] });
      }
      map.get(key).tools.push(tool);
    }
    return Array.from(map.values());
  }, [filtered]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Tools"
        subtitle={`${allTools.length} MER tools across 10 thematic areas.`}
        actions={
          user?.role === 'admin' && (
            <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
              Add tool
            </Button>
          )
        }
      />

      {/* Search + thematic area filter */}
      <div className="mb-6 space-y-3">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools…"
            className="pl-9"
          />
        </div>

        {/* Area filter tabs — scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setArea(null)}
            className={cn(
              'pill shrink-0 transition-colors border',
              !selectedArea
                ? 'bg-brand-900 text-white border-brand-900'
                : 'border-line bg-white text-ink hover:bg-stone-50'
            )}
          >
            All
          </button>
          {areas.map((a) => (
            <button
              key={a.id}
              onClick={() => setArea(selectedArea === a.id ? null : a.id)}
              className={cn(
                'pill shrink-0 transition-colors border',
                selectedArea === a.id
                  ? 'bg-brand-900 text-white border-brand-900'
                  : 'border-line bg-white text-ink hover:bg-stone-50'
              )}
            >
              {a.code}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      ) : grouped.length === 0 ? (
        <Card>
          <CardBody>
            <div className="grid place-items-center py-12 text-center">
              <p className="text-sm text-muted">
                {search ? `No tools match "${search}"` : 'No tools found.'}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <Card key={group.id}>
              <div className="flex items-center gap-3 border-b border-line px-5 py-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {group.name}
                </span>
                <span className="pill border-line bg-stone-50 text-muted">{group.tools.length}</span>
              </div>
              <div className="divide-y divide-line">
                {group.tools.map((tool) => (
                  <ToolRow key={tool.id} tool={tool} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddToolModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
