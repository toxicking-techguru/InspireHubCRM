
"use client"

import React, { useMemo } from 'react';
import { Users, CheckCircle2, Trophy, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Lead, Wallet as WalletType } from '@/types/crm';
import { Skeleton } from '@/components/ui/skeleton';

export function AgentStats() {
  const { user } = useAuthStore();
  const firestore = useFirestore();

  const leadsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    let q = collection(firestore, 'leads');
    if (user.role === 'Agent') {
      return query(q, where('agentId', '==', user.id));
    }
    return q;
  }, [firestore, user]);

  const { data: leads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);
  
  const walletRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'wallets', user.id);
  }, [firestore, user]);
  const { data: wallet, loading: walletLoading } = useDoc<WalletType>(walletRef as any);

  const stats = useMemo(() => {
    if (!leads) return [];
    
    const myLeads = leads.length;
    const qualified = leads.filter(l => l.status === 'qualified').length;
    const won = leads.filter(l => l.status === 'won').length;
    const earnings = wallet?.totalEarned || 0;
    const pending = wallet?.pending || 0;

    return [
      { label: 'Total Leads', value: myLeads.toString(), icon: Users, trend: 'In pipeline', color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Qualified', value: qualified.toString(), icon: CheckCircle2, trend: `${myLeads > 0 ? Math.round((qualified/myLeads)*100) : 0}% conv.`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { label: 'Won (Total)', value: won.toString(), icon: Trophy, trend: 'Closed deals', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Earnings', value: `$${earnings.toLocaleString()}`, icon: Wallet, trend: `Pending: $${pending.toLocaleString()}`, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];
  }, [leads, wallet]);

  if (leadsLoading || walletLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="bg-card border rounded-lg p-3 md:p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <p className="text-lg md:text-xl font-bold mt-0.5">{stat.value}</p>
            </div>
            <div className={`${stat.bg} ${stat.color} p-2 rounded-md`}>
              <stat.icon size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-center text-[10px] md:text-xs">
            <span className="font-medium text-muted-foreground">{stat.trend}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
