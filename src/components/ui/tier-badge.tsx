import { cn } from '@/lib/utils';

const tierConfig: Record<string, { label: string; className: string }> = {
  t1: { label: 'Silver', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  t2: { label: 'Gold', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  t3: { label: 'Diamond', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  t4: { label: 'Platinum', className: 'bg-purple-100 text-purple-800 border-purple-200' },
};

export function TierBadge({ tierId }: { tierId: string }) {
  const config = tierConfig[tierId] || { label: 'Standard', className: 'bg-slate-50' };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-bold uppercase", config.className)}>
      {config.label}
    </span>
  );
}
