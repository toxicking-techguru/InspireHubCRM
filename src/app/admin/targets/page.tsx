"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, orderBy, limit } from 'firebase/firestore';
import { Target, Agent } from '@/types/crm';
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Loader2, 
  History, 
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function AdminTargetsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [saving, setSaving] = useState(false);

  const monthStr = format(selectedMonth, 'yyyy-MM');

  const agentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'agents'), orderBy('name'));
  }, [firestore]);
  const { data: agents } = useCollection<Agent>(agentsQuery as any);

  const targetableStaff = useMemo(() => {
    return agents?.filter(a => a.role !== 'Admin') || [];
  }, [agents]);

  // Form State
  const [formData, setFormData] = useState({
    leadsTarget: 10,
    partnersTarget: 2,
    qualifiedTarget: 5,
    closedTarget: 2,
    revenueTarget: 5000,
    activityScoreTarget: 80
  });

  // Fetch current targets
  const targetQuery = useMemoFirebase(() => {
    if (!firestore || !selectedAgentId) return null;
    return query(
      collection(firestore, 'targets'),
      where('agentId', '==', selectedAgentId),
      where('month', '==', monthStr),
      limit(1)
    );
  }, [firestore, selectedAgentId, monthStr]);
  const { data: existingTargets } = useCollection<Target>(targetQuery as any);

  // Fetch history
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

  // Auto-fill form
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
      toast({ title: "Targets Set", description: `Quota updated for ${monthStr}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-primary flex items-center gap-2">
               <ShieldCheck size={20} /> Quota Administration
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">Define sales and partner quotas for operational staff.</p>
          </div>
          <div className="flex items-center gap-2">
             <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
               <SelectTrigger className="h-9 w-[240px] text-[12px] bg-white">
                 <SelectValue placeholder="Search team member..." />
               </SelectTrigger>
               <SelectContent className="bg-white">
                 {targetableStaff.map(a => (
                   <SelectItem key={a.id} value={a.id}>
                     <div className="flex flex-col">
                       <span className="font-bold">{a.name}</span>
                       <span className="text-[9px] text-slate-400 uppercase">{a.role}</span>
                     </div>
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
             <div className="flex items-center gap-1 bg-white border rounded-md px-2 h-9">
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
            <div className="lg:col-span-2 space-y-6">
               <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                  <div className="p-3 border-b bg-slate-50">
                    <h2 className="text-[12px] font-bold uppercase text-slate-500">Configure Monthly Quota</h2>
                  </div>
                  <div className="p-5 grid md:grid-cols-3 gap-5">
                     {[
                       { id: 'leadsTarget', label: 'Sales Leads' },
                       { id: 'partnersTarget', label: 'Partners' },
                       { id: 'qualifiedTarget', label: 'Qualification' },
                       { id: 'closedTarget', label: 'Deals Won' },
                       { id: 'revenueTarget', label: 'Revenue ($)' },
                       { id: 'activityScoreTarget', label: 'Activity %' },
                     ].map(field => (
                       <div key={field.id} className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-slate-400">{field.label}</Label>
                          <Input 
                            type="number" 
                            className="h-8 text-[13px] bg-slate-50" 
                            value={(formData as any)[field.id]}
                            onChange={(e) => setFormData({...formData, [field.id]: parseFloat(e.target.value) || 0})}
                          />
                       </div>
                     ))}
                     <div className="flex items-end">
                        <Button className="w-full h-8 bg-primary hover:bg-primary/90 gap-2 text-[11px] font-bold uppercase" onClick={handleSave} disabled={saving}>
                          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Commit
                        </Button>
                     </div>
                  </div>
               </div>

               <div className="space-y-2">
                  <h3 className="text-[14px] font-bold flex items-center gap-2 text-slate-600">
                    <History size={16} className="text-slate-300" /> Historical Assignments
                  </h3>
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="bg-slate-50 h-9 text-[11px] text-slate-400 font-bold uppercase">
                          <th className="px-4 text-left">Month</th>
                          <th className="text-center">Leads</th>
                          <th className="text-center">Partners</th>
                          <th className="text-center">Won</th>
                          <th className="text-right">Revenue</th>
                          <th className="text-right px-4">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {history?.map((h, i) => (
                          <tr key={i} className="h-10 hover:bg-slate-50 transition-colors">
                            <td className="px-4 font-bold text-slate-700">{format(parseISO(h.month + '-01'), 'MMMM yyyy')}</td>
                            <td className="text-center">{h.leadsTarget}</td>
                            <td className="text-center">{h.partnersTarget || 0}</td>
                            <td className="text-center font-bold text-primary">{h.closedTarget}</td>
                            <td className="text-right font-medium">${h.revenueTarget.toLocaleString()}</td>
                            <td className="text-right px-4 text-slate-500">{h.activityScoreTarget}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               <div className="bg-primary-50 border border-primary-100 rounded-lg p-5">
                  <div className="flex items-center gap-4 mb-6">
                     <div className="w-12 h-12 rounded-full bg-white border border-primary-100 text-primary flex items-center justify-center font-bold text-lg shadow-sm">
                       {targetableStaff.find(a => a.id === selectedAgentId)?.name?.[0]}
                     </div>
                     <div>
                        <p className="text-[15px] font-bold text-primary-900">{targetableStaff.find(a => a.id === selectedAgentId)?.name}</p>
                        <Badge variant="outline" className="text-[9px] h-4 bg-white border-primary-200 text-primary uppercase">Current Quota</Badge>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <div className="p-3 bg-white rounded border border-primary-100 text-[12px] space-y-2">
                        <div className="flex justify-between"><span>Leads Goal:</span> <b className="text-primary">{formData.leadsTarget}</b></div>
                        <div className="flex justify-between"><span>Partners Goal:</span> <b className="text-primary">{formData.partnersTarget}</b></div>
                        <div className="flex justify-between"><span>Revenue Goal:</span> <b className="text-primary">${formData.revenueTarget.toLocaleString()}</b></div>
                     </div>
                     <p className="text-[11px] text-primary-600 leading-tight italic">
                        Targets set here are immediately visible to the agent and used for monthly evaluation.
                     </p>
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="py-40 border-[0.5px] border-dashed border-primary-200 rounded-lg flex flex-col items-center justify-center text-slate-300 bg-white">
             <ShieldCheck size={48} className="mb-4 opacity-10" />
             <p className="text-[14px] font-bold text-slate-400">Select an operational team member</p>
          </div>
        )}
      </div>
    </Shell>
  );
}
