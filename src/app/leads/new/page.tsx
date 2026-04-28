
"use client"

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Product, Lead, GeoLocation } from '@/types/crm';
import { ChevronLeft, Loader2, AlertTriangle, CheckCircle2, Search, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Germany", "France", "Japan", "Australia", 
  "Singapore", "United Arab Emirates", "Saudi Arabia", "India", "South Africa", "Nigeria", 
  "Kenya", "Brazil", "Mexico", "Italy", "Spain", "Netherlands", "Switzerland"
];

export default function NewLeadPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: string; name: string } | null>(null);
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryResults, setShowCountryResults] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    clientEmail: '',
    clientPhone: '',
    companyName: '',
    businessCountry: '',
    businessRegion: '',
    estimatedBudget: '',
    productId: '',
    firstContactChannel: '',
    firstContactSubchannel: '',
    initialNote: '',
    clientBrief: '',
    painPoints: '',
    serviceOffering: ''
  });

  const [location, setLocation] = useState<GeoLocation | null>(null);

  // Fetch dynamic channels from Firestore
  const channelsQuery = useMemoFirebase(() => 
    firestore ? collection(firestore, 'channels') : null
  , [firestore]);
  const { data: allChannelsRaw, loading: channelsLoading } = useCollection<any>(channelsQuery as any);

  const mainChannels = useMemo(() => {
    if (!allChannelsRaw) return [];
    return allChannelsRaw
      .filter((c: any) => c.active !== false && (!c.parentId || c.parentId === ""))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allChannelsRaw]);

  const subChannels = useMemo(() => {
    if (!formData.firstContactChannel || !allChannelsRaw) return [];
    const parent = mainChannels.find(c => c.name === formData.firstContactChannel);
    if (!parent) return [];
    return allChannelsRaw
      .filter((c: any) => c.active !== false && c.parentId === parent.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allChannelsRaw, mainChannels, formData.firstContactChannel]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return [];
    return COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()));
  }, [countrySearch]);

  const productsQuery = useMemoFirebase(() => 
    firestore ? collection(firestore, 'products') : null
  , [firestore]);
  const { data: products } = useCollection<Product>(productsQuery as any);

  const handleGetLocation = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Unsupported", description: "Geolocation is not supported by your browser." });
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: new Date().toISOString()
        });
        setLocating(false);
        toast({ title: "Location Captured", description: `Coords: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` });
      },
      (err) => {
        toast({ variant: "destructive", title: "Location Denied", description: "Please enable location access to log site visits." });
        setLocating(false);
      }
    );
  };

  const checkDuplicate = async (field: 'clientEmail' | 'clientPhone', value: string) => {
    if (!firestore || !value || !user) return;
    try {
      const q = query(
        collection(firestore, 'leads'),
        where(field, '==', value),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const lead = snap.docs[0];
        setDuplicateWarning({ id: lead.id, name: lead.data().clientName });
      } else {
        setDuplicateWarning(null);
      }
    } catch (e) {}
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
        clientEmail: formData.clientEmail,
        clientPhone: formData.clientPhone,
        companyName: formData.companyName,
        businessCountry: formData.businessCountry,
        businessRegion: formData.businessRegion,
        estimatedBudget: parseFloat(formData.estimatedBudget) || 0,
        productId: formData.productId,
        status: 'new' as const,
        firstContactChannel: formData.firstContactChannel,
        firstContactSubchannel: formData.firstContactSubchannel,
        clientBrief: formData.clientBrief,
        painPoints: formData.painPoints,
        serviceOffering: formData.serviceOffering,
        location: location || null,
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(firestore, 'leads'), leadData);

      if (formData.initialNote.trim()) {
        await addDoc(collection(firestore, 'leads', docRef.id, 'activities'), {
          leadId: docRef.id,
          clientName: clientName,
          agentId: user.id,
          agentName: user.name,
          type: 'Outreach',
          remark: formData.initialNote,
          location: location || null,
          createdAt: new Date().toISOString(),
          outcomeStatus: 'recorded'
        });
      }
      
      toast({ title: "Lead Created", description: `${leadData.clientName} successfully registered.` });
      router.push(`/leads/${docRef.id}`);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Submission Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'firstContactChannel') updated.firstContactSubchannel = '';
      return updated;
    });
  };

  if (!user) return <Shell><div className="flex items-center justify-center py-20"><Loader2 className="animate-spin" /></div></Shell>;

  return (
    <Shell>
      <div className="max-w-[720px] mx-auto space-y-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
              <ChevronLeft size={18} />
            </Button>
            <h1 className="text-xl font-bold">New Lead Acquisition</h1>
          </div>
          <Button 
            variant={location ? "secondary" : "outline"} 
            size="sm" 
            className="h-8 gap-2 text-[12px]" 
            onClick={handleGetLocation}
            disabled={locating}
          >
            {locating ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} className={location ? "text-emerald-500" : ""} />}
            {location ? "Location Pinned" : "Log Site Visit Location"}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-8">
              {/* Step 1 */}
              <div className="space-y-4">
                <div className="border-b pb-1"><h2 className="text-[14px] font-bold uppercase tracking-tight text-slate-400">1. Identity & Context</h2></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label className="text-[11px] font-bold uppercase text-slate-400">First Name</Label><Input required placeholder="First Name" value={formData.firstName} onChange={(e) => handleChange('firstName', e.target.value)} /></div>
                  <div className="space-y-1.5"><Label className="text-[11px] font-bold uppercase text-slate-400">Last Name</Label><Input required placeholder="Last Name" value={formData.lastName} onChange={(e) => handleChange('lastName', e.target.value)} /></div>
                  <div className="space-y-1.5 col-span-2"><Label className="text-[11px] font-bold uppercase text-slate-400">Company Name</Label><Input required placeholder="Client Entity / Company Name" value={formData.companyName} onChange={(e) => handleChange('companyName', e.target.value)} /></div>
                  <div className="space-y-1.5"><Label className="text-[11px] font-bold uppercase text-slate-400">Email</Label><Input required type="email" onBlur={() => checkDuplicate('clientEmail', formData.clientEmail)} value={formData.clientEmail} onChange={(e) => handleChange('clientEmail', e.target.value)} /></div>
                  <div className="space-y-1.5"><Label className="text-[11px] font-bold uppercase text-slate-400">Phone</Label><Input required onBlur={() => checkDuplicate('clientPhone', formData.clientPhone)} value={formData.clientPhone} onChange={(e) => handleChange('clientPhone', e.target.value)} /></div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase text-slate-400">Brief about the client</Label>
                  <Textarea placeholder="Describe the client entity, their core business, and size..." className="min-h-[60px] text-[13px]" value={formData.clientBrief} onChange={(e) => handleChange('clientBrief', e.target.value)} />
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-4">
                <div className="border-b pb-1"><h2 className="text-[14px] font-bold uppercase tracking-tight text-slate-400">2. Problem & Solution Analysis</h2></div>
                <div className="space-y-4">
                   <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase text-slate-400">Pain Point Analysis</Label>
                      <Textarea placeholder="What specific problems are they trying to solve? List challenges..." className="min-h-[80px] text-[13px]" value={formData.painPoints} onChange={(e) => handleChange('painPoints', e.target.value)} />
                   </div>
                   <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase text-slate-400">Service Offering Analysis</Label>
                      <Textarea placeholder="How do our products solve their pain points? Why us?" className="min-h-[80px] text-[13px]" value={formData.serviceOffering} onChange={(e) => handleChange('serviceOffering', e.target.value)} />
                   </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-4">
                <div className="border-b pb-1"><h2 className="text-[14px] font-bold uppercase tracking-tight text-slate-400">3. Commercials & Source</h2></div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase text-slate-400">Estimated Budget (Can be 0 for now)</Label>
                      <Input type="number" placeholder="0.00" value={formData.estimatedBudget} onChange={(e) => handleChange('estimatedBudget', e.target.value)} />
                   </div>
                   <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase text-slate-400">Interested Product</Label>
                      <Select required value={formData.productId} onValueChange={(val) => handleChange('productId', val)}>
                        <SelectTrigger className="text-[13px]"><SelectValue placeholder="Select Product" /></SelectTrigger>
                        <SelectContent>{products?.map(p => <SelectItem key={p.id} value={p.id} className="text-[13px]">{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase text-slate-400">Main Channel</Label>
                      <Select required value={formData.firstContactChannel} onValueChange={(val) => handleChange('firstContactChannel', val)}>
                        <SelectTrigger className="text-[13px]"><SelectValue placeholder="Select Source" /></SelectTrigger>
                        <SelectContent>{mainChannels.map((c: any) => <SelectItem key={c.id} value={c.name} className="text-[13px]">{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase text-slate-400">Sub-channel</Label>
                      <Select required disabled={!formData.firstContactChannel || subChannels.length === 0} value={formData.firstContactSubchannel} onValueChange={(val) => handleChange('firstContactSubchannel', val)}>
                        <SelectTrigger className="text-[13px]"><SelectValue placeholder="Details" /></SelectTrigger>
                        <SelectContent>{subChannels.map((sc: any) => <SelectItem key={sc.id} value={sc.name} className="text-[13px]">{sc.name}</SelectItem>)}</SelectContent>
                      </Select>
                   </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-6 pt-6 border-t">
                <Button type="button" variant="ghost" className="text-[13px]" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" className="h-10 px-10 font-bold bg-primary hover:bg-primary/90 shadow-lg" disabled={loading}>
                  {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <CheckCircle2 size={16} className="mr-2" />}
                  Register & Open Pipeline
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </Shell>
  );
}
