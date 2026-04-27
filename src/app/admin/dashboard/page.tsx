
"use client"

import React, { useMemo, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { Agent, Lead, Withdrawal, Commission } from '@/types/crm';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, startOfMonth, subMonths, parseISO, endOfMonth } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { TierBadge } from '@/components/ui/tier-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { 
  Users, 
  Target, 
  TrendingUp, 
  Banknote, 
  AlertCircle, 
  CheckCircle2, 
  Zap, 
  Clock,
  ArrowUpRight,
  UserPlus
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const [revenueTimeframe, setRevenueTimeframe] = useState<'weekly' | 'monthly'>('monthly');

  // Global Data
  const agentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'agents') : null, [firestore]);
  const { data: agents, loading: agentsLoading } = useCollection<Agent>(agentsQuery as any);

  const leadsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'leads') : null, [firestore]);
  const { data: allLeads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);

  const withdrawalsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'withdrawals') : null, [firestore]);
  const { data: withdrawals } = useCollection<Withdrawal>(withdrawalsQuery as any);

  const commissionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'commissions') : null, [firestore]);
  const { data: commissions } = useCollection<Commission>(commissionsQuery as any);

  const stats = useMemo(() => {
    if (leadsLoading || agentsLoading || !allLeads || !agents) return null;
    
    const activeLeads = allLeads.filter(l => !['won', 'lost', 'dormant'].includes(l.status)).length;
    const monthStart = startOfMonth(new Date());
    const wonThisMonth = allLeads.filter(l => l.status === 'won' && l.wonAt && parseISO(l.wonAt) >= monthStart).length;
    const totalRevenue = allLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
    const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending').length || 0;
    
    const idleLeadsCount = allLeads.filter(l => {
      if (['won', 'lost', 'dormant'].includes(l.status)) return false;
      const lastTouch = new Date(l.lastActivityAt || l.createdAt).getTime();
      return (Date.now() - lastTouch) > (72 * 60 * 60 * 1000);
    }).length;

    const newAgentsThisMonth = agents.filter(a => parseISO(a.joinDate) >= monthStart).length;
    const pendingCommsAmount = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0) || 0;

    return {
      cards: [
        { label: 'Total agents', value: agents.length, icon: Users },
        { label: 'Active leads', value: activeLeads, icon: Target },
        { label: 'Won this month', value: wonThisMonth, icon: TrendingUp },
        { label: 'Total revenue', value: `$${(totalRevenue / 1000).toFixed(1)}k`, icon: TrendingUp },
        { label: 'Pending comms', value: `$${(pendingCommsAmount / 1000).toFixed(1)}k`, icon: Banknote },
        { label: 'Pending withdrawals', value: pendingWithdrawals, isWarning: pendingWithdrawals > 0, icon: Banknote },
        { label: 'Idle leads', value: idleLeadsCount, icon: AlertCircle },
        { label: 'New agents', value: newAgentsThisMonth, icon: UserPlus },
      ],
      idleLeadsCount,
      pendingWithdrawals
    };
  }, [allLeads, agents, withdrawals, commissions, leadsLoading, agentsLoading]);

  const performanceData = useMemo(() => {
    if (!agents || !allLeads) return [];
    return agents.map(agent => {
      const agentLeads = allLeads.filter(l => l.agentId === agent.id);
      const won = agentLeads.filter(l => l.status === 'won').length;
      const revenue = agentLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
      const conversion = agentLeads.length > 0 ? Math.round((won / agentLeads.length) * 100) : 0;
      return { ...agent, won, revenue, conversion };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [agents, allLeads]);

  const revenueChartData = useMemo(() => {
    if (!allLeads) return [];
    const months = Array.from({ length: 6 }).map((_, i) => {
      const date = subMonths(new Date(), 5 - i);
      const mStart = startOfMonth(date);
      const mEnd = endOfMonth(date);
      const rev = allLeads
        .filter(l => l.status === 'won' && l.wonAt && parseISO(l.wonAt) >= mStart && parseISO(l.wonAt) <= mEnd)
        .reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
      return { name: format(date, 'MMM'), revenue: rev };
    });
    return months;
  }, [allLeads]);

  const tierDistribution = useMemo(() => {
    if (!agents) return [];
    const counts = { t1: 0, t2: 0, t3: 0, t4: 0 };
    agents.forEach(a => { 
      const tid = a.tierId as keyof typeof counts;
      counts[tid] = (counts[tid] || 0) + 1 
    });
    return [
      { name: 'Silver', count: counts.t1, fill: '#94a3b8' },
      { name: 'Gold', count: counts.t2, fill: '#fbbf24' },
      { name: 'Diamond', count: counts.t3, fill: '#0891b2' },
      { name: 'Platinum', count: counts.t4, fill: '#0e7490' },
    ];
  }, [agents]);

  if (!user || user.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats ? stats.cards.map((stat, i) => (
            <div key={i} className={cn(
              "border-[0.5px] rounded-md p-3 shadow-sm flex flex-col justify-between h-[90px]",
              stat.isWarning ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200" : "bg-slate-50 dark:bg-slate-800"
            )}>
              <div className="flex justify-between items-start">
                 <p className="text-[11px] font-bold uppercase tracking-tight text-slate-500">{stat.label}</p>
                 <stat.icon size={14} className="text-slate-300" />
              </div>
              <p className="text-[22px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {stat.value}
              </p>
            </div>
          )) : Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[90px] rounded-md" />)}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border rounded-md p-4 shadow-sm border-cyan-100">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">Global Revenue Growth</h3>
                  <div className="flex bg-slate-100 p-0.5 rounded-md">
                    <button 
                      className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", revenueTimeframe === 'weekly' ? "bg-white shadow-sm text-cyan-700" : "text-slate-500")}
                      onClick={() => setRevenueTimeframe('weekly')}
                    >WEEKLY</button>
                    <button 
                      className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", revenueTimeframe === 'monthly' ? "bg-white shadow-sm text-cyan-700" : "text-slate-500")}
                      onClick={() => setRevenueTimeframe('monthly')}
                    >MONTHLY</button>
                  </div>
               </div>
               <div className="h-[200px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueChartData}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0891b2" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#94a3b8' }} />
                      <YAxis hide />
                      <Tooltip cursor={{ stroke: '#0891b2' }} contentStyle={{ fontSize: '11px', borderRadius: '6px' }} />
                      <Area type="monotone" dataKey="revenue" stroke="#0891b2" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                    </AreaChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-card border rounded-md shadow-sm overflow-hidden border-cyan-100">
               <div className="p-3 border-b bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-[12px] font-bold uppercase tracking-tight text-slate-500">Top Performing Agents</h3>
                  <Link href="/admin/agents">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase font-bold text-cyan-600">View All</Button>
                  </Link>
               </div>
               <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-slate-50/50 h-8">
                       <th className="px-3 text-left w-10">Rank</th>
                       <th className="text-left">Agent</th>
                       <th className="text-center">Won</th>
                       <th className="text-right">Revenue</th>
                       <th className="text-center">Conv %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {performanceData.map((p, i) => (
                      <tr key={p.id} className="h-10 hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 font-bold text-slate-400">#{(i + 1)}</td>
                        <td className="font-bold">
                          <div className="flex items-center gap-2">
                             {p.name} <TierBadge tierId={p.tierId} />
                          </div>
                        </td>
                        <td className="text-center">{p.won}</td>
                        <td className="text-right font-medium text-cyan-700">${p.revenue.toLocaleString()}</td>
                        <td className="text-center">
                          <Badge variant="outline" className="text-[9px] h-4 font-bold border-cyan-100 text-cyan-600">{p.conversion}%</Badge>
                        </td>
                      </tr>
                    ))}
                    {performanceData.length === 0 && !agentsLoading && (
                      <tr className="h-20"><td colSpan={5} className="text-center text-slate-300 italic">No agent performance data.</td></tr>
                    )}
                  </tbody>
               </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card border rounded-md p-4 shadow-sm h-[140px] border-cyan-100">
               <h3 className="text-[12px] font-bold uppercase text-slate-500 mb-3">Agent Tier Distribution</h3>
               <div className="flex h-6 w-full rounded-full overflow-hidden border border-slate-100">
                  {tierDistribution.map((t, i) => (
                    <div 
                      key={i} 
                      className="h-full transition-all" 
                      style={{ width: `${(t.count / (agents?.length || 1)) * 100}%`, backgroundColor: t.fill }}
                      title={`${t.name}: ${t.count}`}
                    />
                  ))}
               </div>
               <div className="flex justify-between mt-3 px-1">
                  {tierDistribution.map((t, i) => (
                    <div key={i} className="flex flex-col items-center">
                       <div className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: t.fill }} />
                       <span className="text-[9px] font-bold text-slate-400 uppercase">{t.count}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-card border rounded-md shadow-sm overflow-hidden border-cyan-100">
               <div className="p-3 border-b bg-red-50/30">
                  <h3 className="text-[12px] font-bold text-red-700 uppercase tracking-tight">System Alerts</h3>
               </div>
               <div className="divide-y">
                  {[
                    { text: `${stats?.idleLeadsCount || 0} leads have been idle > 72h`, icon: Clock, href: '/admin/leads' },
                    { text: `${stats?.pendingWithdrawals || 0} withdrawals pending approval`, icon: Banknote, href: '/admin/withdrawals' },
                    { text: "Lead volume assessment complete", icon: TrendingUp, href: '/admin/reports' },
                  ].map((alert, i) => (
                    <Link key={i} href={alert.href}>
                      <div className="p-3 flex items-start gap-3 hover:bg-slate-50/50 cursor-pointer group">
                         <alert.icon size={14} className="mt-0.5 text-red-400" />
                         <div className="flex-1">
                            <p className="text-[12px] font-medium text-slate-700 leading-tight group-hover:text-cyan-700">{alert.text}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase">Quick Action →</p>
                         </div>
                      </div>
                    </Link>
                  ))}
               </div>
            </div>

            <div className="bg-card border rounded-md shadow-sm h-[240px] flex flex-col overflow-hidden border-cyan-100">
               <div className="p-3 border-b bg-slate-50/50">
                  <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-tight">Recent Deals Won</h3>
               </div>
               <div className="flex-1 overflow-y-auto divide-y">
                  {commissions?.filter(c => c.status === 'approved').slice(0, 10).map((c, i) => (
                    <div key={i} className="p-2.5 flex items-center justify-between gap-3 text-[11px]">
                       <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-cyan-700 bg-cyan-50 px-1 rounded">WON</span>
                          <span className="truncate text-slate-600 font-medium">{c.clientName || 'Lead'}</span>
                       </div>
                       <span className="text-slate-400 shrink-0 font-bold uppercase">{formatDistanceToNow(parseISO(c.createdAt))} ago</span>
                    </div>
                  ))}
                  {(!commissions || commissions.length === 0) && (
                    <div className="p-10 text-center text-slate-300 italic text-[11px]">No recent deals recorded.</div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
