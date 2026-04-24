"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Product, Lead } from '@/types/crm';
import { ChevronLeft, Save, AlertTriangle, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function NewLeadPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    businessCountry: '',
    businessRegion: '',
    estimatedBudget: '',
    productId: '',
    firstContactChannel: '',
    firstContactSubchannel: '',
  });

  const { data: products } = useCollection<Product>(
    firestore ? collection(firestore, 'products') : null as any
  );

  const checkDuplicate = async () => {
    if (!firestore || !user) return;
    if (!formData.clientEmail && !formData.clientPhone) return;

    try {
      // Simple duplicate check for the current agent
      const qEmail = query(
        collection(firestore, 'leads'), 
        where('clientEmail', '==', formData.clientEmail),
        limit(1)
      );
      const snap = await getDocs(qEmail);
      
      if (!snap.empty) {
        setDuplicateWarning(`Email already exists for lead: ${snap.docs[0].data().clientName}`);
        return;
      }

      const qPhone = query(
        collection(firestore, 'leads'), 
        where('clientPhone', '==', formData.clientPhone),
        limit(1)
      );
      const snapPhone = await getDocs(qPhone);
      if (!snapPhone.empty) {
        setDuplicateWarning(`Phone number already exists for lead: ${snapPhone.docs[0].data().clientName}`);
        return;
      }

      setDuplicateWarning(null);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkDuplicate();
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.clientEmail, formData.clientPhone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    setLoading(true);

    try {
      const leadData: Omit<Lead, 'id'> = {
        agentId: user.id,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientPhone: formData.clientPhone,
        businessCountry: formData.businessCountry,
        businessRegion: formData.businessRegion,
        estimatedBudget: parseFloat(formData.estimatedBudget) || 0,
        productId: formData.productId,
        status: 'new',
        firstContactChannel: formData.firstContactChannel,
        firstContactSubchannel: formData.firstContactSubchannel,
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(firestore, 'leads'), leadData);
      
      toast({
        title: "Lead Created",
        description: `${formData.clientName} has been added to your pipeline.`,
      });
      
      router.push(`/leads/${docRef.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not save lead.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Shell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
              <ChevronLeft size={18} />
            </Button>
            <h1 className="text-xl font-bold">Register New Lead</h1>
          </div>
        </div>

        {duplicateWarning && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center gap-3 text-amber-800 text-xs">
            <AlertTriangle size={16} className="shrink-0" />
            <p className="font-medium">Potential Duplicate: {duplicateWarning}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm">Client Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">Client/Company Name <span className="text-destructive">*</span></Label>
                <Input 
                  required 
                  className="h-9 text-xs" 
                  placeholder="e.g. Acme Corp / John Smith" 
                  value={formData.clientName}
                  onChange={(e) => handleChange('clientName', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email Address <span className="text-destructive">*</span></Label>
                <Input 
                  type="email" 
                  required 
                  className="h-9 text-xs" 
                  placeholder="john@example.com" 
                  value={formData.clientEmail}
                  onChange={(e) => handleChange('clientEmail', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone Number <span className="text-destructive">*</span></Label>
                <Input 
                  required 
                  className="h-9 text-xs" 
                  placeholder="+1 234 567 890" 
                  value={formData.clientPhone}
                  onChange={(e) => handleChange('clientPhone', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm">Business Context & Channel</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Country <span className="text-destructive">*</span></Label>
                <Input 
                  required 
                  className="h-9 text-xs" 
                  placeholder="e.g. United States" 
                  value={formData.businessCountry}
                  onChange={(e) => handleChange('businessCountry', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Region/State</Label>
                <Input 
                  className="h-9 text-xs" 
                  placeholder="e.g. California" 
                  value={formData.businessRegion}
                  onChange={(e) => handleChange('businessRegion', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estimated Budget (USD) <span className="text-destructive">*</span></Label>
                <Input 
                  type="number" 
                  required 
                  className="h-9 text-xs" 
                  placeholder="0.00" 
                  value={formData.estimatedBudget}
                  onChange={(e) => handleChange('estimatedBudget', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Product of Interest <span className="text-destructive">*</span></Label>
                <Select required value={formData.productId} onValueChange={(val) => handleChange('productId', val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Lead Source <span className="text-destructive">*</span></Label>
                <Select required value={formData.firstContactChannel} onValueChange={(val) => handleChange('firstContactChannel', val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="e.g. LinkedIn, Ads" />
                  </SelectTrigger>
                  <SelectContent>
                    {['LinkedIn', 'Ads', 'Referral', 'Cold Outreach', 'Event', 'Website'].map(c => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sub-channel</Label>
                <Input 
                  className="h-9 text-xs" 
                  placeholder="e.g. InMail, Google Search" 
                  value={formData.firstContactSubchannel}
                  onChange={(e) => handleChange('firstContactSubchannel', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2 min-w-[140px]" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Lead
            </Button>
          </div>
        </form>
      </div>
    </Shell>
  );
}
