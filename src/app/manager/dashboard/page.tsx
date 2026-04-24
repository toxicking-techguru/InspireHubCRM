"use client"

import React, { useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Lead, Agent, Tier, LeadActivity } from '@/types/crm';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TierBadge } from '@/components/ui/tier-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowRight, Clock, Users, Target, TrendingUp, AlertTriangle } from 'lucide-react';

export default function ManagerDashboard() {
  const { user } = useAuthStore();
  const firestore = useFirestore();

  // Team Data
  const teamQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'agents'), where('managerId', '==', user.id));
  }, [firestore, user?.id]);
  const { data: agents, loading: agentsLoading } = useCollection<Agent>(teamQuery as any);

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'leads');
  }, [firestore]);
  const { data: allLeads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);

  const teamLeads = useMemo(() => {
    if (!allLeads || !agents) return [];
    const agentIds = agents.map(a => a.id);
    return allLeads.filter(l => agentIds.includes(l.agentId));
  }, [allLeads, agents]);

  const stats = useMemo(() => {
    if (leadsLoading || agentsLoading) return null;
    const idleCount = teamLeads.filter(l => (Date.now() - new Date(l.lastActivityAt || l.createdAt).getTime()) > (72 * 60 * 60 * 1000)).length;
    const wonThisMonth = teamLeads.filter(l => l.status === 'won').length;
    const totalRevenue = teamLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + l.estimatedBudget, 0);
    
    return [
      { label: 'Total team leads', value: teamLeads.length },
      { label: 'Active leads', value: teamLeads.filter(l => !['won', 'lost'].includes(l.status)).length },
      { label: 'Won this month', value: wonThisMonth },
      { label: 'Team revenue', value: `$${totalRevenue.toLocaleString()}`, isCurrency: true },
      { label: 'Avg conversion %', value: teamLeads.length > 0 ? Math.round((wonThisMonth / teamLeads.length) * 100) + '%' : '0%' },
      { label: 'Idle leads count', value: idleCount, isWarning: idleCount > 0 },
    ];
  }, [teamLeads, leadsLoading, agentsLoading]);

  const performanceData = useMemo(() => {
    if (!agents || !teamLeads) return [];
    return agents.map(agent => {
      const agentLeads = teamLeads.filter(l => l.agentId === agent.id);
      const won = agentLeads.filter(l => l.status === 'won').length;
      const qualified = agentLeads.filter(l => l.status === 'qualified').length;
      const revenue = agentLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + l.estimatedBudget, 0);
      const conversion = agentLeads.length > 0 ? Math.round((won / agentLeads.length) * 100) : 0;
      
      const lastActive = agentLeads.length > 0 
        ? new Date(Math.max(...agentLeads.map(l => new Date(l.lastActivityAt || l.createdAt).getTime())))
        : null;
      
      const isInactive = lastActive ? (Date.now() - lastActive.getTime()) > (7 * 24 * 60 * 60 * 1000) : true;

      return {
        ...agent,
        leadsCount: agentLeads.length,
        qualified,
        won,
        revenue,
        conversion,
        lastActive,
        isInactive
      };
    });
  }, [agents, teamLeads]);

  const chartData = useMemo(() => {
    return performanceData
      .sort((a, b) => b.won - a.won)
      .slice(0, 5)
      .map(p => ({ name: p.name.split(' ')[0], won: p.won }));
  }, [performanceData]);

  if (!user || user.role !== 'Manager') return null;

  return (
    <Shell>
      <div className="space-y-4">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {stats ? stats.map((stat, i) => (
            <div key={i} className={cn(
              "border-[0.5px] rounded-md p-3 shadow-sm flex flex-col justify-between h-[90px]",
              stat.isWarning ? "bg-red-50 dark:bg-red-950/20" : "bg-slate-50 dark:bg-slate-800"
            )}>
              <p className="text-[12px] font-medium text-slate-500">{stat.label}</p>
              <p className="text-[22px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {stat.value}
              </p>
            </div>
          )) : Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[90px] rounded-md" />)}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Team Performance Table */}
            <div className="bg-card border rounded-md shadow-sm overflow-hidden">
              <div className="p-3 border-b bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <h3 className="text-[13px] font-bold uppercase tracking-tight text-slate-500">Team Performance</h3>
                <Link href="/manager/team">
                  <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2">Manage Team</Button>
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 h-9">
                      <th className="px-3 font-semibold text-left">Agent</th>
                      <th className="font-semibold text-center">Leads</th>
                      <th className="font-semibold text-center">Qual.</th>
                      <th className="font-semibold text-center">Won</th>
                      <th className="font-semibold text-right">Revenue</th>
                      <th className="font-semibold text-center">Conv%</th>
                      <th className="font-semibold text-right">Last active</th>
                      <th className="text-right px-3 font-semibold w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {performanceData.map((p) => (
                      <tr key={p.id} className={cn("h-9 transition-colors", p.isInactive ? "bg-amber-50/50 dark:bg-amber-900/10" : "hover:bg-slate-50/50")}>
                        <td className="px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{p.name}</span>
                            <TierBadge tierId={p.tierId} />
                          </div>
                        </td>
                        <td className="text-center">{p.leadsCount}</td>
                        <td className="text-center">{p.qualified}</td>
                        <td className="text-center font-bold">{p.won}</td>
                        <td className="text-right font-medium">${p.revenue.toLocaleString()}</td>
                        <td className="text-center">
                          <Badge variant="outline" className="text-[10px] h-4 font-bold border-slate-200">{p.conversion}%</Badge>
                        </td>
                        <td className="text-right text-slate-500 text-[11px]">
                          {p.lastActive ? formatDistanceToNow(p.lastActive) + ' ago' : 'Never'}
                        </td>
                        <td className="px-3 text-right">
                          <Button variant="ghost" size="icon" className="h-6 w-6"><ArrowRight size={12} /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-card border rounded-md p-4 h-[240px]">
                <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Top Closers (Won)</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={11} width={60} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="won" fill="#0891b2" radius={[0, 2, 2, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card border rounded-md p-4 h-[240px] flex flex-col">
                <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Conversion Funnel</h3>
                <div className="flex-1 flex flex-col justify-between py-2">
                  {['New', 'Qualified', 'Proposal', 'Won'].map((stage, i) => {
                    const count = teamLeads.filter(l => l.status === stage.toLowerCase()).length;
                    const width = 100 - (i * 15);
                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <span className="text-[11px] w-16 text-slate-500">{stage}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden relative">
                           <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full bg-cyan-600/20" style={{ width: `${width}%` }}></div>
                           <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Idle Leads Mini-Table */}
            <div className="bg-card border rounded-md shadow-sm overflow-hidden">
               <div className="p-3 border-b bg-red-50/50 dark:bg-red-900/10">
                 <h3 className="text-[12px] font-bold text-red-700 uppercase tracking-wider">Idle Team Leads</h3>
               </div>
               <div className="divide-y">
                 {teamLeads.filter(l => (Date.now() - new Date(l.lastActivityAt || l.createdAt).getTime()) > (72 * 60 * 60 * 1000)).slice(0, 5).map(l => (
                   <div key={l.id} className="p-3 hover:bg-slate-50/50 transition-colors group">
                     <div className="flex justify-between items-start mb-1">
                        <Link href={`/leads/${l.id}`} className="text-[13px] font-bold hover:underline truncate">{l.clientName}</Link>
                        <Badge variant="outline" className="text-[9px] h-3.5 bg-red-50 text-red-600 border-red-100">
                          {Math.floor((Date.now() - new Date(l.lastActivityAt || l.createdAt).getTime()) / (1000 * 60 * 60 * 24))}d Idle
                        </Badge>
                     </div>
                     <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Assigned: <b className="text-slate-700">{agents?.find(a => a.id === l.agentId)?.name || 'Unknown'}</b></span>
                        <Button variant="ghost" size="sm" className="h-5 text-[10px] p-0 text-cyan-600 hover:text-cyan-700 opacity-0 group-hover:opacity-100 transition-opacity">Reassign</Button>
                     </div>
                   </div>
                 ))}
                 {teamLeads.length === 0 && <p className="p-10 text-center text-slate-400 text-[12px] italic">No idle leads found.</p>}
               </div>
            </div>

            {/* Upgrade Candidates Strip */}
            <div className="bg-card border rounded-md p-3 shadow-sm">
               <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Upgrade Queue</h3>
               <div className="space-y-3">
                 {performanceData.filter(p => p.won > 0).slice(0, 3).map(p => {
                    const progress = Math.min(Math.round((p.won / 10) * 100), 100); // Dummy criteria
                    return (
                      <div key={p.id} className="space-y-1.5 p-2 border rounded-md bg-slate-50/50">
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] font-bold truncate">{p.name}</span>
                          <span className="text-[10px] font-bold text-cyan-600">{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                           <div className="h-full bg-cyan-600" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                           <span>{p.tierId.toUpperCase()} → GOLD</span>
                           <span>{10 - p.won} more wins</span>
                        </div>
                      </div>
                    );
                 })}
               </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
