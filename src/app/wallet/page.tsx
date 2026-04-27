
"use client"

import React, { useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useDoc, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Wallet, Commission, Withdrawal } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { doc, collection, query, where, orderBy, limit, addDoc } from 'firebase/firestore';
import { 
  ArrowUpRight, 
  Loader2, 
  History,
  Banknote,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet as WalletIcon
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function WalletPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Form State
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const walletRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'wallets', user.id);
  }, [firestore, user?.id]);

  const { data: wallet, loading: walletLoading } = useDoc<Wallet>(walletRef as any);

  const configRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'system', 'config');
  }, [firestore]);
  const { data: config } = useDoc<any>(configRef as any);

  const commissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'commissions'), 
      where('agentId', '==', user.id), 
      orderBy('createdAt', 'desc'),
      limit(10)
    );
  }, [firestore, user?.id]);
  const { data: commissions, loading: commissionsLoading } = useCollection<Commission>(commissionsQuery as any);

  const withdrawalsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'withdrawals'), 
      where('agentId', '==', user.id), 
      orderBy('requestedAt', 'desc'),
      limit(10)
    );
  }, [firestore, user?.id]);
  const { data: withdrawals, loading: withdrawalsLoading } = useCollection<Withdrawal>(withdrawalsQuery as any);

  const withdrawableBalance = wallet?.withdrawable || 0;
  const totalBalance = (wallet?.withdrawable || 0) + (wallet?.pending || 0);

  const handleWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user || !wallet) return;

    const requestAmount = parseFloat(amount);
    if (isNaN(requestAmount) || requestAmount <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount." });
      return;
    }

    if (requestAmount > withdrawableBalance) {
      toast({ variant: "destructive", title: "Insufficient Funds", description: "Request exceeds withdrawable balance." });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'withdrawals'), {
        agentId: user.id,
        amount: requestAmount,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        bankDetails: { bankName, accountName, accountNumber }
      });

      setAmount('');
      setBankName('');
      setAccountName('');
      setAccountNumber('');
      toast({ title: "Request Submitted", description: "Your payout request is now in the verification queue." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Request Failed", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Earnings & Wallet</h1>
          <p className="text-sm text-muted-foreground">Manage your commissions and payout requests.</p>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Earned', value: wallet?.totalEarned || 0, color: 'bg-slate-50' },
            { label: 'Pending Commission', value: wallet?.pending || 0, color: 'bg-slate-50' },
            { label: 'Withdrawable', value: withdrawableBalance, color: 'bg-primary/5 border-primary/20' },
            { label: 'Withdrawn', value: wallet?.withdrawn || 0, color: 'bg-slate-50' },
            { label: 'Net Balance', value: totalBalance, color: 'bg-slate-50' },
          ].map((item, i) => (
            <div key={i} className={cn("border-[0.5px] rounded-md p-3 shadow-sm", item.color)}>
              <p className="text-[11px] font-bold uppercase tracking-tight text-slate-400 mb-1">{item.label}</p>
              <p className="text-[20px] font-bold text-slate-900 leading-tight">
                ${item.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-10 gap-6">
          {/* Left Column: Withdrawal Form */}
          <div className="lg:col-span-4 space-y-6">
            <Card>
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-[13px] font-bold uppercase text-slate-500 flex items-center gap-2">
                  <Banknote size={16} /> Request Payout
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <form onSubmit={handleWithdrawalRequest} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-400 uppercase">Amount to Withdraw</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        className="pl-7 h-9 text-[13px]" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Available for transfer: ${withdrawableBalance.toLocaleString()}</p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-slate-400 uppercase">Bank / Provider Name</Label>
                      <Input required className="h-9 text-[13px]" placeholder="e.g. Standard Chartered" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase">Account Name</Label>
                        <Input required className="h-9 text-[13px]" placeholder="Full Name" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-slate-400 uppercase">Account Number</Label>
                        <Input required className="h-9 text-[13px]" placeholder="0000000000" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full gap-2 h-10 font-bold shadow-md" disabled={isSubmitting || withdrawableBalance === 0}>
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
                    Initiate Transfer
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex items-start gap-3 text-[12px] text-amber-800">
               <Clock size={16} className="shrink-0 mt-0.5" />
               <p>Withdrawal requests are processed <b>{config?.withdrawalDays === 'All Days' ? 'daily' : config?.withdrawalDays ? `every ${config.withdrawalDays}` : 'every Friday'}</b>. Transfers to non-local banks may take up to 3 business days to reflect.</p>
            </div>
          </div>

          {/* Right Column: History */}
          <div className="lg:col-span-6 space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="p-4 border-b bg-slate-50/50">
                <CardTitle className="text-[13px] font-bold uppercase text-slate-500 flex items-center justify-between">
                  <div className="flex items-center gap-2"><History size={16} /> Recent Payouts</div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-slate-50/30 h-9">
                        <th className="px-4 text-left">Date</th>
                        <th className="text-left">Amount</th>
                        <th className="text-left">Status</th>
                        <th className="text-right px-4">Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {withdrawalsLoading ? (
                        <tr className="h-20"><td colSpan={4} className="text-center"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                      ) : withdrawals?.map((w) => (
                        <tr key={w.id} className="h-10 hover:bg-slate-50/30 transition-colors">
                          <td className="px-4 text-slate-500">{format(parseISO(w.requestedAt), 'MMM d, yyyy')}</td>
                          <td className="font-bold text-slate-700">${w.amount.toLocaleString()}</td>
                          <td>
                            <Badge variant="outline" className={cn(
                              "text-[10px] uppercase h-4 px-1.5 font-bold border-none",
                              w.status === 'pending' ? "bg-amber-50 text-amber-700" :
                              w.status === 'paid' ? "bg-emerald-50 text-emerald-700" :
                              w.status === 'rejected' ? "bg-red-50 text-red-700" : "bg-slate-100"
                            )}>
                              {w.status}
                            </Badge>
                          </td>
                          <td className="px-4 text-right font-mono text-[10px] text-slate-400">
                             {(w as any).reference || '---'}
                          </td>
                        </tr>
                      ))}
                      {(!withdrawals || withdrawals.length === 0) && (
                        <tr className="h-20"><td colSpan={4} className="text-center text-muted-foreground italic">No payout history.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="p-4 border-b bg-slate-50/50">
                <CardTitle className="text-[13px] font-bold uppercase text-slate-500 flex items-center gap-2">
                  <WalletIcon size={16} /> Latest Commissions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-slate-50/30 h-9">
                        <th className="px-4 text-left">Client</th>
                        <th className="text-left">Deal Value</th>
                        <th className="text-right">Commission</th>
                        <th className="text-right px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {commissionsLoading ? (
                        <tr className="h-20"><td colSpan={4} className="text-center"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                      ) : commissions?.map((c) => (
                        <tr key={c.id} className="h-10 hover:bg-slate-50/30 transition-colors">
                          <td className="px-4 font-medium text-slate-700">{c.clientName || 'Private Lead'}</td>
                          <td className="text-slate-500">${c.dealAmount?.toLocaleString()}</td>
                          <td className="text-right font-bold text-primary">${c.amount.toLocaleString()}</td>
                          <td className="px-4 text-right">
                             <Badge variant="outline" className={cn(
                               "text-[9px] uppercase h-3.5 px-1 font-bold border-none",
                               c.status === 'pending' ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"
                             )}>
                               {c.status}
                             </Badge>
                          </td>
                        </tr>
                      ))}
                      {(!commissions || commissions.length === 0) && (
                        <tr className="h-20"><td colSpan={4} className="text-center text-muted-foreground italic">Awaiting first commission log.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
