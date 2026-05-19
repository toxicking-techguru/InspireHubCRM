"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, collectionGroup } from 'firebase/firestore';
import { Lead, Agent, LeadActivity, Target } from '@/types/crm';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { Download, Loader2, BarChart3, TrendingUp, Users, Target as TargetIcon, Clock, Zap, Calendar as CalendarIcon, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, subMonths, startOfMonth, parseISO, differenceInDays, subDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#1B48A3', '#2579C8', '#164978', '#0E3050', '#071828', '#3377cf'];

export default function AdminReportsPage() {
  const { user, config } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState('6m');
  const [selectedAgentId, setSelectedAgentId] = useState('all');

  const currencySymbol = config?.currency === 'KES' ? 'KES ' : config?.currency === 'GBP' ? '£' : '$';

  const agentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'agents') : null, [firestore]);
  const { data: agents, loading: agentsLoading } = useCollection<Agent>(agentsQuery as any);

  const leadsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'leads') : null, [firestore]);
  const { data: rawLeads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);

  const activitiesQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'activities') : null, [firestore]);
  const { data: rawActivities } = useCollection<LeadActivity>(activitiesQuery as any);

  const targetsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'targets') : null, [firestore]);
  const { data: targets } = useCollection<Target>(targetsQuery as any);

  const leads = useMemo(() => {
    if (!rawLeads) return [];
    if (selectedAgentId === 'all') return rawLeads;
    return rawLeads.filter(l => l.agentId === selectedAgentId);
  }, [rawLeads, selectedAgentId]);

  const activities = useMemo(() => {
    if (!rawActivities) return [];
    if (selectedAgentId === 'all') return rawActivities;
    return rawActivities.filter(a => a.agentId === selectedAgentId);
  }, [rawActivities, selectedAgentId]);

  const velocityData = useMemo(() => {
    if (!leads || !activities) return [];
    return leads.filter(l => l.status === 'won').map(l => {
      const leadActivities = activities.filter(a => a.leadId === l.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      if (leadActivities.length === 0) return null;
      const start = parseISO(leadActivities[0].createdAt);
      const end = parseISO(l.wonAt || l.lastActivityAt || leadActivities[leadActivities.length-1].createdAt);
      const days = Math.max(differenceInDays(end, start), 1);
      return { name: l.clientName, days };
    }).filter(Boolean).slice(0, 10);
  }, [leads, activities]);

  const revenueData = useMemo(() => {
    const range = dateRange === '1y' ? 12 : dateRange === '6m' ? 6 : 3;
    return Array.from({ length: range }).map((_, i) => {
      const date = subMonths(new Date(), (range - 1) - i);
      const mStart = startOfMonth(date);
      const nextMonth = startOfMonth(subMonths(date, -1));
      const rev = leads?.filter(l => {
        const checkDate = parseISO(l.wonAt || l.createdAt);
        return l.status === 'won' && checkDate >= mStart && checkDate < nextMonth;
      }).reduce((sum, l) => sum + (l.estimatedBudget || 0), 0) || 0;
      return { month: format(date, 'MMM'), revenue: rev };
    });
  }, [leads, dateRange]);

  const dailyEngagementData = useMemo(() => {
    if (!activities) return [];
    const last14Days = Array.from({ length: 14 }).map((_, i) => {
      const d = subDays(new Date(), 13 - i);
      return { date: format(d, 'MMM d'), count: 0, fullDate: startOfDay(d) };
    });

    activities.forEach(a => {
      const aDate = startOfDay(parseISO(a.createdAt));
      const day = last14Days.find(d => d.fullDate.getTime() === aDate.getTime());
      if (day) day.count++;
    });

    return last14Days;
  }, [activities]);

  const activityTypeData = useMemo(() => {
    if (!activities) return [];
    const counts: Record<string, number> = {};
    activities.forEach(a => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activities]);

  const channelData = useMemo(() => {
    if (!leads) return [];
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      const ch = l.firstContactChannel || 'Unknown';
      counts[ch] = (counts[ch] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const targetPerformance = useMemo(() => {
    if (!targets || !rawLeads) return [];
    const currentMonthStr = format(new Date(), 'yyyy-MM');
    const monthTargets = targets.filter(t => t.month === currentMonthStr && (selectedAgentId === 'all' || t.agentId === selectedAgentId));
    
    return monthTargets.map(t => {
      const agent = agents?.find(a => a.id === t.agentId);
      const agentWonLeads = rawLeads.filter(l => l.agentId === t.agentId && l.status === 'won' && l.wonAt?.startsWith(currentMonthStr));
      const actualRevenue = agentWonLeads.reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
      return {
        name: agent?.name || 'Unknown',
        target: t.revenueTarget,
        actual: actualRevenue,
        pct: t.revenueTarget > 0 ? Math.round((actualRevenue / t.revenueTarget) * 100) : 0
      };
    }).sort((a,b) => b.pct - a.pct);
  }, [targets, rawLeads, agents, selectedAgentId]);

  if (!user || user.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[18px] font-bold text-slate-900 flex items-center gap-2"><BarChart3 size={20} className="text-primary" /> System Analytics Engine</h1>
            <p className="text-[12px] text-muted-foreground">Comprehensive reporting including cycle time, revenue trajectory, and channel attribution.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-white border rounded-lg px-2 h-8">
               <User size={14} className="text-slate-400" />
               <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                 <SelectTrigger className="h-7 w-[160px] border-none text-[12px] focus:ring-0 shadow-none">
                    <SelectValue placeholder="All Agents" />
                 </SelectTrigger>
                 <SelectContent className="bg-white">
                    <SelectItem value="all">Organization Wide</SelectItem>
                    {agents?.filter(a => a.role === 'Agent').map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                 </SelectContent>
               </Select>
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 w-[140px] text-[12px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="1y">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 gap-2 text-[12px] border-slate-200">
               <Download size={14} /> Export CSV
            </Button>
          </div>
        </div>

        <Tabs defaultValue="growth" className="w-full">
          <TabsList className="bg-white border rounded-lg h-10 p-1 flex w-full overflow-x-auto no-scrollbar justify-start gap-2 px-2 mb-4 shrink-0">
            <TabsTrigger value="growth" className="text-[11px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white shrink-0">Revenue Growth</TabsTrigger>
            <TabsTrigger value="activities" className="text-[11px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white shrink-0">Activity Engagement</TabsTrigger>
            <TabsTrigger value="acquisition" className="text-[11px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white shrink-0">Acquisition Mix</TabsTrigger>
            <TabsTrigger value="performance" className="text-[11px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white shrink-0">Team Quota Accuracy</TabsTrigger>
            <TabsTrigger value="velocity" className="text-[11px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white shrink-0">Pipeline Velocity</TabsTrigger>
          </TabsList>

          <TabsContent value="growth" className="space-y-4">
             <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-white border rounded-xl p-6 h-[340px] shadow-sm">
                   <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-6">Monthly Revenue Trajectory</h3>
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                         <defs>
                            <linearGradient id="colorAdminRev" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#1B48A3" stopOpacity={0.1}/>
                               <stop offset="95%" stopColor="#1B48A3" stopOpacity={0}/>
                            </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="month" fontSize={11} axisLine={false} tickLine={false} />
                         <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={v => `${currencySymbol}${v/1000}k`} />
                         <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                         <Area type="monotone" dataKey="revenue" stroke="#1B48A3" strokeWidth={3} fillOpacity={1} fill="url(#colorAdminRev)" />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                   <div className="bg-white border rounded-xl p-6 shadow-sm">
                      <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Avg Deal Value</p>
                      <p className="text-[28px] font-bold text-slate-900 leading-none">
                         {currencySymbol}{leads?.filter(l => l.status === 'won').length ? Math.round(leads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.estimatedBudget || 0), 0) / leads.filter(l => l.status === 'won').length).toLocaleString() : 0}
                      </p>
                   </div>
                   <div className="bg-white border rounded-xl p-6 shadow-sm">
                      <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Won Conversion</p>
                      <p className="text-[28px] font-bold text-emerald-600 leading-none">
                         {leads?.length ? Math.round((leads.filter(l => l.status === 'won').length / leads.length) * 100) : 0}%
                      </p>
                   </div>
                   <div className="bg-white border rounded-xl p-6 shadow-sm">
                      <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Active Staff</p>
                      <p className="text-[28px] font-bold text-primary leading-none">{agents?.filter(a => a.status === 'active').length || 0}</p>
                   </div>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="activities" className="space-y-4">
             <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white border rounded-xl p-6 h-[340px] shadow-sm">
                   <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-6">Daily Interaction Volume (Last 14d)</h3>
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyEngagementData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                         <YAxis fontSize={10} axisLine={false} tickLine={false} />
                         <Tooltip cursor={{ fill: '#f8fafc' }} />
                         <Bar dataKey="count" fill="#1B48A3" radius={[2, 2, 0, 0]} />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
                <div className="bg-white border rounded-xl p-6 h-[340px] shadow-sm">
                   <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-6">Effort Distribution by Type</h3>
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie data={activityTypeData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                            {activityTypeData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                         </Pie>
                         <Tooltip />
                         <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="acquisition" className="space-y-4">
             <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white border rounded-xl p-6 h-[340px] shadow-sm">
                   <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-6">Lead Volume by Channel</h3>
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie data={channelData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                            {channelData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                         </Pie>
                         <Tooltip />
                         <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', textTransform: 'uppercase' }} />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
                <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                   <div className="p-3 border-b bg-slate-50/50">
                      <h4 className="text-[11px] font-bold uppercase text-slate-400">Sub-channel Analysis</h4>
                   </div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-[13px]">
                        <thead>
                           <tr className="bg-slate-50 h-9 font-bold uppercase text-[10px] text-slate-400">
                              <th className="px-6">Source Detail</th>
                              <th className="text-center">Leads</th>
                              <th className="text-right px-6">Conversion</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y">
                           {leads && Array.from(new Set(leads.map(l => l.firstContactSubchannel || 'Direct'))).map(sub => {
                             const subLeads = leads.filter(l => (l.firstContactSubchannel || 'Direct') === sub);
                             const won = subLeads.filter(l => l.status === 'won').length;
                             return (
                               <tr key={sub} className="h-10 hover:bg-slate-50/50">
                                  <td className="px-6 font-bold text-slate-700">{sub}</td>
                                  <td className="text-center text-slate-500 font-medium">{subLeads.length}</td>
                                  <td className="text-right px-6 font-bold text-primary">{subLeads.length > 0 ? Math.round((won / subLeads.length) * 100) : 0}%</td>
                               </tr>
                             );
                           })}
                        </tbody>
                     </table>
                   </div>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
             <div className="bg-white border rounded-xl p-6 shadow-sm overflow-hidden">
                <h3 className="text-[12px] font-bold text-slate-500 uppercase mb-6 flex items-center gap-2">
                   <TargetIcon size={14} /> Revenue Quota Accuracy (Current Month)
                </h3>
                <div className="space-y-6 max-w-4xl">
                   {targetPerformance.map((p, i) => (
                     <div key={i} className="space-y-2">
                        <div className="flex justify-between items-end">
                           <div>
                              <p className="text-[13px] font-bold text-slate-800">{p.name}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Goal: {currencySymbol}{p.target.toLocaleString()}</p>
                           </div>
                           <div className="text-right">
                              <span className={cn("text-[14px] font-bold", p.pct >= 100 ? "text-emerald-600" : "text-primary")}>{p.pct}%</span>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Achieved</p>
                           </div>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                           <div className={cn("h-full transition-all duration-1000", p.pct >= 100 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${Math.min(p.pct, 100)}%` }} />
                        </div>
                     </div>
                   ))}
                   {targetPerformance.length === 0 && (
                      <div className="py-12 text-center text-slate-400 italic">No targets set for the current period.</div>
                   )}
                </div>
             </div>
          </TabsContent>

          <TabsContent value="velocity" className="space-y-4">
             <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white border rounded-xl p-6 h-[340px] shadow-sm">
                   <h3 className="text-[12px] font-bold text-slate-500 uppercase mb-6 flex items-center gap-2"><Clock size={14} /> Lead Cycle Time (Days to Won)</h3>
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={velocityData} layout="vertical">
                         <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                         <XAxis type="number" fontSize={10} axisLine={false} />
                         <YAxis dataKey="name" type="category" width={100} fontSize={10} axisLine={false} />
                         <Tooltip cursor={{ fill: '#f8fafc' }} />
                         <Bar dataKey="days" fill="#1B48A3" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
                <div className="bg-white border rounded-xl p-6 shadow-sm overflow-hidden">
                   <h3 className="text-[12px] font-bold text-slate-500 uppercase mb-4">Top Converting Staff</h3>
                   <div className="space-y-3">
                      {agents?.map(agent => {
                         const agentLeads = rawLeads?.filter(l => l.agentId === agent.id) || [];
                         const wonCount = agentLeads.filter(l => l.status === 'won').length;
                         const rate = agentLeads.length > 0 ? Math.round((wonCount / agentLeads.length) * 100) : 0;
                         if (agentLeads.length === 0) return null;
                         return (
                           <div key={agent.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px]">{agent.name[0]}</div>
                                 <div>
                                    <p className="text-[13px] font-bold text-slate-800 leading-tight">{agent.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{agent.region}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-[16px] font-bold text-primary">{rate}%</p>
                                 <p className="text-[9px] text-slate-400 font-bold uppercase">Success Rate</p>
                              </div>
                           </div>
                         );
                      }).filter(Boolean).sort((a,b) => (b as any).props?.children?.[1]?.props?.children?.[0]?.props?.children - (a as any).props?.children?.[1]?.props?.children?.[0]?.props?.children).slice(0, 5)}
                   </div>
                </div>
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}
