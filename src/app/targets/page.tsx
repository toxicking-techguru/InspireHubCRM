
"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Target, Lead, Tier } from '@/types/crm';
import { 
  ChevronLeft, 
  ChevronRight, 
  Target as TargetIcon, 
  TrendingUp, 
  Award, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  History as HistoryIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export default function TargetsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const monthStr = format(selectedMonth, 'yyyy-MM');

  // Fetch target for selected month
  const targetQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'targets'),
      where('agentId', '==', user.id),
      where('month', '==', monthStr),
      limit(1)
    );
  }, [firestore, user?.id, monthStr]);

  const { data: targets, loading: targetLoading } = useCollection<Target>(targetQuery as any);
  const currentTarget = targets?.[0];

  // Fetch history (last 6 months)
  const historyQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'targets'),
      where('agentId', '==', user.id),
      orderBy('month', 'desc'),
      limit(6)
    );
  }, [firestore, user?.id]);
  const { data: history } = useCollection<Target>(historyQuery as any);

  // Fetch leads to calculate actuals for the selected month
  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'leads'),
      where('agentId', '==', user.id)
    );
  }, [firestore, user?.id]);
  const { data: leads } = useCollection<Lead>(leadsQuery as any);

  // Fetch tier info for migration banner
  const tiersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'tiers'), orderBy('rankLevel')) : null, [firestore]);
  const { data: tiers } = useCollection<Tier>(tiersQuery as any);
  const currentTier = tiers?.find(t => t.id === user?.tierId);
  const nextTier = tiers?.find(t => t.rankLevel === (currentTier?.rankLevel || 0) + 1);

  // Calculate Actuals for selected month
  const actuals = useMemo(() => {
    if (!leads) return { created: 0, qualified: 0, won: 0, revenue: 0, activity: 0 };
    
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);

    const monthLeads = leads.filter(l => {
      if (!l.createdAt) return false;
      const d = parseISO(l.createdAt);
      return d >= monthStart && d <= monthEnd;
    });

    const monthWon = leads.filter(l => {
      if (l.status !== 'won' || !l.wonAt) return false;
      const d = parseISO(l.wonAt);
      return d >= monthStart && d <= monthEnd;
    });

    const monthQualified = monthLeads.filter(l => l.status === 'qualified');

    const revenue = monthWon.reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);

    return {
      created: monthLeads.length,
      qualified: monthQualified.length,
      won: monthWon.length,
      revenue: revenue,
      activity: 82 // Mocked score
    };
  }, [leads, selectedMonth]);

  const metrics = [
    { name: 'Leads Created', actual: actuals.created, target: currentTarget?.leadsTarget || 10 },
    { name: 'Qualified', actual: actuals.qualified, target: currentTarget?.qualifiedTarget || 5 },
    { name: 'Closed Deals', actual: actuals.won, target: currentTarget?.closedTarget || 2 },
    { name: 'Revenue', actual: actuals.revenue, target: currentTarget?.revenueTarget || 5000, isCurrency: true },
    { name: 'Activity Score', actual: actuals.activity, target: currentTarget?.activityScoreTarget || 80 },
  ];

  // Tier Migration Logic
  const migrationProgress = useMemo(() => {
    if (!nextTier || !actuals) return null;
    const criteria = nextTier.upgradeCriteria;
    if (!criteria) return null;

    const unmet = [];
    if (actuals.created < criteria.leadsTarget) unmet.push('Leads');
    if (actuals.won < criteria.closedTarget) unmet.push('Closed Deals');
    if (actuals.revenue < criteria.revenueTarget) unmet.push('Revenue');

    const totalNeeded = 3;
    const met = totalNeeded - unmet.length;
    const percent = Math.round((met / totalNeeded) * 100);

    return { percent, unmetCount: unmet.length, unmetList: unmet };
  }, [nextTier, actuals]);

  const handlePrevMonth = () => setSelectedMonth(subMonths(selectedMonth, 1));
  const handleNextMonth = () => setSelectedMonth(addMonths(selectedMonth, 1));

  if (!user) return null;

  return (
    <Shell>
      <div className="space-y-6">
        {/* Month Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
              <ChevronLeft size={16} />
            </Button>
            <h1 className="text-lg font-bold min-w-[140px] text-center">
              {format(selectedMonth, 'MMMM yyyy')}
            </h1>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
              <ChevronRight size={16} />
            </Button>
          </div>
          <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-tight py-1 px-3">
            {targetLoading ? <Loader2 size={12} className="animate-spin" /> : currentTarget ? 'Targets Set' : 'Targets Pending'}
          </Badge>
        </div>

        {/* Progress Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {metrics.map((metric, i) => {
            const percent = Math.min(Math.round((metric.actual / metric.target) * 100), 100);
            const statusColor = percent >= 100 ? "text-emerald-600" : percent >= 50 ? "text-amber-600" : "text-red-600";
            const barColor = percent >= 100 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-500" : "bg-red-500";

            return (
              <div key={i} className="bg-card border-[0.5px] rounded-md p-3 shadow-sm flex flex-col gap-2">
                <p className="text-[12px] font-medium text-slate-500">{metric.name}</p>
                <div className="flex items-baseline justify-between">
                  <p className="text-[18px] font-bold">
                    {metric.isCurrency ? `$${metric.actual.toLocaleString()}` : metric.actual}
                    <span className="text-[12px] text-slate-400 font-normal"> / {metric.isCurrency ? `$${metric.target.toLocaleString()}` : metric.target}</span>
                  </p>
                  <span className={cn("text-[11px] font-bold", statusColor)}>{percent}%</span>
                </div>
                <div className="w-full h-[6px] bg-slate-100 rounded-full overflow-hidden">
                  <div className={cn("h-full transition-all duration-500", barColor)} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Tier Migration Banner */}
        {nextTier && migrationProgress && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex flex-col md:flex-row items-center gap-6 shadow-sm">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                <Award size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-[14px] font-bold text-indigo-900">
                  You are {migrationProgress.percent}% away from {nextTier.name} tier
                </h3>
                <p className="text-[12px] text-indigo-700">
                  {migrationProgress.unmetCount > 0 
                    ? `${migrationProgress.unmetCount} metrics still needed: ${migrationProgress.unmetList.join(', ')}`
                    : "All performance targets met! Review pending for upgrade."
                  }
                </p>
              </div>
            </div>
            <div className="w-full md:w-[200px] space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-indigo-700">
                <span>PROGRESS</span>
                <span>{migrationProgress.percent}%</span>
              </div>
              <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 transition-all duration-700" style={{ width: `${migrationProgress.percent}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b pb-1">
            <HistoryIcon className="text-slate-400" size={16} />
            <h2 className="text-[14px] font-bold text-slate-800">Target History</h2>
          </div>
          <div className="bg-card border-[0.5px] rounded-md shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 h-9">
                    <th className="px-3 text-left w-[120px]">Month</th>
                    <th className="text-left w-[100px]">Leads</th>
                    <th className="text-left w-[100px]">Qualified</th>
                    <th className="text-left w-[100px]">Closed</th>
                    <th className="text-left w-[120px]">Revenue</th>
                    <th className="text-left w-[100px]">Score</th>
                    <th className="text-left w-[120px]">Result</th>
                    <th className="text-left px-3">Tier Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[13px]">
                  {history?.map((h) => {
                    const isAchieved = true; // Simplified for demo history
                    return (
                      <tr key={h.id} className="h-9 hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 font-medium">{format(parseISO(h.month + '-01'), 'MMM yyyy')}</td>
                        <td className="text-slate-600">{h.leadsTarget}</td>
                        <td className="text-slate-600">{h.qualifiedTarget}</td>
                        <td className="text-slate-600">{h.closedTarget}</td>
                        <td className="text-slate-600">${h.revenueTarget?.toLocaleString()}</td>
                        <td className="text-slate-600">{h.activityScoreTarget}</td>
                        <td>
                          <Badge variant={isAchieved ? "default" : "destructive"} className="text-[10px] h-4 uppercase px-1.5 border-none bg-emerald-100 text-emerald-700">
                            Achieved
                          </Badge>
                        </td>
                        <td className="px-3">
                          {h.month === '2024-01' && (
                            <Badge variant="outline" className="text-[9px] h-4 uppercase border-indigo-200 text-indigo-600 bg-indigo-50">
                              Upgrade: Gold
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {(!history || history.length === 0) && (
                    <tr className="h-20">
                      <td colSpan={8} className="text-center text-muted-foreground italic">No historical target data found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
