"use client"

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Commission } from '@/types/crm';
import { format, subMonths, startOfMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export function EarningsChart() {
  const { user, config } = useAuthStore();
  const firestore = useFirestore();

  const currencySymbol = config?.currency === 'KES' ? 'KES ' : config?.currency === 'GBP' ? '£' : '$';

  const commissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.id) return null;
    let q = collection(firestore, 'commissions');
    if (user.role === 'Agent') {
      return query(q, where('agentId', '==', user.id), orderBy('createdAt', 'desc'));
    }
    return query(q, orderBy('createdAt', 'desc'));
  }, [firestore, user?.id, user?.role]);

  const { data: commissions, loading } = useCollection<Commission>(commissionsQuery as any);

  const chartData = React.useMemo(() => {
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

  if (loading) return <Skeleton className="h-full w-full rounded-md" />;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Earnings Overview</h3>
      </div>
      <div className="flex-1 min-h-[160px]">
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
              tickFormatter={(v) => `${currencySymbol}${v}`}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
            />
            <Bar dataKey="earnings" fill="#1B48A3" radius={[2, 2, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
