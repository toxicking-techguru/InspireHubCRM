import { LeadStatus } from '@/types/crm';
import { cn } from '@/lib/utils';

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-slate-100 text-slate-700' },
  contacted: { label: 'Contacted', className: 'bg-sky-100 text-sky-700' },
  qualified: { label: 'Qualified', className: 'bg-indigo-100 text-indigo-700' },
  proposal: { label: 'Proposal', className: 'bg-violet-100 text-violet-700' },
  negotiation: { label: 'Negotiation', className: 'bg-amber-100 text-amber-700' },
  won: { label: 'Won', className: 'bg-emerald-100 text-emerald-700' },
  lost: { label: 'Lost', className: 'bg-red-100 text-red-700' },
  dormant: { label: 'Dormant', className: 'bg-slate-200 text-slate-500' },
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  const config = statusConfig[status] || statusConfig.new;
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight shrink-0", 
      config.className
    )}>
      {config.label}
    </span>
  );
}
