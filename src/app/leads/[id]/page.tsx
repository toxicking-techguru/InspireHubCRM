
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, updateDoc, query, orderBy, where, getDocs, limit, getDoc, setDoc } from 'firebase/firestore';
import { useAuthStore } from '@/store/useAuthStore';
import { Lead, LeadActivity, Product, LeadStatus, ActivityType, Tier } from '@/types/crm';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  History, 
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Paperclip,
  Activity,
  Zap,
  FileCheck
} from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow, differenceInDays, parseISO, differenceInHours } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Link from 'next/link';

const ACTIVITY_TYPES: ActivityType[] = [
  'Call made', 'Intro meeting', 'Follow up', 'Proposal send', 'Demo done', 
  'Presentation done', 'Negotiation', 'Quotation shared', 'Contract send', 
  'Invoice send', 'Closed won', 'Closed lost'
];

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const firestore = useFirestore();

  const leadRef = useMemoFirebase(() => id && firestore ? doc(firestore, 'leads', id as string) : null, [id, firestore]);
  const { data: lead, loading: leadLoading } = useDoc<Lead>(leadRef as any);

  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return query(collection(firestore, 'leads', id as string, 'activities'), orderBy('createdAt', 'desc'));
  }, [firestore, id]);
  const { data: activities } = useCollection<LeadActivity>(activitiesQuery as any);

  const tiersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'tiers') : null, [firestore]);
  const { data: tiers } = useCollection<Tier>(tiersQuery as any);

  const [remark, setRemark] = useState('');
  const [type, setType] = useState<ActivityType>('Call made');
  const [scheduledAt, setScheduledAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [nextActionType, setNextActionType] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [outcomeStatus, setOutcomeStatus] = useState('Pending');
  const [submitting, setSubmitting] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<LeadStatus | null>(null);

  const handleStatusChangeRequest = (newStatus: LeadStatus) => {
    if (newStatus === lead?.status) return;
    setConfirmStatus(newStatus);
  };

  const confirmStatusChange = async () => {
    if (!leadRef || !confirmStatus) return;
    try {
      await updateDoc(leadRef, { status: confirmStatus, lastActivityAt: new Date().toISOString() });
      toast({ title: "Status Updated", description: `Lead marked as ${confirmStatus}` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not update status." });
    } finally {
      setConfirmStatus(null);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remark.trim() || !firestore || !id || !user || !lead) return;
    setSubmitting(true);

    try {
      const now = new Date().toISOString();
      const activityData = {
        leadId: id as string,
        agentId: user.id,
        agentName: user.name,
        type,
        scheduledAt,
        remark,
        nextActionType,
        nextActionDate,
        outcomeStatus,
        createdAt: now,
      };

      await addDoc(collection(firestore, 'leads', id as string, 'activities'), activityData);
      
      const updateData: any = { lastActivityAt: now };
      
      // Capture first response if this is the first interaction
      if (!lead.firstResponseAt) {
        updateData.firstResponseAt = now;
      }

      if (type === 'Contract send') {
        updateData.contractSignedAt = now; // Simplified logic: track when contract is initiated
      }

      if (type === 'Closed won') {
        updateData.status = 'won';
        updateData.wonAt = now;

        // COMMISSION AUTOMATION TRIGGER
        const currentTier = tiers?.find(t => t.id === user.tierId);
        const commPct = currentTier?.commissionPct || 5;
        const commAmount = (lead.estimatedBudget * commPct) / 100;

        await addDoc(collection(firestore, 'commissions'), {
          agentId: user.id,
          leadId: lead.id,
          clientName: lead.clientName,
          dealAmount: lead.estimatedBudget,
          commissionPct: commPct,
          amount: commAmount,
          status: 'pending',
          triggerType: 'Deal marked Won',
          createdAt: now
        });

        // Update Wallet Pending
        const walletRef = doc(firestore, 'wallets', user.id);
        const walletSnap = await getDoc(walletRef);
        if (walletSnap.exists()) {
          const w = walletSnap.data();
          await updateDoc(walletRef, {
            pending: (w.pending || 0) + commAmount,
            totalEarned: (w.totalEarned || 0) + commAmount
          });
        }
      } else if (type === 'Closed lost') {
        updateData.status = 'lost';
      }

      await updateDoc(doc(firestore, 'leads', id as string), updateData);
      setRemark(''); setNextActionType(''); setNextActionDate('');
      toast({ title: "Activity Logged", description: "Interaction recorded successfully." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to log activity." });
    } finally {
      setSubmitting(false);
    }
  };

  if (leadLoading) return <Shell><div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" /></div></Shell>;
  if (!lead) return <Shell><div className="py-20 text-center text-muted-foreground">Lead not found.</div></Shell>;

  const daysInPipeline = differenceInDays(new Date(), parseISO(lead.createdAt));
  const lastActivityDate = lead.lastActivityAt ? parseISO(lead.lastActivityAt) : parseISO(lead.createdAt);
  
  // Calculate Response Time
  const firstResponseHours = lead.firstResponseAt 
    ? differenceInHours(parseISO(lead.firstResponseAt), parseISO(lead.createdAt))
    : null;

  return (
    <Shell>
      <div className="text-[12px] text-slate-500 mb-1 flex items-center gap-1">
        <Link href="/leads" className="hover:text-primary transition-colors">My leads</Link>
        <span>></span><span className="text-slate-900 font-medium">{lead.clientName}</span>
      </div>

      <div className="h-[52px] flex items-center justify-between border-b mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[18px] font-bold">{lead.clientName}</h1>
          <span className="text-slate-400">/</span>
          <span className="text-[14px] text-slate-600 font-medium">{lead.companyName || 'Private Individual'}</span>
          <StatusBadge status={lead.status} />
        </div>
        <Select value={lead.status} onValueChange={(val) => handleStatusChangeRequest(val as LeadStatus)}>
          <SelectTrigger className="h-8 text-xs min-w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'dormant'].map(s => (
              <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lifecycle Metrics Bar */}
      <div className="flex items-center gap-6 py-2 px-1 border-b mb-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 overflow-x-auto whitespace-nowrap">
        <div className="flex gap-2 items-center">
          <CalendarIcon size={12} />
          <span>Created: <b className="text-slate-700">{format(parseISO(lead.createdAt), 'MMM d, yyyy')}</b></span>
        </div>
        <div className="h-3 w-px bg-slate-200" />
        <div className="flex gap-2 items-center">
          <Activity size={12} />
          <span>Pipeline: <b className="text-slate-700">{daysInPipeline} Days</b></span>
        </div>
        <div className="h-3 w-px bg-slate-200" />
        <div className="flex gap-2 items-center">
          <Zap size={12} />
          <span>Response: <b className="text-slate-700">{firstResponseHours !== null ? `${firstResponseHours}h` : 'Pending'}</b></span>
        </div>
        <div className="h-3 w-px bg-slate-200" />
        <div className="flex gap-2 items-center">
          <Clock size={12} />
          <span>Last Touch: <b className="text-slate-700">{formatDistanceToNow(lastActivityDate)} ago</b></span>
        </div>
        {lead.wonAt && (
          <>
            <div className="h-3 w-px bg-slate-200" />
            <div className="flex gap-2 items-center">
              <CheckCircle2 size={12} className="text-emerald-500" />
              <span>Time to Close: <b className="text-emerald-700">{differenceInDays(parseISO(lead.wonAt), parseISO(lead.createdAt))} Days</b></span>
            </div>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-10 gap-6">
        <div className="lg:col-span-6 space-y-6">
          <Card className="rounded-none border-[0.5px] shadow-none">
            <CardHeader className="p-3 border-b bg-slate-50/30"><CardTitle className="text-[12px] uppercase font-bold text-slate-500">Lead Information</CardTitle></CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                {[
                  { label: 'Phone', value: lead.clientPhone },
                  { label: 'Email', value: lead.clientEmail },
                  { label: 'Country', value: lead.businessCountry },
                  { label: 'Region', value: lead.businessRegion },
                  { label: 'Budget', value: `$${lead.estimatedBudget.toLocaleString()}` },
                  { label: 'Channel', value: lead.firstContactChannel },
                  { label: 'Sub-channel', value: lead.firstContactSubchannel },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <span className="text-[12px] text-slate-500 font-medium">{item.label}</span>
                    <span className="text-[13px] text-primary font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-[0.5px] shadow-none">
            <CardHeader className="p-3 border-b bg-slate-50/30"><CardTitle className="text-[12px] uppercase font-bold text-slate-500">Log Activity</CardTitle></CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleAddActivity} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Activity Type</Label>
                    <Select value={type} onValueChange={(val) => setType(val as ActivityType)}>
                      <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t} className="text-[11px]">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Outcome Status</Label>
                    <Select value={outcomeStatus} onValueChange={setOutcomeStatus}>
                      <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Pending', 'Success', 'Negative', 'Rescheduled'].map(s => <SelectItem key={s} value={s} className="text-[11px]">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Remark <span className="text-red-500">*</span></Label>
                  <Textarea required className="text-[11px] min-h-[80px]" placeholder="Interaction details..." value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={1000} />
                </div>
                <Button type="submit" className="w-full h-9 font-bold" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Save Activity'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card className="rounded-none border-[0.5px] shadow-none h-full">
            <CardHeader className="p-3 border-b bg-slate-50/30 flex flex-row items-center justify-between">
              <CardTitle className="text-[12px] uppercase font-bold text-slate-500">Activity Timeline</CardTitle>
              <History size={14} className="text-slate-400" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y overflow-y-auto max-h-[800px]">
                {activities?.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-slate-50/30 transition-colors">
                    <div className="flex gap-3">
                      <div className="mt-1 w-2 h-2 rounded-full shrink-0 bg-primary" />
                      <div className="space-y-1 w-full">
                        <div className="flex items-center justify-between"><span className="text-[13px] font-bold">{activity.type}</span><span className="text-[10px] text-slate-400">{format(parseISO(activity.createdAt), 'MMM d, h:mm a')}</span></div>
                        <div className="text-[11px] text-slate-500">Added by <span className="font-bold">{activity.agentName || 'System'}</span></div>
                        <p className="text-[13px] text-slate-700 whitespace-pre-wrap mt-1">{activity.remark}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {(!activities || activities.length === 0) && (
                  <div className="p-10 text-center text-slate-400 italic text-[12px]">No activity history yet.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!confirmStatus} onOpenChange={() => setConfirmStatus(null)}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader><AlertDialogTitle>Move Stage?</AlertDialogTitle><AlertDialogDescription className="text-xs">Confirm moving this lead to <strong>{confirmStatus}</strong>?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmStatusChange} className="h-8 text-xs">Apply Change</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}
