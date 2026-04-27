
"use client"

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, setDoc, collection, getDocs, deleteDoc, writeBatch, collectionGroup, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Clock, 
  ShieldCheck, 
  Save, 
  Loader2, 
  Info,
  Globe,
  DollarSign,
  AlertTriangle,
  Play,
  CheckCircle2,
  XCircle,
  Calendar,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';

export default function AdminSettingsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'system', 'config') : null, [firestore]);
  const { data: config, loading } = useDoc<any>(settingsRef as any);

  const handleSave = async (data: any) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await setDoc(doc(firestore, 'system', 'config'), data, { merge: true });
      toast({ title: "Configuration Updated", description: "System variables synchronized globally." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || user.role !== 'Admin') return null;

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'cron', label: 'Cron Jobs', icon: Clock },
    { id: 'roles', label: 'Roles & Perms', icon: ShieldCheck },
    { id: 'danger', label: 'Danger Zone', icon: ShieldAlert },
  ];

  return (
    <Shell>
      <div className="space-y-4">
        <div>
           <h1 className="text-[18px] font-bold text-cyan-950">System Configuration</h1>
           <p className="text-[12px] text-muted-foreground mt-0.5">Control global variables, background tasks, and automated triggers.</p>
        </div>

        <div className="flex gap-6 items-start">
           <div className="w-[200px] bg-card border rounded-md overflow-hidden shrink-0 shadow-sm">
              <div className="p-2 space-y-0.5">
                 {tabs.map(tab => (
                   <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id)}
                     className={cn(
                       "w-full flex items-center gap-3 px-3 h-9 rounded-[6px] text-[13px] transition-colors",
                       activeTab === tab.id 
                        ? (tab.id === 'danger' ? "bg-red-50 text-red-700 font-bold" : "bg-cyan-50 text-cyan-700 font-bold")
                        : "text-sidebar-foreground hover:bg-slate-50"
                     )}
                   >
                      <tab.icon size={14} className={activeTab === tab.id ? (tab.id === 'danger' ? "text-red-600" : "text-cyan-600") : "text-slate-400"} />
                      {tab.label}
                   </button>
                 ))}
              </div>
           </div>

           <div className="flex-1 bg-card border rounded-md shadow-sm min-h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="animate-spin text-cyan-600 mb-2" />
                  <p className="text-xs text-muted-foreground">Fetching configuration...</p>
                </div>
              ) : (
                <div className="p-6">
                   {activeTab === 'general' && <GeneralSettings config={config} onSave={handleSave} saving={isSaving} />}
                   {activeTab === 'notifications' && <NotificationSettings config={config} onSave={handleSave} saving={isSaving} />}
                   {activeTab === 'cron' && <CronSettings />}
                   {activeTab === 'roles' && <RoleMatrix />}
                   {activeTab === 'danger' && <DangerZone user={user} />}
                </div>
              )}
           </div>
        </div>
      </div>
    </Shell>
  );
}

