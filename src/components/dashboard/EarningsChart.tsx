"use client"

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Oct', earnings: 450 },
  { month: 'Nov', earnings: 1200 },
  { month: 'Dec', earnings: 800 },
  { month: 'Jan', earnings: 2100 },
  { month: 'Feb', earnings: 1100 },
  { month: 'Mar', earnings: 840 },
];

export function EarningsChart() {
  return (
    <div className="bg-card border rounded-lg p-4 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Earnings Overview</h3>
        <span className="text-xs text-muted-foreground">Last 6 Months</span>
      </div>
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
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
