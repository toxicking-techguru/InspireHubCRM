"use client"

import React, { useState, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Shell } from '@/components/layout/Shell';
import { AgentStats } from '@/components/dashboard/AgentStats';
import { EarningsChart } from '@/components/dashboard/EarningsChart';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, CheckCircle2, TrendingUp, Target, Clock, Filter, Loader2, Search
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, query, where } from 'firebase/firestore';
import { Lead, LeadActivity, Tier, Target as AgentTarget } from '@/types/crm';
import { format, startOfMonth, parseISO, endOfMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { MarkdownText } from '@/components/ui/markdown-text';

export default function DashboardPage() {
  const { user, config } = useAuthStore();
  const firestore = useFirestore();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const currencySymbol = config?.currency === 'KES' ? 'KES ' : config?.currency === 'GBP' ? '£' : '$';

  // Data
  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.id) return null;
    return query(collection(firestore, 'leads'), where('agentId', '==', user.id));
  }, [firestore, user?.id]);
  const { data: myLeads } = useCollection<Lead>(leadsQuery);

  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collectionGroup(firestore, 'activities');
  }, [firestore]);
  const { data: rawActivities } = useCollection<LeadActivity>(activitiesQuery as any);

  const targetsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.id || !selectedMonth) return null;
    return query(collection(firestore, 'targets'), where('agentId', '==', user.id), where('month', '==', selectedMonth));
  }, [firestore, user?.id, selectedMonth]);
  const { data: targets } = useCollection<AgentTarget>(targetsQuery as any);

  const myActivities = useMemo(() => 
    rawActivities?.filter(a => a.agentId === user?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) || []
  , [rawActivities, user?.id]);

  const monthPerformance = useMemo(() => {
    if (!myLeads) return { leads: 0, wins: 0, revenue: 0 };
    const start = startOfMonth(parseISO(selectedMonth + '-01'));
    const end = endOfMonth(start);
    const monthLeads = myLeads.filter(l => parseISO(l.createdAt) >= start && parseISO(l.createdAt) <= end);
    const monthWins = myLeads.filter(l => l.status === 'won' && l.wonAt && parseISO(l.wonAt) >= start && parseISO(l.wonAt) <= end);
    const revenue = monthWins.reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
    return { leads: monthLeads.length, wins: monthWins.length, revenue };
  }, [myLeads, selectedMonth]);

  const target = targets?.[0];

  if (!user) return null;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
              <h1 className="text-xl font-bold text-slate-900">Welcome back, {user.name}</h1>
              <p className="text-sm text-slate-500">Here's your sales performance summary for the selected period.</p>
           </div>
           <div className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm">
              <Calendar size={16} className="text-primary" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                 <SelectTrigger className="h-8 w-[160px] border-none font-bold text-[13px] focus:ring-0">
                    <SelectValue />
                 </SelectTrigger>
                 <SelectContent className="bg-white">
                    {[0,1,2,3,4,5].map(i => {
                      const d = startOfMonth(new Date(new Date().setMonth(new Date().getMonth() - i)));
                      const val = format(d, 'yyyy-MM');
                      return <SelectItem key={val} value={val}>{format(d, 'MMMM yyyy')}</SelectItem>
                    })}
                 </SelectContent>
              </Select>
           </div>
        </div>

        <AgentStats />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border rounded-xl p-5 shadow-sm">
                 <h3 className="text-[14px] font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-primary" /> Monthly Target Progress
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                    <div className="space-y-2">
                       <div className="flex justify-between text-[11px] font-bold uppercase text-slate-400">
                          <span>Leads Created</span>
                          <span className="text-primary">{target ? Math.round((monthPerformance.leads / target.leadsTarget) * 100) : 0}%</span>
                       </div>
                       <Progress value={target ? (monthPerformance.leads / target.leadsTarget) * 100 : 0} className="h-2" />
                       <p className="text-[12px] font-bold text-slate-700">{monthPerformance.leads} / {target?.leadsTarget || '--'}</p>
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between text-[11px] font-bold uppercase text-slate-400">
                          <span>Deals Won</span>
                          <span className="text-emerald-600">{target ? Math.round((monthPerformance.wins / target.closedTarget) * 100) : 0}%</span>
                       </div>
                       <Progress value={target ? (monthPerformance.wins / target.closedTarget) * 100 : 0} className="h-2" />
                       <p className="text-[12px] font-bold text-slate-700">{monthPerformance.wins} / {target?.closedTarget || '--'}</p>
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between text-[11px] font-bold uppercase text-slate-400">
                          <span>Revenue ({currencySymbol.trim()})</span>
                          <span className="text-primary">{target ? Math.round((monthPerformance.revenue / target.revenueTarget) * 100) : 0}%</span>
                       </div>
                       <Progress value={target ? (monthPerformance.revenue / target.revenueTarget) * 100 : 0} className="h-2" />
                       <p className="text-[12px] font-bold text-slate-700">{currencySymbol}{monthPerformance.revenue.toLocaleString()} / {currencySymbol}{target?.revenueTarget.toLocaleString() || '--'}</p>
                    </div>
                 </div>
              </div>

              <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                 <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-[13px] font-bold text-slate-700 uppercase flex items-center gap-2">
                       <Clock size={16} className="text-primary" /> Recent Pipeline Actions
                    </h3>
                    <Link href="/activities"><Button variant="ghost" size="sm" className="h-7 text-[11px] font-bold text-primary uppercase">View Log</Button></Link>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-[12px] min-w-[500px]">
                       <thead>
                          <tr className="bg-slate-50 h-8 text-slate-400 font-bold uppercase">
                             <th className="px-4 text-left">Client</th>
                             <th className="text-left">Activity</th>
                             <th className="text-left">Outcome</th>
                             <th className="px-4 text-right">Date</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y">
                          {myActivities.slice(0, 6).map(a => (
                             <tr key={a.id} className="h-11 hover:bg-slate-50 transition-colors">
                                <td className="px-4 font-bold text-slate-700">{a.clientName}</td>
                                <td className="text-slate-600">{a.type}</td>
                                <td className="max-w-[200px]">
                                   <div className="text-slate-500 italic truncate">
                                      <MarkdownText content={a.remark} className="line-clamp-1" />
                                   </div>
                                </td>
                                <td className="px-4 text-right text-slate-400">{format(parseISO(a.createdAt), 'MMM d, HH:mm')}</td>
                             </tr>
                          ))}
                          {myActivities.length === 0 && (
                             <tr className="h-24"><td colSpan={4} className="text-center text-slate-300 italic">No activity logs recorded.</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-white border rounded-xl p-5 shadow-sm h-[320px]">
                 <EarningsChart />
              </div>
              <div className="bg-primary rounded-xl p-5 text-white shadow-lg space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg"><Target size={20} /></div>
                    <div>
                       <p className="text-[10px] font-bold uppercase opacity-80">Current Quota Status</p>
                       <p className="text-lg font-bold">Active Performance</p>
                    </div>
                 </div>
                 <div className="bg-white/10 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-[12px]">
                       <span>Achieved Revenue</span>
                       <span className="font-bold">{currencySymbol}{monthPerformance.revenue.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                       <div className="h-full bg-white transition-all duration-1000" style={{ width: `${target ? (monthPerformance.revenue / target.revenueTarget) * 100 : 0}%` }} />
                    </div>
                 </div>
                 <p className="text-[11px] opacity-70 italic">"Consistent daily logging leads to higher conversion accuracy."</p>
              </div>
           </div>
        </div>
      </div>
    </Shell>
  );
}
