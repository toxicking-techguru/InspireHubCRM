"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, collectionGroup } from 'firebase/firestore';
import { Lead, Agent, LeadActivity } from '@/types/crm';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { Download, Loader2, BarChart3, TrendingUp, Users, Target, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, subMonths, startOfMonth, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#1B48A3', '#2579C8', '#164978', '#0E3050', '#071828', '#3377cf'];

export default function AdminReportsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState('6m');

  const agentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'agents') : null, [firestore]);
  const { data: agents, loading: agentsLoading } = useCollection<Agent>(agentsQuery as any);

  const leadsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'leads') : null, [firestore]);
  const { data: leads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);

  const activitiesQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'activities') : null, [firestore]);
  const { data: activities } = useCollection<LeadActivity>(activitiesQuery as any);

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

  const channelData = useMemo(() => {
    if (!leads) return [];
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      const ch = l.firstContactChannel || 'Unknown';
      counts[ch] = (counts[ch] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [leads]);

  if (!user || user.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-slate-900 flex items-center gap-2"><BarChart3 size={20} className="text-primary" /> System Analytics Engine</h1>
            <p className="text-[12px] text-muted-foreground">Comprehensive reporting including cycle time, revenue trajectory, and channel attribution.</p>
          </div>
          <div className="flex items-center gap-2">
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
          <TabsList className="bg-white border rounded-lg h-10 p-1 justify-start gap-4 px-4 mb-4">
            <TabsTrigger value="growth" className="text-[11px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white">Revenue Growth</TabsTrigger>
            <TabsTrigger value="acquisition" className="text-[11px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white">Acquisition Mix</TabsTrigger>
            <TabsTrigger value="velocity" className="text-[11px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white">Pipeline Velocity</TabsTrigger>
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
                         <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} />
                         <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                         <Area type="monotone" dataKey="revenue" stroke="#1B48A3" strokeWidth={3} fillOpacity={1} fill="url(#colorAdminRev)" />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                   <div className="bg-white border rounded-xl p-6 shadow-sm">
                      <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Avg Deal Value</p>
                      <p className="text-[28px] font-bold text-slate-900 leading-none">
                         ${leads?.filter(l => l.status === 'won').length ? Math.round(leads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.estimatedBudget || 0), 0) / leads.filter(l => l.status === 'won').length).toLocaleString() : 0}
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
                   <table className="w-full text-[13px]">
                      <thead>
                         <tr className="bg-slate-50 h-9 font-bold uppercase text-[10px] text-slate-400">
                            <th className="px-6">Channel</th>
                            <th className="text-center">Count</th>
                            <th className="text-right px-6">Conversion</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y">
                         {channelData.sort((a,b) => b.value - a.value).map(d => {
                           const won = leads?.filter(l => l.status === 'won' && l.firstContactChannel === d.name).length || 0;
                           return (
                             <tr key={d.name} className="h-10 hover:bg-slate-50/50">
                                <td className="px-6 font-bold text-slate-700">{d.name}</td>
                                <td className="text-center text-slate-500 font-medium">{d.value}</td>
                                <td className="text-right px-6 font-bold text-primary">{Math.round((won / d.value) * 100)}%</td>
                             </tr>
                           );
                         })}
                      </tbody>
                   </table>
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
                         const agentLeads = leads?.filter(l => l.agentId === agent.id) || [];
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
                      }).filter(Boolean).slice(0, 5)}
                   </div>
                </div>
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}
