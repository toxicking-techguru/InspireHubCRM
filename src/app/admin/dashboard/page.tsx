"use client"

import React, { useMemo, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Agent, Lead, Withdrawal, Commission } from '@/types/crm';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, startOfMonth, subMonths, parseISO, endOfMonth } from 'date-fns';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
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
  Clock,
  ArrowUpRight,
  Coins,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminDashboard() {
  const { user, config } = useAuthStore();
  const firestore = useFirestore();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [revenueTimeframe, setRevenueTimeframe] = useState<'weekly' | 'monthly'>('monthly');

  const currencySymbol = config?.currency === 'KES' ? 'KSh ' : config?.currency === 'GBP' ? '£' : '$';

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
    
    const activeAgentsCount = agents.filter(a => a.role === 'Agent').length;
    const activeLeads = allLeads.filter(l => !['won', 'lost', 'dormant'].includes(l.status)).length;
    
    // Performance for selected month
    const mStart = startOfMonth(parseISO(selectedMonth + '-01'));
    const mEnd = endOfMonth(mStart);
    
    const wonThisMonth = allLeads.filter(l => l.status === 'won' && l.wonAt && parseISO(l.wonAt) >= mStart && parseISO(l.wonAt) <= mEnd).length;
    
    // Financials
    const totalGrossRevenue = allLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
    const totalApprovedComms = commissions?.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0) || 0;
    const pendingCommsAmount = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0) || 0;
    const netRevenue = totalGrossRevenue - totalApprovedComms;

    const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending').length || 0;
    
    const idleLeadsCount = allLeads.filter(l => {
      if (['won', 'lost', 'dormant'].includes(l.status)) return false;
      const lastTouch = new Date(l.lastActivityAt || l.createdAt).getTime();
      return (Date.now() - lastTouch) > (72 * 60 * 60 * 1000);
    }).length;

    return {
      cards: [
        { label: 'Total agents', value: activeAgentsCount, sub: 'Excluding Admins', icon: Users },
        { label: 'Active leads', value: activeLeads, sub: `${idleLeadsCount} idle (>72h)`, icon: Target },
        { label: 'Won in Period', value: wonThisMonth, sub: 'Closed deals', icon: TrendingUp },
        { label: 'Gross Revenue', value: `${currencySymbol}${(totalGrossRevenue / 1000).toFixed(1)}k`, sub: 'Lifetime sales', icon: TrendingUp },
        { label: 'Paid Comms', value: `${currencySymbol}${(totalApprovedComms / 1000).toFixed(1)}k`, sub: 'Approved earnings', icon: Coins },
        { label: 'Net Revenue', value: `${currencySymbol}${(netRevenue / 1000).toFixed(1)}k`, sub: 'After commissions', icon: ShieldCheck },
        { label: 'Pending Comms', value: `${currencySymbol}${(pendingCommsAmount / 1000).toFixed(1)}k`, sub: 'In validation', icon: Banknote },
        { label: 'Pending Payouts', value: pendingWithdrawals, sub: 'Requests queue', isWarning: pendingWithdrawals > 0, icon: Banknote },
      ],
      idleLeadsCount,
      pendingWithdrawals
    };
  }, [allLeads, agents, withdrawals, commissions, leadsLoading, agentsLoading, currencySymbol, selectedMonth]);

  const performanceData = useMemo(() => {
    if (!agents || !allLeads) return [];
    return agents
      .filter(agent => agent.role !== 'Admin')
      .map(agent => {
        const agentLeads = allLeads.filter(l => l.agentId === agent.id);
        const won = agentLeads.filter(l => l.status === 'won').length;
        const revenue = agentLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
        const conversion = agentLeads.length > 0 ? Math.round((won / agentLeads.length) * 100) : 0;
        return { ...agent, won, revenue, conversion };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
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

  if (!user || user.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
           <div>
              <h1 className="text-xl font-bold text-slate-900">Enterprise Dashboard</h1>
              <p className="text-sm text-slate-500">System-wide performance monitoring and financial oversight.</p>
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats ? stats.cards.map((stat, i) => (
            <div key={i} className={cn(
              "border-[0.5px] rounded-md p-3 shadow-sm flex flex-col justify-between h-[100px]",
              stat.isWarning ? "bg-red-50 border-red-200" : "bg-white"
            )}>
              <div className="flex justify-between items-start">
                 <p className="text-[11px] font-bold uppercase tracking-tight text-slate-500">{stat.label}</p>
                 <stat.icon size={14} className="text-slate-300" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-slate-900 leading-tight">
                  {stat.value}
                </p>
                <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">{stat.sub}</p>
              </div>
            </div>
          )) : Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[100px] rounded-md" />)}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border rounded-md p-4 shadow-sm">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">Revenue Trajectory</h3>
                  <div className="flex bg-slate-100 p-0.5 rounded-md">
                    <button 
                      className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", revenueTimeframe === 'weekly' ? "bg-white shadow-sm text-primary" : "text-slate-500")}
                      onClick={() => setRevenueTimeframe('weekly')}
                    >WEEKLY</button>
                    <button 
                      className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", revenueTimeframe === 'monthly' ? "bg-white shadow-sm text-primary" : "text-slate-500")}
                      onClick={() => setRevenueTimeframe('monthly')}
                    >MONTHLY</button>
                  </div>
               </div>
               <div className="h-[200px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueChartData}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1B48A3" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#1B48A3" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#94a3b8' }} />
                      <YAxis hide />
                      <Tooltip cursor={{ stroke: '#1B48A3' }} contentStyle={{ fontSize: '11px', borderRadius: '6px' }} />
                      <Area type="monotone" dataKey="revenue" stroke="#1B48A3" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                    </AreaChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-white border rounded-md shadow-sm overflow-hidden">
               <div className="p-3 border-b bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-[12px] font-bold uppercase tracking-tight text-slate-500">Top Team Contributors</h3>
                  <Link href="/admin/agents">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase font-bold text-primary">View Directory</Button>
                  </Link>
               </div>
               <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-slate-50/50 h-8">
                       <th className="px-3 text-left w-10">Rank</th>
                       <th className="text-left">Agent Name</th>
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
                        <td className="text-right font-medium text-primary">{currencySymbol}{p.revenue.toLocaleString()}</td>
                        <td className="text-center">
                          <Badge variant="outline" className="text-[9px] h-4 font-bold border-primary/20 text-primary">{p.conversion}%</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border rounded-md p-4 shadow-sm h-[140px]">
               <h3 className="text-[12px] font-bold uppercase text-slate-500 mb-3">Staff Distribution</h3>
               <div className="flex h-6 w-full rounded-full overflow-hidden border border-slate-100">
                  {[
                    { name: 'Silver', count: agents?.filter(a => a.tierId === 't1').length || 0, fill: '#94a3b8' },
                    { name: 'Gold', count: agents?.filter(a => a.tierId === 't2').length || 0, fill: '#fbbf24' },
                    { name: 'Diamond', count: agents?.filter(a => a.tierId === 't3').length || 0, fill: '#1B48A3' },
                    { name: 'Platinum', count: agents?.filter(a => a.tierId === 't4').length || 0, fill: '#071828' },
                  ].map((t, i) => (
                    <div 
                      key={i} 
                      className="h-full transition-all" 
                      style={{ width: `${(t.count / (agents?.length || 1)) * 100}%`, backgroundColor: t.fill }}
                      title={`${t.name}: ${t.count}`}
                    />
                  ))}
               </div>
               <div className="flex justify-between mt-3 px-1">
                  {['S', 'G', 'D', 'P'].map((label, i) => (
                    <span key={i} className="text-[9px] font-bold text-slate-400 uppercase">{label}</span>
                  ))}
               </div>
            </div>

            <div className="bg-white border rounded-md shadow-sm overflow-hidden">
               <div className="p-3 border-b bg-red-50/30">
                  <h3 className="text-[12px] font-bold text-red-700 uppercase tracking-tight">System Notifications</h3>
               </div>
               <div className="divide-y">
                  {[
                    { text: `${stats?.idleLeadsCount || 0} leads exceeded 72h idle limit`, icon: Clock, href: '/admin/leads' },
                    { text: `${stats?.pendingWithdrawals || 0} pending payout requests`, icon: Banknote, href: '/admin/withdrawals' },
                    { text: "System sync verified successfully", icon: ShieldCheck, href: '/admin/audit' },
                  ].map((alert, i) => (
                    <Link key={i} href={alert.href}>
                      <div className="p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors group">
                         <alert.icon size={14} className="mt-0.5 text-slate-400 group-hover:text-primary" />
                         <div className="flex-1">
                            <p className="text-[12px] font-medium text-slate-700 leading-tight group-hover:text-primary">{alert.text}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase">View Logs →</p>
                         </div>
                      </div>
                    </Link>
                  ))}
               </div>
            </div>

            <div className="bg-white border rounded-md shadow-sm h-[240px] flex flex-col overflow-hidden">
               <div className="p-3 border-b bg-slate-50/50">
                  <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-tight text-center">Live Transaction Log</h3>
               </div>
               <div className="flex-1 overflow-y-auto divide-y">
                  {commissions?.filter(c => c.status === 'approved').slice(0, 10).map((c, i) => (
                    <div key={i} className="p-2.5 flex items-center justify-between gap-3 text-[11px]">
                       <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-primary bg-primary/5 px-1 rounded">PAID</span>
                          <span className="truncate text-slate-600 font-medium">{c.clientName || 'Private Deal'}</span>
                       </div>
                       <span className="text-slate-400 shrink-0 font-bold uppercase">{formatDistanceToNow(parseISO(c.createdAt))} ago</span>
                    </div>
                  ))}
                  {(!commissions || commissions.length === 0) && (
                    <div className="p-10 text-center text-slate-300 italic text-[11px]">No transaction history.</div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
