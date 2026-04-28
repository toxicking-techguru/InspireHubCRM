
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { useAuthStore } from '@/store/useAuthStore';
import { Lead, LeadActivity, LeadStatus, ActivityType, Tier, GeoLocation } from '@/types/crm';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  History as HistoryIcon, 
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Paperclip,
  Activity,
  Zap,
  ExternalLink,
  MapPin,
  ClipboardList
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
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const ACTIVITY_TYPES: ActivityType[] = [
  'Call made', 'Intro meeting', 'Follow up', 'Proposal send', 'Demo done', 
  'Presentation done', 'Negotiation', 'Quotation shared', 'Contract send', 
  'Invoice send', 'Closed won', 'Closed lost', 'Outreach', 'Site visit'
];

export default function LeadDetailPage() {
  const { id } = useParams();
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
  const [dateDone, setDateDone] = useState(format(new Date(), "yyyy-MM-dd"));
  const [nextActionType, setNextActionType] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<LeadStatus | null>(null);

  const handleGetLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: new Date().toISOString() };
        setLocation(newLoc);
        setLocating(false);
        toast({ title: "Location Captured" });
      },
      () => {
        toast({ variant: "destructive", title: "Location Error" });
        setLocating(false);
      }
    );
  };

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
        clientName: lead.clientName,
        agentId: user.id,
        agentName: user.name,
        type,
        dateDone,
        remark,
        nextActionType,
        nextActionDate,
        location: location || null,
        createdAt: now,
        outcomeStatus: 'recorded'
      };

      await addDoc(collection(firestore, 'leads', id as string, 'activities'), activityData);
      
      const updateData: any = { lastActivityAt: now };
      if (!lead.firstResponseAt) updateData.firstResponseAt = now;
      if (type === 'Contract send') updateData.contractSignedAt = now;
      if (location) updateData.location = location; 

      if (type === 'Closed won') {
        updateData.status = 'won';
        updateData.wonAt = now;
        const currentTier = tiers?.find(t => t.id === user.tierId);
        const commPct = currentTier?.commissionPct || 5;
        const commAmount = (lead.estimatedBudget * commPct) / 100;

        await addDoc(collection(firestore, 'commissions'), {
          agentId: user.id, leadId: lead.id, clientName: lead.clientName,
          dealAmount: lead.estimatedBudget, commissionPct: commPct, amount: commAmount,
          status: 'pending', triggerType: 'Deal marked Won', createdAt: now
        });
      } else if (type === 'Closed lost') {
        updateData.status = 'lost';
      }

      await updateDoc(doc(firestore, 'leads', id as string), updateData);
      setRemark(''); setNextActionType(''); setNextActionDate(''); setLocation(null);
      toast({ title: "Activity Logged" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setSubmitting(false);
    }
  };

  const overdueAction = useMemo(() => {
    if (!activities) return null;
    const lastWithAction = activities.find(a => a.nextActionDate);
    if (!lastWithAction) return null;
    
    const today = new Date().toISOString().split('T')[0];
    if (lastWithAction.nextActionDate < today) return lastWithAction;
    return null;
  }, [activities]);

  if (leadLoading) return <Shell><div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" /></div></Shell>;
  if (!lead) return <Shell><div className="py-20 text-center">Lead not found.</div></Shell>;

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[20px] font-bold text-slate-900">{lead.clientName}</h1>
          <StatusBadge status={lead.status} />
        </div>
        <div className="flex items-center gap-2">
            <Select value={lead.status} onValueChange={(val) => handleStatusChangeRequest(val as LeadStatus)}>
              <SelectTrigger className="h-8 text-xs min-w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'dormant'].map(s => (
                  <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
      </div>

      {overdueAction && (
        <div className="mb-6 bg-red-50 border border-red-100 p-3 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-red-700">
             <AlertCircle size={18} />
             <div className="text-[12px]">
                <p className="font-bold uppercase tracking-tight">Pending Action Overdue</p>
                <p>Reminder: <b>{overdueAction.nextActionType}</b> was due on {overdueAction.nextActionDate}.</p>
             </div>
          </div>
          <Badge variant="outline" className="bg-white text-red-600 border-red-200">Needs Update</Badge>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <Card className="shadow-none border-[0.5px]">
            <CardHeader className="p-3 bg-slate-50/50 border-b flex flex-row items-center justify-between">
               <div className="flex items-center gap-2">
                 <ClipboardList size={14} className="text-cyan-600" />
                 <CardTitle className="text-[11px] uppercase font-bold text-slate-500">Qualification & Analysis</CardTitle>
               </div>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
               <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <div>
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Brief</Label>
                        <p className="text-[13px] text-slate-700 leading-relaxed mt-1">{lead.clientBrief || 'No background info logged.'}</p>
                     </div>
                     <div>
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Core Pain Points</Label>
                        <p className="text-[13px] text-slate-700 leading-relaxed mt-1">{lead.painPoints || 'Challenges not analyzed yet.'}</p>
                     </div>
                  </div>
                  <div className="space-y-4 border-l pl-6 border-slate-100">
                     <div>
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proposed Offering</Label>
                        <p className="text-[13px] text-slate-700 leading-relaxed mt-1">{lead.serviceOffering || 'Offering not defined.'}</p>
                     </div>
                     <div className="pt-4 mt-4 border-t">
                        <div className="flex justify-between items-center text-[12px] p-3 bg-cyan-50/50 rounded-md border border-cyan-100/50">
                           <span className="text-cyan-600 font-bold uppercase tracking-tight">Est. Budget:</span>
                           <span className="font-bold text-cyan-950 text-[16px]">${(lead.estimatedBudget || 0).toLocaleString()}</span>
                        </div>
                     </div>
                  </div>
               </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-[0.5px]">
            <CardHeader className="p-3 bg-slate-50/50 border-b">
               <CardTitle className="text-[11px] uppercase font-bold text-slate-500">Record Field Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleAddActivity} className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                   <div className="space-y-1.5 md:col-span-1">
                      <Label className="text-[11px] font-bold">Activity Type</Label>
                      <Select value={type} onValueChange={(val) => setType(val as ActivityType)}>
                         <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                         <SelectContent>{ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold">Completion Date</Label>
                      <Input type="date" className="h-8 text-[12px]" value={dateDone} onChange={(e) => setDateDone(e.target.value)} />
                   </div>
                   <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold">GPS Check-in</Label>
                      <Button type="button" variant="outline" size="sm" className={cn("w-full h-8 text-[11px] gap-1", location && "text-emerald-600 border-emerald-200 bg-emerald-50")} onClick={handleGetLocation}>
                         {locating ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
                         {location ? "Position Locked" : "Log Site Visit"}
                      </Button>
                   </div>
                </div>

                <div className="space-y-1.5 p-3 bg-slate-50 rounded-md border border-slate-100">
                   <Label className="text-[10px] font-bold uppercase text-slate-400">Set Next Action (The "Checker")</Label>
                   <div className="flex gap-3">
                      <Input placeholder="What is the next step?" className="h-8 text-[12px] flex-1 bg-white" value={nextActionType} onChange={(e) => setNextActionType(e.target.value)} />
                      <Input type="date" className="h-8 text-[12px] w-[150px] bg-white" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} />
                   </div>
                   <p className="text-[10px] text-slate-400 italic">Setting a date creates a system reminder. It checks out when your next log is saved.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold">Interaction Remark</Label>
                  <Textarea required className="text-[12px] min-h-[80px]" placeholder="Summary of outcomes, feedback, or results..." value={remark} onChange={(e) => setRemark(e.target.value)} />
                </div>

                <Button type="submit" className="w-full h-9 font-bold text-[12px] bg-cyan-600 hover:bg-cyan-700 shadow-md" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" size={14} /> : 'Sync Activity & Move Pipeline'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card className="h-full shadow-none border-[0.5px]">
            <CardHeader className="p-3 border-b bg-slate-50/50">
              <div className="flex items-center gap-2">
                 <HistoryIcon size={14} className="text-cyan-600" />
                 <CardTitle className="text-[11px] uppercase font-bold text-slate-500">Interaction History</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {activities?.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-slate-50/10 transition-colors">
                    <div className="flex gap-3">
                      <div className="mt-1.5 w-2 h-2 rounded-full bg-cyan-600 shrink-0" />
                      <div className="space-y-1.5 w-full">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-bold text-slate-900">{activity.type}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{activity.dateDone || format(parseISO(activity.createdAt), 'MMM d')}</span>
                        </div>
                        <p className="text-[12px] text-slate-600 leading-snug">{activity.remark}</p>
                        
                        <div className="flex items-center gap-3">
                           {activity.location && (
                             <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded">
                               <MapPin size={8} /> Site Pin
                             </div>
                           )}
                           {activity.nextActionType && (
                             <div className="flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase bg-amber-50 px-1.5 py-0.5 rounded">
                               <Clock size={8} /> Task Set
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {(!activities || activities.length === 0) && (
                  <div className="p-20 text-center flex flex-col items-center gap-2">
                     <AlertCircle size={32} className="text-slate-200" />
                     <p className="text-slate-400 text-[11px] italic">Awaiting field activity.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!confirmStatus} onOpenChange={() => setConfirmStatus(null)}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader><AlertDialogTitle>Stage Migration</AlertDialogTitle><AlertDialogDescription>Manually update the pipeline stage? This will reset the last activity timer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmStatusChange} className="h-8 text-xs bg-cyan-600">Update Now</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}
