"use client"

import React, { useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Shell } from '@/components/layout/Shell';
import { AgentStats } from '@/components/dashboard/AgentStats';
import { EarningsChart } from '@/components/dashboard/EarningsChart';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock, Target, CheckCircle2, Phone, Mail, Globe, Award, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Lead, LeadActivity, Tier, Target as AgentTarget } from '@/types/crm';
import { formatDistanceToNow, isToday, parseISO, startOfMonth, format } from 'date-fns';
import { TierBadge } from '@/components/ui/tier-badge';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  // Current Month String for target lookup
  const currentMonthStr = format(new Date(), 'yyyy-MM');

  // Priority Leads (Active ones)
  const priorityLeadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    let q = collection(firestore, 'leads');
    if (user.role === 'Agent') {
      return query(q, where('agentId', '==', user.id), orderBy('lastActivityAt', 'desc'), limit(10));
    }
    return query(q, orderBy('lastActivityAt', 'desc'), limit(10));
  }, [firestore, user?.id, user?.role]);
  const { data: leads } = useCollection<Lead>(priorityLeadsQuery);

  // Today's Activities
  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !leads?.[0]?.id) return null;
    return query(
      collection(firestore, 'leads', leads[0].id, 'activities'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
  }, [firestore, user?.id, leads]);
  const { data: recentActivities } = useCollection<LeadActivity>(activitiesQuery);

  // Monthly Target
  const targetQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'targets'),
      where('agentId', '==', user.id),
      where('month', '==', currentMonthStr),
      limit(1)
    );
  }, [firestore, user?.id, currentMonthStr]);
  const { data: targets } = useCollection<AgentTarget>(targetQuery as any);
  const currentTarget = targets?.[0];

  // Tier info for progress
  const tiersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'tiers'), orderBy('rankLevel')) : null, [firestore]);
  const { data: tiers } = useCollection<Tier>(tiersQuery as any);
  const currentTier = tiers?.find(t => t.id === user?.tierId);
  const nextTier = tiers?.find(t => t.rankLevel === (currentTier?.rankLevel || 0) + 1);

  // Dynamic Progress Calculation
  const progressMetrics = useMemo(() => {
    if (!leads) return { leadsCount: 0, winsCount: 0, leadsPercent: 0, winsPercent: 0, overallPercent: 0 };
    
    const monthStart = startOfMonth(new Date());
    const monthLeads = leads.filter(l => parseISO(l.createdAt) >= monthStart);
    const monthWins = leads.filter(l => l.status === 'won' && l.wonAt && parseISO(l.wonAt) >= monthStart);

    const lTarget = currentTarget?.leadsTarget || 10;
    const wTarget = currentTarget?.closedTarget || 2;

    const leadsCount = monthLeads.length;
    const winsCount = monthWins.length;

    const lp = Math.min(Math.round((leadsCount / lTarget) * 100), 100);
    const wp = Math.min(Math.round((winsCount / wTarget) * 100), 100);
    const op = Math.round((lp + wp) / 2);

    return { 
      leadsCount, 
      winsCount, 
      leadsTarget: lTarget, 
      winsTarget: wTarget,
      leadsPercent: lp, 
      winsPercent: wp, 
      overallPercent: op 
    };
  }, [leads, currentTarget]);

  // Tier UI Styles
  const tierUI = useMemo(() => {
    switch (user?.tierId) {
      case 't1': return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: 'text-slate-500' };
      case 't2': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: 'text-amber-500' };
      case 't3': return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: 'text-blue-500' };
      case 't4': return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', icon: 'text-purple-500' };
      default: return { bg: 'bg-primary/5', text: 'text-primary', border: 'border-primary/20', icon: 'text-primary' };
    }
  }, [user?.tierId]);

  if (!user) return null;

  return (
    <Shell>
      <div className="flex flex-col gap-4">
        {/* Compact Stats Grid */}
        <AgentStats />

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Activities Due Today */}
            <div className="bg-card border rounded-md shadow-sm overflow-hidden">
              <div className="p-3 border-b flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-[13px] font-bold uppercase tracking-tight text-slate-500">Priority Follow-ups</h3>
                <Button variant="ghost" size="sm" onClick={() => router.push('/activities')} className="h-6 text-[10px] uppercase font-bold text-primary px-2">Full Schedule</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 h-9">
                      <th className="px-4 font-semibold text-left">Lead Name</th>
                      <th className="font-semibold text-left">Current Stage</th>
                      <th className="font-semibold text-left">Last Touch</th>
                      <th className="text-right px-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leads?.slice(0, 5).map((lead, idx) => (
                      <tr key={lead.id} className={cn("h-10 hover:bg-slate-50 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                        <td className="px-4 font-bold text-slate-700">{lead.clientName}</td>
                        <td className="capitalize text-slate-500 text-[12px]">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="text-slate-400 text-[11px]">
                          {lead.lastActivityAt ? formatDistanceToNow(parseISO(lead.lastActivityAt)) + ' ago' : 'New'}
                        </td>
                        <td className="px-4 text-right">
                          <Button variant="outline" size="sm" onClick={() => router.push(`/leads/${lead.id}`)} className="h-7 text-[11px] px-2 font-bold uppercase tracking-tighter">Log activity</Button>
                        </td>
                      </tr>
                    ))}
                    {(!leads || leads.length === 0) && (
                      <tr className="h-20">
                        <td colSpan={4} className="text-center text-muted-foreground text-[11px] italic">No active leads in pipeline.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Earnings Chart */}
            <div className="bg-card border rounded-md shadow-sm p-4 h-[260px]">
               <EarningsChart />
            </div>
          </div>

          <div className="space-y-4">
            {/* Tier Progress Card */}
            <div className="bg-card border rounded-md p-0 shadow-sm overflow-hidden flex flex-col">
               <div className={cn("p-4 border-b flex items-center justify-between", tierUI.bg)}>
                  <div className="space-y-0.5">
                    <p className={cn("text-[10px] font-bold uppercase tracking-widest", tierUI.text)}>Active Rank</p>
                    <h3 className="text-[20px] font-bold text-slate-900 dark:text-white leading-none">
                      {currentTier?.name || 'Silver'}
                    </h3>
                  </div>
                  <div className={cn("w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm border-2", tierUI.border, tierUI.icon)}>
                    <Award size={24} />
                  </div>
               </div>
               
               <div className="p-4 space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                       <span className="text-slate-500 uppercase">Monthly Progress</span>
                       <span className="text-primary">{progressMetrics.overallPercent}%</span>
                    </div>
                    <div className="relative w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 h-full bg-primary transition-all duration-1000 ease-out" 
                        style={{ width: `${progressMetrics.overallPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                       <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1">
                          <Target size={12} className="text-primary" /> Leads
                       </div>
                       <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100">
                          {progressMetrics.leadsCount} <span className="text-slate-300 dark:text-slate-700 font-normal">/ {progressMetrics.leadsTarget}</span>
                       </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                       <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1">
                          <TrendingUp size={12} className="text-emerald-500" /> Wins
                       </div>
                       <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100">
                          {progressMetrics.winsCount} <span className="text-slate-300 dark:text-slate-700 font-normal">/ {progressMetrics.winsTarget}</span>
                       </p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-dashed">
                     <span className="text-[10px] uppercase font-bold text-slate-400">Next Tier Goal</span>
                     <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-primary">{nextTier?.name || 'Diamond'}</span>
                        <ArrowRight size={10} className="text-slate-300" />
                     </div>
                  </div>
               </div>
            </div>

            {/* Pipeline Stage Summary */}
            <div className="bg-card border rounded-md p-4 shadow-sm">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Pipeline Distribution</h3>
              <div className="space-y-3">
                {['new', 'qualified', 'proposal', 'won'].map((stage) => {
                  const count = leads?.filter(l => l.status === stage).length || 0;
                  const total = leads?.length || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={stage} className="space-y-1">
                       <div className="flex justify-between text-[11px] font-medium">
                          <span className="capitalize text-slate-600">{stage}</span>
                          <span className="font-bold text-slate-900">{count}</span>
                       </div>
                       <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-300" style={{ width: `${pct}%` }}></div>
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity Mini-Timeline */}
            <div className="bg-card border rounded-md shadow-sm flex flex-col">
              <div className="p-3 border-b bg-slate-50/50">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Recent Log Entries</h3>
              </div>
              <div className="p-3 space-y-4">
                {recentActivities?.slice(0, 3).map(activity => (
                  <div key={activity.id} className="flex items-start gap-3 relative pb-4 last:pb-0">
                    <div className="absolute left-[7px] top-4 bottom-0 w-[1px] bg-slate-100 dark:bg-slate-800 last:hidden"></div>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-primary bg-white z-10 shrink-0 mt-0.5"></div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-800 truncate">
                        {activity.type}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{activity.remark}</p>
                      <p className="text-[9px] text-slate-400 font-medium uppercase mt-0.5">{formatDistanceToNow(parseISO(activity.createdAt))} ago</p>
                    </div>
                  </div>
                ))}
                {(!recentActivities || recentActivities.length === 0) && (
                  <p className="text-[11px] text-muted-foreground italic text-center py-4 bg-slate-50/50 rounded border border-dashed">No recent activities found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
