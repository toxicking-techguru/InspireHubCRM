"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Lead, Agent } from '@/types/crm';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, subMonths, startOfMonth, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#0891b2', '#0e7490', '#155e75', '#164e63', '#22d3ee', '#67e8f9'];

export default function ManagerReportsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState('3m');

  // Fetch collections directly and filter in memory to avoid index management
  const agentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'agents') : null, [firestore]);
  const { data: allAgents, loading: agentsLoading } = useCollection<Agent>(agentsQuery as any);

  const leadsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'leads') : null, [firestore]);
  const { data: allLeads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);

  const teamAgents = useMemo(() => {
    if (!allAgents || !user) return [];
    return allAgents.filter(a => a.managerId === user.id);
  }, [allAgents, user?.id]);

  const teamLeads = useMemo(() => {
    if (!allLeads || teamAgents.length === 0) return [];
    const agentIds = teamAgents.map(a => a.id);
    return allLeads.filter(l => agentIds.includes(l.agentId));
  }, [allLeads, teamAgents]);

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
    return teamAgents.map(agent => {
      const agentLeads = filteredLeads.filter(l => l.agentId === agent.id);
      const won = agentLeads.filter(l => l.status === 'won').length;
      return {
        name: agent.name,
        leadsIn: agentLeads.length,
        won,
        conversion: agentLeads.length > 0 ? Math.round((won / agentLeads.length) * 100) : 0,
      };
    }).sort((a, b) => b.won - a.won);
  }, [teamAgents, filteredLeads]);

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach(l => {
      const channel = l.firstContactChannel || 'Unknown Source';
      counts[channel] = (counts[channel] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredLeads]);

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

  const exportCSV = () => {
    toast({ title: "Compilation Started", description: "Exporting team datasets to CSV." });
  };

  if (!user || user.role !== 'Manager') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-cyan-900">Dynamic Team Analytics</h1>
            <p className="text-[12px] text-muted-foreground">Aggregated data from your {teamAgents.length} team members.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 w-[140px] text-[12px] bg-white border-cyan-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Current Month</SelectItem>
                <SelectItem value="last">Last Month</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 gap-2 border-cyan-100 text-cyan-700" onClick={exportCSV}>
              <Download size={14} /> Export CSV
            </Button>
          </div>
        </div>

        <Tabs defaultValue="conversion" className="w-full">
          <TabsList className="bg-slate-50 border h-9 p-0.5 justify-start gap-4 px-4 rounded-none border-x-0 border-t-0 w-full">
            {['Conversion', 'Revenue', 'Lead Source'].map(t => (
              <TabsTrigger 
                key={t} 
                value={t.toLowerCase().replace(' ', '')} 
                className="text-[12px] h-full rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-600 data-[state=active]:bg-transparent data-[state=active]:text-cyan-700 shadow-none font-bold uppercase tracking-tight"
              >
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="pt-4">
            <TabsContent value="conversion" className="m-0 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-card border rounded-md p-4 h-[240px]">
                  <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-4">Team Pipeline Status</h3>
                  <div className="flex flex-col gap-3 justify-center h-full pb-8">
                    {['New', 'Qualified', 'Proposal', 'Won'].map((stage, i) => {
                      const count = teamLeads.filter(l => l.status === stage.toLowerCase()).length;
                      const total = teamLeads.length || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={stage} className="flex items-center gap-3">
                          <span className="text-[11px] w-16 text-slate-500 font-bold">{stage}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden relative">
                             <div className="absolute top-0 left-0 h-full bg-cyan-600/20 transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                             <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-bold text-cyan-800">{count} Deals</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-card border rounded-md p-4 flex flex-col justify-center gap-4 text-center">
                   <p className="text-[12px] text-slate-500 font-bold uppercase">Aggregated Conversion</p>
                   <p className="text-[42px] font-bold text-cyan-700 leading-none">
                     {teamLeads.length > 0 ? Math.round((teamLeads.filter(l => l.status === 'won').length / teamLeads.length) * 100) : 0}%
                   </p>
                   <p className="text-[10px] text-slate-400 font-medium">Across all team acquisition channels</p>
                </div>
              </div>
              
              <div className="bg-card border rounded-md overflow-hidden shadow-sm">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 h-9">
                      <th className="px-3 text-left">Agent Name</th>
                      <th className="text-center">Total Managed</th>
                      <th className="text-center">Deals Won</th>
                      <th className="text-right px-3">Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {conversionData.map((d, i) => (
                      <tr key={i} className="h-9 hover:bg-slate-50/50">
                        <td className="px-3 font-bold text-slate-800">{d.name}</td>
                        <td className="text-center text-slate-500 font-medium">{d.leadsIn}</td>
                        <td className="text-center text-emerald-600 font-bold">{d.won}</td>
                        <td className="text-right px-3">
                          <Badge variant="outline" className="h-4 text-[10px] border-cyan-100 text-cyan-700 font-bold">{d.conversion}%</Badge>
                        </td>
                      </tr>
                    ))}
                    {conversionData.length === 0 && (
                       <tr className="h-20"><td colSpan={4} className="text-center text-slate-300 italic">Scanning team performance...</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="revenue" className="m-0 space-y-4">
               <div className="bg-card border rounded-md p-4 h-[280px]">
                  <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-4">Team Revenue Attribution</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={11} />
                      <YAxis axisLine={false} tickLine={false} fontSize={11} tickFormatter={v => `$${v/1000}k`} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '6px' }} />
                      <Bar dataKey="revenue" fill="#0891b2" radius={[2, 2, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
               <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Cumulative Revenue', value: `$${teamLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.estimatedBudget || 0), 0).toLocaleString()}` },
                    { label: 'Avg Deal Size', value: `$${teamLeads.filter(l => l.status === 'won').length > 0 ? Math.round(teamLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.estimatedBudget || 0), 0) / teamLeads.filter(l => l.status === 'won').length).toLocaleString() : 0}` },
                    { label: 'Active Pipeline', value: `$${teamLeads.filter(l => !['won', 'lost', 'dormant'].includes(l.status)).reduce((sum, l) => sum + (l.estimatedBudget || 0), 0).toLocaleString()}` },
                  ].map((m, i) => (
                    <div key={i} className="bg-slate-50 border rounded-md p-3">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{m.label}</p>
                      <p className="text-[20px] font-bold text-cyan-800 leading-none">{m.value}</p>
                    </div>
                  ))}
               </div>
            </TabsContent>

            <TabsContent value="leadsource" className="m-0 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-card border rounded-md p-4 h-[280px] flex flex-col">
                  <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-4">Team Acquisition Mix</h3>
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
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '4px' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-card border rounded-md overflow-hidden">
                   <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-slate-50 h-9">
                          <th className="px-3 text-left">Main Source</th>
                          <th className="text-center">Count</th>
                          <th className="text-right px-3">Rev Contribution</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {sourceData.sort((a, b) => b.value - a.value).map((d, i) => {
                          const rev = teamLeads
                            .filter(l => l.status === 'won' && l.firstContactChannel === d.name)
                            .reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
                          return (
                            <tr key={i} className="h-9 hover:bg-slate-50">
                              <td className="px-3 font-medium text-slate-700">{d.name}</td>
                              <td className="text-center font-bold text-slate-600">{d.value}</td>
                              <td className="text-right px-3 font-bold text-cyan-700">${rev.toLocaleString()}</td>
                            </tr>
                          );
                        })}
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
