"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, updateDoc, query, orderBy, arrayUnion } from 'firebase/firestore';
import { useAuthStore } from '@/store/useAuthStore';
import { Lead, LeadActivity, LeadStatus, ActivityType, LeadDoc, GeoLocation } from '@/types/crm';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  History as HistoryIcon, 
  Loader2, MapPin, Edit2, Paperclip,
  FileText, ExternalLink, Bold, Italic, List
} from 'lucide-react';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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

  const activitiesQuery = useMemoFirebase(() => firestore && id ? query(collection(firestore, 'leads', id as string, 'activities'), orderBy('createdAt', 'desc')) : null, [firestore, id]);
  const { data: activities } = useCollection<LeadActivity>(activitiesQuery as any);

  const [remark, setRemark] = useState('');
  const [type, setType] = useState<ActivityType>('Call made');
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [isEditDialogOpen, setIsEditOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [editData, setEditData] = useState({
    estimatedBudget: 0,
    clientBrief: '',
    painPoints: '',
    serviceOffering: ''
  });

  useEffect(() => {
    if (lead) {
      setEditData({
        estimatedBudget: lead.estimatedBudget || 0,
        clientBrief: lead.clientBrief || '',
        painPoints: lead.painPoints || '',
        serviceOffering: lead.serviceOffering || ''
      });
    }
  }, [lead]);

  const insertFormat = (tag: string, field: 'remark' | 'clientBrief' | 'painPoints' | 'serviceOffering' = 'remark') => {
     const text = tag === 'bold' ? '**text**' : tag === 'italic' ? '_text_' : '\n- list item';
     if (field === 'remark') setRemark(prev => prev + text);
     else setEditData(prev => ({ ...prev, [field]: prev[field] + text }));
  };

  const handleAddActivity = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!remark.trim() || !firestore || !id || !user || !lead) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      await addDoc(collection(firestore, 'leads', id as string, 'activities'), {
        leadId: id as string, clientName: lead.clientName, agentId: user.id, agentName: user.name,
        type, remark, location: location || null, createdAt: now, outcomeStatus: 'recorded'
      });
      await updateDoc(doc(firestore, 'leads', id as string), { 
        lastActivityAt: now, 
        ...(location ? { location } : {}) 
      });
      setRemark(''); setLocation(null);
      toast({ title: "Activity Logged" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDoc = async () => {
     if (!leadRef || !docName || !docUrl) return;
     setIsUploading(true);
     try {
        const newDoc: LeadDoc = { id: Date.now().toString(), name: docName, url: docUrl, type: 'pdf', createdAt: new Date().toISOString() };
        await updateDoc(leadRef, { documents: arrayUnion(newDoc) });
        setDocName(''); setDocUrl('');
        toast({ title: "Document Linked" });
     } catch (e: any) {
        toast({ variant: "destructive", title: "Failed", description: e.message });
     } finally {
        setIsUploading(false);
     }
  };

  if (leadLoading) return <Shell><div className="flex items-center justify-center py-20"><Loader2 className="animate-spin" /></div></Shell>;
  if (!lead) return <Shell><div className="py-20 text-center">Lead not found.</div></Shell>;

  return (
    <Shell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{lead.clientName}</h1>
          <StatusBadge status={lead.status} />
          {lead.type === 'partner' && <Badge className="bg-primary-50 text-primary-700 border-none font-bold uppercase">Partner</Badge>}
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)} className="h-9 gap-2 border-slate-200">
               <Edit2 size={14}/> Edit Qualification
            </Button>
            <Select value={lead.status} onValueChange={async (val) => {
               await updateDoc(leadRef!, { status: val as LeadStatus, lastActivityAt: new Date().toISOString() });
               toast({ title: "Status Synchronized" });
            }}>
               <SelectTrigger className="h-9 w-[160px] font-bold bg-white"><SelectValue /></SelectTrigger>
               <SelectContent className="bg-white">{['new','contacted','qualified','proposal','negotiation','won','lost','dormant'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
           <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="bg-white border w-full justify-start h-10 p-1 gap-2 mb-4">
                 <TabsTrigger value="analysis" className="text-[12px] font-bold uppercase tracking-tight">Qualification</TabsTrigger>
                 <TabsTrigger value="docs" className="text-[12px] font-bold uppercase tracking-tight">Files & Proposals ({lead.documents?.length || 0})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="analysis" className="m-0">
                 <Card className="shadow-none border-slate-200 bg-white">
                    <CardHeader className="bg-slate-50 border-b p-3">
                       <CardTitle className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Strategic Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-8">
                       <div className="grid grid-cols-2 gap-4">
                          <div><Label className="text-[10px] uppercase font-bold text-slate-400">Industry</Label><p className="font-medium text-slate-800">{lead.industry || 'Not specified'}</p></div>
                          <div><Label className="text-[10px] uppercase font-bold text-slate-400">Territory</Label><p className="font-medium text-slate-800">{lead.businessRegion} ({lead.businessCountry})</p></div>
                          <div><Label className="text-[10px] uppercase font-bold text-slate-400">Estimated Budget</Label><p className="font-bold text-primary text-lg">${lead.estimatedBudget?.toLocaleString() || '0'}</p></div>
                       </div>
                       <div className="space-y-4 pt-4 border-t">
                          <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-400">Client Context</Label><p className="text-[14px] leading-relaxed text-slate-600 whitespace-pre-wrap">{lead.clientBrief || '--'}</p></div>
                          <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-400">Core Challenges</Label><p className="text-[14px] leading-relaxed text-slate-600 whitespace-pre-wrap">{lead.painPoints || '--'}</p></div>
                          <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-400">Proposed Solution</Label><p className="text-[14px] leading-relaxed text-slate-600 whitespace-pre-wrap">{lead.serviceOffering || '--'}</p></div>
                       </div>
                    </CardContent>
                 </Card>
              </TabsContent>

              <TabsContent value="docs" className="m-0 space-y-4">
                 <div className="bg-white border rounded-xl p-4 flex gap-4 items-end shadow-sm">
                    <div className="flex-1 space-y-1.5">
                       <Label className="text-[11px] font-bold uppercase">Document Title</Label>
                       <Input placeholder="e.g. Solution Proposal v1" value={docName} onChange={e => setDocName(e.target.value)} className="bg-white" />
                    </div>
                    <div className="flex-[2] space-y-1.5">
                       <Label className="text-[11px] font-bold uppercase">URL / Link</Label>
                       <Input placeholder="HTTPS://" value={docUrl} onChange={e => setDocUrl(e.target.value)} className="bg-white" />
                    </div>
                    <Button size="sm" className="h-9 gap-2 bg-primary font-bold" onClick={handleAddDoc} disabled={isUploading}>
                       {isUploading ? <Loader2 className="animate-spin"/> : <Paperclip size={16}/>} Link Doc
                    </Button>
                 </div>
                 <div className="grid md:grid-cols-2 gap-4">
                    {lead.documents?.map(doc => (
                       <div key={doc.id} className="bg-white border rounded-lg p-3 flex items-center justify-between group hover:border-primary/30 transition-colors">
                          <div className="flex items-center gap-3">
                             <div className="p-2 bg-slate-50 text-slate-400 rounded"><FileText size={18}/></div>
                             <div>
                                <p className="text-[13px] font-bold text-slate-800">{doc.name}</p>
                                <p className="text-[10px] text-slate-400">{format(parseISO(doc.createdAt), 'MMM d, yyyy')}</p>
                             </div>
                          </div>
                          <a href={doc.url} target="_blank" className="p-2 hover:bg-slate-100 rounded text-primary transition-colors">
                             <ExternalLink size={16} />
                          </a>
                       </div>
                    ))}
                    {(!lead.documents || lead.documents.length === 0) && <p className="col-span-2 text-center py-10 text-slate-300 italic text-sm">No documents attached.</p>}
                 </div>
              </TabsContent>
           </Tabs>

           <Card className="shadow-none border-slate-200 bg-white">
              <CardHeader className="bg-slate-50 border-b p-3">
                 <CardTitle className="text-[11px] font-bold uppercase text-slate-400">Log Interaction</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                 <form onSubmit={handleAddActivity} className="space-y-4">
                    <div className="flex items-center gap-4">
                       <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
                          <SelectTrigger className="h-9 w-[180px] font-medium bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-white">{ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                       </Select>
                       <div className="flex-1 flex gap-1 bg-slate-100 p-1 rounded-lg">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('bold')}><Bold size={14}/></Button>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('italic')}><Italic size={14}/></Button>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('list')}><List size={14}/></Button>
                       </div>
                       <Button type="button" variant="outline" size="sm" className={cn("h-9 gap-2", location && "bg-emerald-50 text-emerald-600 border-emerald-200")} onClick={() => {
                          setLocating(true);
                          navigator.geolocation.getCurrentPosition(pos => {
                             setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: new Date().toISOString() });
                             setLocating(false); toast({ title: "Check-in Successful" });
                          }, () => {
                             setLocating(false); toast({ variant: "destructive", title: "GPS Error" });
                          });
                       }}>
                          {locating ? <Loader2 size={14} className="animate-spin"/> : <MapPin size={14}/>} {location ? "Location Locked" : "GPS Visit"}
                       </Button>
                    </div>
                    <Textarea required className="min-h-[100px] text-[13px] bg-white" placeholder="Detailed meeting summary, next steps..." value={remark} onChange={e => setRemark(e.target.value)} />
                    <Button type="submit" className="w-full h-10 font-bold uppercase tracking-tight bg-primary shadow-lg" disabled={submitting}>
                       {submitting ? <Loader2 className="animate-spin" /> : "Record Interaction & Synchronize Timer"}
                    </Button>
                 </form>
              </CardContent>
           </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
           <Card className="h-full shadow-none border-slate-200 bg-white">
              <CardHeader className="bg-slate-50 border-b p-3 flex flex-row items-center justify-between">
                 <CardTitle className="text-[11px] font-bold uppercase text-slate-400">Interaction Log</CardTitle>
                 <HistoryIcon size={14} className="text-slate-300" />
              </CardHeader>
              <CardContent className="p-0">
                 <div className="divide-y max-h-[600px] overflow-auto">
                    {activities?.map(a => (
                       <div key={a.id} className="p-4 space-y-1.5 hover:bg-slate-50 transition-colors">
                          <div className="flex justify-between items-start">
                             <p className="text-[12px] font-bold text-slate-900">{a.type}</p>
                             <span className="text-[10px] font-bold text-slate-400">{format(parseISO(a.createdAt), 'MMM d')}</span>
                          </div>
                          <p className="text-[12px] text-slate-600 line-clamp-3 leading-snug whitespace-pre-wrap">{a.remark}</p>
                          {a.location && <Badge className="h-4 bg-emerald-50 text-emerald-700 text-[9px] uppercase border-none">Verified Visit</Badge>}
                       </div>
                    ))}
                    {activities?.length === 0 && <div className="p-10 text-center text-slate-300 italic text-sm">No activity recorded yet.</div>}
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-[600px] bg-white border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b bg-slate-50">
             <DialogTitle className="text-lg font-bold text-slate-900">Edit Lead Qualification</DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
             <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase text-slate-400">Estimated Budget ($)</Label>
                <Input type="number" value={editData.estimatedBudget} onChange={e => setEditData({...editData, estimatedBudget: parseFloat(e.target.value) || 0})} className="bg-white font-bold text-primary" />
             </div>

             {[
               { id: 'clientBrief', label: 'Client Brief & Industry Context' },
               { id: 'painPoints', label: 'Core Challenges & Pain Points' },
               { id: 'serviceOffering', label: 'Proposed Solution Strategy' }
             ].map(field => (
               <div key={field.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                     <Label className="text-[11px] font-bold uppercase text-slate-400">{field.label}</Label>
                     <div className="flex gap-1 bg-slate-100 p-0.5 rounded">
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => insertFormat('bold', field.id as any)}><Bold size={12}/></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => insertFormat('italic', field.id as any)}><Italic size={12}/></Button>
                     </div>
                  </div>
                  <Textarea 
                    value={(editData as any)[field.id]} 
                    onChange={e => setEditData({...editData, [field.id]: e.target.value})} 
                    className="min-h-[100px] bg-white text-[13px]" 
                    placeholder="Enter details..."
                  />
               </div>
             ))}
          </div>

          <DialogFooter className="p-6 border-t bg-slate-50">
             <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
             <Button className="bg-primary px-8 font-bold" onClick={async () => {
                await updateDoc(leadRef!, { ...editData }); toast({ title: "Updated" }); setIsEditOpen(false);
             }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
