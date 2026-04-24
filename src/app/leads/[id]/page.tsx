"use client"

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { useDoc, useCollection, useFirestore } from '@/firebase';
import { doc, collection, addDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useAuthStore } from '@/store/useAuthStore';
import { Lead, LeadActivity, Product, LeadStatus } from '@/types/crm';
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
  AlertCircle
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
import { format } from 'date-fns';

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const firestore = useFirestore();

  const leadRef = useMemo(() => id && firestore ? doc(firestore, 'leads', id as string) : null, [id, firestore]);
  const { data: lead, loading: leadLoading } = useDoc<Lead>(leadRef as any);

  const activitiesQuery = useMemo(() => {
    if (!firestore || !id) return null;
    return query(
      collection(firestore, 'leads', id as string, 'activities'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, id]);
  const { data: activities } = useCollection<LeadActivity>(activitiesQuery as any);

  const [remark, setRemark] = useState('');
  const [type, setType] = useState<LeadActivity['type']>('call');
  const [nextActionType, setNextActionType] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (leadLoading) return <Shell><div>Loading lead details...</div></Shell>;
  if (!lead) return <Shell><div>Lead not found.</div></Shell>;

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!leadRef) return;
    try {
      await updateDoc(leadRef, { 
        status: newStatus,
        lastActivityAt: new Date().toISOString()
      });
      toast({ title: "Status Updated", description: `Lead marked as ${newStatus}` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not update status." });
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remark.trim() || !firestore || !id || !user) return;
    setSubmitting(true);

    try {
      const activityData: Partial<LeadActivity> = {
        leadId: id as string,
        agentId: user.id,
        type,
        remark,
        nextActionType,
        nextActionDate,
        outcomeStatus: 'recorded',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(firestore, 'leads', id as string, 'activities'), activityData);
      await updateDoc(doc(firestore, 'leads', id as string), {
        lastActivityAt: new Date().toISOString()
      });

      setRemark('');
      setNextActionType('');
      setNextActionDate('');
      toast({ title: "Activity Logged", description: "Interaction has been recorded in the timeline." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to log activity." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 gap-1">
          <ChevronLeft size={14} /> Back
        </Button>
        <div className="h-4 w-px bg-border mx-1"></div>
        <h1 className="text-xl font-bold">{lead.clientName}</h1>
        <StatusBadge status={lead.status} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Lead Info & Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-sm">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-4 space-y-3">
              <div className="flex items-center gap-3 text-sm-dense">
                <Mail size={14} className="text-muted-foreground" />
                <span>{lead.clientEmail}</span>
              </div>
              <div className="flex items-center gap-3 text-sm-dense">
                <Phone size={14} className="text-muted-foreground" />
                <span>{lead.clientPhone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm-dense">
                <Globe size={14} className="text-muted-foreground" />
                <span>{lead.businessCountry} ({lead.businessRegion})</span>
              </div>
              <div className="pt-2 border-t mt-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Budget</p>
                <p className="text-sm font-bold text-primary">${lead.estimatedBudget.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm">Pipeline Management</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Current Stage</Label>
                <Select value={lead.status} onValueChange={(val) => handleStatusChange(val as LeadStatus)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'dormant'].map(s => (
                      <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm">Log New Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <form onSubmit={handleAddActivity} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <Select value={type} onValueChange={(val) => setType(val as any)}>
                      <SelectTrigger className="h-8 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['call', 'email', 'meeting', 'note', 'proposal', 'whatsapp'].map(t => (
                          <SelectItem key={t} value={t} className="text-[11px] capitalize">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Scheduled (Optional)</Label>
                    <Input type="datetime-local" className="h-8 text-[11px]" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Remark <span className="text-destructive">*</span></Label>
                  <Textarea 
                    value={remark} 
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="Brief details of the interaction..." 
                    className="min-h-[80px] text-xs" 
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold">Next Action</Label>
                    <Input 
                      placeholder="e.g. Send proposal" 
                      className="h-7 text-[10px]" 
                      value={nextActionType}
                      onChange={(e) => setNextActionType(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold">Follow-up Date</Label>
                    <Input 
                      type="date" 
                      className="h-7 text-[10px]" 
                      value={nextActionDate}
                      onChange={(e) => setNextActionDate(e.target.value)}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-9 text-xs" disabled={submitting}>
                  {submitting ? 'Recording...' : 'Record Interaction'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Timeline */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <History size={16} className="text-primary" /> Activity Timeline
              </CardTitle>
              <span className="text-[10px] text-muted-foreground">{activities?.length || 0} interactions logged</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[700px] overflow-y-auto">
                {activities?.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <div className="mt-1 w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          {activity.type === 'call' && <Phone size={14} className="text-blue-500" />}
                          {activity.type === 'email' && <Mail size={14} className="text-amber-500" />}
                          {activity.type === 'meeting' && <CheckCircle2 size={14} className="text-emerald-500" />}
                          {activity.type === 'note' && <Clock size={14} className="text-slate-500" />}
                          {activity.type === 'whatsapp' && <Globe size={14} className="text-green-500" />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold capitalize">{activity.type} Interaction</span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <p className="text-sm-dense text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                            {activity.remark}
                          </p>
                          {activity.nextActionType && (
                            <div className="mt-2 flex items-center gap-2 px-2 py-1 bg-primary/5 border border-primary/10 rounded text-[10px]">
                              <CalendarIcon size={10} className="text-primary" />
                              <span className="font-bold text-primary uppercase">Next:</span>
                              <span>{activity.nextActionType}</span>
                              <span className="text-muted-foreground">due {activity.nextActionDate}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {(!activities || activities.length === 0) && (
                  <div className="p-12 text-center">
                    <AlertCircle size={32} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-xs text-muted-foreground">No activities recorded yet for this lead.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
