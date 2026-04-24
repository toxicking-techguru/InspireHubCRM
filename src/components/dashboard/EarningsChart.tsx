
"use client"

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Commission } from '@/types/crm';
import { format, subMonths, startOfMonth, isWithinInterval } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export function EarningsChart() {
  const { user } = useAuthStore();
  const firestore = useFirestore();

  const commissionsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    let q = query(collection(firestore, 'commissions'), orderBy('createdAt', 'desc'));
    if (user.role === 'Agent') {
      q = query(q, where('agentId', '==', user.id));
    }
    return q;
  }, [firestore, user]);

  const { data: commissions, loading } = useCollection<Commission>(commissionsQuery as any);

  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => {
      const date = subMonths(new Date(), 5 - i);
      return {
        month: format(date, 'MMM'),
        fullDate: startOfMonth(date),
        earnings: 0
      };
    });

    if (commissions) {
      commissions.forEach(c => {
        const cDate = new Date(c.createdAt);
        const monthItem = months.find(m => 
          format(m.fullDate, 'MMM yyyy') === format(cDate, 'MMM yyyy')
        );
        if (monthItem) {
          monthItem.earnings += c.amount;
        }
      });
    }

    return months;
  }, [commissions]);

  if (loading) return <Skeleton className="h-[250px] w-full rounded-lg" />;

  return (
    <div className="bg-card border rounded-lg p-4 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Earnings Overview</h3>
        <span className="text-xs text-muted-foreground">Last 6 Months</span>
      </div>
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              fontSize={10} 
              tick={{ fill: '#64748b' }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              fontSize={10} 
              tick={{ fill: '#64748b' }} 
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
            />
            <Bar dataKey="earnings" fill="#4F46E5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
