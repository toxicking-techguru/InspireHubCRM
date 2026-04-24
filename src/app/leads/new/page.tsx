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
  'LinkedIn': ['InMail', 'Connection Request', 'Group', 'Post'],
  'Ads': ['Google Search', 'Meta', 'Display', 'YouTube'],
  'Referral': ['Partner', 'Client', 'Internal'],
  'Cold Outreach': ['Email', 'Call', 'WhatsApp'],
  'Event': ['Conference', 'Webinar', 'Workshop'],
  'Website': ['Contact Form', 'Chatbot', 'Newsletter'],
};

export default function NewLeadPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: string; name: string } | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
  
  // Filter products by tier if needed (simplified for MVP)
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
    } catch (e) {
      console.error("Duplicate check error:", e);
    }
  };

  const handleBlur = (field: 'clientEmail' | 'clientPhone') => {
    checkDuplicate(field, formData[field]);
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
          type: 'note',
          remark: formData.initialNote,
          createdAt: new Date().toISOString(),
          outcomeStatus: 'recorded'
        });
      }
      
      toast({
        title: "Lead Created",
        description: `${leadData.clientName} successfully registered.`,
      });
      
      router.push(`/leads/${docRef.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'firstContactChannel') {
        updated.firstContactSubchannel = '';
      }
      return updated;
    });
  };

  const sectionHeader = (title: string) => (
    <div className="pt-2 pb-1 mb-4 border-b border-slate-100">
      <h2 className="text-[15px] font-semibold text-slate-800">{title}</h2>
    </div>
  );

  return (
    <Shell>
      <div className="max-w-[680px] mx-auto space-y-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 text-muted-foreground">
            <ChevronLeft size={18} />
          </Button>
          <h1 className="text-xl font-bold text-slate-900">Add New Lead</h1>
        </div>

        {duplicateWarning && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex items-start gap-3 text-amber-900 text-[13px] animate-in fade-in slide-in-from-top-1">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Potential Duplicate Found</p>
              <p>A lead named <Link href={`/leads/${duplicateWarning.id}`} className="underline font-semibold">{duplicateWarning.name}</Link> already shares this contact info.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-5 space-y-6">
              {/* Section 1: Client Bio */}
              <div className="space-y-4">
                {sectionHeader("1. Client Information")}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium">First Name <span className="text-destructive">*</span></Label>
                    <Input 
                      required 
                      className="h-9 text-[13px]" 
                      placeholder="John" 
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium">Last Name <span className="text-destructive">*</span></Label>
                    <Input 
                      required 
                      className="h-9 text-[13px]" 
                      placeholder="Doe" 
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium">Phone Number <span className="text-destructive">*</span></Label>
                    <Input 
                      required 
                      className="h-9 text-[13px]" 
                      placeholder="+1 234 567 890" 
                      value={formData.clientPhone}
                      onBlur={() => handleBlur('clientPhone')}
                      onChange={(e) => handleChange('clientPhone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium">Email Address <span className="text-destructive">*</span></Label>
                    <Input 
                      type="email" 
                      required 
                      className="h-9 text-[13px]" 
                      placeholder="john.doe@company.com" 
                      value={formData.clientEmail}
                      onBlur={() => handleBlur('clientEmail')}
                      onChange={(e) => handleChange('clientEmail', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Business Data */}
              <div className="space-y-4">
                {sectionHeader("2. Business Context")}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-[13px] font-medium">Company Name <span className="text-destructive">*</span></Label>
                    <Input 
                      required 
                      className="h-9 text-[13px]" 
                      placeholder="e.g. Acme Corp" 
                      value={formData.companyName}
                      onChange={(e) => handleChange('companyName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium">Country <span className="text-destructive">*</span></Label>
                    <Input 
                      required 
                      className="h-9 text-[13px]" 
                      placeholder="Search country..." 
                      value={formData.businessCountry}
                      onChange={(e) => handleChange('businessCountry', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium">Region / City</Label>
                    <Input 
                      className="h-9 text-[13px]" 
                      placeholder="e.g. California" 
                      value={formData.businessRegion}
                      onChange={(e) => handleChange('businessRegion', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium">Estimated Budget <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[13px]">$</span>
                      <Input 
                        type="number" 
                        required 
                        className="h-9 pl-6 text-[13px]" 
                        placeholder="0.00" 
                        value={formData.estimatedBudget}
                        onChange={(e) => handleChange('estimatedBudget', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Channel */}
              <div className="space-y-4">
                {sectionHeader("3. Acquisition Channel")}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium">Main Source <span className="text-destructive">*</span></Label>
                    <Select required value={formData.firstContactChannel} onValueChange={(val) => handleChange('firstContactChannel', val)}>
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(CHANNEL_MAP).map(c => (
                          <SelectItem key={c} value={c} className="text-[13px]">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium">Sub-channel <span className="text-destructive">*</span></Label>
                    <Select 
                      required 
                      disabled={!formData.firstContactChannel} 
                      value={formData.firstContactSubchannel} 
                      onValueChange={(val) => handleChange('firstContactSubchannel', val)}
                    >
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder={formData.firstContactChannel ? "Select detail" : "Choose main channel first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.firstContactChannel && CHANNEL_MAP[formData.firstContactChannel].map(sc => (
                          <SelectItem key={sc} value={sc} className="text-[13px]">{sc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 4: Product & Assignment */}
              <div className="space-y-4">
                {sectionHeader("4. Product & Assignment")}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium">Product of Interest <span className="text-destructive">*</span></Label>
                    <Select required value={formData.productId} onValueChange={(val) => handleChange('productId', val)}>
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-[13px]">{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium text-slate-400">Assigned Agent</Label>
                    <div className="h-9 bg-slate-50 border rounded-md flex items-center px-3 text-[13px] text-slate-500 font-medium cursor-not-allowed">
                      {user.name} (You)
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Notes */}
              <div className="space-y-4">
                {sectionHeader("5. Initial Discovery Notes")}
                <div className="space-y-1.5 relative">
                  <Label className="text-[13px] font-medium text-slate-700">Optional Notes</Label>
                  <Textarea 
                    placeholder="Briefly describe the client's current pain points or context..." 
                    className="min-h-[100px] text-[13px] resize-none"
                    maxLength={500}
                    value={formData.initialNote}
                    onChange={(e) => handleChange('initialNote', e.target.value)}
                  />
                  <div className="absolute bottom-2 right-2 text-[10px] font-bold text-slate-400">
                    {formData.initialNote.length}/500
                  </div>
                </div>
              </div>

              {/* Form Footer */}
              <div className="flex items-center justify-end gap-6 pt-2 border-t mt-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="text-[13px] font-medium text-slate-500 hover:text-slate-900"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" className="h-9 px-8 text-[13px] font-bold shadow-sm" disabled={loading}>
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      <span>Save Lead</span>
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </Shell>
  );
}
