"use client"

import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Lead, Wallet as WalletType, Commission } from '@/types/crm';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfMonth, parseISO } from 'date-fns';

export function AgentStats() {
  const { user, config } = useAuthStore();
  const firestore = useFirestore();

  const currencySymbol = config?.currency === 'USD' ? '$' : config?.currency === 'GBP' ? '£' : 'KES ';

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    let q = collection(firestore, 'leads');
    if (user.role === 'Agent') {
      return query(q, where('agentId', '==', user.id));
    }
    return q;
  }, [firestore, user?.id, user?.role]);

  const { data: leads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);
  
  const walletRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'wallets', user.id);
  }, [firestore, user?.id]);
  
  const { data: wallet, loading: walletLoading } = useDoc<WalletType>(walletRef as any);

  // Fetch commissions to calculate "Earnings this month" dynamically
  const commissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'commissions'), where('agentId', '==', user.id));
  }, [firestore, user?.id]);
  const { data: commissions } = useCollection<Commission>(commissionsQuery as any);

  const stats = React.useMemo(() => {
    if (!leads) return [];
    
    const myLeads = leads.length;
    const qualified = leads.filter(l => l.status === 'qualified').length;
    const wonTotal = leads.filter(l => l.status === 'won').length;

    // Monthly Earnings Calculation
    const monthStart = startOfMonth(new Date());
    const monthlyEarnings = commissions?.reduce((sum, c) => {
      const cDate = parseISO(c.createdAt);
      return cDate >= monthStart ? sum + c.amount : sum;
    }, 0) || 0;

    return [
      { label: 'My total leads', value: myLeads.toString() },
      { label: 'Qualified leads', value: qualified.toString() },
      { label: 'Wins (Lifetime)', value: wonTotal.toString() },
      { label: 'Earnings this month', value: `${currencySymbol}${monthlyEarnings.toLocaleString()}` },
    ];
  }, [leads, commissions, currencySymbol]);

  if (leadsLoading || walletLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[90px] rounded-md" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <div key={i} className="bg-slate-50 dark:bg-slate-800 border-[0.5px] rounded-md p-3 shadow-sm">
          <p className="text-[12px] font-medium text-slate-500 mb-1">{stat.label}</p>
          <p className="text-[22px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
