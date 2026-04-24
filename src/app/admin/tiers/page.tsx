"use client"

import React, { useMemo, useState, useEffect } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore } from '@/firebase';
import { collection, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { Tier } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Shield, Edit2, Save, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function AdminTiersPage() {
  const { user, isAuthenticated } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, isAuthenticated, router]);

  const tiersQuery = useMemo(() => firestore ? query(collection(firestore, 'tiers'), orderBy('rankLevel')) : null, [firestore]);
  const { data: tiers, loading } = useCollection<Tier>(tiersQuery as any);

  const [editValues, setEditValues] = useState<Partial<Tier>>({});

  const handleEdit = (tier: Tier) => {
    setEditingId(tier.id);
    setEditValues(tier);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleSave = async (id: string) => {
    if (!firestore) return;
    setSaving(true);
    try {
      await updateDoc(doc(firestore, 'tiers', id), editValues);
      toast({ title: "Tier Updated", description: "The performance criteria has been updated." });
      setEditingId(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!user || user?.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Performance Tiers</h1>
          <p className="text-sm text-muted-foreground">Configure commission rates and upgrade criteria for agents.</p>
        </div>

        <div className="grid gap-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center">
              <Loader2 className="animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Loading tier configurations...</p>
            </div>
          ) : tiers?.map((tier) => (
            <Card key={tier.id} className={editingId === tier.id ? "border-primary ring-1 ring-primary/20" : ""}>
              <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield size={16} className="text-primary" /> {tier.name} Tier
                </CardTitle>
                {editingId === tier.id ? (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8 text-xs">
                      <X size={14} className="mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={() => handleSave(tier.id)} disabled={saving} className="h-8 text-xs">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} className="mr-1" />}
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => handleEdit(tier)} className="h-8 text-xs">
                    <Edit2 size={12} className="mr-1" /> Edit Criteria
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-4 grid md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Commission Rate</Label>
                  {editingId === tier.id ? (
                    <div className="relative">
                      <Input 
                        type="number" 
                        className="h-9 text-sm pr-6" 
                        value={editValues.commissionPct}
                        onChange={(e) => setEditValues({...editValues, commissionPct: parseFloat(e.target.value)})}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                    </div>
                  ) : (
                    <p className="text-xl font-bold">{tier.commissionPct}%</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Leads Target</Label>
                  {editingId === tier.id ? (
                    <Input 
                      type="number" 
                      className="h-9 text-sm" 
                      value={editValues.upgradeCriteria?.leadsTarget}
                      onChange={(e) => setEditValues({
                        ...editValues, 
                        upgradeCriteria: { ...editValues.upgradeCriteria!, leadsTarget: parseInt(e.target.value) }
                      })}
                    />
                  ) : (
                    <p className="text-xl font-bold">{tier.upgradeCriteria.leadsTarget}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Revenue Target</Label>
                  {editingId === tier.id ? (
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                      <Input 
                        type="number" 
                        className="h-9 text-sm pl-5" 
                        value={editValues.upgradeCriteria?.revenueTarget}
                        onChange={(e) => setEditValues({
                          ...editValues, 
                          upgradeCriteria: { ...editValues.upgradeCriteria!, revenueTarget: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                  ) : (
                    <p className="text-xl font-bold">${tier.upgradeCriteria.revenueTarget.toLocaleString()}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Product Limit</Label>
                  {editingId === tier.id ? (
                    <Input 
                      type="number" 
                      className="h-9 text-sm" 
                      value={editValues.productLimit}
                      onChange={(e) => setEditValues({...editValues, productLimit: parseInt(e.target.value)})}
                    />
                  ) : (
                    <p className="text-xl font-bold">{tier.productLimit}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}