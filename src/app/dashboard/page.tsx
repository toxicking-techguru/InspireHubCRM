"use client"

import React, { useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Shell } from '@/components/layout/Shell';
import { AgentStats } from '@/components/dashboard/AgentStats';
import { EarningsChart } from '@/components/dashboard/EarningsChart';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  Clock, 
  Target, 
  Award, 
  TrendingUp,
  Activity,
  Zap,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup } from 'firebase/firestore';
import { Lead, LeadActivity, Tier, Target as AgentTarget } from '@/types/crm';
import { formatDistanceToNow, parseISO, startOfMonth, format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role === 'Admin') {
      router.push('/admin/dashboard');
    } else if (user?.role === 'Manager') {
      router.push('/manager/dashboard');
    }
  }, [isAuthenticated, user, router]);

  const currentMonthStr = format(new Date(), 'yyyy-MM');

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'leads');
  }, [firestore]);
  const { data: rawLeads } = useCollection<Lead>(leadsQuery);

  const leads = useMemo(() => {
    if (!rawLeads || !user) return [];
    return rawLeads
      .filter(l => l.agentId === user.id)
      .sort((a, b) => (b.lastActivityAt || b.createdAt).localeCompare(a.lastActivityAt || a.createdAt))
      .slice(0, 10);
  }, [rawLeads, user?.id]);

  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collectionGroup(firestore, 'activities');
  }, [firestore]);
  
  const { data: rawActivities, loading: activitiesLoading } = useCollection<LeadActivity>(activitiesQuery as any);

  const recentActivities = useMemo(() => {
    if (!rawActivities || !user) return [];
    return [...rawActivities]
      .filter(a => a.agentId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4);
  }, [rawActivities, user?.id]);

  const targetQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'targets');
  }, [firestore]);
  const { data: allTargets } = useCollection<AgentTarget>(targetQuery as any);
  
  const currentTarget = useMemo(() => {
    if (!allTargets || !user) return null;
    return allTargets.find(t => t.agentId === user.id && t.month === currentMonthStr);
  }, [allTargets, user?.id, currentMonthStr]);

  const tiersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'tiers') : null, [firestore]);
  const { data: tiers } = useCollection<Tier>(tiersQuery as any);
  
  const currentTier = useMemo(() => {
    if (!tiers || !user) return null;
    return tiers.find(t => t.id === user.tierId);
  }, [tiers, user?.tierId]);

  const nextTier = useMemo(() => {
    if (!tiers || !currentTier) return null;
    return [...tiers].sort((a, b) => a.rankLevel - b.rankLevel).find(t => t.rankLevel === currentTier.rankLevel + 1);
  }, [tiers, currentTier]);

  const progressMetrics = useMemo(() => {
    if (!rawLeads || !user) return { leadsCount: 0, winsCount: 0, leadsPercent: 0, winsPercent: 0, overallPercent: 0, leadsTarget: 10, winsTarget: 2 };
    
    const monthStart = startOfMonth(new Date());
    const myLeads = rawLeads.filter(l => l.agentId === user.id);
    const monthLeads = myLeads.filter(l => parseISO(l.createdAt) >= monthStart);
    const monthWins = myLeads.filter(l => l.status === 'won' && l.wonAt && parseISO(l.wonAt) >= monthStart);

    const lTarget = currentTarget?.leadsTarget || 10;
    const wTarget = currentTarget?.closedTarget || 2;

    const lp = Math.min(Math.round((monthLeads.length / lTarget) * 100), 100);
    const wp = Math.min(Math.round((monthWins.length / wTarget) * 100), 100);
    const op = Math.round((lp + wp) / 2);

    return { 
      leadsCount: monthLeads.length, 
      winsCount: monthWins.length, 
      leadsTarget: lTarget, 
      winsTarget: wTarget,
      leadsPercent: lp, 
      winsPercent: wp, 
      overallPercent: op 
    };
  }, [rawLeads, currentTarget, user?.id]);

  const tierUI = useMemo(() => {
    switch (user?.tierId) {
      case 't1': return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: 'text-slate-400' };
      case 't2': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-500' };
      case 't3': return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', icon: 'text-cyan-500' };
      case 't4': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: 'text-purple-500' };
      default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: 'text-slate-400' };
    }
  }, [user?.tierId]);

  if (!user || user.role !== 'Agent') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-sm font-medium text-slate-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <AgentStats />

        <div className="grid lg:grid-cols-10 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-card border rounded-md shadow-sm overflow-hidden">
              <div className="p-3 border-b flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  <h3 className="text-[13px] font-bold uppercase tracking-tight text-slate-500">Priority Follow-ups</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/activities')} className="h-6 text-[10px] uppercase font-bold text-primary px-2">Full Schedule</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-slate-50/30 h-9">
                      <th className="px-4 font-bold text-left uppercase text-[11px] text-slate-400 tracking-wider">Lead Name</th>
                      <th className="font-bold text-left uppercase text-[11px] text-slate-400 tracking-wider">Current Stage</th>
                      <th className="font-bold text-left uppercase text-[11px] text-slate-400 tracking-wider">Last Touch</th>
                      <th className="text-right px-4 font-bold uppercase text-[11px] text-slate-400 tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="h-11 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 font-bold text-slate-700">{lead.clientName}</td>
                        <td>
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="text-slate-400 text-[12px]">
                          {lead.lastActivityAt ? formatDistanceToNow(parseISO(lead.lastActivityAt)) + ' ago' : 'New'}
                        </td>
                        <td className="px-4 text-right">
                          <Button variant="outline" size="sm" onClick={() => router.push(`/leads/${lead.id}`)} className="h-7 text-[11px] px-3 font-bold uppercase tracking-tighter">Log activity</Button>
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

            <div className="bg-card border rounded-md shadow-sm p-4 h-[300px]">
               <EarningsChart />
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="bg-card border rounded-md shadow-sm overflow-hidden flex flex-col">
               <div className={cn("p-5 border-b flex items-center justify-between", tierUI.bg)}>
                  <div className="space-y-1">
                    <p className={cn("text-[11px] font-bold uppercase tracking-widest opacity-80", tierUI.text)}>Active Rank</p>
                    <h3 className="text-[24px] font-bold text-slate-900 leading-none">
                      {currentTier?.name || 'Silver'}
                    </h3>
                  </div>
                  <div className={cn("w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm border-2", tierUI.border, tierUI.icon)}>
                    <Award size={28} />
                  </div>
               </div>
               
               <div className="p-5 space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                       <span className="text-slate-500 uppercase tracking-wider">Monthly Progress</span>
                       <span className="text-primary">{progressMetrics.overallPercent}%</span>
                    </div>
                    <Progress value={progressMetrics.overallPercent} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                       <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1">
                          <Target size={12} className="text-primary" /> Leads
                       </div>
                       <p className="text-[16px] font-bold text-slate-800">
                          {progressMetrics.leadsCount} <span className="text-slate-300 font-normal">/ {progressMetrics.leadsTarget}</span>
                       </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                       <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1">
                          <TrendingUp size={12} className="text-emerald-500" /> Wins
                       </div>
                       <p className="text-[16px] font-bold text-slate-800">
                          {progressMetrics.winsCount} <span className="text-slate-300 font-normal">/ {progressMetrics.winsTarget}</span>
                       </p>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between border-t border-dashed">
                     <span className="text-[10px] uppercase font-bold text-slate-400">Next Tier Goal</span>
                     <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-primary">{nextTier?.name || 'Diamond'}</span>
                        <ArrowRight size={10} className="text-slate-300" />
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-card border rounded-md p-5 shadow-sm">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Pipeline Distribution</h3>
              <div className="space-y-4">
                {['new', 'qualified', 'proposal', 'won'].map((stage) => {
                  const count = rawLeads?.filter(l => l.status === stage && l.agentId === user.id).length || 0;
                  const total = rawLeads?.filter(l => l.agentId === user.id).length || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={stage} className="space-y-1.5">
                       <div className="flex justify-between text-[11px] font-medium">
                          <span className="capitalize text-slate-600">{stage}</span>
                          <span className="font-bold text-slate-900">{count}</span>
                       </div>
                       <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-300 transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Clock size={16} className="text-slate-400" />
            <h3 className="text-[13px] font-bold uppercase tracking-tight text-slate-500">Recent interaction logs</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentActivities.map(activity => (
              <div key={activity.id} className="bg-card border rounded-md p-4 shadow-sm hover:shadow-md transition-shadow relative">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <MessageSquare size={14} />
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase bg-slate-50 px-1.5 py-0.5 rounded border">
                    {formatDistanceToNow(parseISO(activity.createdAt))} ago
                  </span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-[13px] font-bold text-slate-800 truncate">{activity.type}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 min-h-[32px]">{activity.remark}</p>
                </div>
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                   <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold shrink-0">
                        {(activity.clientName || 'L')[0]}
                      </div>
                      <span className="text-[10px] font-medium text-slate-600 truncate">{activity.clientName || 'Lead'}</span>
                   </div>
                   <Badge variant="outline" className="text-[8px] h-3.5 px-1 font-bold uppercase tracking-tighter">
                    {activity.outcomeStatus}
                   </Badge>
                </div>
              </div>
            ))}
            {(!recentActivities || recentActivities.length === 0) && !activitiesLoading && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-slate-50/50 border border-dashed rounded-md p-4 flex flex-col items-center justify-center text-slate-300 h-[140px]">
                <Activity size={24} className="opacity-10 mb-2" />
                <p className="text-[10px] font-medium uppercase">Awaiting activity</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}