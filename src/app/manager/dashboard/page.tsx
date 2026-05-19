"use client"

import React, { useMemo, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Lead, Agent } from '@/types/crm';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, startOfMonth, parseISO, endOfMonth, format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TierBadge } from '@/components/ui/tier-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowRight, Users, Target, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ManagerDashboard() {
  const { user, config } = useAuthStore();
  const firestore = useFirestore();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const currencySymbol = config?.currency === 'KES' ? 'KES ' : config?.currency === 'GBP' ? '£' : '$';

  // Fetch all agents and leads to filter in memory
  const agentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'agents') : null, [firestore]);
  const { data: allAgents, loading: agentsLoading } = useCollection<Agent>(agentsQuery as any);

  const leadsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'leads') : null, [firestore]);
  const { data: allLeads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);

  const teamAgents = useMemo(() => {
    if (!allAgents || !user) return [];
    return allAgents.filter(a => a.managerId === user.id || a.id === user.id);
  }, [allAgents, user?.id]);

  const teamLeads = useMemo(() => {
    if (!allLeads || teamAgents.length === 0) return [];
    const agentIds = teamAgents.map(a => a.id);
    return allLeads.filter(l => agentIds.includes(l.agentId));
  }, [allLeads, teamAgents]);

  const stats = useMemo(() => {
    if (leadsLoading || agentsLoading) return null;
    
    const idleCount = teamLeads.filter(l => {
      if (['won', 'lost', 'dormant'].includes(l.status)) return false;
      const lastTouch = new Date(l.lastActivityAt || l.createdAt).getTime();
      return (Date.now() - lastTouch) > (72 * 60 * 60 * 1000);
    }).length;

    const mStart = startOfMonth(parseISO(selectedMonth + '-01'));
    const mEnd = endOfMonth(mStart);

    const wonThisMonth = teamLeads.filter(l => l.status === 'won' && l.wonAt && parseISO(l.wonAt) >= mStart && parseISO(l.wonAt) <= mEnd).length;
    const totalRevenue = teamLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
    const activeLeads = teamLeads.filter(l => !['won', 'lost', 'dormant'].includes(l.status)).length;
    
    return [
      { label: 'Team Accounts', value: teamAgents.length, icon: Users },
      { label: 'Active Pipeline', value: activeLeads, icon: Target },
      { label: 'Won in Period', value: wonThisMonth, icon: TrendingUp },
      { label: 'Total Revenue', value: `${currencySymbol}${(totalRevenue / 1000).toFixed(1)}k`, icon: TrendingUp },
      { label: 'Conversion', value: teamLeads.length > 0 ? Math.round((teamLeads.filter(l => l.status === 'won').length / teamLeads.length) * 100) + '%' : '0%', icon: TrendingUp },
      { label: 'Critical Idle', value: idleCount, isWarning: idleCount > 0, icon: AlertTriangle },
    ];
  }, [teamLeads, teamAgents, leadsLoading, agentsLoading, selectedMonth, currencySymbol]);

  const performanceData = useMemo(() => {
    if (teamAgents.length === 0 || teamLeads.length === 0) return [];
    return teamAgents.map(agent => {
      const agentLeads = teamLeads.filter(l => l.agentId === agent.id);
      const won = agentLeads.filter(l => l.status === 'won').length;
      const revenue = agentLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
      const conversion = agentLeads.length > 0 ? Math.round((won / agentLeads.length) * 100) : 0;
      
      const timestamps = agentLeads.map(l => new Date(l.lastActivityAt || l.createdAt).getTime());
      const lastActive = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;
      const isInactive = lastActive ? (Date.now() - lastActive.getTime()) > (7 * 24 * 60 * 60 * 1000) : true;

      return { ...agent, leadsCount: agentLeads.length, won, revenue, conversion, lastActive, isInactive };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [teamAgents, teamLeads]);

  if (!user || user.role !== 'Manager') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
           <div>
              <h1 className="text-xl font-bold text-slate-900">Team Oversight</h1>
              <p className="text-sm text-slate-500">Performance metrics for your regional team accounts.</p>
           </div>
           <div className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm">
              <Calendar size={16} className="text-primary" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                 <SelectTrigger className="h-8 w-[160px] border-none font-bold text-[13px] focus:ring-0">
                    <SelectValue />
                 </SelectTrigger>
                 <SelectContent className="bg-white">
                    {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
                      const d = startOfMonth(new Date(new Date().setMonth(new Date().getMonth() - i)));
                      const val = format(d, 'yyyy-MM');
                      return <SelectItem key={val} value={val}>{format(d, 'MMMM yyyy')}</SelectItem>
                    })}
                 </SelectContent>
              </Select>
           </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {stats ? stats.map((stat, i) => (
            <div key={i} className={cn(
              "border-[0.5px] rounded-md p-3 shadow-sm flex flex-col justify-between h-[90px]",
              stat.isWarning ? "bg-red-50 border-red-200" : "bg-white"
            )}>
              <div className="flex justify-between items-start">
                 <p className="text-[11px] font-bold uppercase tracking-tight text-slate-500">{stat.label}</p>
                 <stat.icon size={12} className={stat.isWarning ? "text-red-400" : "text-slate-300"} />
              </div>
              <p className="text-[20px] font-bold text-slate-900 leading-tight">
                {stat.value}
              </p>
            </div>
          )) : Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[90px] rounded-md" />)}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border rounded-md shadow-sm overflow-hidden">
              <div className="p-3 border-b bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-[12px] font-bold uppercase tracking-tight text-slate-500">Agent Performance Table</h3>
                <Link href="/manager/team">
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase font-bold text-primary">Full Directory</Button>
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 h-9">
                      <th className="px-3 font-semibold text-left">Agent</th>
                      <th className="font-semibold text-center">Managed</th>
                      <th className="font-semibold text-center">Won</th>
                      <th className="font-semibold text-right">Revenue</th>
                      <th className="font-semibold text-center">Conv%</th>
                      <th className="font-semibold text-right">Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {performanceData.map((p) => (
                      <tr key={p.id} className={cn("h-10 transition-colors", p.isInactive ? "bg-amber-50/50" : "hover:bg-slate-50/50")}>
                        <td className="px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{p.name}</span>
                            <TierBadge tierId={p.tierId} />
                          </div>
                        </td>
                        <td className="text-center">{p.leadsCount}</td>
                        <td className="text-center font-bold text-emerald-600">{p.won}</td>
                        <td className="text-right font-medium">{currencySymbol}{p.revenue.toLocaleString()}</td>
                        <td className="text-center">
                          <Badge variant="outline" className="text-[10px] h-4 font-bold border-primary/10 text-primary">{p.conversion}%</Badge>
                        </td>
                        <td className="text-right text-slate-400 text-[11px]">
                          {p.lastActive ? formatDistanceToNow(p.lastActive) + ' ago' : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border rounded-md p-4 h-[240px] flex flex-col">
                <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Team Funnel Accuracy</h3>
                <div className="flex-1 flex flex-col justify-between py-2">
                  {['New', 'Qualified', 'Proposal', 'Won'].map((stage) => {
                    const count = teamLeads.filter(l => l.status === stage.toLowerCase()).length;
                    const total = teamLeads.length || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={stage} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-500">{stage}</span>
                          <span className="text-slate-700">{count}</span>
                        </div>
                        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden relative">
                           <div className="absolute top-0 left-0 h-full bg-primary/20 transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border rounded-md shadow-sm overflow-hidden">
               <div className="p-3 border-b bg-red-50/50">
                 <h3 className="text-[12px] font-bold text-red-700 uppercase tracking-wider">Priority Idle Action</h3>
               </div>
               <div className="divide-y max-h-[340px] overflow-y-auto">
                 {teamLeads.filter(l => {
                    if (['won', 'lost', 'dormant'].includes(l.status)) return false;
                    const idle = Date.now() - new Date(l.lastActivityAt || l.createdAt).getTime();
                    return idle > (72 * 60 * 60 * 1000);
                 }).slice(0, 8).map(l => (
                   <div key={l.id} className="p-3 hover:bg-slate-50 transition-colors group">
                     <div className="flex justify-between items-start mb-1">
                        <Link href={`/leads/${l.id}`} className="text-[13px] font-bold hover:underline truncate text-slate-800">{l.clientName}</Link>
                        <Badge variant="outline" className="text-[9px] h-3.5 bg-red-50 text-red-600 border-red-100 font-bold">
                          {Math.floor((Date.now() - new Date(l.lastActivityAt || l.createdAt).getTime()) / (1000 * 60 * 60 * 24))}d IDLE
                        </Badge>
                     </div>
                     <div className="text-[11px] text-slate-500">
                        Assigned: <b className="text-slate-600">{teamAgents.find(a => a.id === l.agentId)?.name || '...'}</b>
                     </div>
                   </div>
                 ))}
                 {teamLeads.length === 0 && <p className="p-10 text-center text-slate-300 text-[12px] italic">No active accounts.</p>}
               </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
