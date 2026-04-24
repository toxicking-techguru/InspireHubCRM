"use client"

import React, { useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Shell } from '@/components/layout/Shell';
import { AgentStats } from '@/components/dashboard/AgentStats';
import { EarningsChart } from '@/components/dashboard/EarningsChart';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock, Users, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Lead } from '@/types/crm';
import { formatDistanceToNow } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const activeLeadsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    let q = query(collection(firestore, 'leads'), orderBy('lastActivityAt', 'desc'), limit(5));
    if (user.role === 'Agent') {
      q = query(q, where('agentId', '==', user.id));
    }
    return q;
  }, [firestore, user]);

  const { data: recentLeads } = useCollection<Lead>(activeLeadsQuery as any);

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
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border rounded-lg shadow-sm">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-sm font-semibold">{isManagement ? "Team Pipeline" : "Recent Leads"}</h3>
                <Button variant="link" size="sm" onClick={() => router.push('/leads')} className="text-xs h-7">
                  View All <ArrowRight size={14} className="ml-1"/>
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Client Name</th>
                      <th>Status</th>
                      <th>Last Activity</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLeads?.map((lead) => (
                      <tr key={lead.id}>
                        <td className="font-medium">{lead.clientName}</td>
                        <td><StatusBadge status={lead.status} /></td>
                        <td className="text-slate-500 text-xs">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            {lead.lastActivityAt ? formatDistanceToNow(new Date(lead.lastActivityAt)) + ' ago' : 'Never'}
                          </div>
                        </td>
                        <td>
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

          {/* Sidebar Area */}
          <div className="space-y-6">
            {!isManagement && (
              <div className="bg-card border rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Tier Progression</h3>
                  <span className="text-[10px] font-bold text-primary uppercase">To Gold</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span>Closed Deals</span>
                      <span className="font-medium">2 / 5</span>
                    </div>
                    <Progress value={40} className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span>Revenue (MTD)</span>
                      <span className="font-medium">$12.5k / $15k</span>
                    </div>
                    <Progress value={83} className="h-1.5" />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic mt-2 text-center">
                    Complete targets by end of month to upgrade.
                  </p>
                </div>
              </div>
            )}

            {isManagement && (
              <div className="bg-card border rounded-lg p-4 shadow-sm">
                <h3 className="text-sm font-semibold mb-3">Conversion Funnel</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'New', value: 40 },
                          { name: 'Qualified', value: 25 },
                          { name: 'Proposal', value: 15 },
                          { name: 'Won', value: 10 },
                        ]}
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
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Won Rate</span>
                    <span className="font-bold">12%</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Qualified Rate</span>
                    <span className="font-bold">34%</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-card border rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h3 className="text-sm font-semibold">Priority Tasks</h3>
              </div>
              <div className="p-3 space-y-3">
                <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-md border border-transparent hover:border-slate-200 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded bg-white dark:bg-slate-800 border flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary">14:00</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">Acme Corp</p>
                    <p className="text-[10px] text-muted-foreground">Follow-up Call</p>
                  </div>
                </div>
                <div className="p-2 border border-dashed rounded text-center">
                  <p className="text-[10px] text-muted-foreground">No more tasks for today.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function TeamPerformanceSection() {
  const data = [
    { name: 'John D.', leads: 24, won: 4 },
    { name: 'Sarah S.', leads: 32, won: 7 },
    { name: 'Mike R.', leads: 18, won: 2 },
    { name: 'Elena K.', leads: 45, won: 9 },
  ];

  return (
    <div className="bg-card border rounded-lg p-4 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Team Leads vs. Wins</h3>
        <span className="text-xs text-muted-foreground">This Quarter</span>
      </div>
      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" fontSize={10} width={60} axisLine={false} tickLine={false} />
            <Tooltip />
            <Bar dataKey="leads" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={20} />
            <Bar dataKey="won" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
