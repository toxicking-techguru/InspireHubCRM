"use client"

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Product, GeoLocation, LeadType } from '@/types/crm';
import { 
  ChevronLeft, 
  Loader2, 
  CheckCircle2, 
  MapPin, 
  Bold, 
  Italic, 
  List,
  Target
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const INDUSTRIES = ["Technology", "Healthcare", "Finance", "Education", "Manufacturing", "Retail", "Real Estate", "Legal", "Government", "Other"];

export default function NewLeadPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    clientEmail: '',
    clientPhone: '',
    companyName: '',
    industry: '',
    businessCountry: 'Kenya',
    businessCounty: '',
    businessRegion: '',
    estimatedBudget: '',
    productId: '',
    type: 'lead' as LeadType,
    firstContactChannel: '',
    firstContactSubchannel: '',
    initialNote: '',
    clientBrief: '',
    painPoints: '',
    serviceOffering: ''
  });

  const [location, setLocation] = useState<GeoLocation | null>(null);

  const channelsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'channels') : null, [firestore]);
  const { data: allChannelsRaw } = useCollection<any>(channelsQuery as any);

  const mainChannels = useMemo(() => allChannelsRaw?.filter(c => !c.parentId) || [], [allChannelsRaw]);
  const subChannels = useMemo(() => {
    const parent = mainChannels.find(c => c.name === formData.firstContactChannel);
    return allChannelsRaw?.filter(c => c.parentId === parent?.id) || [];
  }, [allChannelsRaw, mainChannels, formData.firstContactChannel]);

  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsQuery as any);

  const insertFormat = (tag: string, field: 'clientBrief' | 'painPoints' | 'serviceOffering') => {
    const text = tag === 'bold' ? '**text**' : tag === 'italic' ? '_text_' : '\n- list item';
    setFormData(prev => ({ ...prev, [field]: prev[field] + text }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    setLoading(true);
    try {
      const clientName = `${formData.firstName} ${formData.lastName}`.trim();
      const leadData = {
        agentId: user.id,
        clientName,
        ...formData,
        estimatedBudget: parseFloat(formData.estimatedBudget) || 0,
        location: location || null,
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        status: 'new' as const,
      };
      const docRef = await addDoc(collection(firestore, 'leads'), leadData);
      
      if (formData.initialNote.trim()) {
        await addDoc(collection(firestore, 'leads', docRef.id, 'activities'), {
          leadId: docRef.id, 
          clientName, 
          agentId: user.id, 
          agentName: user.name,
          type: 'Outreach', 
          remark: formData.initialNote, 
          createdAt: new Date().toISOString(), 
          outcomeStatus: 'recorded'
        });
      }
      
      toast({ title: "Record Created", description: `${clientName} successfully registered.` });
      router.push(`/leads/${docRef.id}`);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Submission Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Shell>
      <div className="max-w-[900px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-2 w-full">
              <Button variant="ghost" size="icon" onClick={() => router.back()}><ChevronLeft size={18}/></Button>
              <h1 className="text-xl font-bold">New Acquisition</h1>
           </div>
           <Tabs value={formData.type} onValueChange={(v) => setFormData({...formData, type: v as LeadType})} className="w-full sm:w-auto">
              <TabsList className="bg-slate-100 p-1 w-full sm:w-auto">
                 <TabsTrigger value="lead" className="flex-1 sm:flex-none text-[12px] uppercase font-bold">Standard Lead</TabsTrigger>
                 <TabsTrigger value="partner" className="flex-1 sm:flex-none text-[12px] uppercase font-bold">Partner Account</TabsTrigger>
              </TabsList>
           </Tabs>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pb-20">
           <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6 space-y-8">
                 <div className="space-y-6">
                    <div className="border-b pb-1"><h2 className="text-[12px] font-bold uppercase text-slate-400">1. Core Identity & Industry</h2></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="space-y-1.5"><Label className="text-[11px] font-bold uppercase">First Name</Label><Input required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} /></div>
                       <div className="space-y-1.5"><Label className="text-[11px] font-bold uppercase">Last Name</Label><Input required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} /></div>
                       <div className="space-y-1.5 sm:col-span-2"><Label className="text-[11px] font-bold uppercase">Company Name</Label><Input required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} /></div>
                       <div className="space-y-1.5"><Label className="text-[11px] font-bold uppercase">Primary Industry</Label>
                          <Select value={formData.industry} onValueChange={v => setFormData({...formData, industry: v})}>
                             <SelectTrigger className="h-9"><SelectValue placeholder="Select Industry"/></SelectTrigger>
                             <SelectContent className="bg-white">{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-1.5"><Label className="text-[11px] font-bold uppercase">Work Email</Label><Input required type="email" value={formData.clientEmail} onChange={e => setFormData({...formData, clientEmail: e.target.value})} /></div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="border-b pb-1"><h2 className="text-[12px] font-bold uppercase text-slate-400">2. Qualification & Context</h2></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="space-y-1.5"><Label className="text-[11px] font-bold uppercase">Estimated Budget ($)</Label><Input type="number" placeholder="0.00" value={formData.estimatedBudget} onChange={e => setFormData({...formData, estimatedBudget: e.target.value})} /></div>
                       <div className="space-y-1.5"><Label className="text-[11px] font-bold uppercase">Target Product</Label>
                          <Select value={formData.productId} onValueChange={v => setFormData({...formData, productId: v})}>
                             <SelectTrigger className="h-9"><SelectValue placeholder="Select Product"/></SelectTrigger>
                             <SelectContent className="bg-white">{products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                          </Select>
                       </div>
                    </div>
                    
                    {[
                      { id: 'clientBrief', label: 'Client Brief & Context' },
                      { id: 'painPoints', label: 'Core Challenges' },
                      { id: 'serviceOffering', label: 'Proposed Solution' }
                    ].map(field => (
                      <div key={field.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-bold uppercase text-slate-400">{field.label}</Label>
                          <div className="flex gap-1 bg-slate-100 p-0.5 rounded">
                             <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => insertFormat('bold', field.id as any)}><Bold size={12}/></Button>
                             <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => insertFormat('italic', field.id as any)}><Italic size={12}/></Button>
                             <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => insertFormat('list', field.id as any)}><List size={12}/></Button>
                          </div>
                        </div>
                        <Textarea 
                          className="min-h-[80px] bg-slate-50 text-[13px]" 
                          placeholder="Provide details..." 
                          value={(formData as any)[field.id]}
                          onChange={e => setFormData({...formData, [field.id]: e.target.value})}
                        />
                      </div>
                    ))}
                 </div>

                 <div className="space-y-6">
                    <div className="border-b pb-1"><h2 className="text-[12px] font-bold uppercase text-slate-400">3. Territory & Physical Visit</h2></div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       <div className="space-y-1.5"><Label className="text-[11px] font-bold uppercase">Country</Label><Input value={formData.businessCountry} onChange={e => setFormData({...formData, businessCountry: e.target.value})} /></div>
                       <div className="space-y-1.5"><Label className="text-[11px] font-bold uppercase">County / State</Label><Input value={formData.businessCounty} onChange={e => setFormData({...formData, businessCounty: e.target.value})} /></div>
                       <div className="space-y-1.5"><Label className="text-[11px] font-bold uppercase">Region / Zone</Label><Input value={formData.businessRegion} onChange={e => setFormData({...formData, businessRegion: e.target.value})} /></div>
                    </div>
                    <Button type="button" variant="outline" className={cn("w-full h-10 gap-2 font-bold", location && "bg-emerald-50 text-emerald-600 border-emerald-200")} onClick={() => {
                       navigator.geolocation.getCurrentPosition(pos => {
                          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: new Date().toISOString() });
                          toast({ title: "GPS Position Captured" });
                       });
                    }}>
                       <MapPin size={16}/> {location ? "Current Position Verified" : "Capture Site Visit GPS Coords"}
                    </Button>
                 </div>

                 <div className="space-y-6">
                    <div className="border-b pb-1"><h2 className="text-[12px] font-bold uppercase text-slate-400">4. Acquisition Source</h2></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="space-y-1.5"><Label className="text-[11px] font-bold uppercase">Main Source</Label>
                          <Select value={formData.firstContactChannel} onValueChange={v => setFormData({...formData, firstContactChannel: v, firstContactSubchannel: ''})}>
                             <SelectTrigger className="h-9"><SelectValue placeholder="Lead Source"/></SelectTrigger>
                             <SelectContent className="bg-white">{mainChannels.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-1.5"><Label className="text-[11px] font-bold uppercase">Source Details</Label>
                          <Select value={formData.firstContactSubchannel} onValueChange={v => setFormData({...formData, firstContactSubchannel: v})} disabled={!formData.firstContactChannel}>
                             <SelectTrigger className="h-9"><SelectValue placeholder="Details"/></SelectTrigger>
                             <SelectContent className="bg-white">{subChannels.map(sc => <SelectItem key={sc.id} value={sc.name}>{sc.name}</SelectItem>)}</SelectContent>
                          </Select>
                       </div>
                    </div>
                 </div>

                 <div className="flex flex-col sm:flex-row justify-end pt-6 border-t gap-4">
                    <Button type="button" variant="ghost" onClick={() => router.back()} className="w-full sm:w-auto">Cancel</Button>
                    <Button type="submit" className="h-10 px-10 font-bold bg-primary uppercase w-full sm:w-auto" disabled={loading}>
                       {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 size={16} className="mr-2" />} Register Record
                    </Button>
                 </div>
              </CardContent>
           </Card>
        </form>
      </div>
    </Shell>
  );
}
