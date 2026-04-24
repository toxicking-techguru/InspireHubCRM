"use client"

import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Shell } from '@/components/layout/Shell';
import { AgentStats } from '@/components/dashboard/AgentStats';
import { EarningsChart } from '@/components/dashboard/EarningsChart';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!user) return null;

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        {/* Role Header */}
        <div>
          <h1 className="text-xl font-bold">Good morning, {user.name}</h1>
          <p className="text-sm text-muted-foreground">Here's what's happening with your leads today.</p>
        </div>

        <AgentStats />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border rounded-lg shadow-sm">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-sm font-semibold">Active Pipeline</h3>
                <Button variant="link" size="sm" className="text-xs h-7">View All Leads <ArrowRight size={14} className="ml-1"/></Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Client Name</th>
                      <th>Product</th>
                      <th>Status</th>
                      <th>Last Activity</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'TechFlow Inc.', prod: 'Nexus ERP', status: 'qualified', date: '2h ago' },
                      { name: 'Green Energy Ltd', prod: 'Cloud Host', status: 'proposal', date: '1d ago' },
                      { name: 'StartupX', prod: 'DataSecure', status: 'new', date: '4h ago' },
                      { name: 'Logistics Pro', prod: 'Al Analytics', status: 'negotiation', date: '3d ago' },
                    ].map((lead, i) => (
                      <tr key={i}>
                        <td className="font-medium">{lead.name}</td>
                        <td className="text-slate-500">{lead.prod}</td>
                        <td><StatusBadge status={lead.status as any} /></td>
                        <td className="text-slate-500 text-xs">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            {lead.date}
                          </div>
                        </td>
                        <td>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">Details</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <EarningsChart />
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            {/* Tier Progress */}
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
                <p className="text-[10px] text-muted-foreground italic mt-2">
                  Complete these targets by end of March to upgrade.
                </p>
              </div>
            </div>

            {/* Activities Due */}
            <div className="bg-card border rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h3 className="text-sm font-semibold">Due Today</h3>
              </div>
              <div className="p-3 space-y-3">
                {[
                  { lead: 'TechFlow Inc.', task: 'Follow-up Call', time: '14:00' },
                  { lead: 'StartupX', task: 'Send Proposal', time: '16:30' },
                ].map((task, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-md border border-transparent hover:border-slate-200 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded bg-white dark:bg-slate-800 border flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary">{task.time}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{task.lead}</p>
                      <p className="text-[10px] text-muted-foreground">{task.task}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
