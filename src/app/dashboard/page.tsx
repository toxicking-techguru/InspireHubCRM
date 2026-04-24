"use client"

import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Shell } from '@/components/layout/Shell';
import { AgentStats } from '@/components/dashboard/AgentStats';
import { EarningsChart } from '@/components/dashboard/EarningsChart';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock, Target, CheckCircle2, Phone, Mail, Globe } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Lead, LeadActivity, Tier } from '@/types/crm';
import { formatDistanceToNow, isToday, parseISO } from 'date-fns';
import { format } from 'date-fns';
import { TierBadge } from '@/components/ui/tier-badge';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  // Priority Leads
  const priorityLeadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    let q = collection(firestore, 'leads');
    if (user.role === 'Agent') {
      return query(q, where('agentId', '==', user.id), orderBy('lastActivityAt', 'desc'), limit(5));
    }
    return query(q, orderBy('lastActivityAt', 'desc'), limit(5));
  }, [firestore, user?.id, user?.role]);
  const { data: recentLeads } = useCollection<Lead>(priorityLeadsQuery);

  // Today's Activities
  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'leads', recentLeads?.[0]?.id || 'dummy', 'activities'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
  }, [firestore, user?.id, recentLeads]);
  const { data: recentActivities } = useCollection<LeadActivity>(activitiesQuery);

  // Tier info for progress
  const tiersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'tiers') : null, [firestore]);
  const { data: tiers } = useCollection<Tier>(tiersQuery);
  const currentTier = tiers?.find(t => t.id === user?.tierId);
  const nextTier = tiers?.find(t => t.rankLevel === (currentTier?.rankLevel || 0) + 1);

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
                <h3 className="text-[13px] font-semibold">Activities Due Today</h3>
                <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2">View Full Schedule</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 h-9">
                      <th className="px-4 font-semibold text-left">Lead Name</th>
                      <th className="font-semibold text-left">Type</th>
                      <th className="font-semibold text-left">Due Time</th>
                      <th className="text-right px-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentLeads?.slice(0, 3).map((lead, idx) => (
                      <tr key={lead.id} className={cn("h-9", idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                        <td className="px-4 font-medium">{lead.clientName}</td>
                        <td className="capitalize text-slate-500 text-[12px]">{lead.status}</td>
                        <td className="text-slate-500 text-[12px]">Today, 10:00 AM</td>
                        <td className="px-4 text-right">
                          <Button variant="outline" size="sm" onClick={() => router.push(`/leads/${lead.id}`)} className="h-6 text-[11px] px-2">Action</Button>
                        </td>
                      </tr>
                    ))}
                    {(!recentLeads || recentLeads.length === 0) && (
                      <tr className="h-20">
                        <td colSpan={4} className="text-center text-muted-foreground text-[11px] italic">No activities for today.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Earnings Chart */}
            <div className="bg-card border rounded-md shadow-sm p-4 h-[240px]">
               <EarningsChart />
            </div>
          </div>

          <div className="space-y-4">
            {/* Pipeline Mini-Summary */}
            <div className="bg-card border rounded-md p-3 shadow-sm">
              <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Pipeline Pipeline</h3>
              <div className="flex flex-wrap gap-1.5">
                {['New', 'Contacted', 'Qualified', 'Proposal', 'Won'].map((stage) => (
                  <div key={stage} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-900 border rounded-full text-[11px] font-medium">
                    <span>{stage}</span>
                    <span className="bg-primary/10 text-primary px-1.5 rounded-full text-[10px]">2</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier Progress Card */}
            <div className="bg-card border rounded-md p-3 shadow-sm">
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                   <h3 className="text-[13px] font-bold">{currentTier?.name || 'Standard'}</h3>
                   <TierBadge tierId={user.tierId} />
                 </div>
                 <span className="text-[11px] font-bold text-primary">65%</span>
               </div>
               <div className="space-y-3">
                 <div className="relative w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                   <div className="absolute left-0 top-0 h-full bg-indigo-600 rounded-full" style={{ width: '65%' }}></div>
                 </div>
                 <div className="flex justify-between items-center text-[11px] pt-1">
                    <div className="flex gap-3">
                      <span className="text-muted-foreground">Leads: <b className="text-foreground">8/12</b></span>
                      <span className="text-muted-foreground">Wins: <b className="text-foreground">3/5</b></span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Next: {nextTier?.name || 'Top'}</span>
                 </div>
               </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="bg-card border rounded-md shadow-sm">
              <div className="p-3 border-b">
                <h3 className="text-[13px] font-semibold">Recent Activity</h3>
              </div>
              <div className="p-3 space-y-4">
                {recentActivities?.map(activity => (
                  <div key={activity.id} className="flex items-start gap-3 relative pb-4 last:pb-0">
                    <div className="absolute left-[7px] top-4 bottom-0 w-[1px] bg-slate-100 dark:bg-slate-800 last:hidden"></div>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-primary bg-white z-10 shrink-0 mt-0.5"></div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
                        <span className="capitalize">{activity.type}</span> with <span className="font-bold">Client</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(activity.createdAt))} ago</p>
                    </div>
                  </div>
                ))}
                {(!recentActivities || recentActivities.length === 0) && (
                  <p className="text-[11px] text-muted-foreground italic text-center py-2">No recent activity.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
