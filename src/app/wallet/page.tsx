
"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useDoc, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Wallet, Commission, Withdrawal } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { doc, collection, query, where, orderBy, limit, addDoc } from 'firebase/firestore';
import { 
  CreditCard, 
  ArrowUpRight, 
  History,
  TrendingUp,
  Clock,
  Loader2,
  AlertCircle,
  Banknote,
  CheckCircle2,
  XCircle
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

  const commissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'commissions'), 
      where('agentId', '==', user.id), 
      orderBy('createdAt', 'desc'),
      limit(15)
    );
  }, [firestore, user?.id]);
  const { data: commissions, loading: commissionsLoading } = useCollection<Commission>(commissionsQuery as any);

  const withdrawalsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'withdrawals'), 
      where('agentId', '==', user.id), 
      orderBy('requestedAt', 'desc'),
      limit(15)
    );
  }, [firestore, user?.id]);
  const { data: withdrawals, loading: withdrawalsLoading } = useCollection<Withdrawal>(withdrawalsQuery as any);

  const withdrawableBalance = wallet?.withdrawable || 0;
  const balance = (wallet?.withdrawable || 0) + (wallet?.pending || 0);

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
      toast({ title: "Request Sent", description: "Your withdrawal request is pending approval." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Request Failed", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="border-b mb-4 pb-1">
      <h2 className="text-[14px] font-bold text-slate-800">{title}</h2>
    </div>
  );

  if (!user) return null;

  return (
    <Shell>
      <div className="space-y-8">
        {/* Metric Cards Grid - Aligned with image list */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Earned', value: wallet?.totalEarned || 0, color: 'bg-slate-50' },
            { label: 'Pending Commission', value: wallet?.pending || 0, color: 'bg-slate-50' },
            { label: 'Withdrawable', value: wallet?.withdrawable || 0, color: 'bg-indigo-100 border-indigo-200' },
            { label: 'Withdrawn Amount', value: wallet?.withdrawn || 0, color: 'bg-slate-50' },
            { label: 'Remaining Balance', value: balance, color: 'bg-slate-50' },
          ].map((item, i) => (
            <div key={i} className={cn("border-[0.5px] rounded-md p-3 shadow-sm", item.color)}>
              <p className="text-[11px] font-bold uppercase tracking-tight text-slate-400 mb-1">{item.label}</p>
              <p className="text-[20px] font-bold text-slate-900 leading-tight">
                ${item.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Withdrawal Request Form Section */}
        <div className="space-y-4">
          <SectionHeader title="Withdrawal Request Flow" />
          <div className="bg-card border-[0.5px] rounded-lg p-5 shadow-sm max-w-[480px]">
            <form onSubmit={handleWithdrawalRequest} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-[12px] font-bold">Amount to Withdraw</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <Input 
                    id="amount" 
                    type="number" 
                    placeholder="0.00" 
                    className="pl-7 h-9 text-[13px]" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Approved Withdrawable Balance: ${withdrawableBalance.toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-[12px] font-bold uppercase text-slate-400">Target Bank / Provider</Label>
                  <Input required className="h-9 text-[13px]" placeholder="e.g. Standard Chartered" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-bold uppercase text-slate-400">Account Name</Label>
                  <Input required className="h-9 text-[13px]" placeholder="Account Holder" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-bold uppercase text-slate-400">Account Number</Label>
                  <Input required className="h-9 text-[13px]" placeholder="**** **** ****" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                </div>
              </div>

              <Button type="submit" className="w-full gap-2 h-9 font-bold bg-indigo-600 hover:bg-indigo-700" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
                Initiate Request
              </Button>
            </form>
          </div>
        </div>

        {/* Withdrawal History Section */}
        <div className="space-y-4">
          <SectionHeader title="Payout Status Tracking" />
          <div className="bg-card border-[0.5px] rounded-md shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 h-9">
                    <th className="px-3 text-left w-[140px]">Date Requested</th>
                    <th className="text-left w-[120px]">Amount</th>
                    <th className="text-left w-[100px]">Status</th>
                    <th className="text-left w-[140px]">Processed Date</th>
                    <th className="text-left w-[120px]">Processed By</th>
                    <th className="text-left px-3">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[13px]">
                  {withdrawalsLoading ? (
                    <tr className="h-20"><td colSpan={6} className="text-center"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                  ) : withdrawals?.map((w) => (
                    <tr key={w.id} className="h-9 hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 text-slate-500">{format(parseISO(w.requestedAt), 'MMM d, yyyy')}</td>
                      <td className="font-bold">${w.amount.toLocaleString()}</td>
                      <td>
                        <Badge variant="outline" className={cn(
                          "text-[10px] uppercase h-4 px-1.5 font-bold",
                          w.status === 'pending' && "bg-amber-50 text-amber-700 border-amber-200",
                          w.status === 'approved' && "bg-blue-50 text-blue-700 border-blue-200",
                          w.status === 'paid' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                          w.status === 'rejected' && "bg-red-50 text-red-700 border-red-200"
                        )}>
                          {w.status}
                        </Badge>
                      </td>
                      <td className="text-slate-500">{(w as any).processedAt ? format(parseISO((w as any).processedAt), 'MMM d, HH:mm') : '--'}</td>
                      <td>{(w as any).processedBy || '--'}</td>
                      <td className="px-3 font-mono text-[11px]">{(w as any).reference || '--'}</td>
                    </tr>
                  ))}
                  {(!withdrawals || withdrawals.length === 0) && (
                    <tr className="h-20"><td colSpan={6} className="text-center text-muted-foreground italic">No withdrawal records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
