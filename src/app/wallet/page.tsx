"use client"

import React from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { WALLETS } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History,
  TrendingUp,
  Clock,
  CheckCircle2
} from 'lucide-react';

export default function WalletPage() {
  const { user } = useAuthStore();
  const wallet = WALLETS.find(w => w.agent_id === user?.id) || WALLETS[0];

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Earnings & Wallet</h1>
          <p className="text-sm text-muted-foreground">Track your commissions and manage withdrawals.</p>
        </div>

        {/* Wallet Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div className="bg-primary rounded-xl p-5 text-primary-foreground shadow-lg flex flex-col justify-between h-[160px]">
              <div className="flex items-center justify-between">
                <CreditCard size={24} className="opacity-80" />
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Withdrawable Balance</span>
              </div>
              <div>
                <p className="text-3xl font-bold">${wallet.withdrawable.toLocaleString()}</p>
                <p className="text-xs opacity-80 mt-1">Ready for withdrawal</p>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-5 shadow-sm flex flex-col justify-between h-[160px]">
              <div className="flex items-center justify-between">
                <Clock size={24} className="text-amber-500 opacity-80" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Pending Approval</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-amber-600">${wallet.pending.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">From recent won deals</p>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-5 shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold mb-4">Request Withdrawal</h3>
            <div className="space-y-4 flex-1">
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs">Amount to withdraw</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input id="amount" placeholder="0.00" className="pl-7 h-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank" className="text-xs">Bank Destination</Label>
                <select id="bank" className="w-full bg-background border rounded-md h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option>Primary Savings (**** 4242)</option>
                  <option>Business Account (**** 9876)</option>
                </select>
              </div>
              <Button className="w-full gap-2">
                <ArrowUpRight size={16} /> Withdraw Funds
              </Button>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Lifetime Earned', value: `$${wallet.total_earned.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500' },
            { label: 'Total Withdrawn', value: `$${wallet.withdrawn.toLocaleString()}`, icon: ArrowDownLeft, color: 'text-slate-500' },
            { label: 'Commission Rate', value: '12%', icon: TrendingUp, color: 'text-indigo-500' },
            { label: 'Approved Today', value: '$0.00', icon: CheckCircle2, color: 'text-blue-500' },
          ].map((item, i) => (
            <div key={i} className="bg-card border rounded-lg p-3 shadow-sm flex items-center gap-3">
              <div className={`p-2 rounded bg-slate-50 dark:bg-slate-900 ${item.color}`}>
                <item.icon size={16} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{item.label}</p>
                <p className="text-sm font-bold">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tables Container */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Commissions */}
          <div className="bg-card border rounded-lg shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-500" /> Recent Commissions
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Amt</th>
                    <th>Earned</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { lead: 'TechFlow Inc.', amt: '$12,000', earned: '$600', status: 'approved', date: 'Mar 5' },
                    { lead: 'Global Logistics', amt: '$45,000', earned: '$5,400', status: 'approved', date: 'Feb 28' },
                    { lead: 'StartupX', amt: '$5,000', earned: '$250', status: 'pending', date: 'Mar 6' },
                  ].map((row, i) => (
                    <tr key={i}>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold">{row.lead}</span>
                          <span className="text-[10px] text-muted-foreground">{row.date}</span>
                        </div>
                      </td>
                      <td>{row.amt}</td>
                      <td className="font-bold text-emerald-600">{row.earned}</td>
                      <td>
                        <span className={`text-[10px] font-bold uppercase ${row.status === 'approved' ? 'text-emerald-600' : 'text-amber-500'}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Withdrawal History */}
          <div className="bg-card border rounded-lg shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <History size={16} className="text-indigo-500" /> Withdrawal History
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amt</th>
                    <th>Account</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { date: 'Feb 15, 2024', amt: '$1,500', bank: '**** 4242', status: 'paid' },
                    { date: 'Jan 20, 2024', amt: '$500', bank: '**** 4242', status: 'paid' },
                    { date: 'Mar 6, 2024', amt: '$300', bank: '**** 9876', status: 'pending' },
                  ].map((row, i) => (
                    <tr key={i}>
                      <td className="text-xs">{row.date}</td>
                      <td className="font-bold">{row.amt}</td>
                      <td className="text-[10px] text-muted-foreground uppercase">{row.bank}</td>
                      <td>
                        <span className={`text-[10px] font-bold uppercase ${row.status === 'paid' ? 'text-emerald-600' : 'text-amber-500'}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
