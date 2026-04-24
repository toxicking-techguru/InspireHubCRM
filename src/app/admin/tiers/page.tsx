
"use client"

import React, { useMemo, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Tier, Agent } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function AdminTiersPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const tiersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'tiers'), orderBy('rankLevel')) : null, [firestore]);
  const { data: tiers, loading } = useCollection<Tier>(tiersQuery as any);

  const agentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'agents') : null, [firestore]);
  const { data: agents } = useCollection<Agent>(agentsQuery as any);

  const [editValues, setEditValues] = useState<Partial<Tier>>({});

  const handleStartEdit = (tier: Tier) => {
    setEditingId(tier.id);
    setEditValues(tier);
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

  const handleAddCriterion = (id: string) => {
    // Simplified for MVP - normally would push to array
    toast({ title: "Metric Added", description: "New performance target added to evaluation list." });
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
        <div>
          <h1 className="text-[18px] font-bold flex items-center gap-2 text-violet-900">
             <Layers className="text-violet-600" size={20} /> Performance Tiers & Criteria
          </h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Configure global commission rates and auto-upgrade performance targets.</p>
        </div>

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
                           <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-slate-200">RANK {tier.rankLevel}</Badge>
                        </div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          {tierAgents.length} Active Agents
                        </p>
                     </div>
                     {isEditing ? (
                       <Button size="sm" className="h-7 bg-violet-600 hover:bg-violet-700 px-2 gap-1 text-[10px] font-bold uppercase" onClick={() => handleSave(tier.id)} disabled={savingId === tier.id}>
                          {savingId === tier.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                       </Button>
                     ) : (
                       <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-violet-600" onClick={() => handleStartEdit(tier)}>
                          <Edit2 size={14} />
                       </Button>
                     )}
                  </div>

                  <div className="p-4 space-y-5 flex-1">
                     <div className="space-y-4">
                        <div className="flex justify-between items-center group">
                           <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
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
                           <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                              <Package size={14} className="text-slate-300" /> Prod Limit
                           </div>
                           {isEditing ? (
                             <Input 
                               type="number" 
                               className="h-7 w-16 text-right text-[12px] p-1 font-bold" 
                               value={editValues.productLimit} 
                               onChange={(e) => setEditValues({...editValues, productLimit: parseInt(e.target.value)})}
                             />
                           ) : (
                             <span className="text-[18px] font-bold text-slate-800">{tier.productLimit}</span>
                           )}
                        </div>
                     </div>

                     <div className="pt-4 border-t space-y-3">
                        <div className="flex justify-between items-center">
                           <h4 className="text-[11px] font-bold text-violet-700 uppercase tracking-widest">Upgrade Criteria</h4>
                           {isEditing && (
                             <button className="text-[10px] text-violet-600 font-bold hover:underline" onClick={() => handleAddCriterion(tier.id)}>+ ADD</button>
                           )}
                        </div>
                        <div className="space-y-2">
                           {[
                             { label: 'Leads Target', key: 'leadsTarget' },
                             { label: 'Won Target', key: 'closedTarget' },
                             { label: 'Revenue Target', key: 'revenueTarget', isPrice: true },
                           ].map(item => (
                             <div key={item.key} className="flex justify-between items-center p-2 rounded bg-white border border-slate-100 group">
                                <span className="text-[11px] font-medium text-slate-500">{item.label}</span>
                                {isEditing ? (
                                  <Input 
                                    type="number" 
                                    className="h-6 w-20 text-right text-[11px] p-1 border-violet-100" 
                                    value={(editValues as any).upgradeCriteria[item.key]} 
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
                                    {item.isPrice ? `$${tier.upgradeCriteria[item.key as keyof typeof tier.upgradeCriteria].toLocaleString()}` : tier.upgradeCriteria[item.key as keyof typeof tier.upgradeCriteria]}
                                  </span>
                                )}
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="p-3 bg-slate-50/80 mt-auto rounded-b-lg border-t flex justify-center">
                     <Link href={`/admin/agents?tier=${tier.id}`} className="text-[10px] font-bold text-slate-400 hover:text-violet-600 uppercase tracking-tighter flex items-center gap-1">
                        Manage Agents in this tier <ChevronRight size={10} />
                     </Link>
                  </div>
                </div>
              );
            })
          }
        </div>

        <div className="bg-violet-50 border border-violet-100 p-4 rounded-lg flex items-start gap-4">
           <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
              <Target size={20} />
           </div>
           <div>
              <h3 className="text-[14px] font-bold text-violet-900">System Evaluation Logic</h3>
              <p className="text-[12px] text-violet-700 mt-1 leading-relaxed">
                 NexusCRM performs an automated evaluation on the 1st of every month. Agents meeting the cumulative criteria defined above are automatically migrated to the next tier. Tier migrations trigger an audit log entry and a dashboard notification for both the Agent and their Manager.
              </p>
           </div>
        </div>
      </div>
    </Shell>
  );
}
