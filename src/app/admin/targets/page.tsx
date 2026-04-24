
"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, orderBy, limit } from 'firebase/firestore';
import { Target, Agent } from '@/types/crm';
import { 
  Target as TargetIcon, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Loader2, 
  History, 
  User,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, subMonths, parseISO } from 'date-fns';
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

  // Admin sees ALL agents
  const agentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'agents'), orderBy('name'));
  }, [firestore]);
  const { data: agents } = useCollection<Agent>(agentsQuery as any);

  // Form State
  const [formData, setFormData] = useState({
    leadsTarget: 10,
    qualifiedTarget: 5,
    closedTarget: 2,
    revenueTarget: 5000,
    activityScoreTarget: 80
  });

  // Fetch current targets for selection
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

  // Auto-fill form if target exists
  React.useEffect(() => {
    if (existingTargets?.[0]) {
      const t = existingTargets[0];
      setFormData({
        leadsTarget: t.leadsTarget,
        qualifiedTarget: t.qualifiedTarget,
        closedTarget: t.closedTarget,
        revenueTarget: t.revenueTarget,
        activityScoreTarget: t.activityScoreTarget
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
      toast({ title: "Targets Set", description: `Global quota updated for ${monthStr}` });
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
            <h1 className="text-[18px] font-bold text-violet-900 flex items-center gap-2">
               <ShieldCheck className="text-violet-600" size={20} /> Quota Administration
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">Define system-wide performance targets for any sales representative.</p>
          </div>
          <div className="flex items-center gap-2">
             <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
               <SelectTrigger className="h-9 w-[240px] text-[12px] bg-white border-violet-100">
                 <SelectValue placeholder="Search agent to assign targets..." />
               </SelectTrigger>
               <SelectContent>
                 {agents?.map(a => (
                   <SelectItem key={a.id} value={a.id}>
                     <div className="flex flex-col">
                       <span>{a.name}</span>
                       <span className="text-[9px] text-slate-400 uppercase">{a.region} · {a.role}</span>
                     </div>
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
             <div className="flex items-center gap-1 bg-slate-50 border rounded-md px-2 h-9">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-[12px] font-bold min-w-[80px] text-center">{format(selectedMonth, 'MMM yyyy')}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)))}>
                  <ChevronRight size={14} />
                </Button>
             </div>
          </div>
        </div>

        {selectedAgentId ? (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
               <div className="bg-card border border-violet-100 rounded-md shadow-sm overflow-hidden">
                  <div className="p-3 border-b bg-violet-50/50">
                    <h2 className="text-[13px] font-bold uppercase tracking-tight text-violet-700">Configure Monthly Quota</h2>
                  </div>
                  <div className="p-4 grid md:grid-cols-3 gap-5">
                     {[
                       { id: 'leadsTarget', label: 'Leads Created', type: 'number' },
                       { id: 'qualifiedTarget', label: 'Qualified Target', type: 'number' },
                       { id: 'closedTarget', label: 'Closed Deals', type: 'number' },
                       { id: 'revenueTarget', label: 'Revenue ($)', type: 'number' },
                       { id: 'activityScoreTarget', label: 'Activity Score', type: 'number' },
                     ].map(field => (
                       <div key={field.id} className="space-y-1.5">
                          <Label className="text-[11px] font-bold uppercase text-slate-400 tracking-tight">{field.label}</Label>
                          <Input 
                            type="number" 
                            className="h-8 text-[13px] border-violet-50 focus-visible:ring-violet-600" 
                            value={(formData as any)[field.id]}
                            onChange={(e) => setFormData({...formData, [field.id]: parseFloat(e.target.value)})}
                          />
                       </div>
                     ))}
                     <div className="flex items-end">
                        <Button className="w-full h-8 bg-violet-600 hover:bg-violet-700 gap-2 text-[12px] font-bold uppercase" onClick={handleSave} disabled={saving}>
                          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Commit Targets
                        </Button>
                     </div>
                  </div>
               </div>

               <div className="space-y-2">
                  <h3 className="text-[14px] font-bold flex items-center gap-2 text-slate-700">
                    <History size={16} className="text-violet-400" /> Historical Assignments
                  </h3>
                  <div className="bg-card border rounded-md shadow-sm overflow-hidden">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="bg-slate-50 h-9 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                          <th className="px-3 text-left">Month</th>
                          <th className="text-center">Leads</th>
                          <th className="text-center">Qual.</th>
                          <th className="text-center">Won</th>
                          <th className="text-right">Revenue</th>
                          <th className="text-right px-3">Act. Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {history?.map((h, i) => (
                          <tr key={i} className="h-10 hover:bg-slate-50/50 transition-colors">
                            <td className="px-3 font-bold text-slate-700">{format(parseISO(h.month + '-01'), 'MMMM yyyy')}</td>
                            <td className="text-center text-slate-600">{h.leadsTarget}</td>
                            <td className="text-center text-slate-600">{h.qualifiedTarget}</td>
                            <td className="text-center font-bold text-violet-700">{h.closedTarget}</td>
                            <td className="text-right font-medium">${h.revenueTarget.toLocaleString()}</td>
                            <td className="text-right px-3 text-slate-500">{h.activityScoreTarget}%</td>
                          </tr>
                        ))}
                        {(!history || history.length === 0) && (
                          <tr className="h-24"><td colSpan={6} className="text-center text-slate-300 italic text-[12px]">No historical targets defined for this agent.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               <div className="bg-violet-50 border border-violet-100 rounded-md p-5 shadow-inner">
                  <div className="flex items-center gap-4 mb-6">
                     <div className="w-12 h-12 rounded-full bg-white border border-violet-100 text-violet-600 flex items-center justify-center font-bold text-lg shadow-sm">
                       {agents?.find(a => a.id === selectedAgentId)?.name[0]}
                     </div>
                     <div>
                        <p className="text-[15px] font-bold text-violet-900">{agents?.find(a => a.id === selectedAgentId)?.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                           <Badge variant="outline" className="text-[9px] h-4 bg-white border-violet-200 text-violet-700 uppercase tracking-tighter">Current Quota</Badge>
                           <span className="text-[10px] text-slate-400 font-bold uppercase">{monthStr}</span>
                        </div>
                     </div>
                  </div>
                  <div className="space-y-5">
                     <div className="p-3 bg-white/60 rounded border border-violet-100/50 text-[12px] space-y-2">
                        <div className="flex justify-between">
                           <span className="text-slate-500">Leads Goal:</span>
                           <b className="text-violet-700">{formData.leadsTarget}</b>
                        </div>
                        <div className="flex justify-between">
                           <span className="text-slate-500">Wins Goal:</span>
                           <b className="text-violet-700">{formData.closedTarget}</b>
                        </div>
                        <div className="flex justify-between">
                           <span className="text-slate-500">Revenue Goal:</span>
                           <b className="text-violet-700">${formData.revenueTarget.toLocaleString()}</b>
                        </div>
                     </div>
                     <p className="text-[11px] text-violet-600 leading-tight italic">
                        Targets set here are immediately visible to the agent and their manager. Monthly tier evaluations are based on these benchmarks.
                     </p>
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="py-40 border-[0.5px] border-dashed border-violet-200 rounded-lg flex flex-col items-center justify-center text-slate-300 bg-slate-50/30">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                <TargetIcon size={32} className="text-violet-100" />
             </div>
             <p className="text-[15px] font-bold text-slate-400">Select an agent profile</p>
             <p className="text-[12px] text-slate-400">Select a team member from the dropdown to manage their performance benchmarks.</p>
          </div>
        )}
      </div>
    </Shell>
  );
}
