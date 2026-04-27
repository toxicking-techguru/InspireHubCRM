"use client"

import React, { useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Lead, Agent } from '@/types/crm';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, startOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TierBadge } from '@/components/ui/tier-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowRight, Users, Target, TrendingUp, AlertTriangle } from 'lucide-react';

export default function ManagerDashboard() {
  const { user } = useAuthStore();
  const firestore = useFirestore();

  // Fetch all agents and leads to filter in memory (Avoids index management issues)
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

  const stats = useMemo(() => {
    if (leadsLoading || agentsLoading) return null;
    
    const idleCount = teamLeads.filter(l => {
      if (['won', 'lost', 'dormant'].includes(l.status)) return false;
      const lastTouch = new Date(l.lastActivityAt || l.createdAt).getTime();
      return (Date.now() - lastTouch) > (72 * 60 * 60 * 1000);
    }).length;

    const monthStart = startOfMonth(new Date());
    const wonThisMonth = teamLeads.filter(l => l.status === 'won' && l.wonAt && new Date(l.wonAt) >= monthStart).length;
    const totalRevenue = teamLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
    const activeLeads = teamLeads.filter(l => !['won', 'lost', 'dormant'].includes(l.status)).length;
    
    return [
      { label: 'Team Agents', value: teamAgents.length, icon: Users },
      { label: 'Active Leads', value: activeLeads, icon: Target },
      { label: 'Won (Month)', value: wonThisMonth, icon: TrendingUp },
      { label: 'Total Revenue', value: `$${(totalRevenue / 1000).toFixed(1)}k`, icon: TrendingUp },
      { label: 'Avg Conv %', value: teamLeads.length > 0 ? Math.round((teamLeads.filter(l => l.status === 'won').length / teamLeads.length) * 100) + '%' : '0%', icon: TrendingUp },
      { label: 'Idle Leads', value: idleCount, isWarning: idleCount > 0, icon: AlertTriangle },
    ];
  }, [teamLeads, teamAgents, leadsLoading, agentsLoading]);

  const performanceData = useMemo(() => {
    if (teamAgents.length === 0 || teamLeads.length === 0) return [];
    return teamAgents.map(agent => {
      const agentLeads = teamLeads.filter(l => l.agentId === agent.id);
      const won = agentLeads.filter(l => l.status === 'won').length;
      const qualified = agentLeads.filter(l => l.status === 'qualified').length;
      const revenue = agentLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
      const conversion = agentLeads.length > 0 ? Math.round((won / agentLeads.length) * 100) : 0;
      
      const timestamps = agentLeads.map(l => new Date(l.lastActivityAt || l.createdAt).getTime());
      const lastActive = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;
      const isInactive = lastActive ? (Date.now() - lastActive.getTime()) > (7 * 24 * 60 * 60 * 1000) : true;

      return { ...agent, leadsCount: agentLeads.length, qualified, won, revenue, conversion, lastActive, isInactive };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [teamAgents, teamLeads]);

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
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {stats ? stats.map((stat, i) => (
            <div key={i} className={cn(
              "border-[0.5px] rounded-md p-3 shadow-sm flex flex-col justify-between h-[90px]",
              stat.isWarning ? "bg-red-50 dark:bg-red-950/20 border-red-200" : "bg-slate-50 dark:bg-slate-800"
            )}>
              <div className="flex justify-between items-start">
                 <p className="text-[11px] font-bold uppercase tracking-tight text-slate-500">{stat.label}</p>
                 <stat.icon size={12} className={stat.isWarning ? "text-red-400" : "text-slate-300"} />
              </div>
              <p className="text-[22px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {stat.value}
              </p>
            </div>
          )) : Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[90px] rounded-md" />)}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border rounded-md shadow-sm overflow-hidden">
              <div className="p-3 border-b bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-[13px] font-bold uppercase tracking-tight text-slate-500">Team Performance Rankings</h3>
                <Link href="/manager/team">
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase font-bold text-cyan-600">View All Agents</Button>
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 h-9">
                      <th className="px-3 font-semibold text-left">Agent</th>
                      <th className="font-semibold text-center">Leads</th>
                      <th className="font-semibold text-center">Won</th>
                      <th className="font-semibold text-right">Revenue</th>
                      <th className="font-semibold text-center">Conv%</th>
                      <th className="font-semibold text-right">Last active</th>
                      <th className="text-right px-3 font-semibold w-[60px]"></th>
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
                        <td className="text-right font-medium">${p.revenue.toLocaleString()}</td>
                        <td className="text-center">
                          <Badge variant="outline" className="text-[10px] h-4 font-bold border-cyan-100 text-cyan-700">{p.conversion}%</Badge>
                        </td>
                        <td className="text-right text-slate-400 text-[11px]">
                          {p.lastActive ? formatDistanceToNow(p.lastActive) + ' ago' : 'Never'}
                        </td>
                        <td className="px-3 text-right">
                          <Link href={`/manager/team?agentId=${p.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-cyan-600"><ArrowRight size={14} /></Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {performanceData.length === 0 && !agentsLoading && (
                      <tr className="h-20"><td colSpan={7} className="text-center text-slate-400 italic">No agents assigned to your team yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-card border rounded-md p-4 h-[240px]">
                <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Top Closers (Won Deals)</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={10} width={60} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ fontSize: '11px', borderRadius: '4px' }} />
                    <Bar dataKey="won" fill="#0891b2" radius={[0, 2, 2, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card border rounded-md p-4 h-[240px] flex flex-col">
                <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Team Conversion Funnel</h3>
                <div className="flex-1 flex flex-col justify-between py-2">
                  {['New', 'Qualified', 'Proposal', 'Won'].map((stage, i) => {
                    const count = teamLeads.filter(l => l.status === stage.toLowerCase()).length;
                    const total = teamLeads.length || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={stage} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-500">{stage}</span>
                          <span className="text-slate-700">{count}</span>
                        </div>
                        <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden relative">
                           <div className="absolute top-0 left-0 h-full bg-cyan-600/20 transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card border rounded-md shadow-sm overflow-hidden">
               <div className="p-3 border-b bg-red-50/50">
                 <h3 className="text-[12px] font-bold text-red-700 uppercase tracking-wider">Critical Idle Leads</h3>
               </div>
               <div className="divide-y max-h-[340px] overflow-y-auto">
                 {teamLeads.filter(l => {
                    if (['won', 'lost', 'dormant'].includes(l.status)) return false;
                    const idle = Date.now() - new Date(l.lastActivityAt || l.createdAt).getTime();
                    return idle > (72 * 60 * 60 * 1000);
                 }).slice(0, 8).map(l => (
                   <div key={l.id} className="p-3 hover:bg-slate-50/50 transition-colors group">
                     <div className="flex justify-between items-start mb-1">
                        <Link href={`/leads/${l.id}`} className="text-[13px] font-bold hover:underline truncate text-slate-800">{l.clientName}</Link>
                        <Badge variant="outline" className="text-[9px] h-3.5 bg-red-50 text-red-600 border-red-100 font-bold">
                          {Math.floor((Date.now() - new Date(l.lastActivityAt || l.createdAt).getTime()) / (1000 * 60 * 60 * 24))}d IDLE
                        </Badge>
                     </div>
                     <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Assigned: <b className="text-slate-600">{teamAgents.find(a => a.id === l.agentId)?.name || 'Unknown'}</b></span>
                        <Link href="/manager/idle">
                          <Button variant="ghost" size="sm" className="h-5 text-[10px] p-0 text-cyan-600 font-bold uppercase hover:bg-transparent">Action →</Button>
                        </Link>
                     </div>
                   </div>
                 ))}
                 {teamLeads.length === 0 && <p className="p-10 text-center text-slate-300 text-[12px] italic">No active pipeline.</p>}
               </div>
            </div>

            <div className="bg-card border rounded-md p-4 shadow-sm bg-gradient-to-br from-white to-slate-50/50">
               <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                 <TrendingUp size={14} className="text-cyan-600" /> High Performance Queue
               </h3>
               <div className="space-y-4">
                 {performanceData.filter(p => p.won > 0).slice(0, 3).map(p => {
                    const progress = Math.min(Math.round((p.won / 10) * 100), 100);
                    return (
                      <div key={p.id} className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] font-bold text-slate-700">{p.name}</span>
                          <span className="text-[10px] font-bold text-cyan-700">{progress}% Target</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                           <div className="h-full bg-cyan-600" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                           <span>{p.won} / 10 WINS</span>
                           <Link href="/manager/upgrade" className="text-cyan-600 hover:underline">Monitor upgrade path</Link>
                        </div>
                      </div>
                    );
                 })}
                 {performanceData.filter(p => p.won > 0).length === 0 && (
                   <p className="text-center text-slate-400 italic text-[11px] py-4">Awaiting first wins from team members.</p>
                 )}
               </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
