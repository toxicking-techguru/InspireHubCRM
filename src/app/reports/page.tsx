
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
import { format, subMonths, startOfMonth, parseISO } from 'date-fns';

const COLORS = ['#1B48A3', '#2579C8', '#164978', '#0E3050', '#071828'];

export default function GlobalReportsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const [dateRange, setDateRange] = useState('6m');

  const leadsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'leads') : null, [firestore]);
  const { data: allLeads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);

  const agentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'agents') : null, [firestore]);
  const { data: agents } = useCollection<Agent>(agentsQuery as any);

  const revenueData = useMemo(() => {
    if (!allLeads) return [];
    const range = dateRange === '1y' ? 12 : dateRange === '6m' ? 6 : 3;
    return Array.from({ length: range }).map((_, i) => {
      const date = subMonths(new Date(), (range - 1) - i);
      const mStart = startOfMonth(date);
      const nextMonth = startOfMonth(subMonths(date, -1));
      const rev = allLeads.filter(l => l.status === 'won' && l.wonAt && parseISO(l.wonAt) >= mStart && parseISO(l.wonAt) < nextMonth)
        .reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
      return { month: format(date, 'MMM'), revenue: rev };
    });
  }, [allLeads, dateRange]);

  const channelData = useMemo(() => {
    if (!allLeads) return [];
    const counts: Record<string, number> = {};
    allLeads.forEach(l => {
      counts[l.firstContactChannel || 'Direct'] = (counts[l.firstContactChannel || 'Direct'] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [allLeads]);

  if (!user || user.role === 'Agent') return null;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <div>
              <h1 className="text-xl font-bold text-slate-900">Advanced Analytics</h1>
              <p className="text-sm text-slate-500">High-level summary of lead acquisition and revenue growth.</p>
           </div>
           <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                 <SelectTrigger className="h-9 w-[150px] text-[13px] bg-white">
                    <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                    <SelectItem value="3m">Last 3 Months</SelectItem>
                    <SelectItem value="6m">Last 6 Months</SelectItem>
                    <SelectItem value="1y">Last 12 Months</SelectItem>
                 </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-[13px] border-slate-200">
                 <Download size={14} /> Export Dataset
              </Button>
           </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
           <TabsList className="bg-white border p-1 rounded-lg h-10 gap-2 mb-6">
              <TabsTrigger value="overview" className="text-[12px] font-bold uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-white">Revenue Growth</TabsTrigger>
              <TabsTrigger value="acquisition" className="text-[12px] font-bold uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-white">Lead Acquisition</TabsTrigger>
              <TabsTrigger value="agents" className="text-[12px] font-bold uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-white">Agent Performance</TabsTrigger>
           </TabsList>

           <TabsContent value="overview" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 bg-white border rounded-xl p-6 shadow-sm h-[400px]">
                    <h3 className="text-[14px] font-bold text-slate-800 mb-6 uppercase tracking-wider">Revenue Trend (Won Deals)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={revenueData}>
                          <defs>
                             <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1B48A3" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#1B48A3" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={11} tick={{ fill: '#94a3b8' }} />
                          <YAxis axisLine={false} tickLine={false} fontSize={11} tick={{ fill: '#94a3b8' }} tickFormatter={v => `$${v/1000}k`} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Area type="monotone" dataKey="revenue" stroke="#1B48A3" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="space-y-4">
                    <div className="bg-white border rounded-xl p-6 shadow-sm space-y-1">
                       <p className="text-[11px] font-bold text-slate-400 uppercase">Avg. Deal Size</p>
                       <p className="text-3xl font-bold text-slate-900">
                          ${allLeads?.filter(l => l.status === 'won').length ? Math.round(allLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + l.estimatedBudget, 0) / allLeads.filter(l => l.status === 'won').length).toLocaleString() : 0}
                       </p>
                    </div>
                    <div className="bg-white border rounded-xl p-6 shadow-sm space-y-1">
                       <p className="text-[11px] font-bold text-slate-400 uppercase">Retention Score</p>
                       <p className="text-3xl font-bold text-emerald-600">84.2%</p>
                    </div>
                 </div>
              </div>
           </TabsContent>

           <TabsContent value="acquisition" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                 <div className="bg-white border rounded-xl p-6 shadow-sm h-[350px]">
                    <h3 className="text-[14px] font-bold text-slate-800 mb-6 uppercase tracking-wider">Leads per Channel</h3>
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie data={channelData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                             {channelData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="bg-white border rounded-xl p-6 shadow-sm overflow-hidden flex flex-col">
                    <h3 className="text-[14px] font-bold text-slate-800 mb-4 uppercase">Channel Efficiency</h3>
                    <div className="flex-1 overflow-auto">
                       <table className="w-full text-[13px]">
                          <thead>
                             <tr className="bg-slate-50 h-9 font-bold uppercase text-[10px] text-slate-400"><th className="px-4">Channel</th><th>Count</th><th className="text-right px-4">Conv %</th></tr>
                          </thead>
                          <tbody className="divide-y">
                             {channelData.map(d => {
                               const won = allLeads?.filter(l => l.status === 'won' && l.firstContactChannel === d.name).length || 0;
                               return (
                                 <tr key={d.name} className="h-10">
                                    <td className="px-4 font-bold text-slate-700">{d.name}</td>
                                    <td className="text-slate-500">{d.value}</td>
                                    <td className="text-right px-4 font-bold text-primary">{Math.round((won / d.value) * 100)}%</td>
                                 </tr>
                               );
                             })}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
           </TabsContent>

           <TabsContent value="agents" className="space-y-6">
              <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                 <table className="w-full text-[13px]">
                    <thead>
                       <tr className="bg-slate-50 h-10 font-bold uppercase text-[11px] text-slate-400">
                          <th className="px-6 text-left">Agent Name</th>
                          <th className="text-center">Managed</th>
                          <th className="text-center">Won</th>
                          <th className="text-right">Revenue</th>
                          <th className="text-right px-6">Conv Rate</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y">
                       {agents?.map(agent => {
                          const agentLeads = allLeads?.filter(l => l.agentId === agent.id) || [];
                          const won = agentLeads.filter(l => l.status === 'won').length;
                          const rev = agentLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + l.estimatedBudget, 0);
                          return (
                            <tr key={agent.id} className="h-12 hover:bg-slate-50 transition-colors">
                               <td className="px-6">
                                  <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[11px]">{agent.name[0]}</div>
                                     <span className="font-bold text-slate-800">{agent.name}</span>
                                  </div>
                               </td>
                               <td className="text-center text-slate-500 font-medium">{agentLeads.length}</td>
                               <td className="text-center font-bold text-emerald-600">{won}</td>
                               <td className="text-right font-bold text-slate-700">${rev.toLocaleString()}</td>
                               <td className="text-right px-6">
                                  <Badge className="bg-slate-100 text-slate-700 border-none font-bold">{agentLeads.length > 0 ? Math.round((won/agentLeads.length)*100) : 0}%</Badge>
                               </td>
                            </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>
           </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}
