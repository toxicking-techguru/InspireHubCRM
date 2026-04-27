
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
import { User, Shield, Phone, Mail, Globe, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <Shell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold">Account Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your personal information and preferences.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <User size={16} /> Personal Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6 pb-6 border-b">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                {user.name[0]}
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold">{user.name}</p>
                <div className="flex items-center gap-2">
                  <TierBadge tierId={user.tierId} />
                  <Badge variant="outline" className="text-[10px] h-4 uppercase">{user.role}</Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Email Address</Label>
                <div className="flex items-center gap-2 px-3 h-9 bg-slate-50 border rounded-md text-[13px] text-slate-600">
                  <Mail size={14} className="text-slate-400" />
                  {user.email}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Phone Number</Label>
                <div className="flex items-center gap-2 px-3 h-9 bg-slate-50 border rounded-md text-[13px] text-slate-600">
                  <Phone size={14} className="text-slate-400" />
                  {user.phone}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Region / Territory</Label>
                <div className="flex items-center gap-2 px-3 h-9 bg-slate-50 border rounded-md text-[13px] text-slate-600">
                  <Globe size={14} className="text-slate-400" />
                  {user.region}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Member Since</Label>
                <div className="flex items-center gap-2 px-3 h-9 bg-slate-50 border rounded-md text-[13px] text-slate-600">
                  <Calendar size={14} className="text-slate-400" />
                  {format(parseISO(user.joinDate), 'PPP')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Shield size={16} /> Security & Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[12px] text-slate-500">Your account is managed by the central system. Contact your manager or system administrator to change your role or performance tier.</p>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" size="sm" className="h-8 text-[12px]">Change Password</Button>
              <Button size="sm" className="h-8 text-[12px]">Request Data Update</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function Badge({ children, variant, className }: any) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border",
      variant === 'outline' ? "border-slate-200 text-slate-500" : "bg-primary text-white border-transparent",
      className
    )}>
      {children}
    </span>
  );
}
