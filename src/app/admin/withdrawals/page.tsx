
"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, writeBatch, where } from 'firebase/firestore';
import { Withdrawal, Agent } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Banknote, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Clock, 
  Download, 
  Search, 
  AlertCircle,
  Eye,
  ShieldCheck,
  History
} from 'lucide-react';
import { format, differenceInHours, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function AdminWithdrawalsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [isActioning, setIsActioning] = useState(false);

  // Data Fetching
  const withdrawalsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'withdrawals'), orderBy('requestedAt', 'desc')) : null, [firestore]);
  const { data: withdrawals, loading } = useCollection<Withdrawal>(withdrawalsQuery as any);

  const agentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'agents') : null, [firestore]);
  const { data: agents } = useCollection<Agent>(agentsQuery as any);

  const pendingList = useMemo(() => withdrawals?.filter(w => w.status === 'pending') || [], [withdrawals]);
  const historyList = withdrawals || [];

  const stats = useMemo(() => {
    const total = pendingList.reduce((sum, w) => sum + w.amount, 0);
    const critical = pendingList.filter(w => differenceInHours(new Date(), parseISO(w.requestedAt)) > 48).length;
    return { total, count: pendingList.length, critical };
  }, [pendingList]);

  const handleApprove = async (withdrawal: Withdrawal) => {
    if (!firestore || !paymentRef.trim()) return;
    setIsActioning(true);
    try {
      const batch = writeBatch(firestore);
      const wRef = doc(firestore, 'withdrawals', withdrawal.id);
      const walletRef = doc(firestore, 'wallets', withdrawal.agentId);

      batch.update(wRef, { 
        status: 'paid', 
        processedAt: new Date().toISOString(),
        processedBy: user?.name,
        reference: paymentRef
      });
      
      // Update wallet totals (mock logic: increment withdrawn, decrement withdrawable)
      // This usually happens in a secure cloud function in production
      
      await batch.commit();
      toast({ title: "Payment Recorded", description: "Withdrawal marked as paid and wallet updated." });
      setProcessingId(null);
      setPaymentRef('');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsActioning(false);
    }
  };

  const handleReject = async (withdrawal: Withdrawal) => {
    if (!firestore || !rejectReason.trim()) return;
    setIsActioning(true);
    try {
      await updateDoc(doc(firestore, 'withdrawals', withdrawal.id), {
        status: 'rejected',
        processedAt: new Date().toISOString(),
        processedBy: user?.name,
        rejectionReason: rejectReason
      });
      toast({ title: "Request Rejected", description: "Agent will be notified with reason." });
      setProcessingId(null);
      setRejectReason('');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsActioning(false);
    }
  };

  if (!user || user.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold flex items-center gap-2 text-violet-900">
               <Banknote className="text-violet-600" size={20} /> Withdrawal Approvals
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">Manage agent payout requests and monitor disbursement health.</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-2 border-violet-200 text-violet-700">
             <Download size={14} /> Export Queue
          </Button>
        </div>

        <div className="bg-violet-50 border border-violet-100 p-3 rounded-md flex items-center gap-6 shadow-sm">
           <div className="flex items-center gap-2">
              <span className="text-[20px] font-bold text-violet-900">${stats.total.toLocaleString()}</span>
              <span className="text-[11px] font-bold uppercase text-violet-400 tracking-tight">Total Pending</span>
           </div>
           <div className="h-4 w-px bg-violet-200" />
           <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-violet-700">{stats.count} Requests</span>
           </div>
           <div className="flex items-center gap-2 ml-auto">
              <AlertCircle size={14} className={cn(stats.critical > 0 ? "text-red-500" : "text-emerald-500")} />
              <span className="text-[12px] font-bold text-slate-600">{stats.critical} requests waiting &gt; 48h</span>
           </div>
        </div>

        <Tabs defaultValue="pending" onValueChange={setActiveTab}>
           <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-9 gap-6 px-1">
              <TabsTrigger value="pending" className="text-[12px] px-0 h-full border-b-2 border-transparent data-[state=active]:border-violet-600 data-[state=active]:bg-transparent data-[state=active]:text-violet-700 shadow-none">
                 Approval Queue
              </TabsTrigger>
              <TabsTrigger value="all" className="text-[12px] px-0 h-full border-b-2 border-transparent data-[state=active]:border-violet-600 data-[state=active]:bg-transparent data-[state=active]:text-violet-700 shadow-none">
                 Payout History
              </TabsTrigger>
           </TabsList>

           <div className="pt-4">
              <TabsContent value="pending" className="m-0 space-y-4">
                 <div className="bg-card border rounded-md shadow-sm overflow-hidden">
                    <table className="w-full text-[13px]">
                       <thead>
                          <tr className="bg-slate-50/80 border-b h-9">
                             <th className="px-3 text-left w-[180px]">Agent Name</th>
                             <th className="text-left w-[120px]">Amount</th>
                             <th className="text-left w-[140px]">Requested Date</th>
                             <th className="text-center w-[120px]">Days Waiting</th>
                             <th className="text-left w-[180px]">Bank Info (Masked)</th>
                             <th className="text-right px-3">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y">
                          {pendingList.map(w => {
                             const agent = agents?.find(a => a.id === w.agentId);
                             const waitHours = differenceInHours(new Date(), parseISO(w.requestedAt));
                             const waitColor = waitHours > 48 ? "text-red-600" : waitHours > 24 ? "text-amber-600" : "text-emerald-600";
                             const isProcessing = processingId === w.id;

                             return (
                                <React.Fragment key={w.id}>
                                   <tr className={cn("h-10 hover:bg-slate-50 group transition-colors", isProcessing && "bg-violet-50/50")}>
                                      <td className="px-3 font-bold text-slate-800">{agent?.name || 'Unknown'}</td>
                                      <td className="font-bold text-violet-700">${w.amount.toLocaleString()}</td>
                                      <td className="text-slate-500 font-medium">{format(parseISO(w.requestedAt), 'MMM d, yyyy')}</td>
                                      <td className="text-center">
                                         <span className={cn("text-[11px] font-bold uppercase", waitColor)}>{Math.floor(waitHours/24)}d {waitHours%24}h</span>
                                      </td>
                                      <td className="text-slate-400 font-mono text-[10px]">
                                         **** **** {(w as any).bankDetails?.accountNumber?.slice(-4) || 'XXXX'}
                                      </td>
                                      <td className="px-3 text-right">
                                         <Button variant="outline" size="sm" className="h-7 text-[11px] font-bold uppercase text-violet-600 border-violet-100" onClick={() => setProcessingId(isProcessing ? null : w.id)}>
                                            {isProcessing ? 'Close' : 'Process Request'}
                                         </Button>
                                      </td>
                                   </tr>
                                   {isProcessing && (
                                     <tr className="bg-slate-50/50">
                                        <td colSpan={6} className="p-4 px-10 border-b">
                                           <div className="flex gap-10">
                                              <div className="w-[300px] space-y-3">
                                                 <div className="flex items-center gap-2 text-violet-700 mb-2">
                                                    <ShieldCheck size={16} />
                                                    <h4 className="text-[12px] font-bold uppercase">Payment Credentials</h4>
                                                 </div>
                                                 <div className="space-y-1.5 p-3 bg-white border rounded shadow-sm text-[12px]">
                                                    <div className="flex justify-between"><span className="text-slate-400">Bank:</span> <b>{(w as any).bankDetails?.bankName}</b></div>
                                                    <div className="flex justify-between"><span className="text-slate-400">Account:</span> <b>{(w as any).bankDetails?.accountName}</b></div>
                                                    <div className="flex justify-between font-mono"><span className="text-slate-400">Number:</span> <b>{(w as any).bankDetails?.accountNumber}</b></div>
                                                 </div>
                                              </div>
                                              <div className="flex-1 space-y-4">
                                                 <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-1.5">
                                                       <Label className="text-[11px] font-bold uppercase text-emerald-700">Payment Reference (Approval)</Label>
                                                       <Input 
                                                         placeholder="TXN-XXXXX-XXXX" 
                                                         className="h-8 text-[12px] bg-white border-emerald-100" 
                                                         value={paymentRef}
                                                         onChange={(e) => setPaymentRef(e.target.value)}
                                                       />
                                                       <Button className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-[11px] font-bold uppercase" onClick={() => handleApprove(w)} disabled={isActioning || !paymentRef.trim()}>
                                                          Confirm & Mark Paid
                                                       </Button>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                       <Label className="text-[11px] font-bold uppercase text-red-700">Rejection Reason</Label>
                                                       <Input 
                                                         placeholder="Explain why rejected..." 
                                                         className="h-8 text-[12px] bg-white border-red-100" 
                                                         value={rejectReason}
                                                         onChange={(e) => setRejectReason(e.target.value)}
                                                       />
                                                       <Button variant="outline" className="w-full h-8 border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold uppercase" onClick={() => handleReject(w)} disabled={isActioning || !rejectReason.trim()}>
                                                          Reject Request
                                                       </Button>
                                                    </div>
                                                 </div>
                                              </div>
                                           </div>
                                        </td>
                                     </tr>
                                   )}
                                </React.Fragment>
                             );
                          })}
                          {pendingList.length === 0 && !loading && (
                            <tr className="h-40 text-center"><td colSpan={6} className="text-slate-300 italic">No pending withdrawal requests in queue.</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </TabsContent>

              <TabsContent value="all" className="m-0 space-y-4">
                 <div className="flex items-center gap-3 mb-2">
                    <div className="relative w-[300px]">
                       <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                       <Input placeholder="Search by agent or reference..." className="pl-8 h-8 text-[12px] bg-white" />
                    </div>
                 </div>
                 <div className="bg-card border rounded-md shadow-sm overflow-hidden">
                    <table className="w-full text-[13px]">
                       <thead>
                          <tr className="bg-slate-50/80 border-b h-9">
                             <th className="px-3 text-left w-[180px]">Agent</th>
                             <th className="text-left w-[120px]">Amount</th>
                             <th className="text-left w-[100px]">Status</th>
                             <th className="text-left w-[140px]">Processed</th>
                             <th className="text-left w-[140px]">Processed By</th>
                             <th className="text-left px-3">Reference</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y">
                          {historyList.map(w => {
                             const agent = agents?.find(a => a.id === w.agentId);
                             return (
                               <tr key={w.id} className="h-9 hover:bg-slate-50 transition-colors">
                                  <td className="px-3 font-medium">{agent?.name || '--'}</td>
                                  <td className="font-bold text-slate-700">${w.amount.toLocaleString()}</td>
                                  <td>
                                     <Badge variant="outline" className={cn(
                                       "text-[9px] h-3.5 px-1 font-bold uppercase",
                                       w.status === 'paid' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                                     )}>
                                        {w.status}
                                     </Badge>
                                  </td>
                                  <td className="text-slate-400">{(w as any).processedAt ? format(parseISO((w as any).processedAt), 'MMM d, HH:mm') : '--'}</td>
                                  <td className="text-slate-600 font-medium">{(w as any).processedBy || '--'}</td>
                                  <td className="px-3 font-mono text-[10px] text-slate-400">{(w as any).reference || '--'}</td>
                               </tr>
                             );
                          })}
                       </tbody>
                    </table>
                 </div>
              </TabsContent>
           </div>
        </Tabs>
      </div>
    </Shell>
  );
}

