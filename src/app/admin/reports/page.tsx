
"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, collectionGroup } from 'firebase/firestore';
import { Lead, Agent, Commission, LeadActivity } from '@/types/crm';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Download, Loader2, BarChart3, TrendingUp, Users, Target, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, subMonths, startOfMonth, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#0891b2', '#0e7490', '#155e75', '#164e63', '#22d3ee', '#67e8f9'];

export default function AdminReportsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState('6m');

  const agentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'agents') : null, [firestore]);
  const { data: agents } = useCollection<Agent>(agentsQuery as any);

  const leadsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'leads') : null, [firestore]);
  const { data: leads } = useCollection<Lead>(leadsQuery as any);

  const activitiesQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'activities') : null, [firestore]);
  const { data: activities } = useCollection<LeadActivity>(activitiesQuery as any);

  const velocityData = useMemo(() => {
    if (!leads || !activities) return [];
    return leads.filter(l => l.status === 'won').map(l => {
      const leadActivities = activities.filter(a => a.leadId === l.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      if (leadActivities.length === 0) return null;
      const start = parseISO(leadActivities[0].createdAt);
      const end = parseISO(l.wonAt || leadActivities[leadActivities.length-1].createdAt);
      const days = Math.max(differenceInDays(end, start), 1);
      return { name: l.clientName, days };
    }).filter(Boolean).slice(0, 10);
  }, [leads, activities]);

  const revenueData = useMemo(() => {
    const range = dateRange === '1y' ? 12 : dateRange === '6m' ? 6 : 3;
    return Array.from({ length: range }).map((_, i) => {
      const date = subMonths(new Date(), (range - 1) - i);
      const mStart = startOfMonth(date);
      const nextMonth = startOfMonth(subMonths(date, -1));
      const rev = leads?.filter(l => l.status === 'won' && l.wonAt && parseISO(l.wonAt) >= mStart && parseISO(l.wonAt) < nextMonth)
        .reduce((sum, l) => sum + (l.estimatedBudget || 0), 0) || 0;
      return { month: format(date, 'MMM'), revenue: rev };
    });
  }, [leads, dateRange]);

  if (!user || user.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-cyan-900 flex items-center gap-2"><BarChart3 size={20} /> Analytics Engine</h1>
            <p className="text-[12px] text-muted-foreground">Comprehensive system reporting including lead cycle time and acquisition attribution.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 w-[140px] text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="3m">Last 3 Months</SelectItem><SelectItem value="6m">Last 6 Months</SelectItem><SelectItem value="1y">Last 12 Months</SelectItem></SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="growth" className="w-full">
          <TabsList className="bg-slate-50 border h-10 p-0.5 justify-start gap-6 px-4 rounded-none border-x-0 border-t-0 w-full">
            <TabsTrigger value="growth" className="text-[11px] font-bold uppercase">Growth</TabsTrigger>
            <TabsTrigger value="velocity" className="text-[11px] font-bold uppercase">Pipeline Velocity</TabsTrigger>
          </TabsList>

          <div className="pt-6">
            <TabsContent value="growth" className="space-y-6">
              <div className="bg-card border rounded-md p-6 h-[300px]">
                 <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-4">Revenue Trend</h3>
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} />
                       <XAxis dataKey="month" fontSize={11} />
                       <YAxis fontSize={11} />
                       <Tooltip />
                       <Area type="monotone" dataKey="revenue" stroke="#0891b2" fill="#0891b2" fillOpacity={0.1} />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="velocity" className="space-y-6">
               <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-card border rounded-md p-6 h-[340px]">
                     <h3 className="text-[12px] font-bold text-slate-500 uppercase mb-6 flex items-center gap-2"><Clock size={14} /> Cycle Time (First Log to Won)</h3>
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={velocityData} layout="vertical">
                           <XAxis type="number" fontSize={10} label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
                           <YAxis dataKey="name" type="category" width={80} fontSize={10} />
                           <Tooltip />
                           <Bar dataKey="days" fill="#0891b2" radius={[0, 2, 2, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="bg-card border rounded-md p-6">
                     <h3 className="text-[12px] font-bold text-slate-500 uppercase mb-4">Recent High-Velocity Deals</h3>
                     <div className="space-y-3">
                        {velocityData.sort((a,b) => a.days - b.days).slice(0, 5).map((v, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-100">
                             <div className="space-y-0.5">
                                <p className="text-[13px] font-bold text-slate-800">{v.name}</p>
                                <p className="text-[10px] text-emerald-600 font-bold uppercase flex items-center gap-1"><Zap size={10} /> High Momentum</p>
                             </div>
                             <div className="text-right">
                                <p className="text-[16px] font-bold text-cyan-700">{v.days} Days</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Total Cycle</p>
                             </div>
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
