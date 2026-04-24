
"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, query, where, getDocs, limit, doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Product, Lead, LeadActivity } from '@/types/crm';
import { ChevronLeft, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

const CHANNEL_MAP: Record<string, string[]> = {
  'Physical visit': ['Office Walk-in', 'Field Prospecting', 'Exhibition Stand'],
  'Referral': ['Existing Client', 'Friend', 'Consultant', 'Partner', 'NGO'],
  'Social media': ['LinkedIn', 'TikTok', 'Facebook', 'Instagram', 'X'],
  'Email': ['Inbound Inquiry', 'Cold Outreach', 'Newsletter'],
  'Website Inquiry': ['Contact Form', 'Chatbot', 'Download Resource'],
  'Partnership': ['Agency', 'Distributor', 'Strategic Partner'],
  'Events or Expos': ['Trade Show', 'Local Meetup', 'Industry Conference'],
  'Webinars': ['Product Launch', 'Educational Session'],
  'Workshops': ['Training Session', 'Demo Day'],
  'Walk in': ['Direct Arrival', 'Branch Visit']
};

export default function NewLeadPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: string; name: string } | null>(null);

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
  });

  const productsQuery = useMemoFirebase(() => 
    firestore ? collection(firestore, 'products') : null
  , [firestore]);
  
  const { data: allProducts } = useCollection<Product>(productsQuery as any);
  const products = allProducts;

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
      const leadData = {
        agentId: user.id,
        clientName: `${formData.firstName} ${formData.lastName}`.trim(),
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
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(firestore, 'leads'), leadData);

      if (formData.initialNote.trim()) {
        await addDoc(collection(firestore, 'leads', docRef.id, 'activities'), {
          leadId: docRef.id,
          agentId: user.id,
          agentName: user.name,
          type: 'Call made', // Default start activity
          remark: formData.initialNote,
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

  return (
    <Shell>
      <div className="max-w-[680px] mx-auto space-y-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
            <ChevronLeft size={18} />
          </Button>
          <h1 className="text-xl font-bold">Add New Lead</h1>
        </div>

        {duplicateWarning && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex items-start gap-3 text-amber-900 text-[13px]">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Potential Duplicate Found</p>
              <p>A lead named <Link href={`/leads/${duplicateWarning.id}`} className="underline font-semibold">{duplicateWarning.name}</Link> shares this contact info.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-6">
              <div className="space-y-4">
                <div className="border-b pb-1"><h2 className="text-[15px] font-bold">1. Client Information</h2></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>First Name <span className="text-red-500">*</span></Label>
                    <Input required placeholder="John" value={formData.firstName} onChange={(e) => handleChange('firstName', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last Name <span className="text-red-500">*</span></Label>
                    <Input required placeholder="Doe" value={formData.lastName} onChange={(e) => handleChange('lastName', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone Number <span className="text-red-500">*</span></Label>
                    <Input required onBlur={() => checkDuplicate('clientPhone', formData.clientPhone)} value={formData.clientPhone} onChange={(e) => handleChange('clientPhone', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email Address <span className="text-red-500">*</span></Label>
                    <Input required type="email" onBlur={() => checkDuplicate('clientEmail', formData.clientEmail)} value={formData.clientEmail} onChange={(e) => handleChange('clientEmail', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-b pb-1"><h2 className="text-[15px] font-bold">2. Business Context</h2></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label>Company Name <span className="text-red-500">*</span></Label>
                    <Input required placeholder="Acme Corp" value={formData.companyName} onChange={(e) => handleChange('companyName', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Country <span className="text-red-500">*</span></Label>
                    <Input required placeholder="Search country..." value={formData.businessCountry} onChange={(e) => handleChange('businessCountry', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Estimated Budget <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <Input type="number" required className="pl-6" placeholder="0.00" value={formData.estimatedBudget} onChange={(e) => handleChange('estimatedBudget', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-b pb-1"><h2 className="text-[15px] font-bold">3. Acquisition Channel</h2></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Main Source <span className="text-red-500">*</span></Label>
                    <Select required value={formData.firstContactChannel} onValueChange={(val) => handleChange('firstContactChannel', val)}>
                      <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(CHANNEL_MAP).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sub-channel <span className="text-red-500">*</span></Label>
                    <Select required disabled={!formData.firstContactChannel} value={formData.firstContactSubchannel} onValueChange={(val) => handleChange('firstContactSubchannel', val)}>
                      <SelectTrigger><SelectValue placeholder={formData.firstContactChannel ? "Select detail" : "Choose main source first"} /></SelectTrigger>
                      <SelectContent>
                        {formData.firstContactChannel && CHANNEL_MAP[formData.firstContactChannel].map(sc => <SelectItem key={sc} value={sc}>{sc}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-b pb-1"><h2 className="text-[15px] font-bold">4. Product & Assignment</h2></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Product of Interest <span className="text-red-500">*</span></Label>
                    <Select required value={formData.productId} onValueChange={(val) => handleChange('productId', val)}>
                      <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-400">Assigned Agent</Label>
                    <div className="h-10 bg-slate-50 border rounded-md flex items-center px-3 text-[13px] text-slate-500 font-medium">
                      {user.name} (You)
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-b pb-1"><h2 className="text-[15px] font-bold">5. Initial Notes</h2></div>
                <div className="space-y-1.5 relative">
                  <Textarea placeholder="Client's pain points or context..." className="min-h-[100px]" maxLength={500} value={formData.initialNote} onChange={(e) => handleChange('initialNote', e.target.value)} />
                  <div className="absolute bottom-2 right-2 text-[10px] font-bold text-slate-400">{formData.initialNote.length}/500</div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-6 pt-4 border-t">
                <Button type="button" variant="ghost" onClick={() => router.back()} disabled={loading}>Cancel</Button>
                <Button type="submit" className="h-10 px-8 font-bold" disabled={loading}>
                  {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <CheckCircle2 size={16} className="mr-2" />}
                  Save Lead
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </Shell>
  );
}
