"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import { Lead, LeadActivity, Target } from '@/types/crm';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { BarChart3, TrendingUp, Target as TargetIcon, Clock, Zap, Download, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, subMonths, startOfMonth, parseISO, differenceInDays, subDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

const COLORS = ['#1B48A3', '#2579C8', '#164978', '#0E3050', '#071828'];

export default function AgentReportsPage() {
  const { user, config } = useAuthStore();
  const firestore = useFirestore();
  const [dateRange, setDateRange] = useState('6m');

  const currencySymbol = config?.currency === 'KES' ? 'KES ' : config?.currency === 'GBP' ? '£' : '$';

  const leadsQuery = useMemoFirebase(() => 
    (firestore && user?.id) ? query(collection(firestore, 'leads'), where('agentId', '==', user.id)) : null
  , [firestore, user?.id]);
  const { data: myLeads, loading: leadsLoading } = useCollection<Lead>(leadsQuery);

  const activitiesQuery = useMemoFirebase(() => 
    (firestore && user?.id) ? query(collectionGroup(firestore, 'activities'), where('agentId', '==', user.id)) : null
  , [firestore, user?.id]);
  const { data: myActivities } = useCollection<LeadActivity>(activitiesQuery as any);

  const targetsQuery = useMemoFirebase(() => 
    (firestore && user?.id) ? query(collection(firestore, 'targets'), where('agentId', '==', user.id)) : null
  , [firestore, user?.id]);
  const { data: myTargets } = useCollection<Target>(targetsQuery as any);

  const revenueData = useMemo(() => {
    if (!myLeads) return [];
    const range = dateRange === '1y' ? 12 : dateRange === '6m' ? 6 : 3;
    return Array.from({ length: range }).map((_, i) => {
      const date = subMonths(new Date(), (range - 1) - i);
      const mStart = startOfMonth(date);
      const nextMonth = startOfMonth(subMonths(date, -1));
      const rev = myLeads.filter(l => {
        const checkDate = parseISO(l.wonAt || l.createdAt);
        return l.status === 'won' && checkDate >= mStart && checkDate < nextMonth;
      }).reduce((sum, l) => sum + (l.estimatedBudget || 0), 0) || 0;
      return { month: format(date, 'MMM'), revenue: rev };
    });
  }, [myLeads, dateRange]);

  const dailyActivityData = useMemo(() => {
    const last14Days = Array.from({ length: 14 }).map((_, i) => {
      const d = subDays(new Date(), 13 - i);
      return { date: format(d, 'MMM d'), count: 0, fullDate: startOfDay(d) };
    });

    if (myActivities) {
      myActivities.forEach(a => {
        const aDate = startOfDay(parseISO(a.createdAt));
        const day = last14Days.find(d => d.fullDate.getTime() === aDate.getTime());
        if (day) day.count++;
      });
    }

    return last14Days;
  }, [myActivities]);

  const activityDistribution = useMemo(() => {
    if (!myActivities) return [];
    const counts: Record<string, number> = {};
    myActivities.forEach(a => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [myActivities]);

  const channelData = useMemo(() => {
    if (!myLeads) return [];
    const counts: Record<string, number> = {};
    myLeads.forEach(l => {
      const ch = l.firstContactChannel || 'Direct';
      counts[ch] = (counts[ch] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [myLeads]);

  const quotaPerformance = useMemo(() => {
    if (!myTargets || !myLeads) return [];
    const currentMonthStr = format(new Date(), 'yyyy-MM');
    const t = myTargets.find(target => target.month === currentMonthStr);
    if (!t) return [];

    const monthWins = myLeads.filter(l => l.status === 'won' && l.wonAt?.startsWith(currentMonthStr));
    const revenueActual = monthWins.reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
    const leadsActual = myLeads.filter(l => l.createdAt.startsWith(currentMonthStr)).length;

    return [
      { name: 'Monthly Revenue', actual: revenueActual, target: t.revenueTarget, pct: t.revenueTarget > 0 ? Math.round((revenueActual/t.revenueTarget)*100) : 0, isCurrency: true },
      { name: 'Leads Created', actual: leadsActual, target: t.leadsTarget, pct: t.leadsTarget > 0 ? Math.round((leadsActual/t.leadsTarget)*100) : 0, isCurrency: false },
    ];
  }, [myTargets, myLeads]);

  if (!user) return null;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div>
              <h1 className="text-xl font-bold text-slate-900">My Performance Analysis</h1>
              <p className="text-sm text-slate-500">Visualization of your personal sales journey and efficiency milestones.</p>
           </div>
           <Button variant="outline" size="sm" className="h-9 gap-2 border-slate-200 w-full sm:w-auto">
              <Download size={14} /> My Summary Report
           </Button>
        </div>

        <Tabs defaultValue="growth" className="w-full">
           <TabsList className="bg-white border p-1 rounded-lg h-10 flex w-full overflow-x-auto no-scrollbar justify-start gap-2 px-2 mb-6 shrink-0">
              <TabsTrigger value="growth" className="text-[12px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white shrink-0">Revenue Growth</TabsTrigger>
              <TabsTrigger value="daily" className="text-[12px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white shrink-0">Daily Engagement</TabsTrigger>
              <TabsTrigger value="accuracy" className="text-[12px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white shrink-0">Target Accuracy</TabsTrigger>
              <TabsTrigger value="sources" className="text-[12px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white shrink-0">Acquisition Channels</TabsTrigger>
           </TabsList>

           <TabsContent value="growth" className="space-y-6">
              <div className="bg-white border rounded-xl p-6 h-[400px] shadow-sm">
                 <h3 className="text-[14px] font-bold text-slate-800 mb-6 uppercase tracking-wider">Historical Earnings Trajectory</h3>
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                       <defs>
                          <linearGradient id="colorAgentRev" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#1B48A3" stopOpacity={0.1}/>
                             <stop offset="95%" stopColor="#1B48A3" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="month" fontSize={11} axisLine={false} tickLine={false} />
                       <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={v => `${currencySymbol}${v/1000}k`} />
                       <Tooltip />
                       <Area type="monotone" dataKey="revenue" stroke="#1B48A3" strokeWidth={3} fillOpacity={1} fill="url(#colorAgentRev)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </TabsContent>

           <TabsContent value="daily" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white border rounded-xl p-6 h-[350px] shadow-sm">
                    <h3 className="text-[14px] font-bold text-slate-800 mb-6 uppercase tracking-wider">Your Interaction Pulse (Last 14d)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={dailyActivityData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                          <YAxis fontSize={10} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: '#f8fafc' }} />
                          <Bar dataKey="count" fill="#1B48A3" radius={[2, 2, 0, 0]} />
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="bg-white border rounded-xl p-6 h-[350px] shadow-sm">
                    <h3 className="text-[14px] font-bold text-slate-800 mb-6 uppercase tracking-wider">Activity Distribution</h3>
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie data={activityDistribution} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                             {activityDistribution.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" iconType="circle" />
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </TabsContent>

           <TabsContent value="accuracy" className="space-y-6">
              <div className="bg-white border rounded-xl p-6 shadow-sm">
                 <h3 className="text-[14px] font-bold text-slate-800 mb-8 uppercase tracking-wider flex items-center gap-2">
                    <TargetIcon size={16} /> Achievement Progress (Current Month)
                 </h3>
                 <div className="space-y-10 max-w-2xl">
                    {quotaPerformance.map((q, i) => (
                      <div key={i} className="space-y-3">
                         <div className="flex justify-between items-end">
                            <div>
                               <p className="text-[14px] font-bold text-slate-800">{q.name}</p>
                               <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">
                                 Goal: {q.isCurrency ? currencySymbol : ''}{q.target.toLocaleString()}
                               </p>
                            </div>
                            <span className={cn("text-[18px] font-bold", q.pct >= 100 ? "text-emerald-600" : "text-primary")}>{q.pct}%</span>
                         </div>
                         <div className="h-2.5 w-full bg-slate-50 border rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all duration-1000", q.pct >= 100 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${Math.min(q.pct, 100)}%` }} />
                         </div>
                      </div>
                    ))}
                    {quotaPerformance.length === 0 && (
                      <div className="py-12 text-center text-slate-400 italic">No quotas set for the current period. Consult your manager.</div>
                    )}
                 </div>
              </div>
           </TabsContent>

           <TabsContent value="sources" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white border rounded-xl p-6 h-[350px] shadow-sm">
                    <h3 className="text-[14px] font-bold text-slate-800 mb-6 uppercase tracking-wider">Your Acquisition Mix</h3>
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie data={channelData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                             {channelData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <h3 className="text-[14px] font-bold text-slate-800 p-6 pb-2 uppercase">Sub-channel Conversion</h3>
                    <div className="flex-1 overflow-auto">
                       <table className="w-full text-[13px] min-w-[300px]">
                          <thead>
                             <tr className="bg-slate-50 h-9 font-bold uppercase text-[10px] text-slate-400">
                                <th className="px-6 text-left">Sub-source</th>
                                <th className="text-center">Leads</th>
                                <th className="text-right px-6">Won Count</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y">
                             {myLeads && Array.from(new Set(myLeads.map(l => l.firstContactSubchannel || 'Direct'))).map(sub => {
                               const subLeads = myLeads.filter(l => (l.firstContactSubchannel || 'Direct') === sub);
                               const wonCount = subLeads.filter(l => l.status === 'won').length;
                               return (
                                 <tr key={sub} className="h-10 hover:bg-slate-50">
                                    <td className="px-6 font-bold text-slate-700">{sub}</td>
                                    <td className="text-center text-slate-500">{subLeads.length}</td>
                                    <td className="text-right px-6 font-bold text-primary">{wonCount}</td>
                                 </tr>
                               );
                             }).sort((a,b) => (b as any).props?.children?.[1]?.props?.children - (a as any).props?.children?.[1]?.props?.children).slice(0, 10)}
                             {channelData.length === 0 && (
                               <tr className="h-20 text-center"><td colSpan={3} className="italic text-slate-300">No channel data available.</td></tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
           </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}
