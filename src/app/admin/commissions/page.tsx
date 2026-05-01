"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, writeBatch, increment, addDoc } from 'firebase/firestore';
import { Commission, Agent } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Coins, 
  CheckCircle2, 
  Loader2, 
  Search, 
  AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function AdminCommissionsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Data Fetching
  const commissionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'commissions'), orderBy('createdAt', 'desc')) : null, [firestore]);
  const { data: commissions, loading } = useCollection<Commission>(commissionsQuery as any);

  const agentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'agents') : null, [firestore]);
  const { data: agents } = useCollection<Agent>(agentsQuery as any);

  const filteredCommissions = useMemo(() => {
    if (!commissions) return [];
    return commissions.filter(c => {
      const search = searchTerm.toLowerCase();
      const agentName = agents?.find(a => a.id === c.agentId)?.name || '';
      return (
        c.clientName?.toLowerCase().includes(search) ||
        agentName.toLowerCase().includes(search)
      );
    });
  }, [commissions, searchTerm, agents]);

  const pendingCount = useMemo(() => commissions?.filter(c => c.status === 'pending').length || 0, [commissions]);
  const pendingAmount = useMemo(() => commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0) || 0, [commissions]);

  const handleApprove = async (commission: Commission) => {
    if (!firestore || !user) return;
    setIsProcessing(commission.id);
    try {
      const batch = writeBatch(firestore);
      const cRef = doc(firestore, 'commissions', commission.id);
      const wRef = doc(firestore, 'wallets', commission.agentId);
      const auditRef = doc(collection(firestore, 'audit_logs'));

      // 1. Mark commission as approved
      batch.update(cRef, { 
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: user?.name
      });

      // 2. Move from 'pending' to 'withdrawable' in the agent's wallet
      batch.update(wRef, {
        pending: increment(-commission.amount),
        withdrawable: increment(commission.amount)
      });

      // 3. Log to Audit
      batch.set(auditRef, {
        timestamp: new Date().toISOString(),
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        actionType: 'APPROVE_COMMISSION',
        entityType: 'Commission',
        entityId: commission.id,
        remark: `Approved commission of $${commission.amount.toLocaleString()} for ${agents?.find(a => a.id === commission.agentId)?.name}`,
        newValue: { status: 'approved', amount: commission.amount }
      });

      await batch.commit();
      toast({ 
        title: "Commission Approved", 
        description: `$${commission.amount.toLocaleString()} released to ${agents?.find(a => a.id === commission.agentId)?.name}'s withdrawable balance.` 
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Approval Failed", description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  if (!user || user.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold flex items-center gap-2 text-primary-950">
               <Coins className="text-primary-600" size={20} /> Commission Validation
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">Review deals won and release earnings to agent wallets.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-3">
           <div className="bg-primary-50 border border-primary-100 p-3 rounded-md shadow-sm">
              <p className="text-[10px] font-bold uppercase text-primary-500 mb-1">Queue Size</p>
              <p className="text-[20px] font-bold text-primary-950">{pendingCount} Pending</p>
           </div>
           <div className="bg-primary-50 border border-primary-100 p-3 rounded-md shadow-sm">
              <p className="text-[10px] font-bold uppercase text-primary-500 mb-1">Total to Release</p>
              <p className="text-[20px] font-bold text-primary-950">${pendingAmount.toLocaleString()}</p>
           </div>
        </div>

        <div className="bg-card border rounded-md shadow-sm p-3 flex items-center gap-3">
           <div className="relative flex-1 max-w-[300px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input 
                placeholder="Search agent or client..." 
                className="pl-8 h-8 text-[12px] bg-white border-primary-100" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>

        <div className="bg-card border rounded-md shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                 <thead>
                    <tr className="bg-slate-50/80 border-b h-9">
                       <th className="px-3 text-left w-[160px]">Date Won</th>
                       <th className="text-left w-[180px]">Agent</th>
                       <th className="text-left">Client / Deal</th>
                       <th className="text-right w-[100px]">Deal Value</th>
                       <th className="text-right w-[120px]">Commission</th>
                       <th className="text-center w-[100px]">Status</th>
                       <th className="text-right px-3 w-[140px]">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y">
                    {loading ? (
                       <tr className="h-40"><td colSpan={7} className="text-center"><Loader2 className="animate-spin mx-auto text-primary-200" /></td></tr>
                    ) : filteredCommissions.map(c => {
                       const agent = agents?.find(a => a.id === c.agentId);
                       const isPending = c.status === 'pending';
                       const processing = isProcessing === c.id;

                       return (
                          <tr key={c.id} className={cn("h-11 hover:bg-slate-50/50 transition-colors", isPending && "bg-amber-50/10")}>
                             <td className="px-3 text-slate-500">{format(parseISO(c.createdAt), 'MMM d, yyyy')}</td>
                             <td>
                                <div className="flex flex-col">
                                   <span className="font-bold text-slate-800">{agent?.name || 'Unknown'}</span>
                                   <span className="text-[10px] text-slate-400">{agent?.email}</span>
                                </div>
                             </td>
                             <td className="font-medium text-slate-700">{c.clientName || 'Private Lead'}</td>
                             <td className="text-right text-slate-500">${c.dealAmount?.toLocaleString() || '0'}</td>
                             <td className="text-right font-bold text-primary-700">
                                <div className="flex flex-col">
                                   <span>${c.amount.toLocaleString()}</span>
                                   <span className="text-[9px] text-primary-400 font-bold uppercase">{c.commissionPct}% Rate</span>
                                </div>
                             </td>
                             <td className="text-center">
                                <Badge variant="outline" className={cn(
                                   "text-[9px] h-4 px-1.5 font-bold uppercase border-none",
                                   isPending ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                                )}>
                                   {c.status}
                                </Badge>
                             </td>
                             <td className="px-3 text-right">
                                {isPending ? (
                                   <Button 
                                      size="sm" 
                                      className="h-7 text-[11px] bg-primary-600 hover:bg-primary-700 gap-1 font-bold uppercase"
                                      onClick={() => handleApprove(c)}
                                      disabled={processing}
                                   >
                                      {processing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                      Approve
                                   </Button>
                                ) : (
                                   <div className="flex items-center justify-end gap-1 text-slate-400 text-[10px] font-medium">
                                      <CheckCircle2 size={12} className="text-emerald-500" /> Released
                                   </div>
                                )}
                             </td>
                          </tr>
                       );
                    })}
                    {filteredCommissions.length === 0 && !loading && (
                      <tr className="h-40 text-center"><td colSpan={7} className="text-slate-300 italic">No commission records matching criteria.</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 p-4 rounded-md flex items-start gap-4">
           <AlertCircle className="text-amber-500 mt-0.5 shrink-0" size={18} />
           <div className="text-[12px] text-amber-800 leading-relaxed">
              <h4 className="font-bold mb-1">Validation Rules</h4>
              <p>Approving a commission immediately moves the funds from the agent's **Pending** balance to their **Withdrawable** balance. This action is logged in the system audit trail and cannot be reversed through the UI. Ensure lead payments are verified before releasing commissions.</p>
           </div>
        </div>
      </div>
    </Shell>
  );
}