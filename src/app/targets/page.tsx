
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
  Award, 
  Loader2,
  History as HistoryIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export default function TargetsPage() {
  const { user, config } = useAuthStore();
  const firestore = useFirestore();
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const monthStr = format(selectedMonth, 'yyyy-MM');
  const currencySymbol = config?.currency === 'KES' ? 'KSh ' : config?.currency === 'GBP' ? '£' : '$';

  // Fetch target for selected month
  const targetQuery = useMemoFirebase(() => {
    if (!firestore || !user?.id || !monthStr) return null;
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
    if (!firestore || !user?.id) return null;
    return query(
      collection(firestore, 'targets'),
      where('agentId', '==', user.id),
      orderBy('month', 'desc'),
      limit(6)
    );
  }, [firestore, user?.id]);
  const { data: history } = useCollection<Target>(historyQuery as any);

  // Fetch leads to calculate actuals
  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.id) return null;
    return query(
      collection(firestore, 'leads'),
      where('agentId', '==', user.id)
    );
  }, [firestore, user?.id]);
  const { data: leads } = useCollection<Lead>(leadsQuery as any);

  // Calculate Actuals for selected month
  const actuals = useMemo(() => {
    if (!leads) return { created: 0, partners: 0, qualified: 0, won: 0, revenue: 0, activity: 80 };
    
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

    return {
      created: monthLeads.filter(l => l.type === 'lead').length,
      partners: monthLeads.filter(l => l.type === 'partner').length,
      qualified: monthLeads.filter(l => l.status === 'qualified').length,
      won: monthWon.length,
      revenue: monthWon.reduce((sum, l) => sum + (l.estimatedBudget || 0), 0),
      activity: 82 
    };
  }, [leads, selectedMonth]);

  const metrics = [
    { name: 'Leads Created', actual: actuals.created, target: currentTarget?.leadsTarget || 10 },
    { name: 'Partners Set', actual: actuals.partners, target: currentTarget?.partnersTarget || 2 },
    { name: 'Closed Deals', actual: actuals.won, target: currentTarget?.closedTarget || 2 },
    { name: `Revenue (${currencySymbol.trim()})`, actual: actuals.revenue, target: currentTarget?.revenueTarget || 5000, isCurrency: true },
    { name: 'Activity Score', actual: actuals.activity, target: currentTarget?.activityScoreTarget || 80 },
  ];

  const handlePrevMonth = () => setSelectedMonth(subMonths(selectedMonth, 1));
  const handleNextMonth = () => setSelectedMonth(addMonths(selectedMonth, 1));

  if (!user) return null;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
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
          <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-tight py-1 px-3 w-full sm:w-auto text-center">
            {targetLoading ? <Loader2 size={12} className="animate-spin" /> : currentTarget ? 'Quota Synchronized' : 'Quotas Not Set'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-5 gap-3">
          {metrics.map((metric, i) => {
            const percent = Math.min(Math.round((metric.actual / metric.target) * 100), 100);
            const statusColor = percent >= 100 ? "text-emerald-600" : percent >= 50 ? "text-primary" : "text-slate-400";
            const barColor = percent >= 100 ? "bg-emerald-500" : percent >= 50 ? "bg-primary" : "bg-slate-200";

            return (
              <div key={i} className="bg-white border rounded-lg p-4 shadow-sm flex flex-col gap-2">
                <p className="text-[11px] font-bold uppercase text-slate-400 tracking-tight">{metric.name}</p>
                <div className="flex items-baseline justify-between">
                  <p className="text-[18px] font-bold">
                    {metric.isCurrency ? `${currencySymbol}${metric.actual.toLocaleString()}` : metric.actual}
                    <span className="text-[11px] text-slate-300 font-normal"> / {metric.target}</span>
                  </p>
                  <span className={cn("text-[11px] font-bold", statusColor)}>{percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                  <div className={cn("h-full transition-all duration-700", barColor)} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b pb-2">
            <HistoryIcon className="text-slate-400" size={16} />
            <h2 className="text-[14px] font-bold text-slate-800">Historical Benchmarks</h2>
          </div>
          <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 h-9">
                      <th className="px-4 text-left">Period</th>
                      <th className="text-center">Leads</th>
                      <th className="text-center">Partners</th>
                      <th className="text-center">Wins</th>
                      <th className="text-right">Revenue</th>
                      <th className="text-center">Score</th>
                      <th className="text-right px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {history?.map((h) => (
                      <tr key={h.id} className="h-10 hover:bg-slate-50 transition-colors">
                        <td className="px-4 font-bold text-slate-700">{format(parseISO(h.month + '-01'), 'MMM yyyy')}</td>
                        <td className="text-center">{h.leadsTarget}</td>
                        <td className="text-center">{h.partnersTarget || 0}</td>
                        <td className="text-center font-bold text-primary">{h.closedTarget}</td>
                        <td className="text-right">{currencySymbol}{h.revenueTarget?.toLocaleString()}</td>
                        <td className="text-center text-slate-500">{h.activityScoreTarget}%</td>
                        <td className="px-4 text-right">
                           <Badge className="bg-emerald-50 text-emerald-700 border-none text-[9px] uppercase px-1.5 h-4">Achieved</Badge>
                        </td>
                      </tr>
                    ))}
                    {(!history || history.length === 0) && (
                      <tr className="h-20"><td colSpan={7} className="text-center text-slate-300 italic">No historical data available.</td></tr>
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
