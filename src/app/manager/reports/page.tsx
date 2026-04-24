
"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Lead, Agent, LeadActivity } from '@/types/crm';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  BarChart3, TrendingUp, Users, PieChart as PieChartIcon, 
  Download, Filter, Loader2, Calendar 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';

const COLORS = ['#0891b2', '#0e7490', '#155e75', '#164e63', '#22d3ee', '#67e8f9'];

export default function ManagerReportsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const [dateRange, setDateRange] = useState('3m');

  const agentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'agents'), where('managerId', '==', user.id));
  }, [firestore, user?.id]);
  const { data: agents } = useCollection<Agent>(agentsQuery as any);

  const leadsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'leads') : null, [firestore]);
  const { data: leads, loading } = useCollection<Lead>(leadsQuery as any);

  const teamLeads = useMemo(() => {
    if (!leads || !agents) return [];
    const agentIds = agents.map(a => a.id);
    return leads.filter(l => agentIds.includes(l.agentId));
  }, [leads, agents]);

  // Filters based on selected range
  const filteredLeads = useMemo(() => {
    const now = new Date();
    let start: Date;
    if (dateRange === '1m') start = startOfMonth(now);
    else if (dateRange === 'last') start = startOfMonth(subMonths(now, 1));
    else if (dateRange === '3m') start = startOfMonth(subMonths(now, 2));
    else start = startOfMonth(subMonths(now, 5));

    return teamLeads.filter(l => parseISO(l.createdAt) >= start);
  }, [teamLeads, dateRange]);

  const conversionData = useMemo(() => {
    return agents?.map(agent => {
      const agentLeads = filteredLeads.filter(l => l.agentId === agent.id);
      const won = agentLeads.filter(l => l.status === 'won').length;
      return {
        name: agent.name,
        leadsIn: agentLeads.length,
        won,
        conversion: agentLeads.length > 0 ? Math.round((won / agentLeads.length) * 100) : 0,
        avgDays: 14 // Mocked
      };
    }) || [];
  }, [agents, filteredLeads]);

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach(l => {
      counts[l.firstContactChannel] = (counts[l.firstContactChannel] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredLeads]);

  const revenueData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => format(subMonths(new Date(), 5 - i), 'MMM'));
    return months.map(m => ({
      month: m,
      revenue: Math.floor(Math.random() * 50000) + 10000,
      target: 40000
    }));
  }, []);

  const exportCSV = () => {
    toast({ title: "Export Started", description: "Report data is being compiled." });
  };

  if (!user || user.role !== 'Manager') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold">Team Analytics</h1>
            <p className="text-[12px] text-muted-foreground">Comprehensive performance and pipeline reports.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 w-[140px] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">This Month</SelectItem>
                <SelectItem value="last">Last Month</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 gap-2" onClick={exportCSV}>
              <Download size={14} /> Export CSV
            </Button>
          </div>
        </div>

        <Tabs defaultValue="conversion" className="w-full">
          <TabsList className="bg-slate-50 border h-9 p-0.5 justify-start gap-4 px-4 rounded-none border-x-0 border-t-0 w-full">
            {['Conversion', 'Revenue', 'Activity', 'Lead Source'].map(t => (
              <TabsTrigger 
                key={t} 
                value={t.toLowerCase().replace(' ', '')} 
                className="text-[12px] h-full rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-600 data-[state=active]:bg-transparent data-[state=active]:text-cyan-700 shadow-none"
              >
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="pt-4">
            <TabsContent value="conversion" className="m-0 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-card border rounded-md p-4 h-[240px]">
                  <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-4">Pipeline Funnel</h3>
                  <div className="flex flex-col gap-3 justify-center h-full pb-8">
                    {['New', 'Qualified', 'Proposal', 'Won'].map((stage, i) => {
                      const count = teamLeads.filter(l => l.status === stage.toLowerCase()).length;
                      const width = 100 - (i * 15);
                      return (
                        <div key={stage} className="flex items-center gap-3">
                          <span className="text-[11px] w-16 text-slate-500">{stage}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden relative">
                             <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full bg-cyan-600/20" style={{ width: `${width}%` }}></div>
                             <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-card border rounded-md p-4 flex flex-col justify-center gap-4">
                   <div className="text-center">
                      <p className="text-[12px] text-slate-500 font-medium">Avg Conversion</p>
                      <p className="text-[32px] font-bold text-cyan-700">24.5%</p>
                      <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px]">+2.1% vs prev</Badge>
                   </div>
                </div>
              </div>
              
              <div className="bg-card border rounded-md overflow-hidden shadow-sm">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 h-9">
                      <th className="px-3 text-left">Agent Name</th>
                      <th className="text-center">Leads In</th>
                      <th className="text-center">Leads Won</th>
                      <th className="text-center">Conversion %</th>
                      <th className="text-right px-3">Avg Close (Days)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {conversionData.map((d, i) => (
                      <tr key={i} className="h-9 hover:bg-slate-50/50">
                        <td className="px-3 font-bold">{d.name}</td>
                        <td className="text-center">{d.leadsIn}</td>
                        <td className="text-center">{d.won}</td>
                        <td className="text-center">
                          <Badge variant="outline" className="h-4 text-[10px] border-cyan-200">{d.conversion}%</Badge>
                        </td>
                        <td className="text-right px-3 text-slate-500">{d.avgDays} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="revenue" className="m-0 space-y-4">
               <div className="bg-card border rounded-md p-4 h-[280px]">
                  <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-4">Revenue Growth</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={11} />
                      <YAxis axisLine={false} tickLine={false} fontSize={11} tickFormatter={v => `$${v/1000}k`} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="revenue" fill="#0891b2" radius={[2, 2, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
               <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total Revenue', value: '$248,500' },
                    { label: 'Avg Deal Size', value: '$12,400' },
                    { label: 'Best Month', value: 'March 2024' },
                  ].map((m, i) => (
                    <div key={i} className="bg-slate-50 border rounded-md p-3">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</p>
                      <p className="text-[20px] font-bold text-slate-800">{m.value}</p>
                    </div>
                  ))}
               </div>
            </TabsContent>

            <TabsContent value="activity" className="m-0 space-y-4">
               <div className="bg-card border rounded-md p-4">
                  <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-4">Team Activity Heatmap (30 Days)</h3>
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px] flex flex-col gap-1">
                       {agents?.map(a => (
                         <div key={a.id} className="flex items-center gap-2 h-6">
                            <span className="text-[11px] w-24 truncate font-medium">{a.name.split(' ')[0]}</span>
                            <div className="flex-1 flex gap-0.5 h-full">
                               {Array.from({ length: 30 }).map((_, i) => {
                                 const intensity = Math.random(); // Mock intensity
                                 return (
                                   <div 
                                     key={i} 
                                     className={cn(
                                       "flex-1 rounded-sm",
                                       intensity > 0.8 ? "bg-cyan-600" : intensity > 0.5 ? "bg-cyan-400" : intensity > 0.2 ? "bg-cyan-200" : "bg-slate-100"
                                     )}
                                   />
                                 );
                               })}
                            </div>
                         </div>
                       ))}
                       <div className="flex gap-2 h-4 mt-2">
                          <div className="w-24" />
                          <div className="flex-1 flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                             <span>30d ago</span>
                             <span>Today</span>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="leadsource" className="m-0 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-card border rounded-md p-4 h-[240px] flex flex-col">
                  <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-4">Leads by Channel</h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sourceData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {sourceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-card border rounded-md overflow-hidden">
                   <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-slate-50 h-8">
                          <th className="px-3 text-left">Source</th>
                          <th className="text-center">Count</th>
                          <th className="text-right px-3">Rev Attributed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {sourceData.map((d, i) => (
                          <tr key={i} className="h-8">
                            <td className="px-3 font-medium">{d.name}</td>
                            <td className="text-center">{d.value}</td>
                            <td className="text-right px-3 font-bold text-cyan-700">${(d.value * 2500).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Shell>
  );
}
