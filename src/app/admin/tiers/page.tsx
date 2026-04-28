
"use client"

import React, { useMemo, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Tier, Agent } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Layers, 
  ChevronRight, 
  Save, 
  Loader2, 
  Plus, 
  Trash2, 
  CheckCircle2,
  TrendingUp,
  Package,
  Target,
  Edit2,
  Trophy,
  Zap,
  BarChart2,
  Database
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { TIERS as DEFAULT_TIERS } from '@/lib/mock-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function AdminTiersPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Naked query first to ensure we see data if index is missing, then sort in memory
  const tiersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'tiers') : null, [firestore]);
  const { data: rawTiers, loading } = useCollection<Tier>(tiersQuery as any);

  const tiers = useMemo(() => {
    if (!rawTiers) return [];
    return [...rawTiers].sort((a, b) => a.rankLevel - b.rankLevel);
  }, [rawTiers]);

  const agentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'agents') : null, [firestore]);
  const { data: agents } = useCollection<Agent>(agentsQuery as any);

  const [editValues, setEditValues] = useState<Partial<Tier>>({});
  const [newTierData, setNewTierData] = useState({
    name: '',
    rankLabel: 'Standard',
    commissionPct: 5,
    productLimitLabel: 'Few Products',
    upgradeTargetLabel: 'Monthly sales',
    upgradeCriteria: {
      leadsTarget: 10,
      closedTarget: 2,
      revenueTarget: 5000,
      activityScoreTarget: 80,
      conversionRateTarget: 15
    }
  });

  const handleStartEdit = (tier: Tier) => {
    setEditingId(tier.id);
    setEditValues(tier);
  };

  const handleInitialize = async () => {
    if (!firestore) return;
    setIsInitializing(true);
    try {
      for (const t of DEFAULT_TIERS) {
        await setDoc(doc(firestore, 'tiers', t.id), t);
      }
      toast({ title: "Tiers Initialized", description: "Default sales hierarchy has been restored." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Setup Failed", description: e.message });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleAddTier = async () => {
    if (!firestore) return;
    const id = `tier_${Date.now()}`;
    const nextRank = (tiers.length > 0 ? Math.max(...tiers.map(t => t.rankLevel)) : 0) + 1;
    
    try {
      await setDoc(doc(firestore, 'tiers', id), {
        ...newTierData,
        id,
        rankLevel: nextRank,
        productLimit: 10,
      });
      setIsAddModalOpen(false);
      toast({ title: "New Tier Created", description: `${newTierData.name} has been added to the hierarchy.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Creation Failed", description: e.message });
    }
  };

  const handleSave = async (id: string) => {
    if (!firestore) return;
    setSavingId(id);
    try {
      await updateDoc(doc(firestore, 'tiers', id), editValues);
      toast({ title: "Tier Updated", description: "Global commission and criteria synchronized." });
      setEditingId(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteTier = async (id: string) => {
    if (!firestore) return;
    const hasUsers = agents?.some(a => a.tierId === id);
    if (hasUsers) {
      toast({ variant: "destructive", title: "Action Blocked", description: "Cannot delete a tier with assigned users." });
      return;
    }
    if (window.confirm("Permanently remove this tier?")) {
      await deleteDoc(doc(firestore, 'tiers', id));
      toast({ title: "Tier Deleted" });
    }
  };

  if (!user || user.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold flex items-center gap-2 text-cyan-900">
               <Layers className="text-cyan-600" size={20} /> Sales Tiers Configuration
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">Define rank levels, commission rates, and qualitative upgrade targets.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-8 gap-2 bg-cyan-600 hover:bg-cyan-700" onClick={() => setIsAddModalOpen(true)}>
               <Plus size={14} /> New Tier
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[400px] rounded-lg" />) : 
            tiers?.map((tier) => {
              const tierAgents = agents?.filter(a => a.tierId === tier.id) || [];
              const isEditing = editingId === tier.id;

              return (
                <div key={tier.id} className={cn(
                  "bg-card border rounded-lg shadow-sm flex flex-col transition-all border-l-4 border-l-cyan-500",
                  isEditing && "ring-1 ring-cyan-500 shadow-md scale-[1.02]"
                )}>
                  <div className="p-4 border-b flex justify-between items-start">
                     <div>
                        <div className="flex items-center gap-1.5 mb-1">
                           <h3 className="text-[15px] font-bold text-slate-800">{tier.name}</h3>
                           <Badge variant="secondary" className="text-[9px] h-3.5 px-1 bg-slate-100">{tier.rankLabel?.toUpperCase() || 'LEVEL'}</Badge>
                        </div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          {tierAgents.length} Users Assigned
                        </p>
                     </div>
                     <div className="flex gap-1">
                        {isEditing ? (
                          <Button size="sm" className="h-7 bg-cyan-600 hover:bg-cyan-700 px-2 gap-1 text-[10px] font-bold uppercase" onClick={() => handleSave(tier.id)} disabled={savingId === tier.id}>
                              {savingId === tier.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 p-0 text-slate-400 hover:text-cyan-600" onClick={() => handleStartEdit(tier)}>
                                <Edit2 size={14} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 p-0 text-slate-200 hover:text-red-500" onClick={() => handleDeleteTier(tier.id)}>
                                <Trash2 size={14} />
                            </Button>
                          </>
                        )}
                     </div>
                  </div>

                  <div className="p-4 space-y-5 flex-1">
                     <div className="space-y-4">
                        <div className="flex justify-between items-center">
                           <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase">
                              <TrendingUp size={14} className="text-slate-300" /> Commission
                           </div>
                           {isEditing ? (
                             <div className="flex items-center gap-1">
                               <Input 
                                 type="number" 
                                 className="h-7 w-16 text-right text-[12px] p-1 font-bold" 
                                 value={editValues.commissionPct} 
                                 onChange={(e) => setEditValues({...editValues, commissionPct: parseFloat(e.target.value)})}
                               />
                               <span className="text-[12px] font-bold text-slate-400">%</span>
                             </div>
                           ) : (
                             <span className="text-[18px] font-bold text-slate-800">{tier.commissionPct}%</span>
                           )}
                        </div>

                        <div className="flex justify-between items-center">
                           <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase">
                              <Package size={14} className="text-slate-300" /> Catalog Access
                           </div>
                           {isEditing ? (
                             <Input 
                               className="h-7 w-[120px] text-right text-[11px] p-1 border-cyan-100" 
                               value={editValues.productLimitLabel} 
                               onChange={(e) => setEditValues({...editValues, productLimitLabel: e.target.value})}
                             />
                           ) : (
                             <span className="text-[12px] font-bold text-slate-700">{tier.productLimitLabel || 'Standard'}</span>
                           )}
                        </div>
                     </div>

                     <div className="pt-4 border-t space-y-3">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Logic Criteria (Auto-check)</h4>
                        <div className="space-y-2">
                           {[
                             { label: 'Leads Created', key: 'leadsTarget' },
                             { label: 'Closed Deals', key: 'closedTarget' },
                             { label: 'Revenue ($)', key: 'revenueTarget' },
                             { label: 'Act. Score', key: 'activityScoreTarget' },
                             { label: 'Conv %', key: 'conversionRateTarget' },
                           ].map(item => (
                             <div key={item.key} className="flex justify-between items-center p-2 rounded bg-slate-50/50 border border-slate-100">
                                <span className="text-[10px] font-medium text-slate-500">{item.label}</span>
                                {isEditing ? (
                                  <Input 
                                    type="number" 
                                    className="h-6 w-16 text-right text-[11px] p-1 border-cyan-100" 
                                    value={(editValues as any).upgradeCriteria?.[item.key]} 
                                    onChange={(e) => {
                                      const newVal = parseFloat(e.target.value);
                                      setEditValues({
                                        ...editValues, 
                                        upgradeCriteria: { ...editValues.upgradeCriteria!, [item.key]: newVal }
                                      });
                                    }}
                                  />
                                ) : (
                                  <span className="text-[11px] font-bold text-slate-700">
                                    {(tier.upgradeCriteria as any)[item.key]?.toLocaleString() || 0}
                                  </span>
                                )}
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>
                </div>
              );
            })
          }
        </div>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Create New Sales Tier</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
               <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase text-slate-400">Tier Name</Label>
                  <Input placeholder="e.g. Sapphire" value={newTierData.name} onChange={(e) => setNewTierData({...newTierData, name: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase text-slate-400">Rank Label</Label>
                    <Input placeholder="e.g. Master" value={newTierData.rankLabel} onChange={(e) => setNewTierData({...newTierData, rankLabel: e.target.value})} />
                 </div>
                 <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase text-slate-400">Commission %</Label>
                    <Input type="number" value={newTierData.commissionPct} onChange={(e) => setNewTierData({...newTierData, commissionPct: parseFloat(e.target.value)})} />
                 </div>
               </div>
               <div className="p-3 bg-cyan-50 rounded text-[11px] text-cyan-700 italic border border-cyan-100">
                 Adding a tier dynamically places it at the end of the current hierarchy rank. You can configure upgrade criteria after creation.
               </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button size="sm" className="bg-cyan-600" onClick={handleAddTier} disabled={!newTierData.name}>Create Tier</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Shell>
  );
}
