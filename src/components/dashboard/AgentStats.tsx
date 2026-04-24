import React from 'react';
import { Users, CheckCircle2, Trophy, Wallet } from 'lucide-react';

export function AgentStats() {
  const stats = [
    { label: 'My Leads', value: '14', icon: Users, trend: '+2 this week', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Qualified', value: '5', icon: CheckCircle2, trend: '30% conv.', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Won (MTD)', value: '2', icon: Trophy, trend: '$12,500 vol.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Earnings', value: '$840', icon: Wallet, trend: 'Pending: $210', color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="bg-card border rounded-lg p-3 md:p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <p className="text-lg md:text-xl font-bold mt-0.5">{stat.value}</p>
            </div>
            <div className={`${stat.bg} ${stat.color} p-2 rounded-md`}>
              <stat.icon size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-center text-[10px] md:text-xs">
            <span className="font-medium text-muted-foreground">{stat.trend}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
