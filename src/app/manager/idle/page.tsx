
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, updateDoc, addDoc } from 'firebase/firestore';
import { Lead, Agent, Product, ActivityType } from '@/types/crm';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  AlertTriangle, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  History as HistoryIcon, 
  RefreshCcw,
  UserPlus,
  Moon
} from 'lucide-react';
import { format, differenceInHours, parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ManagerIdleLeadsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [quickRemark, setQuickRemark] = useState('');
  const [quickType, setQuickType] = useState<ActivityType>('Call made');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setLastRefreshed(new Date()), 300000);
    return () => clearInterval(interval);
  }, []);

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'leads'), orderBy('lastActivityAt', 'asc'));
  }, [firestore, lastRefreshed]);
  const { data: leads, loading } = useCollection<Lead>(leadsQuery as any);

  const agentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'agents'), where('managerId', '==', user.id));
  }, [firestore, user?.id]);
  const { data: agents } = useCollection<Agent>(agentsQuery as any);

  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsQuery as any);

  const idleLeads = useMemo(() => {
    if (!leads || !agents) return [];
    const agentIds = agents.map(a => a.id);
    return leads
      .filter(l => {
        if (['won', 'lost', 'dormant'].includes(l.status)) return false;
        if (!agentIds.includes(l.agentId)) return false;
        const idleHours = differenceInHours(new Date(), parseISO(l.lastActivityAt || l.createdAt));
        return idleHours >= 72;
      })
      .map(l => ({
        ...l,
        idleHours: differenceInHours(new Date(), parseISO(l.lastActivityAt || l.createdAt))
      }))
      .sort((a, b) => b.idleHours - a.idleHours);
  }, [leads, agents]);

  const stats = useMemo(() => {
    const total = idleLeads.length;
    const critical = idleLeads.filter(l => l.idleHours >= 240).length;
    const warning = idleLeads.filter(l => l.idleHours >= 120 && l.idleHours < 240).length;
    const approaching = total - critical - warning;
    return { total, critical, warning, approaching };
  }, [idleLeads]);

  const handleQuickAdd = async (lead: Lead) => {
    if (!firestore || !user || !quickRemark.trim()) return;
    setIsSubmitting(true);
    try {
      const activityData = {
        leadId: lead.id,
        clientName: lead.clientName,
        agentId: user.id,
        agentName: user.name,
        type: quickType,
        remark: quickRemark,
        outcomeStatus: 'recorded',
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(firestore, 'leads', lead.id, 'activities'), activityData);
      await updateDoc(doc(firestore, 'leads', lead.id), { 
        lastActivityAt: new Date().toISOString() 
      });
      toast({ title: "Activity Recorded", description: "Lead updated and removed from idle list." });
      setExpandedLeadId(null);
      setQuickRemark('');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const markDormant = async (leadId: string) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'leads', leadId), { 
        status: 'dormant',
        lastActivityAt: new Date().toISOString()
      });
      toast({ title: "Lead Marked Dormant", description: "Lead moved to archives." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  if (!user || user.role !== 'Manager') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold flex items-center gap-2">
              <Clock className="text-red-500" size={20} /> Idle Team Leads
            </h1>
            <p className="text-[12px] text-muted-foreground">Leads with no activity for more than 72 hours.</p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
             <div className="flex items-center gap-1">
               <RefreshCcw size={12} className="animate-spin text-primary-500" />
               Last updated {formatDistanceToNow(lastRefreshed)} ago
             </div>
             <Button variant="outline" size="sm" className="h-8 border-primary-100 text-primary-700" onClick={() => setLastRefreshed(new Date())}>Refresh</Button>
          </div>
        </div>

        <div className="bg-primary-50 border border-primary-100 p-3 rounded-md flex flex-wrap gap-6 items-center shadow-sm">
           <div className="flex items-center gap-2">
             <span className="text-[20px] font-bold text-primary-950">{stats.total}</span>
             <span className="text-[12px] font-medium text-primary-500 uppercase tracking-tight">Idle Leads</span>
           </div>
           <div className="h-4 w-px bg-primary-200 hidden md:block" />
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[12px] font-bold text-slate-700">{stats.critical} Critical (240h+)</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-[12px] font-bold text-slate-700">{stats.warning} Warning (120h+)</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[12px] font-bold text-slate-700">{stats.approaching} Approaching</span>
           </div>
        </div>

        <div className="bg-card border rounded-md shadow-sm overflow-hidden border-primary-50">
          {loading ? (
            <div className="py-20 flex flex-col items-center">
              <Loader2 className="animate-spin text-primary-600 mb-2" />
              <p className="text-[13px] text-muted-foreground">Scanning team database...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b h-9">
                    <th className="px-3 text-left w-[180px]">Lead Name</th>
                    <th className="text-left w-[140px]">Agent</th>
                    <th className="text-left w-[120px]">Product</th>
                    <th className="text-left w-[90px]">Status</th>
                    <th className="text-center w-[100px]">Hours Idle</th>
                    <th className="text-right px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {idleLeads.map((lead) => {
                    const agent = agents?.find(a => a.id === lead.agentId);
                    const severityColor = lead.idleHours >= 240 ? "bg-red-50/30" : lead.idleHours >= 120 ? "bg-orange-50/20" : "bg-amber-50/20";
                    const textColor = lead.idleHours >= 240 ? "text-red-700" : lead.idleHours >= 120 ? "text-orange-700" : "text-amber-700";
                    
                    return (
                      <React.Fragment key={lead.id}>
                        <tr className={cn("h-10 transition-colors group", severityColor)}>
                          <td className="px-3">
                            <Link href={`/leads/${lead.id}`} className="font-bold text-primary-900 hover:underline truncate">
                              {lead.clientName}
                            </Link>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[9px] font-bold">
                                {agent?.name.split(' ').map(n => n[0]).join('') || '??'}
                              </div>
                              <span className="text-[12px] truncate text-slate-700">{agent?.name || 'Unassigned'}</span>
                            </div>
                          </td>
                          <td className="text-[12px] truncate text-slate-600">
                            {products?.find(p => p.id === lead.productId)?.name || 'Standard'}
                          </td>
                          <td><StatusBadge status={lead.status} /></td>
                          <td className="text-center">
                            <span className={cn("font-bold text-[13px]", textColor)}>{lead.idleHours}h</span>
                          </td>
                          <td className="px-3 text-right">
                             <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1 text-primary-600 hover:bg-primary-50" onClick={() => setExpandedLeadId(expandedLeadId === lead.id ? null : lead.id)}>
                                 {expandedLeadId === lead.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Intervention
                               </Button>
                               <Button variant="ghost" size="sm" className="h-6 text-[11px] text-slate-500 hover:bg-slate-100" onClick={() => markDormant(lead.id)}>
                                 <Moon size={12} className="mr-1" /> Dormant
                               </Button>
                             </div>
                          </td>
                        </tr>
                        {expandedLeadId === lead.id && (
                          <tr className="bg-slate-50/50 border-b">
                            <td colSpan={6} className="p-4 px-10">
                              <div className="flex gap-4">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-4">
                                     <Select value={quickType} onValueChange={(val) => setQuickType(val as ActivityType)}>
                                       <SelectTrigger className="h-8 w-[160px] text-[11px] bg-white border-primary-100">
                                         <SelectValue />
                                       </SelectTrigger>
                                       <SelectContent className="bg-white">
                                         {['Call made', 'Intro meeting', 'Follow up'].map(t => <SelectItem key={t} value={t} className="text-[11px]">{t}</SelectItem>)}
                                       </SelectContent>
                                     </Select>
                                     <p className="text-[11px] text-slate-500 italic">Add a quick note to reset the idle timer for this lead.</p>
                                  </div>
                                  <Textarea 
                                    className="bg-white text-[12px] min-h-[60px] resize-none border-primary-100 focus-visible:ring-primary" 
                                    placeholder="Brief intervention note..." 
                                    value={quickRemark}
                                    onChange={(e) => setQuickRemark(e.target.value)}
                                  />
                                </div>
                                <div className="flex flex-col gap-2 justify-end">
                                  <Button size="sm" className="h-8 bg-primary hover:bg-primary-900 text-[12px] font-bold px-6" onClick={() => handleQuickAdd(lead)} disabled={isSubmitting || !quickRemark.trim()}>
                                    {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : 'Post Update'}
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 text-[12px]" onClick={() => setExpandedLeadId(null)}>Cancel</Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {idleLeads.length === 0 && !loading && (
                    <tr className="h-40">
                      <td colSpan={6} className="text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                         <AlertTriangle size={32} className="text-emerald-500/20" />
                         <p className="text-[14px] font-bold text-slate-400">Perfect Pipeline Health</p>
                         <p className="text-[12px]">No team leads currently exceeding the 72h idle threshold.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
