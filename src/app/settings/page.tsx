
"use client"

import React from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TierBadge } from '@/components/ui/tier-badge';
import { format, parseISO } from 'date-fns';
import { User, Shield, Phone, Mail, Globe, Calendar, Banknote, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <Shell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold">Personal Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your information and review your locked system credentials.</p>
        </div>

        <Card className="shadow-none border-[0.5px]">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <User size={14} /> Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-6 pb-6 border-b">
              <div className="w-16 h-16 rounded-full bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center text-xl font-bold">
                {user.name[0]}
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-slate-900">{user.name}</p>
                <div className="flex items-center gap-2">
                  <TierBadge tierId={user.tierId} />
                  <Badge variant="outline" className="text-[10px] h-4 uppercase border-cyan-100 text-cyan-700 bg-cyan-50/30">{user.role}</Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase">Work Email</Label>
                <div className="text-[13px] font-medium text-slate-700">{user.email}</div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase">Territory</Label>
                <div className="text-[13px] font-medium text-slate-700">{user.region}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-[0.5px]">
          <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Banknote size={14} /> Payout Credentials
            </CardTitle>
            <Badge variant="secondary" className="h-4 gap-1 text-[9px] uppercase"><Lock size={8} /> Read Only</Badge>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
             <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-md flex items-start gap-3">
                <Shield size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[12px] text-amber-800 leading-relaxed">
                   Your payment details are managed by your reporting manager. These credentials are used for commission disbursements and cannot be self-edited for system security.
                </p>
             </div>

             <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">Bank Name</Label>
                  <div className="text-[13px] font-bold text-slate-800">{user.paymentDetails?.bankName || '--'}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">Account Name</Label>
                  <div className="text-[13px] font-bold text-slate-800">{user.paymentDetails?.accountName || '--'}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">Account Number</Label>
                  <div className="text-[13px] font-bold text-slate-800 font-mono">{user.paymentDetails?.accountNumber || 'NOT CONFIGURED'}</div>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
