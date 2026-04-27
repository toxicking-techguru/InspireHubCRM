
"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Lead, Agent, Commission } from '@/types/crm';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { Download, Loader2, BarChart3, TrendingUp, Users, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, subMonths, startOfMonth, parseISO, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

export default function AdminReportsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState('6m');

  // Fetch collections
  const agentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'agents') : null, [firestore]);
  const { data: agents, loading: agentsLoading } = useCollection<Agent>(agentsQuery as any);

  const leadsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'leads') : null, [firestore]);
  const { data: leads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);

  const commissionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'commissions') : null, [firestore]);
  const { data: commissions } = useCollection<Commission>(commissionsQuery as any);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    const now = new Date();
    let start: Date;
    if (dateRange === '1m') start = startOfMonth(now);
    else if (dateRange === '3m') start = startOfMonth(subMonths(now, 2));
    else if (dateRange === '6m') start = startOfMonth(subMonths(now, 5));
    else start = startOfMonth(subMonths(now, 11));

    return leads.filter(l => parseISO(l.createdAt) >= start);
  }, [leads, dateRange]);

  const revenueData = useMemo(() => {
    const range = dateRange === '1y' ? 12 : dateRange === '6m' ? 6 : 3;
    const months = Array.from({ length: range }).map((_, i) => {
      const date = subMonths(new Date(), (range - 1) - i);
      const mStr = format(date, 'MMM');
      const mStart = startOfMonth(date);
      const mEnd = endOfMonth(date);
      
      const rev = leads?.filter(l => l.status === 'won' && l.wonAt && parseISO(l.wonAt) >= mStart && parseISO(l.wonAt) <= mEnd)
        .reduce((sum, l) => sum + (l.estimatedBudget || 0), 0) || 0;
        
      return { month: mStr, revenue: rev };
    });
    return months;
  }, [leads, dateRange]);

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach(l => {
      const channel = l.firstContactChannel || 'Other';
      counts[channel] = (counts[channel] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredLeads]);

  const managerPerformance = useMemo(() => {
    if (!agents || !leads) return [];
    const managers = agents.filter(a => a.role === 'Manager' || a.role === 'Admin');
    
    return managers.map(m => {
      const teamAgentIds = agents.filter(a => a.managerId === m.id || a.id === m.id).map(a => a.id);
      const teamLeads = leads.filter(l => teamAgentIds.includes(l.agentId));
      const won = teamLeads.filter(l => l.status === 'won').length;
      const revenue = teamLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
      
      return {
        name: m.name,
        won,
        revenue,
        conversion: teamLeads.length > 0 ? Math.round((won / teamLeads.length) * 100) : 0
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [agents, leads]);

  if (!user || user.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-violet-900 flex items-center gap-2">
              <BarChart3 size={20} className="text-violet-600" /> Global Analytics Engine
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">System-wide performance monitoring and data aggregation.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 w-[160px] text-[12px] bg-white border-violet-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Current Month</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="1y">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 gap-2 border-violet-200 text-violet-700" onClick={() => toast({ title: "Report Exported" })}>
              <Download size={14} /> Export Global Data
            </Button>
          </div>
        </div>

        <Tabs defaultValue="growth" className="w-full">
          <TabsList className="bg-slate-50 border h-10 p-0.5 justify-start gap-6 px-4 rounded-none border-x-0 border-t-0 w-full">
            {['Growth', 'Team Performance', 'Attribution'].map(t => (
              <TabsTrigger 
                key={t} 
                value={t.toLowerCase().replace(' ', '')} 
                className="text-[12px] h-full rounded-none border-b-2 border-transparent data-[state=active]:border-violet-600 data-[state=active]:bg-transparent data-[state=active]:text-violet-700 shadow-none font-bold uppercase tracking-tight"
              >
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="pt-6">
            <TabsContent value="growth" className="m-0 space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                 {[
                   { label: 'System Revenue', value: `$${revenueData.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}`, icon: TrendingUp },
                   { label: 'Deals Closed', value: leads?.filter(l => l.status === 'won').length || 0, icon: Target },
                   { label: 'Total Database', value: leads?.length || 0, icon: Users },
                 ].map((m, i) => (
                   <div key={i} className="bg-white border rounded-md p-4 shadow-sm border-violet-50">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">{m.label}</span>
                        <m.icon size={14} className="text-violet-200" />
                      </div>
                      <p className="text-[24px] font-bold text-violet-900 leading-none">{m.value}</p>
                   </div>
                 ))}
              </div>

              <div className="bg-white border rounded-md p-6 shadow-sm border-violet-50 h-[360px]">
                 <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-6">Revenue Trend (System-Wide)</h3>
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={11} tick={{ fill: '#94a3b8' }} />
                       <YAxis axisLine={false} tickLine={false} fontSize={11} tick={{ fill: '#94a3b8' }} tickFormatter={v => `$${v/1000}k`} />
                       <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                       <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }} />
                    </LineChart>
                 </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="teamperformance" className="m-0 space-y-4">
               <div className="bg-card border rounded-md overflow-hidden border-violet-100 shadow-sm">
                  <table className="w-full text-[13px]">
                     <thead>
                        <tr className="bg-slate-50 h-10 border-b">
                           <th className="px-4 text-left">Unit Leader / Manager</th>
                           <th className="text-center">Team Wins</th>
                           <th className="text-right">Team Revenue</th>
                           <th className="text-center px-4">Avg. Conversion</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y">
                        {managerPerformance.map((m, i) => (
                          <tr key={i} className="h-11 hover:bg-violet-50/30 transition-colors">
                             <td className="px-4 font-bold text-slate-800">{m.name}</td>
                             <td className="text-center font-medium text-slate-600">{m.won}</td>
                             <td className="text-right font-bold text-violet-700">${m.revenue.toLocaleString()}</td>
                             <td className="text-center px-4">
                                <Badge variant="outline" className="h-4 text-[10px] border-violet-100 text-violet-700 font-bold">{m.conversion}%</Badge>
                             </td>
                          </tr>
                        ))}
                        {managerPerformance.length === 0 && (
                          <tr className="h-40"><td colSpan={4} className="text-center text-slate-300 italic">No manager data available for current range.</td></tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </TabsContent>

            <TabsContent value="attribution" className="m-0">
               <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white border rounded-md p-6 shadow-sm h-[340px] flex flex-col">
                     <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-4">Source Distribution</h3>
                     <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie data={sourceData} innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value">
                                 {sourceData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                              </Pie>
                              <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px' }} />
                              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
                  <div className="bg-white border rounded-md overflow-hidden">
                     <div className="p-3 border-b bg-slate-50 font-bold text-[11px] uppercase text-slate-500 tracking-wider">Top Channels by Count</div>
                     <div className="divide-y overflow-y-auto max-h-[290px]">
                        {sourceData.sort((a, b) => b.value - a.value).map((s, i) => (
                          <div key={i} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span className="text-[13px] font-medium text-slate-700">{s.name}</span>
                             </div>
                             <span className="text-[13px] font-bold text-violet-700">{s.value}</span>
                          </div>
                        ))}
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
