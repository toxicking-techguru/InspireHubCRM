
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, updateDoc, query, orderBy, where, getDocs, limit } from 'firebase/firestore';
import { useAuthStore } from '@/store/useAuthStore';
import { Lead, LeadActivity, Product, LeadStatus, ActivityType } from '@/types/crm';
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
  ChevronLeft,
  AlertCircle,
  FileText,
  Loader2,
  MoreVertical,
  Paperclip,
  Zap
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
import { format, formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Link from 'next/link';

const ACTIVITY_TYPES: ActivityType[] = [
  'Call made', 'Intro meeting', 'Follow up', 'Proposal sent', 'Demo done', 
  'Presentation', 'Negotiation', 'Quotation shared', 'Contract sent', 
  'Invoice sent', 'Closed won', 'Closed lost'
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
    return query(
      collection(firestore, 'leads', id as string, 'activities'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, id]);
  const { data: activities } = useCollection<LeadActivity>(activitiesQuery as any);

  const [remark, setRemark] = useState('');
  const [type, setType] = useState<ActivityType>('Call made');
  const [scheduledAt, setScheduledAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [nextActionType, setNextActionType] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [outcomeStatus, setOutcomeStatus] = useState('Pending');
  const [submitting, setSubmitting] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<LeadStatus | null>(null);
  const [duplicateLead, setDuplicateLead] = useState<{id: string, name: string} | null>(null);

  // Check for duplicates
  useEffect(() => {
    if (!lead || !firestore) return;
    const checkDup = async () => {
      const q = query(
        collection(firestore, 'leads'),
        where('clientEmail', '==', lead.clientEmail),
        limit(5)
      );
      const snap = await getDocs(q);
      const other = snap.docs.find(d => d.id !== id);
      if (other) setDuplicateLead({ id: other.id, name: other.data().clientName });
    };
    checkDup();
  }, [lead, firestore, id]);

  if (leadLoading) return <Shell><div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" /></div></Shell>;
  if (!lead) return <Shell><div className="py-20 text-center text-muted-foreground">Lead not found.</div></Shell>;

  const handleStatusChangeRequest = (newStatus: LeadStatus) => {
    if (newStatus === lead.status) return;
    setConfirmStatus(newStatus);
  };

  const confirmStatusChange = async () => {
    if (!leadRef || !confirmStatus) return;
    try {
      await updateDoc(leadRef, { 
        status: confirmStatus,
        lastActivityAt: new Date().toISOString()
      });
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
      const activityData: any = {
        leadId: id as string,
        agentId: user.id,
        agentName: user.name,
        clientName: lead.clientName, // Store clientName for cross-reference in activities page
        type,
        scheduledAt,
        remark,
        nextActionType,
        nextActionDate,
        outcomeStatus,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(firestore, 'leads', id as string, 'activities'), activityData);
      
      const updateData: any = { lastActivityAt: new Date().toISOString() };
      if (type === 'Closed won') {
        updateData.status = 'won';
        updateData.wonAt = new Date().toISOString();
      } else if (type === 'Closed lost') {
        updateData.status = 'lost';
      }

      await updateDoc(doc(firestore, 'leads', id as string), updateData);

      setRemark('');
      setNextActionType('');
      setNextActionDate('');
      toast({ title: "Activity Logged", description: "Interaction recorded successfully." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to log activity." });
    } finally {
      setSubmitting(false);
    }
  };

  const daysInPipeline = differenceInDays(new Date(), parseISO(lead.createdAt));
  const lastActivityDate = lead.lastActivityAt ? parseISO(lead.lastActivityAt) : parseISO(lead.createdAt);
  const daysSinceLastActivity = differenceInDays(new Date(), lastActivityDate);
  
  // Calculate first response time (mock logic or find first activity that isn't the creation note)
  const firstActivity = activities?.filter(a => a.type !== 'Call made').reverse()[0];
  const firstResponse = firstActivity ? formatDistanceToNow(parseISO(lead.createdAt), { addSuffix: false }) : 'N/A';

  return (
    <Shell>
      {/* Breadcrumb */}
      <div className="text-[12px] text-slate-500 mb-1 flex items-center gap-1">
        <Link href="/leads" className="hover:text-primary transition-colors">My leads</Link>
        <span>></span>
        <span className="text-slate-900 font-medium">{lead.clientName}</span>
      </div>

      {/* Duplicate Banner */}
      {duplicateLead && (
        <div className="mb-4 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle size={14} />
          <span>Potential duplicate found with <Link href={`/leads/${duplicateLead.id}`} className="underline font-bold">{duplicateLead.name}</Link></span>
        </div>
      )}

      {/* Header */}
      <div className="h-[52px] flex items-center justify-between border-b mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[18px] font-bold">{lead.clientName}</h1>
          <span className="text-slate-400">/</span>
          <span className="text-[14px] text-slate-600 font-medium">{lead.companyName || 'Private Individual'}</span>
          <StatusBadge status={lead.status} />
        </div>
        <div className="flex items-center gap-3">
          <Select value={lead.status} onValueChange={(val) => handleStatusChangeRequest(val as LeadStatus)}>
            <SelectTrigger className="h-8 text-xs min-w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'dormant'].map(s => (
                <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="flex items-center gap-6 py-2 px-1 border-b mb-6 text-[11px] font-bold uppercase tracking-tight text-slate-400">
        <div className="flex gap-2 items-center">
          <span>Days in Pipeline:</span>
          <span className="text-slate-900">{daysInPipeline} days</span>
        </div>
        <div className="h-3 w-px bg-slate-200" />
        <div className="flex gap-2 items-center">
          <span>First Response:</span>
          <span className="text-slate-900">{firstResponse}</span>
        </div>
        <div className="h-3 w-px bg-slate-200" />
        <div className="flex gap-2 items-center">
          <span>Last Activity:</span>
          <span className="text-slate-900">{formatDistanceToNow(lastActivityDate)} ago</span>
        </div>
        <div className="h-3 w-px bg-slate-200" />
        <div className="flex gap-2 items-center">
          <span>Idle Time:</span>
          <span className={cn("text-slate-900", daysSinceLastActivity > 3 ? "text-red-600" : "")}>
            {daysSinceLastActivity} days
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-10 gap-6">
        {/* Left Column: 55% */}
        <div className="lg:col-span-6 space-y-6">
          {/* Lead Info Card */}
          <Card className="rounded-none border-[0.5px] shadow-none">
            <CardHeader className="p-3 border-b bg-slate-50/30">
              <CardTitle className="text-[12px] uppercase font-bold text-slate-500">Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                {[
                  { label: 'Phone', value: lead.clientPhone, icon: Phone },
                  { label: 'Email', value: lead.clientEmail, icon: Mail },
                  { label: 'Country', value: lead.businessCountry, icon: Globe },
                  { label: 'Region', value: lead.businessRegion, icon: Globe },
                  { label: 'Budget', value: `$${lead.estimatedBudget.toLocaleString()}`, icon: Clock },
                  { label: 'Channel', value: lead.firstContactChannel, icon: History },
                  { label: 'Sub-channel', value: lead.firstContactSubchannel, icon: History },
                  { label: 'Assigned Agent', value: user?.id === lead.agentId ? 'You' : 'Other Agent', icon: CheckCircle2 },
                  { label: 'Created Date', value: format(parseISO(lead.createdAt), 'MMM d, yyyy'), icon: CalendarIcon },
                  { label: 'First Response', value: firstResponse, icon: Clock },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <span className="text-[12px] text-slate-500 font-medium">{item.label}</span>
                    <span className="text-[13px] text-primary font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activity Form */}
          <Card className="rounded-none border-[0.5px] shadow-none">
            <CardHeader className="p-3 border-b bg-slate-50/30">
              <CardTitle className="text-[12px] uppercase font-bold text-slate-500">Log Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleAddActivity} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Activity Type</Label>
                    <Select value={type} onValueChange={(val) => setType(val as ActivityType)}>
                      <SelectTrigger className="h-8 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t} className="text-[11px]">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Date & Time</Label>
                    <Input 
                      type="datetime-local" 
                      className="h-8 text-[11px]" 
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Next Action</Label>
                    <Input 
                      placeholder="e.g. Follow-up Call" 
                      className="h-8 text-[11px]" 
                      value={nextActionType}
                      onChange={(e) => setNextActionType(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Next Action Date</Label>
                    <Input 
                      type="date" 
                      className="h-8 text-[11px]" 
                      value={nextActionDate}
                      onChange={(e) => setNextActionDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Outcome Status</Label>
                    <Select value={outcomeStatus} onValueChange={setOutcomeStatus}>
                      <SelectTrigger className="h-8 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['Pending', 'Success', 'Negative', 'Rescheduled'].map(s => <SelectItem key={s} value={s} className="text-[11px]">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Attachments</Label>
                    <div className="h-8 border border-dashed rounded flex items-center px-3 gap-2 text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors">
                      <Paperclip size={12} />
                      <span className="text-[10px]">Click to upload</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Remark <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Textarea 
                      required 
                      className="text-[11px] min-h-[80px] resize-none pr-10" 
                      placeholder="Details of the interaction..." 
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      maxLength={1000}
                    />
                    <span className="absolute bottom-1 right-2 text-[10px] text-slate-400">
                      {remark.length}/1000
                    </span>
                  </div>
                </div>

                <Button type="submit" className="w-full h-9 text-[13px] font-bold" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Save Activity'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: 45% */}
        <div className="lg:col-span-4">
          <Card className="rounded-none border-[0.5px] shadow-none h-full">
            <CardHeader className="p-3 border-b bg-slate-50/30 flex flex-row items-center justify-between">
              <CardTitle className="text-[12px] uppercase font-bold text-slate-500">Activity Timeline</CardTitle>
              <History size={14} className="text-slate-400" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y overflow-y-auto max-h-[800px]">
                {activities?.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-slate-50/30 transition-colors relative">
                    <div className="flex gap-3">
                      <div className="mt-1 w-2 h-2 rounded-full shrink-0 bg-primary" />
                      <div className="space-y-1 w-full">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-bold">{activity.type}</span>
                          <span className="text-[10px] text-slate-400">
                            {format(parseISO(activity.createdAt), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Added by <span className="font-bold">{activity.agentName || 'System'}</span>
                        </div>
                        <p className="text-[13px] text-slate-700 whitespace-pre-wrap mt-1">
                          {activity.remark}
                        </p>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold uppercase">
                            {activity.outcomeStatus}
                          </span>
                          {activity.nextActionType && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold">
                              <CalendarIcon size={8} />
                              NEXT: {activity.nextActionType} ({activity.nextActionDate})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {(!activities || activities.length === 0) && (
                  <div className="p-12 text-center">
                    <Clock size={32} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-[11px] text-muted-foreground italic">No activities recorded yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AlertDialog open={!!confirmStatus} onOpenChange={() => setConfirmStatus(null)}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Move Stage?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to move this lead to <strong>{confirmStatus}</strong>? This will update the pipeline status immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange} className="h-8 text-xs">Apply Change</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}
