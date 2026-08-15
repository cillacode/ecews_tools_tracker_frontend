import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReceiveStock from './ReceiveStock';
import BulkIssue from './BulkIssue';

// Unified Distribution page — "single" (one tool → one destination) and
// "bulk" (one tool → many destinations) as tabs. The underlying forms branch
// by role themselves: super_admin distributes to STATES, state admins /
// central to FACILITIES. Legacy routes /stock/receive and /stock/bulk render
// this page with the matching tab preselected so old links keep working.
export default function Distribution({ initialTab }) {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(initialTab ?? searchParams.get('tab') ?? 'single');

  const pill = (key, label) => (
    <button
      onClick={() => setTab(key)}
      className={`rounded-lg border px-6 py-3 text-sm font-bold transition-colors ${
        tab === key
          ? 'bg-brand-900 text-white border-brand-900 shadow-soft'
          : 'border-line bg-white text-ink hover:bg-stone-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-5 flex gap-3">
        {pill('single', 'Single distribution')}
        {pill('bulk',   'Bulk distribution')}
      </div>
      {tab === 'single' ? <ReceiveStock /> : <BulkIssue />}
    </div>
  );
}
