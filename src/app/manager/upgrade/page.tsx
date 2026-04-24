
"use client"

import React, { useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Agent, Tier, Lead } from '@/types/crm';
import { 
  ArrowUpCircle, 
  Award, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Bell, 
  Zap,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TierBadge } from '@/components/ui/tier-badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function ManagerUpgradeQueuePage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();

  const agentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'agents'), where('managerId', '==', user.id));
  }, [firestore, user?.id]);
  const { data: agents } = useCollection<Agent>(agentsQuery as any);

  const leadsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'leads') : null, [firestore]);
  const { data: leads } = useCollection<Lead>(leadsQuery as any);

  const tiersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'tiers'), orderBy('rankLevel')) : null, [firestore]);
  const { data: tiers } = useCollection<Tier>(tiersQuery as any);

  const upgradeCandidates = useMemo(() => {
    if (!agents || !tiers || !leads) return [];
    
    return agents.map(agent => {
      const currentTier = tiers.find(t => t.id === agent.tierId);
      const nextTier = tiers.find(t => t.rankLevel === (currentTier?.rankLevel || 0) + 1);
      
      if (!nextTier) return null;

      const agentLeads = leads.filter(l => l.agentId === agent.id);
      const won = agentLeads.filter(l => l.status === 'won').length;
      const revenue = agentLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + l.estimatedBudget, 0);
      const created = agentLeads.length;

      const criteria = nextTier.upgradeCriteria;
      
      const metrics = [
        { name: 'Leads Created', actual: created, target: criteria.leadsTarget },
        { name: 'Wins', actual: won, target: criteria.closedTarget },
        { name: 'Revenue', actual: revenue, target: criteria.revenueTarget, isCurrency: true },
      ];

      const progress = metrics.map(m => ({
        ...m,
        percent: Math.min(Math.round((m.actual / m.target) * 100), 100),
        isMet: m.actual >= m.target
      }));

      const overallPercent = Math.round(progress.reduce((sum, m) => sum + m.percent, 0) / progress.length);
      const remainingCount = progress.filter(m => !m.isMet).length;

      // Filter: only show if within 20% of meeting (overall > 80% or any metric > 80%)
      const isClose = overallPercent >= 80 || progress.some(m => m.percent >= 80);

      if (!isClose) return null;

      return {
        ...agent,
        nextTierName: nextTier.name,
        progress,
        overallPercent,
        remainingCount
      };
    }).filter(Boolean);
  }, [agents, tiers, leads]);

  const handleNotify = (name: string) => {
    toast({ title: "Notification Sent", description: `Sent upgrade path nudge to ${name}` });
  };

  if (!user || user.role !== 'Manager') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold flex items-center gap-2">
              <ArrowUpCircle className="text-cyan-600" size={20} /> Upgrade Queue
            </h1>
            <p className="text-[12px] text-muted-foreground">Agents approaching their next performance tier.</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border text-[11px] font-bold text-slate-500 uppercase tracking-tight">
            <Clock size={12} className="text-cyan-600" />
            Next Evaluation: May 1, 2025
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {upgradeCandidates.map((c: any) => (
            <div key={c.id} className="bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
                     {c.name[0]}
                   </div>
                   <div>
                      <h3 className="text-[14px] font-bold">{c.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                         <TierBadge tierId={c.tierId} />
                         <ChevronRight size={10} className="text-slate-300" />
                         <Badge variant="outline" className="text-[9px] h-3.5 border-cyan-200 bg-cyan-50 text-cyan-700 font-bold uppercase">{c.nextTierName}</Badge>
                      </div>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[18px] font-bold text-cyan-700">{c.overallPercent}%</p>
                   <p className="text-[9px] text-slate-400 font-bold uppercase">Overall</p>
                </div>
              </div>

              <div className="space-y-3 flex-1">
                 {c.progress.map((m: any, i: number) => (
                   <div key={i} className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                         <span className="text-slate-500">{m.name}</span>
                         {m.isMet ? (
                           <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={10} /> MET</span>
                         ) : (
                           <span className="text-slate-400">{m.isCurrency ? `$${m.actual.toLocaleString()}` : m.actual} / {m.isCurrency ? `$${m.target.toLocaleString()}` : m.target}</span>
                         )}
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                         <div 
                           className={cn(
                             "h-full transition-all duration-700",
                             m.isMet ? "bg-emerald-500" : m.percent >= 80 ? "bg-amber-500" : "bg-red-400"
                           )} 
                           style={{ width: `${m.percent}%` }}
                         />
                      </div>
                   </div>
                 ))}
              </div>

              <div className="mt-5 pt-4 border-t flex items-center justify-between">
                 <p className="text-[11px] font-medium text-slate-500">
                    <b className="text-cyan-700">{c.remainingCount}</b> criteria remaining
                 </p>
                 <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5" onClick={() => handleNotify(c.name)}>
                    <Bell size={12} /> Notify Agent
                 </Button>
              </div>
            </div>
          ))}

          {upgradeCandidates.length === 0 && (
            <div className="col-span-full py-20 border-[0.5px] border-dashed rounded-lg flex flex-col items-center justify-center text-slate-400">
               <Zap size={32} className="mb-2 opacity-20" />
               <p className="text-[14px] font-medium">No active upgrade candidates in the queue.</p>
               <p className="text-[12px]">Agents will appear here when they reach 80% of next tier requirements.</p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
