import { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { StateStockView } from './StateStock';
import { ToolsCatalogue } from './Tools';

// The state admin's "State inventory" — two tabs sharing one space:
//   • Inventory — received / distributed / balance per tool (StateStockView)
//   • Tools     — the tools catalogue + facility drill-down (ToolsCatalogue)
export default function StateInventory() {
  const [tab, setTab] = useState('inventory');

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
    <div className="animate-fade-in">
      <PageHeader
        title="State inventory"
        subtitle="Your state's stock balances and the tools catalogue, in one place."
      />

      <div className="mb-5 flex gap-3">
        {pill('inventory', 'Inventory')}
        {pill('tools', 'Tools')}
      </div>

      {tab === 'inventory' ? <StateStockView /> : <ToolsCatalogue />}
    </div>
  );
}
