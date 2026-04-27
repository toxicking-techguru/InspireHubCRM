"use client"

import React, { useMemo, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, setDoc } from 'firebase/firestore';
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

export default function AdminTiersPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

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

  if (!user || user.role !== 'Admin') return null;

  const colorConfig: Record<string, string> = {
    t1: 'border-l-slate-400 bg-slate-50/30',
    t2: 'border-l-amber-400 bg-amber-50/30',
    t3: 'border-l-blue-400 bg-blue-50/30',
    t4: 'border-l-purple-400 bg-purple-50/30',
  };

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold flex items-center gap-2 text-violet-900">
               <Layers className="text-violet-600" size={20} /> Sales Tiers Configuration
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">Define rank levels, commission rates, and qualitative upgrade targets.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-6 border-violet-200 text-violet-700 font-bold">{tiers.length} LEVELS CONFIGURED</Badge>
          </div>
        </div>

        {!loading && tiers.length === 0 && (
          <div className="py-20 border-[0.5px] border-dashed border-violet-200 rounded-lg flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
             <Database size={48} className="mb-4 text-violet-100" />
             <p className="text-[15px] font-bold text-slate-600">No Tier Records Found</p>
             <p className="text-[12px] mb-6">The system hierarchy must be initialized before you can manage agents.</p>
             <Button className="bg-violet-600 hover:bg-violet-700 font-bold uppercase text-[11px]" disabled={isInitializing} onClick={handleInitialize}>
               {isInitializing ? <Loader2 size={14} className="animate-spin mr-2" /> : <Plus size={14} className="mr-2" />}
               Initialize Default Tiers
             </Button>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[400px] rounded-lg" />) : 
            tiers?.map((tier) => {
              const tierAgents = agents?.filter(a => a.tierId === tier.id) || [];
              const isEditing = editingId === tier.id;

              return (
                <div key={tier.id} className={cn(
                  "bg-card border rounded-lg shadow-sm flex flex-col transition-all border-l-4",
                  colorConfig[tier.id] || "border-l-violet-400",
                  isEditing && "ring-1 ring-violet-500 shadow-md scale-[1.02]"
                )}>
                  <div className="p-4 border-b flex justify-between items-start">
                     <div>
                        <div className="flex items-center gap-1.5 mb-1">
                           <h3 className="text-[15px] font-bold text-slate-800">{tier.name}</h3>
                           <Badge variant="secondary" className="text-[9px] h-3.5 px-1 bg-slate-100">{tier.rankLabel?.toUpperCase() || 'LEVEL'}</Badge>
                        </div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          {tierAgents.length} Agents Assigned
                        </p>
                     </div>
                     {isEditing ? (
                       <Button size="sm" className="h-7 bg-violet-600 hover:bg-violet-700 px-2 gap-1 text-[10px] font-bold uppercase" onClick={() => handleSave(tier.id)} disabled={savingId === tier.id}>
                          {savingId === tier.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                       </Button>
                     ) : (
                       <Button variant="ghost" size="icon" className="h-7 w-7 p-0 text-slate-400 hover:text-violet-600" onClick={() => handleStartEdit(tier)}>
                          <Edit2 size={14} />
                       </Button>
                     )}
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
                               className="h-7 w-[120px] text-right text-[11px] p-1 border-violet-100" 
                               value={editValues.productLimitLabel} 
                               onChange={(e) => setEditValues({...editValues, productLimitLabel: e.target.value})}
                               placeholder="e.g. Few Products"
                             />
                           ) : (
                             <span className="text-[12px] font-bold text-slate-700">{tier.productLimitLabel || 'Standard'}</span>
                           )}
                        </div>

                        <div className="flex justify-between items-center">
                           <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase">
                              <Trophy size={14} className="text-slate-300" /> Upgrade Target
                           </div>
                           {isEditing ? (
                             <Input 
                               className="h-7 w-[120px] text-right text-[11px] p-1 border-violet-100" 
                               value={editValues.upgradeTargetLabel} 
                               onChange={(e) => setEditValues({...editValues, upgradeTargetLabel: e.target.value})}
                               placeholder="e.g. Monthly sales"
                             />
                           ) : (
                             <span className="text-[12px] font-bold text-violet-700 text-right max-w-[100px] truncate">{tier.upgradeTargetLabel || 'N/A'}</span>
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
                                    className="h-6 w-16 text-right text-[11px] p-1 border-violet-100" 
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

                  <div className="p-3 bg-slate-50 mt-auto rounded-b-lg border-t flex justify-center">
                     <Link href={`/admin/agents?tier=${tier.id}`} className="text-[10px] font-bold text-slate-400 hover:text-violet-600 uppercase flex items-center gap-1">
                        View Team in Tier <ChevronRight size={10} />
                     </Link>
                  </div>
                </div>
              );
            })
          }
        </div>

        <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex items-start gap-4">
           <Zap className="text-amber-500 mt-0.5 shrink-0" size={18} />
           <div>
              <h3 className="text-[14px] font-bold text-amber-900">System Upgrade Engine</h3>
              <p className="text-[12px] text-amber-700 mt-1 leading-relaxed">
                 InspireHubCRM monitors the 5 key criteria above. When an agent hits the threshold for the next rank, the system automatically migrates their profile, updates their commission percentage, and unlocks relevant product resources.
              </p>
           </div>
        </div>
      </div>
    </Shell>
  );
}