function DangerZone({ user }: { user: any }) {
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [purgeInput, setPurgeInput] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handlePurgeAll = async () => {
    if (!firestore || !user || purgeInput !== 'PRODUCTION') return;
    setIsPurging(true);
    try {
      const collectionsToPurge = [
        'leads', 'wallets', 'commissions', 'withdrawals', 
        'tiers', 'targets', 'channels', 'products', 'audit_logs'
      ];

      // 1. Purge all Lead Activities (Subcollections)
      const activitySnap = await getDocs(collectionGroup(firestore, 'activities'));
      for (const d of activitySnap.docs) {
        await deleteDoc(d.ref);
      }

      // 2. Purge other primary collections
      for (const colName of collectionsToPurge) {
        const snap = await getDocs(collection(firestore, colName));
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      }

      // 3. Purge all agents EXCEPT the current user
      const agentSnap = await getDocs(collection(firestore, 'agents'));
      for (const d of agentSnap.docs) {
        if (d.id !== user.id) {
          await deleteDoc(d.ref);
        }
      }

      toast({ 
        title: "System Purge Complete", 
        description: "All demo records removed. System is now ready for production." 
      });
      setIsPurgeDialogOpen(false);
      setPurgeInput('');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Purge Failed", description: e.message });
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-100 p-4 rounded-md flex items-start gap-4 text-red-800">
        <ShieldAlert size={20} className="shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-[14px]">System Reset & Production Handover</h4>
          <p className="text-[12px] opacity-80 leading-relaxed">
            These actions are IRREVERSIBLE. Purging the system will delete all leads, activities, commissions, and team records across the entire global organization. 
          </p>
        </div>
      </div>

      <div className="border rounded-md divide-y overflow-hidden">
         <div className="p-4 flex items-center justify-between gap-10 hover:bg-slate-50/50 transition-colors">
            <div className="space-y-1">
               <h5 className="text-[13px] font-bold text-slate-800">Purge All Data</h5>
               <p className="text-[11px] text-slate-500">Deletes every record in the system to prepare for production launch. Your own admin profile is preserved.</p>
            </div>
            <Button 
              variant="destructive" 
              size="sm" 
              className="font-bold uppercase tracking-tight h-8 text-[11px] px-6"
              onClick={() => setIsPurgeDialogOpen(true)}
            >
              Wipe Everything
            </Button>
         </div>
      </div>

      <AlertDialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">CRITICAL ACTION</AlertDialogTitle>
            <AlertDialogDescription className="text-xs space-y-2">
              <p>You are about to wipe the entire CRM database. This will remove all history, financial records, and team assignments.</p>
              <p className="font-bold">To continue, type "PRODUCTION" in the box below:</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input 
              value={purgeInput} 
              onChange={(e) => setPurgeInput(e.target.value.toUpperCase())}
              placeholder="Type here..."
              className="h-9 text-center font-bold tracking-widest"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-[11px] font-bold uppercase" disabled={isPurging}>Cancel</AlertDialogCancel>
            <Button 
              variant="destructive" 
              className="h-8 text-[11px] font-bold uppercase px-6"
              disabled={purgeInput !== 'PRODUCTION' || isPurging}
              onClick={handlePurgeAll}
            >
              {isPurging ? <Loader2 className="animate-spin" size={14} /> : 'Confirm Wipe'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GeneralSettings({ config, onSave, saving }: any) {
  const [data, setData] = useState({ 
    appName: 'InspireHubCRM', 
    timezone: 'UTC+3', 
    currency: 'USD', 
    idleThreshold: 72,
    withdrawalDays: 'Fridays'
  });

  useEffect(() => {
    if (config) {
      setData({
        appName: config.appName || 'InspireHubCRM',
        timezone: config.timezone || 'UTC+3',
        currency: config.currency || 'USD',
        idleThreshold: config.idleThreshold || 72,
        withdrawalDays: config.withdrawalDays || 'Fridays',
      });
    }
  }, [config]);
  
  const withdrawalOptions = [
    { label: 'All Days (Active Window)', value: 'All Days' },
    { label: 'Every Friday', value: 'Fridays' },
    { label: 'Mondays & Thursdays', value: 'Mondays & Thursdays' },
    { label: 'First of Month', value: 'First of Month' },
    { label: 'Weekends Only', value: 'Weekends Only' },
  ];

  return (
    <div className="space-y-6 max-w-[500px]">
       <div className="space-y-4">
          <div className="space-y-1.5">
             <Label className="text-[11px] font-bold uppercase text-slate-400">Application Name</Label>
             <Input className="h-9 text-[13px]" value={data.appName} onChange={(e) => setData({...data, appName: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase text-slate-400">Default Timezone</Label>
                <div className="relative">
                   <Globe size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                   <Input className="h-9 pl-8 text-[13px]" value={data.timezone} onChange={(e) => setData({...data, timezone: e.target.value})} />
                </div>
             </div>
             <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase text-slate-400">Base Currency</Label>
                <div className="relative">
                   <DollarSign size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                   <Input className="h-9 pl-8 text-[13px]" value={data.currency} onChange={(e) => setData({...data, currency: e.target.value})} />
                </div>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
               <Label className="text-[11px] font-bold uppercase text-slate-400">Idle Threshold (Hours)</Label>
               <Input type="number" className="h-9 text-[13px]" value={data.idleThreshold} onChange={(e) => setData({...data, idleThreshold: parseInt(e.target.value) || 0})} />
            </div>
            <div className="space-y-1.5">
               <Label className="text-[11px] font-bold uppercase text-slate-400">Withdrawal Allowed Window</Label>
               <Select value={data.withdrawalDays} onValueChange={(v) => setData({...data, withdrawalDays: v})}>
                 <SelectTrigger className="h-9 text-[13px] bg-white border-cyan-100">
                    <SelectValue placeholder="Select window..." />
                 </SelectTrigger>
                 <SelectContent>
                    {withdrawalOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                 </SelectContent>
               </Select>
            </div>
          </div>
       </div>
       <Button className="bg-cyan-600 hover:bg-cyan-700 h-9 px-8 gap-2 font-bold uppercase text-[11px]" disabled={saving} onClick={() => onSave(data)}>
          {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save General Config
       </Button>
    </div>
  );
}

function NotificationSettings({ config, onSave, saving }: any) {
  return (
    <div className="space-y-6">
       <div className="space-y-4">
          {[
            { id: 'lead_won', label: 'Lead Won (System Wide)', desc: 'Notify managers when a deal is closed.' },
            { id: 'withdrawal_request', label: 'New Payout Request', desc: 'Alert admins for pending approvals.' },
            { id: 'tier_upgrade', label: 'Agent Tier Upgrade', desc: 'Send automated congrats to agent and manager.' },
            { id: 'idle_alert', label: 'Critical Idle Warning', desc: 'Alert manager when lead is idle > 240h.' },
          ].map(item => (
            <div key={item.id} className="p-4 border rounded-md flex items-start justify-between gap-6 hover:bg-slate-50/50 transition-colors">
               <div className="space-y-1">
                  <h4 className="text-[13px] font-bold text-slate-800">{item.label}</h4>
                  <p className="text-[11px] text-slate-500">{item.desc}</p>
                  <div className="pt-2">
                     <Label className="text-[10px] font-bold uppercase text-slate-400">Template Text</Label>
                     <Textarea className="h-16 text-[12px] mt-1 bg-white resize-none border-cyan-50" defaultValue="Hi {name}, a new {event} occurred on {date}." />
                  </div>
               </div>
               <Switch className="data-[state=checked]:bg-cyan-600 scale-90" defaultChecked />
            </div>
          ))}
       </div>
       <Button className="bg-cyan-600 hover:bg-cyan-700 h-9 px-8 gap-2 font-bold uppercase text-[11px]">
          Save Notification Logic
       </Button>
    </div>
  );
}

function CronSettings() {
  const jobs = [
    { name: 'Monthly Performance Eval', cron: '0 0 1 * *', last: '2025-04-01', next: '2025-05-01', status: 'ready' },
    { name: 'Idle Lead Scanner', cron: '0 * * * *', last: '15m ago', next: 'In 45m', status: 'running' },
    { name: 'Payout Batch Processor', cron: '0 12 * * 1', last: '2d ago', next: 'Next Monday', status: 'ready' },
  ];

  return (
    <div className="space-y-4">
       <div className="bg-amber-50 border border-amber-100 p-3 rounded-md flex items-start gap-3 text-amber-800 text-[12px]">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p>Manual trigger of cron jobs bypasses scheduled logic. Use with caution during business hours.</p>
       </div>
       <div className="border rounded-md overflow-hidden">
          <table className="w-full text-[13px]">
             <thead>
                <tr className="bg-slate-50 h-9">
                   <th className="px-3 text-left">Job Name</th>
                   <th className="text-left w-[120px]">Schedule</th>
                   <th className="text-left w-[120px]">Last Run</th>
                   <th className="text-left w-[120px]">Next Run</th>
                   <th className="text-right px-3">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y">
                {jobs.map((job, i) => (
                  <tr key={i} className="h-10">
                     <td className="px-3 font-bold">{job.name}</td>
                     <td className="font-mono text-[11px] text-slate-400">{job.cron}</td>
                     <td className="text-slate-500">{job.last}</td>
                     <td className="text-cyan-600 font-medium">{job.next}</td>
                     <td className="px-3 text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-cyan-600 gap-1.5 text-[11px] uppercase font-bold">
                           <Play size={12} /> Trigger
                        </Button>
                     </td>
                  </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}

function RoleMatrix() {
  const perms = ['Read Leads', 'Add Activity', 'Edit Products', 'Manage Tiers', 'Approve Payouts', 'Bulk Reassign', 'Edit Users', 'View System Reports'];
  const roles = ['Admin', 'Manager', 'Agent'];

  return (
    <div className="space-y-4">
       <div className="flex items-center gap-2 text-slate-500 mb-2">
          <Info size={14} />
          <p className="text-[12px]">Permission levels are strictly code-defined for security. This matrix is read-only.</p>
       </div>
       <div className="border rounded-md overflow-hidden">
          <table className="w-full text-[13px]">
             <thead>
                <tr className="bg-slate-50 h-9">
                   <th className="px-3 text-left">Permission Module</th>
                   {roles.map(r => <th key={r} className="text-center w-[100px]">{r}</th>)}
                </tr>
             </thead>
             <tbody className="divide-y">
                {perms.map((p, i) => (
                  <tr key={i} className="h-9">
                     <td className="px-3 font-medium text-slate-700">{p}</td>
                     {roles.map(r => {
                        const has = r === 'Admin' || (r === 'Manager' && !['Manage Tiers', 'Edit Users'].includes(p)) || (r === 'Agent' && ['Read Leads', 'Add Activity'].includes(p));
                        return (
                          <td key={r} className="text-center">
                             {has ? <CheckCircle2 size={16} className="mx-auto text-emerald-500" /> : <XCircle size={16} className="mx-auto text-slate-100" />}
                          </td>
                        );
                     })}
                  </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}
