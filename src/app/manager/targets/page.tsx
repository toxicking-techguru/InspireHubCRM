"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, orderBy, limit } from 'firebase/firestore';
import { Target, Agent, Lead } from '@/types/crm';
import { 
  Target as TargetIcon, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Loader2, 
  History, 
  TrendingUp,
  User 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, addMonths, subMonths, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ManagerTargetsPage() {
  const { user, config } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [saving, setSaving] = useState(false);

  const monthStr = format(selectedMonth, 'yyyy-MM');
  const currencySymbol = config?.currency === 'KES' ? 'KES ' : config?.currency === 'GBP' ? '£' : '$';

  const agentsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.id) return null;
    return query(collection(firestore, 'agents'), where('managerId', '==', user.id));
  }, [firestore, user?.id]);
  const { data: agents } = useCollection<Agent>(agentsQuery as any);

  // Form State
  const [formData, setFormData] = useState({
    leadsTarget: 10,
    partnersTarget: 2,
    qualifiedTarget: 5,
    closedTarget: 2,
    revenueTarget: 5000,
    activityScoreTarget: 80
  });

  // Fetch current targets for selection
  const targetQuery = useMemoFirebase(() => {
    if (!firestore || !selectedAgentId || !monthStr) return null;
    return query(
      collection(firestore, 'targets'),
      where('agentId', '==', selectedAgentId),
      where('month', '==', monthStr),
      limit(1)
    );
  }, [firestore, selectedAgentId, monthStr]);
  const { data: existingTargets } = useCollection<Target>(targetQuery as any);

  // Fetch history for selected agent
  const historyQuery = useMemoFirebase(() => {
    if (!firestore || !selectedAgentId) return null;
    return query(
      collection(firestore, 'targets'),
      where('agentId', '==', selectedAgentId),
      orderBy('month', 'desc'),
      limit(6)
    );
  }, [firestore, selectedAgentId]);
  const { data: history } = useCollection<Target>(historyQuery as any);

  // Fetch leads for progress calculation
  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedAgentId) return null;
    return query(collection(firestore, 'leads'), where('agentId', '==', selectedAgentId));
  }, [firestore, selectedAgentId]);
  const { data: leads } = useCollection<Lead>(leadsQuery as any);

  const actuals = useMemo(() => {
    if (!leads) return { leadsCount: 0, revenue: 0 };
    const mStart = startOfMonth(selectedMonth);
    const mEnd = endOfMonth(selectedMonth);

    const monthLeads = leads.filter(l => {
      const d = parseISO(l.createdAt);
      return d >= mStart && d <= mEnd;
    });

    const monthRev = leads
      .filter(l => l.status === 'won' && l.wonAt && parseISO(l.wonAt) >= mStart && parseISO(l.wonAt) <= mEnd)
      .reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);

    return { leadsCount: monthLeads.length, revenue: monthRev };
  }, [leads, selectedMonth]);

  // Auto-fill form if target exists
  React.useEffect(() => {
    if (existingTargets?.[0]) {
      const t = existingTargets[0];
      setFormData({
        leadsTarget: t.leadsTarget,
        partnersTarget: t.partnersTarget || 0,
        qualifiedTarget: t.qualifiedTarget,
        closedTarget: t.closedTarget,
        revenueTarget: t.revenueTarget,
        activityScoreTarget: t.activityScoreTarget
      });
    } else {
      setFormData({
        leadsTarget: 10, partnersTarget: 2, qualifiedTarget: 5, closedTarget: 2, revenueTarget: 5000, activityScoreTarget: 80
      });
    }
  }, [existingTargets]);

  const handleSave = async () => {
    if (!firestore || !selectedAgentId) return;
    setSaving(true);
    try {
      const targetId = `${selectedAgentId}_${monthStr}`;
      await setDoc(doc(firestore, 'targets', targetId), {
        agentId: selectedAgentId,
        month: monthStr,
        ...formData,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast({ title: "Targets Updated", description: `Performance goals set for ${monthStr}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'Manager') return null;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold">Target Management</h1>
            <p className="text-[12px] text-muted-foreground">Define and monitor performance quotas for your team.</p>
          </div>
          <div className="flex items-center gap-2">
             <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
               <SelectTrigger className="h-9 w-[200px] text-[12px]">
                 <SelectValue placeholder="Select Agent..." />
               </SelectTrigger>
               <SelectContent className="bg-white">
                 {agents?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
               </SelectContent>
             </Select>
             <div className="flex items-center gap-1 bg-slate-50 border rounded-md px-2 h-9">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-[12px] font-bold min-w-[80px] text-center">{format(selectedMonth, 'MMM yyyy')}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}>
                  <ChevronRight size={14} />
                </Button>
             </div>
          </div>
        </div>

        {selectedAgentId ? (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
               <div className="bg-card border rounded-md shadow-sm">
                  <div className="p-3 border-b bg-slate-50/50">
                    <h2 className="text-[13px] font-bold uppercase tracking-tight text-slate-500">Set Monthly Quotas</h2>
                  </div>
                  <div className="p-4 grid md:grid-cols-3 gap-4">
                     {[
                       { id: 'leadsTarget', label: 'Leads Created' },
                       { id: 'partnersTarget', label: 'Partner Accounts' },
                       { id: 'qualifiedTarget', label: 'Qualified Target' },
                       { id: 'closedTarget', label: 'Closed Deals' },
                       { id: 'revenueTarget', label: `Revenue (${currencySymbol.trim()})` },
                       { id: 'activityScoreTarget', label: 'Activity Score' },
                     ].map(field => (
                       <div key={field.id} className="space-y-1.5">
                          <Label className="text-[11px] font-bold uppercase text-slate-400">{field.label}</Label>
                          <Input 
                            type="number" 
                            className="h-8 text-[13px]" 
                            value={(formData as any)[field.id.split(' ')[0]]}
                            onChange={(e) => {
                              const key = field.id.startsWith('revenue') ? 'revenueTarget' : field.id;
                              setFormData({...formData, [key as any]: parseFloat(e.target.value) || 0})
                            }}
                          />
                       </div>
                     ))}
                     <div className="flex items-end">
                        <Button className="w-full h-8 bg-primary hover:bg-primary/90 gap-2 text-[12px] font-bold uppercase" onClick={handleSave} disabled={saving}>
                          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Targets
                        </Button>
                     </div>
                  </div>
               </div>

               <div className="space-y-2">
                  <h3 className="text-[14px] font-bold flex items-center gap-2">
                    <History size={16} className="text-slate-400" /> Quota History
                  </h3>
                  <div className="bg-card border rounded-md shadow-sm overflow-hidden">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="bg-slate-50 h-9">
                          <th className="px-3 text-left">Month</th>
                          <th className="text-center">Leads</th>
                          <th className="text-center">Partners</th>
                          <th className="text-center">Won</th>
                          <th className="text-right">Revenue</th>
                          <th className="text-right px-3">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {history?.map((h, i) => (
                          <tr key={i} className="h-9 hover:bg-slate-50/50 transition-colors">
                            <td className="px-3 font-medium">{format(parseISO(h.month + '-01'), 'MMM yyyy')}</td>
                            <td className="text-center">{h.leadsTarget}</td>
                            <td className="text-center">{h.partnersTarget || 0}</td>
                            <td className="text-center font-bold text-emerald-600">{h.closedTarget}</td>
                            <td className="text-right">{currencySymbol}{h.revenueTarget.toLocaleString()}</td>
                            <td className="text-right px-3">{h.activityScoreTarget}</td>
                          </tr>
                        ))}
                        {(!history || history.length === 0) && (
                          <tr className="h-20"><td colSpan={6} className="text-center text-slate-400 italic">No historical targets found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               <div className="bg-primary-50 border border-primary-100 rounded-md p-4">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                       {agents?.find(a => a.id === selectedAgentId)?.name[0]}
                     </div>
                     <div>
                        <p className="text-[14px] font-bold">{agents?.find(a => a.id === selectedAgentId)?.name}</p>
                        <Badge variant="outline" className="text-[9px] h-3.5 bg-white border-primary-200 text-primary font-bold">Current Progress</Badge>
                     </div>
                  </div>
                  <div className="space-y-4">
                     {[
                       { label: 'Leads Progress', val: actuals.leadsCount, target: formData.leadsTarget },
                       { label: 'Revenue Progress', val: actuals.revenue, target: formData.revenueTarget, isCurrency: true },
                     ].map((p, i) => {
                       const pct = p.target > 0 ? Math.min(Math.round((p.val / p.target) * 100), 100) : 0;
                       return (
                         <div key={i} className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-bold">
                               <span className="text-slate-500 uppercase tracking-tighter">{p.label}</span>
                               <span className="text-primary">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
                               <div className="h-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }}></div>
                            </div>
                            <p className="text-[10px] text-slate-400 text-right">
                              {p.isCurrency ? `${currencySymbol}${p.val.toLocaleString()}` : p.val} / {p.isCurrency ? `${currencySymbol}${p.target.toLocaleString()}` : p.target}
                            </p>
                         </div>
                       );
                     })}
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="py-20 border-[0.5px] border-dashed rounded-md flex flex-col items-center justify-center text-slate-400 bg-white">
             <User size={32} className="mb-2 opacity-20" />
             <p className="text-[14px] font-medium">Select an agent to manage performance targets.</p>
          </div>
        )}
      </div>
    </Shell>
  );
}
