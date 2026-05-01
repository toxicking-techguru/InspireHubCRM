"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import { Lead, LeadActivity } from '@/types/crm';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { BarChart3, TrendingUp, Target, Clock, Zap, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, subMonths, startOfMonth, parseISO, differenceInDays } from 'date-fns';

const COLORS = ['#1B48A3', '#2579C8', '#164978', '#0E3050', '#071828'];

export default function AgentReportsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const [dateRange, setDateRange] = useState('6m');

  const leadsQuery = useMemoFirebase(() => 
    firestore && user ? query(collection(firestore, 'leads'), where('agentId', '==', user.id)) : null
  , [firestore, user?.id]);
  const { data: myLeads, loading: leadsLoading } = useCollection<Lead>(leadsQuery);

  const activitiesQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'activities') : null, [firestore]);
  const { data: allActivities } = useCollection<LeadActivity>(activitiesQuery as any);

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
      }).reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
      return { month: format(date, 'MMM'), revenue: rev };
    });
  }, [myLeads, dateRange]);

  const channelData = useMemo(() => {
    if (!myLeads) return [];
    const counts: Record<string, number> = {};
    myLeads.forEach(l => {
      const ch = l.firstContactChannel || 'Direct';
      counts[ch] = (counts[ch] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [myLeads]);

  const cycleData = useMemo(() => {
    if (!myLeads || !allActivities) return [];
    return myLeads.filter(l => l.status === 'won').map(l => {
       const act = allActivities.filter(a => a.leadId === l.id).sort((a,b) => a.createdAt.localeCompare(b.createdAt));
       if (act.length === 0) return null;
       const days = Math.max(differenceInDays(parseISO(l.wonAt || l.lastActivityAt), parseISO(act[0].createdAt)), 1);
       return { name: l.clientName, days };
    }).filter(Boolean).slice(0, 8);
  }, [myLeads, allActivities]);

  if (!user) return null;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <div>
              <h1 className="text-xl font-bold text-slate-900">My Performance Analysis</h1>
              <p className="text-sm text-slate-500">Visualization of your personal sales journey and efficiency milestones.</p>
           </div>
           <Button variant="outline" size="sm" className="h-9 gap-2 border-slate-200">
              <Download size={14} /> My Summary Report
           </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
           {[
             { label: 'Total Managed', val: myLeads?.length || 0, icon: Target },
             { label: 'Closed Won', val: myLeads?.filter(l => l.status === 'won').length || 0, icon: Zap },
             { label: 'Wins Value', val: `$${myLeads?.filter(l => l.status === 'won').reduce((s, l) => s + (l.estimatedBudget || 0), 0).toLocaleString()}`, icon: TrendingUp },
             { label: 'Avg Cycle', val: cycleData.length ? `${Math.round(cycleData.reduce((s, d: any) => s + d.days, 0) / cycleData.length)} Days` : '--', icon: Clock },
           ].map((stat, i) => (
             <div key={i} className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                   <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">{stat.label}</p>
                   <stat.icon size={14} className="text-primary/40" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{stat.val}</p>
             </div>
           ))}
        </div>

        <Tabs defaultValue="overview" className="w-full">
           <TabsList className="bg-white border p-1 rounded-lg h-10 gap-2 mb-6">
              <TabsTrigger value="overview" className="text-[12px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white">Revenue Growth</TabsTrigger>
              <TabsTrigger value="sources" className="text-[12px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white">Acquisition Channels</TabsTrigger>
              <TabsTrigger value="efficiency" className="text-[12px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white">Pipeline Efficiency</TabsTrigger>
           </TabsList>

           <TabsContent value="overview" className="space-y-6">
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
                       <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} />
                       <Tooltip />
                       <Area type="monotone" dataKey="revenue" stroke="#1B48A3" strokeWidth={3} fillOpacity={1} fill="url(#colorAgentRev)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </TabsContent>

           <TabsContent value="sources" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
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
                    <h3 className="text-[14px] font-bold text-slate-800 p-6 pb-2 uppercase">Channel Efficiency Table</h3>
                    <div className="flex-1 overflow-auto">
                       <table className="w-full text-[13px]">
                          <thead>
                             <tr className="bg-slate-50 h-9 font-bold uppercase text-[10px] text-slate-400"><th className="px-6">Channel</th><th>Count</th><th className="text-right px-6">Success %</th></tr>
                          </thead>
                          <tbody className="divide-y">
                             {channelData.map(d => {
                               const won = myLeads?.filter(l => l.status === 'won' && l.firstContactChannel === d.name).length || 0;
                               return (
                                 <tr key={d.name} className="h-10">
                                    <td className="px-6 font-bold text-slate-700">{d.name}</td>
                                    <td className="text-slate-500">{d.value}</td>
                                    <td className="text-right px-6 font-bold text-primary">{Math.round((won / d.value) * 100)}%</td>
                                 </tr>
                               );
                             })}
                             {channelData.length === 0 && (
                               <tr className="h-20 text-center"><td colSpan={3} className="italic text-slate-300">No channel data available.</td></tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
           </TabsContent>

           <TabsContent value="efficiency" className="space-y-6">
              <div className="bg-white border rounded-xl p-6 h-[350px] shadow-sm">
                 <h3 className="text-[14px] font-bold text-slate-800 mb-6 uppercase tracking-wider flex items-center gap-2"><Clock size={16} /> Velocity Chart (Days from Entry to Close)</h3>
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cycleData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                       <YAxis fontSize={10} axisLine={false} tickLine={false} label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                       <Tooltip cursor={{ fill: '#f8fafc' }} />
                       <Bar dataKey="days" fill="#1B48A3" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}
