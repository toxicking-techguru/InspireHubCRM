"use client"

import React, { useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useDoc, useFirestore } from '@/firebase';
import { Wallet } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc } from 'firebase/firestore';
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export default function WalletPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();

  const walletRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'wallets', user.id);
  }, [firestore, user]);

  const { data: wallet, loading } = useDoc<Wallet>(walletRef as any);

  if (loading) {
    return (
      <Shell>
        <div className="py-20 flex flex-col items-center">
          <Loader2 className="animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Syncing financial data...</p>
        </div>
      </Shell>
    );
  }

  const w = wallet || { totalEarned: 0, pending: 0, withdrawable: 0, withdrawn: 0 };

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Earnings & Wallet</h1>
          <p className="text-sm text-muted-foreground">Track your commissions and manage withdrawals.</p>
        </div>

        {/* Wallet Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div className="bg-primary rounded-xl p-5 text-primary-foreground shadow-lg flex flex-col justify-between h-[160px]">
              <div className="flex items-center justify-between">
                <CreditCard size={24} className="opacity-80" />
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Withdrawable Balance</span>
              </div>
              <div>
                <p className="text-3xl font-bold">${w.withdrawable.toLocaleString()}</p>
                <p className="text-xs opacity-80 mt-1">Ready for withdrawal</p>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-5 shadow-sm flex flex-col justify-between h-[160px]">
              <div className="flex items-center justify-between">
                <Clock size={24} className="text-amber-500 opacity-80" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Pending Approval</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-amber-600">${w.pending.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">From recent deals</p>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-5 shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold mb-4">Request Withdrawal</h3>
            <div className="space-y-4 flex-1">
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs">Amount to withdraw</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input id="amount" placeholder="0.00" className="pl-7 h-10 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank" className="text-xs">Bank Destination</Label>
                <select id="bank" className="w-full bg-background border rounded-md h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option>Primary Savings (**** 4242)</option>
                  <option>Business Account (**** 9876)</option>
                </select>
              </div>
              <Button className="w-full gap-2 h-10">
                <ArrowUpRight size={16} /> Withdraw Funds
              </Button>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Lifetime Earned', value: `$${w.totalEarned.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500' },
            { label: 'Total Withdrawn', value: `$${w.withdrawn.toLocaleString()}`, icon: ArrowDownLeft, color: 'text-slate-500' },
            { label: 'Commission Rate', value: '12%', icon: TrendingUp, color: 'text-indigo-500' },
            { label: 'Approved Today', value: '$0.00', icon: CheckCircle2, color: 'text-blue-500' },
          ].map((item, i) => (
            <div key={i} className="bg-card border rounded-lg p-3 shadow-sm flex items-center gap-3">
              <div className={`p-2 rounded bg-slate-50 dark:bg-slate-900 ${item.color}`}>
                <item.icon size={16} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{item.label}</p>
                <p className="text-sm font-bold">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card border rounded-lg shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-500" /> Recent Activity
              </h3>
            </div>
            <div className="p-12 text-center text-muted-foreground italic text-xs">
              No recent commissions recorded in this period.
            </div>
          </div>

          <div className="bg-card border rounded-lg shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <History size={16} className="text-indigo-500" /> Withdrawal History
              </h3>
            </div>
            <div className="p-12 text-center text-muted-foreground italic text-xs">
              No withdrawal history found.
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
