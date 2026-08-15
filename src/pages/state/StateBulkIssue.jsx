import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getStates } from '../../api/facilities';
import { getTools, getThematicAreas } from '../../api/tools';
import { recordStateBulkReceipt } from '../../api/stateMovements';
import { PageHeader } from '../../components/layout/PageHeader';
import { BulkMatrix } from '../../components/BulkMatrix';

// HQ → many states. Multiple tools distributed to multiple states at once.
export default function StateBulkIssue() {
  const qc = useQueryClient();
  const [formKey, setFormKey] = useState(0);

  const { data: stateData } = useQuery({ queryKey: ['states'], queryFn: getStates });
  const { data: toolsData } = useQuery({ queryKey: ['tools'],  queryFn: () => getTools({ limit: 300 }) });
  const { data: areasData } = useQuery({ queryKey: ['thematic-areas'], queryFn: getThematicAreas });

  const states = stateData?.data ?? [];
  const tools  = toolsData?.data ?? [];
  const areas  = areasData?.data ?? [];

  const destinations = states.map((s) => ({ id: s.id, name: s.name }));

  const mutation = useMutation({
    mutationFn: recordStateBulkReceipt,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['state-movements'] });
      qc.invalidateQueries({ queryKey: ['state-coverage'] });
      qc.invalidateQueries({ queryKey: ['state-stock'] });
      toast.success(`Recorded ${data.count} state receipt${data.count !== 1 ? 's' : ''}`);
      setFormKey((k) => k + 1); // reset the grid
    },
    onError: (err) => toast.error(err.response?.data?.error ?? 'Failed to record bulk distribution'),
  });

  function handleSubmit(lines, meta) {
    mutation.mutate({
      items:        lines.map((l) => ({ tool_id: l.tool_id, state_id: l.dest_id, quantity: l.quantity })),
      reference_no: meta.reference_no,
      note:         meta.note,
    });
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Bulk distribution"
        subtitle="Send multiple tools to multiple states in one submission. Fill the quantity grid — leave a cell blank to send nothing."
      />

      <div className="max-w-4xl">
        <BulkMatrix
          key={formKey}
          tools={tools}
          areas={areas}
          destinations={destinations}
          destinationLabel="State"
          destinationNoun="states"
          submitting={mutation.isPending}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
