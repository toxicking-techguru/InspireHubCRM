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
import { Download, Loader2, Clock, Zap, Target as TargetIcon, BarChart3, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, subMonths, startOfMonth, parseISO, differenceInDays, subDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#1B48A3', '#2579C8', '#164978', '#0E3050', '#071828', '#3377cf'];

export default function ManagerReportsPage() {
  const { user, config } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState('3m');
  const [selectedAgentId, setSelectedAgentId] = useState('all');

  const currencySymbol = config?.currency === 'KES' ? 'KSh ' : config?.currency === 'GBP' ? '£' : '$';

  const agentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'agents') : null, [firestore]);
  const { data: allAgents, loading: agentsLoading } = useCollection<Agent>(agentsQuery as any);

  const leadsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'leads') : null, [firestore]);
  const { data: allLeads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);

  const activitiesQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'activities') : null, [firestore]);
  const { data: allActivities } = useCollection<LeadActivity>(activitiesQuery as any);

  const targetsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'targets') : null, [firestore]);
  const { data: targets } = useCollection<Target>(targetsQuery as any);

  const teamAgents = useMemo(() => {
    if (!allAgents || !user) return [];
    return allAgents.filter(a => a.managerId === user.id || a.id === user.id);
  }, [allAgents, user?.id]);

  const teamLeads = useMemo(() => {
    if (!allLeads || teamAgents.length === 0) return [];
    const agentIds = teamAgents.map(a => a.id);
    const leads = allLeads.filter(l => agentIds.includes(l.agentId));
    if (selectedAgentId === 'all') return leads;
    return leads.filter(l => l.agentId === selectedAgentId);
  }, [allLeads, teamAgents, selectedAgentId]);

  const teamActivities = useMemo(() => {
    if (!allActivities || teamAgents.length === 0) return [];
    const agentIds = teamAgents.map(a => a.id);
    const acts = allActivities.filter(a => agentIds.includes(a.agentId));
    if (selectedAgentId === 'all') return acts;
    return acts.filter(a => a.agentId === selectedAgentId);
  }, [allActivities, teamAgents, selectedAgentId]);

  const dailyEngagementData = useMemo(() => {
    const last14Days = Array.from({ length: 14 }).map((_, i) => {
      const d = subDays(new Date(), 13 - i);
      return { date: format(d, 'MMM d'), count: 0, fullDate: startOfDay(d) };
    });

    teamActivities.forEach(a => {
      const aDate = startOfDay(parseISO(a.createdAt));
      const day = last14Days.find(d => d.fullDate.getTime() === aDate.getTime());
      if (day) day.count++;
    });

    return last14Days;
  }, [teamActivities]);

  const filteredLeads = useMemo(() => {
    const now = new Date();
    let start: Date;
    if (dateRange === '1m') start = startOfMonth(now);
    else if (dateRange === 'last') start = startOfMonth(subMonths(now, 1));
    else if (dateRange === '3m') start = startOfMonth(subMonths(now, 2));
    else start = startOfMonth(subMonths(now, 5));

    return teamLeads.filter(l => parseISO(l.createdAt) >= start);
  }, [teamLeads, dateRange]);

  const revenueData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => {
      const date = subMonths(new Date(), 5 - i);
      const mStr = format(date, 'MMM');
      const mStart = startOfMonth(date);
      const mEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const rev = teamLeads
        .filter(l => l.status === 'won' && l.wonAt && new Date(l.wonAt) >= mStart && new Date(l.wonAt) <= mEnd)
        .reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
        
      return { month: mStr, revenue: rev };
    });
    return months;
  }, [teamLeads]);

  const targetPerformance = useMemo(() => {
    if (!targets || teamAgents.length === 0) return [];
    const currentMonthStr = format(new Date(), 'yyyy-MM');
    const teamAgentIds = teamAgents.map(a => a.id);
    const monthTargets = targets.filter(t => t.month === currentMonthStr && teamAgentIds.includes(t.agentId) && (selectedAgentId === 'all' || t.agentId === selectedAgentId));
    
    return monthTargets.map(t => {
      const agent = teamAgents.find(a => a.id === t.agentId);
      const agentWonLeads = teamLeads.filter(l => l.agentId === t.agentId && l.status === 'won' && l.wonAt?.startsWith(currentMonthStr));
      const actualRevenue = agentWonLeads.reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
      return {
        name: agent?.name || 'Unknown',
        target: t.revenueTarget,
        actual: actualRevenue,
        pct: t.revenueTarget > 0 ? Math.round((actualRevenue / t.revenueTarget) * 100) : 0
      };
    }).sort((a,b) => b.pct - a.pct);
  }, [targets, teamLeads, teamAgents, selectedAgentId]);

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach(l => {
      const channel = l.firstContactChannel || 'Unknown Source';
      counts[channel] = (counts[channel] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredLeads]);

  const exportCSV = () => {
    toast({ title: "Compilation Started", description: "Exporting team datasets to CSV." });
  };

  if (!user || user.role !== 'Manager') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[18px] font-bold text-slate-900 flex items-center gap-2"><BarChart3 size={20} className="text-primary" /> Dynamic Team Analytics</h1>
            <p className="text-[12px] text-muted-foreground">Aggregated performance and activity metrics for your team accounts.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-white border rounded-lg px-2 h-8">
               <User size={14} className="text-slate-400" />
               <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                 <SelectTrigger className="h-7 w-[160px] border-none text-[12px] focus:ring-0 shadow-none">
                    <SelectValue placeholder="All Agents" />
                 </SelectTrigger>
                 <SelectContent className="bg-white">
                    <SelectItem value="all">Entire Team</SelectItem>
                    {teamAgents.filter(a => a.role === 'Agent').map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                 </SelectContent>
               </Select>
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 w-[140px] text-[12px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Current Month</SelectItem>
                <SelectItem value="last">Last Month</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 gap-2 border-slate-200" onClick={exportCSV}>
              <Download size={14} /> Export CSV
            </Button>
          </div>
        </div>

        <Tabs defaultValue="growth" className="w-full">
          <TabsList className="bg-white border rounded-lg h-10 p-1 flex w-full overflow-x-auto no-scrollbar justify-start gap-2 px-2 mb-4 shrink-0">
            <TabsTrigger value="growth" className="text-[12px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white shrink-0">Revenue Growth</TabsTrigger>
            <TabsTrigger value="activities" className="text-[12px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white shrink-0">Team Engagement</TabsTrigger>
            <TabsTrigger value="targets" className="text-[12px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white shrink-0">Performance vs Targets</TabsTrigger>
            <TabsTrigger value="acquisition" className="text-[12px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white shrink-0">Lead Sources</TabsTrigger>
          </TabsList>

          <div className="pt-2">
            <TabsContent value="growth" className="m-0 space-y-4">
               <div className="bg-white border rounded-xl p-6 h-[340px] shadow-sm">
                  <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-6">Team Revenue Attribution</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={11} />
                      <YAxis axisLine={false} tickLine={false} fontSize={11} tickFormatter={v => `${currencySymbol}${v/1000}k`} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="revenue" fill="#1B48A3" radius={[2, 2, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </TabsContent>

            <TabsContent value="activities" className="m-0 space-y-4">
               <div className="bg-white border rounded-xl p-6 h-[340px] shadow-sm">
                  <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-6">Daily Interaction Pulse</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyEngagementData}>
                       <defs>
                          <linearGradient id="colorTeamActivity" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#1B48A3" stopOpacity={0.1}/>
                             <stop offset="95%" stopColor="#1B48A3" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                       <YAxis fontSize={10} axisLine={false} tickLine={false} />
                       <Tooltip />
                       <Area type="monotone" dataKey="count" stroke="#1B48A3" fillOpacity={1} fill="url(#colorTeamActivity)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </TabsContent>

            <TabsContent value="targets" className="m-0 space-y-4">
               <div className="bg-white border rounded-xl p-6 shadow-sm">
                  <h3 className="text-[12px] font-bold text-slate-500 uppercase mb-6 flex items-center gap-2">
                     <TargetIcon size={14} /> Team Quota Accuracy (Current Month)
                  </h3>
                  <div className="space-y-6">
                    {targetPerformance.map((p, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-end">
                           <div>
                              <p className="text-[13px] font-bold text-slate-800">{p.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Goal: {currencySymbol}{p.target.toLocaleString()}</p>
                           </div>
                           <span className={cn("text-[14px] font-bold", p.pct >= 100 ? "text-emerald-600" : "text-primary")}>{p.pct}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                           <div className={cn("h-full transition-all duration-1000", p.pct >= 100 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${Math.min(p.pct, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                    {targetPerformance.length === 0 && (
                      <div className="py-12 text-center text-slate-400 italic">No team quotas set for the current evaluation cycle.</div>
                    )}
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="acquisition" className="m-0 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white border rounded-xl p-6 h-[340px] shadow-sm">
                  <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-6">Team Acquisition Mix</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sourceData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {sourceData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', textTransform: 'uppercase' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                   <div className="p-3 border-b bg-slate-50/50">
                      <h4 className="text-[11px] font-bold uppercase text-slate-400">Granular Sub-source Breakdown</h4>
                   </div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-[12px]">
                        <thead>
                          <tr className="bg-slate-50 h-9 font-bold uppercase text-[10px] text-slate-400">
                            <th className="px-3 text-left">Sub-channel</th>
                            <th className="text-center">Leads</th>
                            <th className="text-right px-3">Revenue Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {teamLeads && Array.from(new Set(teamLeads.map(l => l.firstContactSubchannel || 'Direct'))).map((sub, i) => {
                            const subLeads = teamLeads.filter(l => (l.firstContactSubchannel || 'Direct') === sub);
                            const rev = subLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
                            return (
                              <tr key={i} className="h-10 hover:bg-slate-50">
                                <td className="px-3 font-bold text-slate-700">{sub}</td>
                                <td className="text-center text-slate-500">{subLeads.length}</td>
                                <td className="text-right px-3 font-bold text-primary">{currencySymbol}{rev.toLocaleString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                     </table>
                   </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Shell>
  );
}
