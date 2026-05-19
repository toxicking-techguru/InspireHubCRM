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
  FileText, ExternalLink, Bold, Italic, List,
  Calendar, Clock, CheckCircle2, AlertCircle,
  MessageSquare
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
import { MarkdownText } from '@/components/ui/markdown-text';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ACTIVITY_TYPES: ActivityType[] = [
  'Call made', 'Intro meeting', 'Follow up', 'Proposal send', 'Demo done', 
  'Presentation done', 'Negotiation', 'Quotation shared', 'Contract send', 
  'Invoice send', 'Closed won', 'Closed lost', 'Outreach', 'Site visit'
];

export default function LeadDetailPage() {
  const { id } = useParams();
  const { user, config } = useAuthStore();
  const { toast } = useToast();
  const firestore = useFirestore();

  const currencySymbol = config?.currency === 'KES' ? 'KES ' : config?.currency === 'GBP' ? '£' : '$';

  const leadRef = useMemoFirebase(() => id && firestore ? doc(firestore, 'leads', id as string) : null, [id, firestore]);
  const { data: lead, loading: leadLoading } = useDoc<Lead>(leadRef as any);

  const activitiesQuery = useMemoFirebase(() => firestore && id ? query(collection(firestore, 'leads', id as string, 'activities'), orderBy('createdAt', 'desc')) : null, [firestore, id]);
  const { data: activities } = useCollection<LeadActivity>(activitiesQuery as any);

  const [remark, setRemark] = useState('');
  const [type, setType] = useState<ActivityType>('Call made');
  const [nextActionType, setNextActionType] = useState<string>('');
  const [nextActionDate, setNextActionDate] = useState<string>('');
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
     const markers: Record<string, string> = {
       bold: '**text**',
       italic: '_text_',
       list: '\n- '
     };
     const text = markers[tag];
     if (field === 'remark') setRemark(prev => prev + text);
     else setEditData(prev => ({ ...prev, [field]: prev[field] + text }));
  };

  const handleAddActivity = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        remark, 
        nextActionType: nextActionType || null,
        nextActionDate: nextActionDate || null,
        location: location || null, 
        createdAt: now, 
        outcomeStatus: 'recorded'
      };
      
      await addDoc(collection(firestore, 'leads', id as string, 'activities'), activityData);
      
      const leadUpdate: any = { lastActivityAt: now };
      if (location) leadUpdate.location = location;
      if (type === 'Closed won') leadUpdate.status = 'won';
      if (type === 'Closed lost') leadUpdate.status = 'lost';
      
      await updateDoc(doc(firestore, 'leads', id as string), leadUpdate);
      
      setRemark(''); setLocation(null); setNextActionType(''); setNextActionDate('');
      toast({ title: "Timeline Updated" });
    } catch (error) {
      toast({ variant: "destructive", title: "Persistence Error" });
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
        toast({ title: "Document Cataloged" });
     } catch (e: any) {
        toast({ variant: "destructive", title: "Failed", description: e.message });
     } finally {
        setIsUploading(false);
     }
  };

  if (leadLoading) return <Shell><div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div></Shell>;
  if (!lead) return <Shell><div className="py-20 text-center">Lead identity not found in territory.</div></Shell>;

  return (
    <Shell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">{lead.clientName}</h1>
          <StatusBadge status={lead.status} />
          {lead.type === 'partner' && <Badge className="bg-primary/10 text-primary border-none font-bold uppercase text-[10px]">Partner Account</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)} className="h-9 gap-2 border-slate-200 text-slate-600 bg-white shadow-sm">
               <Edit2 size={14}/> Edit Profile
            </Button>
            <Select value={lead.status} onValueChange={async (val) => {
               await updateDoc(leadRef!, { status: val as LeadStatus, lastActivityAt: new Date().toISOString() });
               toast({ title: "Status Updated" });
            }}>
               <SelectTrigger className="h-9 w-[160px] font-bold bg-white border-primary/20"><SelectValue /></SelectTrigger>
               <SelectContent className="bg-white">{['new','contacted','qualified','proposal','negotiation','won','lost','dormant'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
           <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="bg-slate-100/50 border w-full justify-start h-10 p-1 gap-2 mb-4 overflow-x-auto no-scrollbar">
                 <TabsTrigger value="analysis" className="text-[12px] font-bold uppercase tracking-tight px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">Qualification</TabsTrigger>
                 <TabsTrigger value="docs" className="text-[12px] font-bold uppercase tracking-tight px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">Files & Proposals ({lead.documents?.length || 0})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="analysis" className="m-0">
                 <Card className="shadow-sm border-slate-200 bg-white">
                    <CardHeader className="bg-slate-50/50 border-b py-3 px-4">
                       <CardTitle className="text-[11px] font-bold uppercase text-slate-400 tracking-widest">Business Discovery</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 space-y-8">
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-400">Industry</Label><p className="font-bold text-slate-800 truncate">{lead.industry || '--'}</p></div>
                          <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-400">Territory</Label><p className="font-bold text-slate-800 truncate">{lead.businessRegion || 'Global'}</p></div>
                          <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-400">Budget</Label><p className="font-bold text-primary text-lg">{currencySymbol}{lead.estimatedBudget?.toLocaleString() || '0'}</p></div>
                       </div>
                       <div className="space-y-6 pt-6 border-t">
                          <div className="space-y-1.5">
                             <Label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-2"><FileText size={12} className="text-primary"/> Client Brief & History</Label>
                             <div className="text-[13px] leading-relaxed text-slate-600 bg-slate-50/50 p-4 rounded-xl border border-slate-100 min-h-[60px]">
                                <MarkdownText content={lead.clientBrief || 'No history recorded.'} />
                             </div>
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-2"><AlertCircle size={12} className="text-red-400"/> Critical Pain Points</Label>
                             <div className="text-[13px] leading-relaxed text-slate-600 bg-slate-50/50 p-4 rounded-xl border border-slate-100 min-h-[60px]">
                                <MarkdownText content={lead.painPoints || 'No issues documented.'} />
                             </div>
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-500"/> Recommended Strategy</Label>
                             <div className="text-[13px] leading-relaxed text-slate-600 bg-slate-50/50 p-4 rounded-xl border border-slate-100 min-h-[60px]">
                                <MarkdownText content={lead.serviceOffering || 'Strategy not yet defined.'} />
                             </div>
                          </div>
                       </div>
                    </CardContent>
                 </Card>
              </TabsContent>

              <TabsContent value="docs" className="m-0 space-y-4">
                 <div className="bg-white border rounded-xl p-5 space-y-4 shadow-sm border-primary/5">
                    <h3 className="text-[11px] font-bold uppercase text-slate-400 tracking-widest">Register Client Material</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <Label className="text-[11px] font-bold uppercase text-slate-500">Document Display Name</Label>
                          <Input placeholder="e.g. Master Proposal V2" value={docName} onChange={e => setDocName(e.target.value)} className="h-9 bg-white" />
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-[11px] font-bold uppercase text-slate-500">Resource URL / Link</Label>
                          <Input placeholder="https://drive.google.com/..." value={docUrl} onChange={e => setDocUrl(e.target.value)} className="h-9 bg-white" />
                       </div>
                    </div>
                    <div className="flex justify-end">
                       <Button size="sm" className="h-9 gap-2 bg-primary font-bold uppercase text-[11px] px-8" onClick={handleAddDoc} disabled={isUploading || !docName || !docUrl}>
                          {isUploading ? <Loader2 className="animate-spin" size={14}/> : <Paperclip size={14}/>} Catalog File
                       </Button>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lead.documents?.map(doc => (
                       <div key={doc.id} className="bg-white border rounded-xl p-4 flex items-center justify-between group hover:border-primary/40 transition-all hover:shadow-md border-slate-200">
                          <div className="flex items-center gap-3">
                             <div className="p-2.5 bg-primary/5 text-primary rounded-lg border border-primary/10"><FileText size={20}/></div>
                             <div className="min-w-0">
                                <p className="text-[13px] font-bold text-slate-800 truncate max-w-[140px]">{doc.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{format(parseISO(doc.createdAt), 'MMM d, yyyy')}</p>
                             </div>
                          </div>
                          <a href={doc.url} target="_blank" className="p-2 hover:bg-primary hover:text-white rounded-full text-slate-400 transition-all shadow-sm border border-transparent">
                             <ExternalLink size={16} />
                          </a>
                       </div>
                    ))}
                    {(!lead.documents || lead.documents.length === 0) && (
                      <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-300 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                         <Paperclip size={32} className="mb-2 opacity-20" />
                         <p className="italic text-sm font-medium text-slate-400">Repository is currently empty.</p>
                      </div>
                    )}
                 </div>
              </TabsContent>
           </Tabs>

           <Card className="shadow-md border-primary/10 bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b py-3 px-4">
                 <CardTitle className="text-[11px] font-bold uppercase text-slate-500 tracking-widest flex items-center gap-2"><MessageSquare size={14} className="text-primary"/> Record Interaction Log</CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                 <form onSubmit={handleAddActivity} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                       <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Interaction Category</Label>
                          <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
                             <SelectTrigger className="h-10 font-bold bg-white"><SelectValue /></SelectTrigger>
                             <SelectContent className="bg-white">{ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                       </div>
                       
                       <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Follow-up Milestone</Label>
                          <Input placeholder="e.g. Closing Call..." className="h-10 bg-white" value={nextActionType} onChange={e => setNextActionType(e.target.value)} />
                       </div>

                       <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Schedule Date</Label>
                          <Input type="date" className="h-10 bg-white" value={nextActionDate} onChange={e => setNextActionDate(e.target.value)} />
                       </div>
                    </div>

                    <div className="space-y-2 group">
                       <div className="flex items-center justify-between bg-slate-50 p-2 border border-slate-200 rounded-t-lg">
                          <Label className="text-[10px] font-bold uppercase text-slate-400 px-1">Summary & Outcomes</Label>
                          <div className="flex gap-1">
                             <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 hover:bg-white text-slate-400 hover:text-primary" onClick={() => insertFormat('bold')}>
                                      <Bold size={15}/>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Bold</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 hover:bg-white text-slate-400 hover:text-primary" onClick={() => insertFormat('italic')}>
                                      <Italic size={15}/>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Italic</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 hover:bg-white text-slate-400 hover:text-primary" onClick={() => insertFormat('list')}>
                                      <List size={15}/>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>List</TooltipContent>
                                </Tooltip>
                             </TooltipProvider>
                          </div>
                       </div>
                       <Textarea 
                          required 
                          className="min-h-[140px] text-[14px] bg-white border-slate-200 rounded-t-none rounded-b-lg focus:ring-0 focus:border-primary transition-all leading-relaxed" 
                          placeholder="Log exact points discussed..." 
                          value={remark} 
                          onChange={e => setRemark(e.target.value)} 
                       />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                       <Button type="button" variant="outline" className={cn("h-11 gap-2 font-bold px-6", location && "bg-emerald-50 text-emerald-600 border-emerald-200")} onClick={() => {
                          setLocating(true);
                          navigator.geolocation.getCurrentPosition(pos => {
                             setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: new Date().toISOString() });
                             setLocating(false); toast({ title: "GPS Verified" });
                          }, () => {
                             setLocating(false); toast({ variant: "destructive", title: "GPS Error" });
                          });
                       }}>
                          {locating ? <Loader2 size={16} className="animate-spin"/> : <MapPin size={16}/>} {location ? "Field Pin Captured" : "Verified Site Visit"}
                       </Button>
                       <Button type="submit" className="flex-1 h-11 font-bold uppercase tracking-tight bg-primary hover:bg-primary/90 shadow-lg text-[12px]" disabled={submitting}>
                          {submitting ? <Loader2 className="animate-spin" /> : "Commit to Pipeline History"}
                       </Button>
                    </div>
                 </form>
              </CardContent>
           </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
           <Card className="h-full shadow-sm border-slate-200 bg-white">
              <CardHeader className="bg-slate-50/50 border-b py-3 px-4 flex flex-row items-center justify-between">
                 <CardTitle className="text-[11px] font-bold uppercase text-slate-400 tracking-widest">Immutable History</CardTitle>
                 <HistoryIcon size={14} className="text-slate-300" />
              </CardHeader>
              <CardContent className="p-0">
                 <div className="divide-y max-h-[850px] overflow-y-auto no-scrollbar">
                    {activities?.map(a => (
                       <div key={a.id} className="p-5 space-y-3 hover:bg-slate-50/50 transition-all border-l-4 border-l-transparent hover:border-l-primary">
                          <div className="flex justify-between items-start">
                             <Badge variant="outline" className="h-5 text-[9px] uppercase font-bold text-primary border-primary/20 bg-primary/5">{a.type}</Badge>
                             <span className="text-[10px] font-bold text-slate-300 uppercase">{a.createdAt ? format(parseISO(a.createdAt), 'MMM d, HH:mm') : 'Unknown'}</span>
                          </div>
                          <div className="text-[13px] text-slate-600 leading-relaxed font-medium">
                             <MarkdownText content={a.remark} />
                          </div>
                          
                          {(a.nextActionType || a.nextActionDate) && (
                            <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100 flex items-center justify-between shadow-inner">
                               <div className="flex items-center gap-2 text-amber-800">
                                  <Clock size={12} />
                                  <span className="text-[10px] font-bold uppercase tracking-tight">Next: {a.nextActionType || 'Follow up'}</span>
                               </div>
                               <span className="text-[11px] font-mono font-extrabold text-amber-700">{a.nextActionDate}</span>
                            </div>
                          )}

                          {a.location && (
                             <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 w-max px-2 py-0.5 rounded border border-emerald-100">
                                <MapPin size={10} /> GPS Verified Interaction
                             </div>
                          )}
                       </div>
                    ))}
                    {activities?.length === 0 && (
                      <div className="py-24 text-center flex flex-col items-center justify-center opacity-30 px-6">
                         <AlertCircle size={40} className="mb-2 text-slate-200" />
                         <p className="italic text-sm font-medium text-slate-400">Chronological history is empty. Log your first field visit above.</p>
                      </div>
                    )}
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-[700px] bg-white border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-6 border-b bg-slate-50">
             <DialogTitle className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Edit2 className="text-primary" size={20} /> Update Lead Profile
             </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
             <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Estimated Project Budget ({currencySymbol.trim()})</Label>
                <div className="relative">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">{currencySymbol}</span>
                   <Input type="number" value={editData.estimatedBudget} onChange={e => setEditData({...editData, estimatedBudget: parseFloat(e.target.value) || 0})} className="pl-7 bg-white font-extrabold text-primary text-lg h-11 border-primary/20 focus:border-primary" />
                </div>
             </div>

             {[
               { id: 'clientBrief', label: 'Client briefing & Narrative' },
               { id: 'painPoints', label: 'Critical Pain Points' },
               { id: 'serviceOffering', label: 'Proposed Solution Mapping' }
             ].map(field => (
               <div key={field.id} className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-50 p-2 rounded-t-lg border border-slate-200">
                     <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider px-1">{field.label}</Label>
                     <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => insertFormat('bold', field.id as any)}><Bold size={14}/></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => insertFormat('italic', field.id as any)}><Italic size={14}/></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => insertFormat('list', field.id as any)}><List size={14}/></Button>
                     </div>
                  </div>
                  <Textarea 
                    value={(editData as any)[field.id]} 
                    onChange={e => setEditData({...editData, [field.id]: e.target.value})} 
                    className="min-h-[120px] bg-white text-[14px] border-slate-200 rounded-t-none focus:border-primary transition-all leading-relaxed" 
                    placeholder="Provide details..."
                  />
               </div>
             ))}
          </div>

          <DialogFooter className="p-6 border-t bg-slate-50 flex gap-3">
             <Button variant="ghost" className="px-8 font-bold text-slate-400" onClick={() => setIsEditOpen(false)}>Discard</Button>
             <Button className="bg-primary px-10 font-bold uppercase tracking-tight shadow-md" onClick={async () => {
                await updateDoc(leadRef!, { ...editData }); toast({ title: "Lead Synchronized" }); setIsEditOpen(false);
             }}>Sync Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
