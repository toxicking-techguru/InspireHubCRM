
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, updateDoc, query, orderBy, getDoc } from 'firebase/firestore';
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
import { format, formatDistanceToNow, differenceInDays, parseISO, differenceInHours } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Link from 'next/link';

const ACTIVITY_TYPES: ActivityType[] = [
  'Call made', 'Intro meeting', 'Follow up', 'Proposal send', 'Demo done', 
  'Presentation done', 'Negotiation', 'Quotation shared', 'Contract send', 
  'Invoice send', 'Closed won', 'Closed lost', 'Outreach', 'Site visit'
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
  const [dateDone, setDateDone] = useState(format(new Date(), "yyyy-MM-dd"));
  const [scheduledAt, setScheduledAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [nextActionType, setNextActionType] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [outcomeStatus, setOutcomeStatus] = useState('Pending');
  const [fileUrl, setFileUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<LeadStatus | null>(null);

  const handleGetLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: new Date().toISOString() });
        setLocating(false);
        toast({ title: "Site Location Captured" });
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
        scheduledAt,
        remark,
        nextActionType,
        nextActionDate,
        outcomeStatus,
        fileUrl,
        location: location || null,
        createdAt: now,
      };

      await addDoc(collection(firestore, 'leads', id as string, 'activities'), activityData);
      
      const updateData: any = { lastActivityAt: now };
      if (!lead.firstResponseAt) updateData.firstResponseAt = now;
      if (type === 'Contract send') updateData.contractSignedAt = now;

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
      setRemark(''); setNextActionType(''); setNextActionDate(''); setFileUrl(''); setLocation(null);
      toast({ title: "Activity Logged" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setSubmitting(false);
    }
  };

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

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <Card className="shadow-none border-[0.5px]">
            <CardHeader className="p-3 bg-slate-50/50 border-b flex flex-row items-center gap-2">
               <ClipboardList size={14} className="text-cyan-600" />
               <CardTitle className="text-[11px] uppercase font-bold text-slate-500">Qualification Insights</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
               <div>
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">Client Brief</Label>
                  <p className="text-[13px] text-slate-700 leading-relaxed">{lead.clientBrief || 'Not provided'}</p>
               </div>
               <div>
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">Pain Points</Label>
                  <p className="text-[13px] text-slate-700 leading-relaxed">{lead.painPoints || 'Not analyzed'}</p>
               </div>
               <div>
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">Proposed Offering</Label>
                  <p className="text-[13px] text-slate-700 leading-relaxed">{lead.serviceOffering || 'Not defined'}</p>
               </div>
               <div className="pt-2 border-t">
                  <div className="flex justify-between items-center text-[12px]">
                     <span className="text-slate-500">Est. Budget:</span>
                     <span className="font-bold text-cyan-700">${(lead.estimatedBudget || 0).toLocaleString()}</span>
                  </div>
               </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-[0.5px]">
            <CardHeader className="p-3 bg-slate-50/50 border-b">
               <CardTitle className="text-[11px] uppercase font-bold text-slate-500">Log Field Progress</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleAddActivity} className="space-y-4">
                <div className="space-y-1.5">
                   <Label className="text-[11px] font-bold">Activity Performed</Label>
                   <Select value={type} onValueChange={(val) => setType(val as ActivityType)}>
                      <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                   </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold">Completion Date</Label>
                      <Input type="date" className="h-8 text-[12px]" value={dateDone} onChange={(e) => setDateDone(e.target.value)} />
                   </div>
                   <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold">Site Check-in</Label>
                      <Button type="button" variant="outline" size="sm" className={cn("w-full h-8 text-[11px] gap-1", location && "text-emerald-600 border-emerald-200 bg-emerald-50")} onClick={handleGetLocation}>
                         {locating ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
                         {location ? "Check-in OK" : "Pin Location"}
                      </Button>
                   </div>
                </div>

                <div className="space-y-1.5">
                   <Label className="text-[11px] font-bold uppercase text-slate-400">Next Planned Action</Label>
                   <div className="flex gap-2">
                      <Input placeholder="What's next?" className="h-8 text-[12px] flex-1" value={nextActionType} onChange={(e) => setNextActionType(e.target.value)} />
                      <Input type="date" className="h-8 text-[12px] w-[130px]" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} />
                   </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold">Progress Notes</Label>
                  <Textarea required className="text-[12px] min-h-[100px]" placeholder="Detailed log of results, feedback, or outreach outcomes..." value={remark} onChange={(e) => setRemark(e.target.value)} />
                </div>

                <Button type="submit" className="w-full h-9 font-bold text-[12px] bg-cyan-600 hover:bg-cyan-700 shadow-md" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" size={14} /> : 'Record Step & Sync'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card className="h-full shadow-none border-[0.5px]">
            <CardHeader className="p-3 border-b bg-slate-50/50 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                 <HistoryIcon size={14} className="text-cyan-600" />
                 <CardTitle className="text-[11px] uppercase font-bold text-slate-500">Pipeline Velocity & History</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {activities?.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-slate-50/10 transition-colors">
                    <div className="flex gap-4">
                      <div className="mt-1 w-2.5 h-2.5 rounded-full bg-cyan-600 shrink-0 shadow-sm" />
                      <div className="space-y-1 w-full">
                        <div className="flex items-center justify-between">
                          <span className="text-[14px] font-bold text-slate-900">{activity.type}</span>
                          <span className="text-[11px] text-slate-400 font-medium">Done: {activity.dateDone || format(parseISO(activity.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                           <span className="text-[11px] text-slate-500">Captured by <b className="text-slate-700">{activity.agentName || 'System'}</b></span>
                           {activity.location && (
                             <Badge variant="outline" className="text-[9px] h-3.5 gap-1 border-emerald-100 text-emerald-700 bg-emerald-50">
                               <MapPin size={8} /> {activity.location.lat.toFixed(3)}, {activity.location.lng.toFixed(3)}
                             </Badge>
                           )}
                        </div>
                        <p className="text-[13px] text-slate-600 whitespace-pre-wrap mt-2 leading-relaxed bg-slate-50/50 p-3 rounded border border-slate-100/50">{activity.remark}</p>
                        
                        {activity.nextActionType && (
                          <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-700 font-bold bg-amber-50/50 p-2 rounded border border-amber-100/30">
                             <Clock size={12} /> NEXT ACTION: {activity.nextActionType} {activity.nextActionDate && `ON ${activity.nextActionDate}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {(!activities || activities.length === 0) && (
                  <div className="p-20 text-center flex flex-col items-center gap-2">
                     <AlertCircle size={32} className="text-slate-200" />
                     <p className="text-slate-400 text-[12px] italic">Awaiting field activity for this lead.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!confirmStatus} onOpenChange={() => setConfirmStatus(null)}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader><AlertDialogTitle>Confirm Stage Migration</AlertDialogTitle><AlertDialogDescription>Manually override the pipeline status for this lead? This bypasses automatic activity logging triggers.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmStatusChange} className="h-8 text-xs bg-cyan-600">Sync Change</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}
