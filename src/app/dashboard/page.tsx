"use client"

import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Shell } from '@/components/layout/Shell';
import { AgentStats } from '@/components/dashboard/AgentStats';
import { EarningsChart } from '@/components/dashboard/EarningsChart';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock, Users, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Lead, Agent } from '@/types/crm';
import { formatDistanceToNow } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const activeLeadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    let q = collection(firestore, 'leads');
    if (user.role === 'Agent') {
      return query(q, where('agentId', '==', user.id), orderBy('lastActivityAt', 'desc'), limit(5));
    }
    return query(q, orderBy('lastActivityAt', 'desc'), limit(5));
  }, [firestore, user?.id, user?.role]);

  const { data: recentLeads } = useCollection<Lead>(activeLeadsQuery);

  const allLeadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    let q = collection(firestore, 'leads');
    if (user.role === 'Agent') return query(q, where('agentId', '==', user.id));
    return q;
  }, [firestore, user?.id, user?.role]);

  const { data: allLeads } = useCollection<Lead>(allLeadsQuery);

  const funnelData = React.useMemo(() => {
    if (!allLeads) return [];
    const counts = {
      new: allLeads.filter(l => l.status === 'new').length,
      qualified: allLeads.filter(l => l.status === 'qualified').length,
      proposal: allLeads.filter(l => l.status === 'proposal').length,
      won: allLeads.filter(l => l.status === 'won').length,
    };
    return [
      { name: 'New', value: counts.new },
      { name: 'Qualified', value: counts.qualified },
      { name: 'Proposal', value: counts.proposal },
      { name: 'Won', value: counts.won },
    ].filter(d => d.value > 0);
  }, [allLeads]);

  if (!user) return null;

  const isManagement = user.role === 'Manager' || user.role === 'Admin';

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold">Welcome back, {user.name}</h1>
          <p className="text-sm text-muted-foreground">
            {isManagement ? "Here's a high-level overview of your team's performance." : "Here's what's happening with your leads today."}
          </p>
        </div>

        <AgentStats />

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border rounded-lg shadow-sm">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-sm font-semibold">{isManagement ? "Global Pipeline" : "Recent Leads"}</h3>
                <Button variant="link" size="sm" onClick={() => router.push('/leads')} className="text-xs h-7">
                  View All <ArrowRight size={14} className="ml-1"/>
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-4">Client Name</th>
                      <th>Status</th>
                      <th>Last Activity</th>
                      <th className="text-right px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLeads?.map((lead) => (
                      <tr key={lead.id}>
                        <td className="px-4 py-2 font-medium">{lead.clientName}</td>
                        <td><StatusBadge status={lead.status} /></td>
                        <td className="text-slate-500 text-xs">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            {lead.lastActivityAt ? formatDistanceToNow(new Date(lead.lastActivityAt)) + ' ago' : 'Never'}
                          </div>
                        </td>
                        <td className="px-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/leads/${lead.id}`)} className="h-7 text-xs">Details</Button>
                        </td>
                      </tr>
                    ))}
                    {(!recentLeads || recentLeads.length === 0) && (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-muted-foreground text-xs italic">
                          No active leads found in the pipeline.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {isManagement ? <TeamPerformanceSection /> : <EarningsChart />}
          </div>

          <div className="space-y-6">
            {!isManagement && (
              <div className="bg-card border rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Performance</h3>
                  <span className="text-[10px] font-bold text-primary uppercase">Pipeline Health</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span>Qualified Deals</span>
                      <span className="font-medium">{allLeads?.filter(l => l.status === 'qualified').length || 0}</span>
                    </div>
                    <Progress value={Math.min(100, (allLeads?.filter(l => l.status === 'qualified').length || 0) * 10)} className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span>Conversion (Won)</span>
                      <span className="font-medium">{allLeads && allLeads.length > 0 ? Math.round((allLeads.filter(l => l.status === 'won').length / allLeads.length) * 100) : 0}%</span>
                    </div>
                    <Progress value={allLeads && allLeads.length > 0 ? (allLeads.filter(l => l.status === 'won').length / allLeads.length) * 100 : 0} className="h-1.5" />
                  </div>
                </div>
              </div>
            )}

            {isManagement && (
              <div className="bg-card border rounded-lg p-4 shadow-sm">
                <h3 className="text-sm font-semibold mb-3">Conversion Funnel</h3>
                <div className="h-[200px]">
                  {funnelData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={funnelData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {['#94a3b8', '#6366f1', '#a855f7', '#10b981'].map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">No data yet</div>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {funnelData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#94a3b8', '#6366f1', '#a855f7', '#10b981'][i] }}></span> 
                        {d.name}
                      </span>
                      <span className="font-bold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-card border rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h3 className="text-sm font-semibold">Priority Leads</h3>
              </div>
              <div className="p-3 space-y-3">
                {recentLeads?.filter(l => l.status === 'new' || l.status === 'contacted').slice(0, 3).map(lead => (
                  <div key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-md border border-transparent hover:border-slate-200 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded bg-white dark:bg-slate-800 border flex items-center justify-center shrink-0">
                       <Target size={16} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{lead.clientName}</p>
                      <p className="text-[10px] text-muted-foreground">Action needed</p>
                    </div>
                  </div>
                ))}
                {(!recentLeads || recentLeads.length === 0) && (
                  <p className="text-[10px] text-muted-foreground italic text-center py-2">No priority items.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function TeamPerformanceSection() {
  const firestore = useFirestore();
  const agentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'agents') : null, [firestore]);
  const leadsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'leads') : null, [firestore]);

  const { data: agents } = useCollection<Agent>(agentsQuery);
  const { data: leads } = useCollection<Lead>(leadsQuery);

  const teamData = React.useMemo(() => {
    if (!agents || !leads) return [];
    return agents.filter(a => a.role === 'Agent').map(agent => ({
      name: agent.name.split(' ')[0],
      leads: leads.filter(l => l.agentId === agent.id).length,
      won: leads.filter(l => l.agentId === agent.id && l.status === 'won').length,
    })).sort((a, b) => b.leads - a.leads).slice(0, 5);
  }, [agents, leads]);

  return (
    <div className="bg-card border rounded-lg p-4 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Team Performance (Leads vs. Wins)</h3>
        <span className="text-xs text-muted-foreground">Total records</span>
      </div>
      <div className="flex-1 min-h-[250px]">
        {teamData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teamData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" fontSize={10} width={60} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="leads" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={20} />
              <Bar dataKey="won" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">No team data yet</div>
        )}
      </div>
    </div>
  );
}
