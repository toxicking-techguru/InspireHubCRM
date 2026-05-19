"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Lead, Agent, Product, Tier } from '@/types/crm';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  Loader2, 
  UserPlus, 
  Plus,
  ChevronRight,
  AlertCircle,
  Building2
} from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ManagerAllLeadsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Data fetching
  const leadsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'leads'), orderBy('createdAt', 'desc'));
  }, [firestore]);
  const { data: leads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);

  const agentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'agents'), where('managerId', '==', user.id));
  }, [firestore, user?.id]);
  const { data: agents } = useCollection<Agent>(agentsQuery as any);

  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsQuery as any);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(l => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        (l.companyName?.toLowerCase().includes(search)) ||
        (l.clientName.toLowerCase().includes(search)) || 
        (l.clientEmail.toLowerCase().includes(search)) ||
        (l.status.toLowerCase().includes(search));
      
      const agentIds = agents?.map(a => a.id) || [];
      const isOwner = l.agentId === user?.id;
      return matchesSearch && (agentIds.includes(l.agentId) || isOwner);
    });
  }, [leads, searchTerm, agents, user?.id]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(l => l.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const handleBulkReassign = async () => {
    if (!firestore || !targetAgentId || selectedLeads.length === 0) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(firestore);
      selectedLeads.forEach(leadId => {
        const ref = doc(firestore, 'leads', leadId);
        batch.update(ref, { 
          agentId: targetAgentId,
          lastActivityAt: new Date().toISOString()
        });
      });
      await batch.commit();
      toast({ title: "Bulk Reassign Complete", description: `Reassigned ${selectedLeads.length} leads successfully.` });
      setSelectedLeads([]);
      setIsReassignModalOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const exportCSV = () => {
    if (filteredLeads.length === 0) return;
    const headers = ['Company', 'Contact', 'Email', 'Phone', 'Status', 'Agent', 'Created At'];
    const rows = filteredLeads.map(l => [
      l.companyName || 'Private',
      l.clientName,
      l.clientEmail,
      l.clientPhone,
      l.status,
      agents?.find(a => a.id === l.agentId)?.name || 'Manager',
      l.createdAt
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `team_leads_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user || user.role !== 'Manager') return null;

  return (
    <Shell>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="h-11 flex items-center justify-between gap-4">
          <h1 className="text-[16px] font-bold">Team Pipeline</h1>
          <div className="flex-1 max-w-[320px] relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input 
              placeholder="Search company, status, staff..." 
              className="pl-8 h-8 text-[13px] border-primary-100" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            {selectedLeads.length > 0 && (
              <Button size="sm" className="h-8 text-[12px] bg-primary hover:bg-primary/90 gap-2" onClick={() => setIsReassignModalOpen(true)}>
                <UserPlus size={14} /> Reassign ({selectedLeads.length})
              </Button>
            )}
            <Link href="/leads/new">
              <Button size="sm" className="h-8 text-[12px] gap-2 bg-primary hover:bg-primary/90">
                <Plus size={14} /> Add Lead
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="h-8 text-[12px] gap-2 border-primary-100 text-primary-700" onClick={exportCSV}>
              <Download size={14} /> Export CSV
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border rounded-md shadow-sm overflow-hidden border-primary-50">
          {leadsLoading ? (
            <div className="py-20 flex flex-col items-center">
              <Loader2 className="animate-spin text-primary mb-2" />
              <p className="text-[13px] text-muted-foreground">Syncing team pipeline...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b h-10">
                    <th className="w-[40px] px-3">
                      <Checkbox 
                        checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="w-[180px] text-left">Company name</th>
                    <th className="w-[140px] text-left">Agent</th>
                    <th className="w-[120px] text-left">Product</th>
                    <th className="w-[90px] text-left">Status</th>
                    <th className="w-[110px] text-left">Last activity</th>
                    <th className="w-[60px] text-left">Days</th>
                    <th className="text-right px-3 w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLeads.map((lead) => {
                    const agent = agents?.find(a => a.id === lead.agentId);
                    const isManagerOwn = lead.agentId === user.id;
                    const days = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                    const isIdle = (Date.now() - new Date(lead.lastActivityAt || lead.createdAt).getTime()) > (72 * 60 * 60 * 1000);
                    
                    return (
                      <tr key={lead.id} className={cn("h-11 hover:bg-slate-50/50 group transition-colors", isIdle && "bg-amber-50/30")}>
                        <td className="px-3">
                          <Checkbox 
                            checked={selectedLeads.includes(lead.id)}
                            onCheckedChange={() => toggleLeadSelection(lead.id)}
                          />
                        </td>
                        <td className="font-bold text-slate-800">
                          <div className="flex items-center gap-2 truncate">
                            <Building2 size={12} className="text-primary/40" />
                            {lead.companyName || 'Private Org'}
                            {isIdle && <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded-full font-bold uppercase">Idle</span>}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold",
                              isManagerOwn ? "bg-primary text-white" : "bg-slate-100 text-slate-600"
                            )}>
                              {isManagerOwn ? 'ME' : (agent?.name.split(' ').map(n => n[0]).join('') || '??')}
                            </div>
                            <span className="text-[12px] truncate text-slate-700">{isManagerOwn ? 'Self (Manager)' : (agent?.name || 'Unassigned')}</span>
                          </div>
                        </td>
                        <td className="text-[12px] truncate text-slate-600">
                           {products?.find(p => p.id === lead.productId)?.name || 'Standard'}
                        </td>
                        <td><StatusBadge status={lead.status} /></td>
                        <td className="text-[12px] text-slate-400">
                          {lead.lastActivityAt ? formatDistanceToNow(new Date(lead.lastActivityAt)) + ' ago' : 'Never'}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <div className={cn("w-1.5 h-1.5 rounded-full", days < 8 ? "bg-emerald-500" : days < 22 ? "bg-amber-500" : "bg-red-500")} />
                            <span className="text-[12px] text-slate-600">{days}</span>
                          </div>
                        </td>
                        <td className="px-3 text-right">
                          <Link href={`/leads/${lead.id}`}>
                            <Button variant="ghost" size="sm" className="h-6 text-primary hover:underline text-[11px] font-bold uppercase tracking-tight p-0 px-2">View</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLeads.length === 0 && (
                    <tr className="h-20">
                      <td colSpan={8} className="text-center text-muted-foreground italic text-[13px]">
                        No pipeline records match your current criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Reassign Modal */}
      <Dialog open={isReassignModalOpen} onOpenChange={setIsReassignModalOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-primary">Reassign {selectedLeads.length} Records</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="space-y-1.5">
               <label className="text-[11px] font-bold uppercase text-slate-400">Target Team Member</label>
               <Select value={targetAgentId} onValueChange={setTargetAgentId}>
                 <SelectTrigger className="h-9 text-[13px] border-primary-50">
                   <SelectValue placeholder="Select new agent..." />
                 </SelectTrigger>
                 <SelectContent className="bg-white">
                   <SelectItem value={user.id}>Self (Manager)</SelectItem>
                   {agents?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
             <p className="text-[11px] text-slate-500 flex items-start gap-2 bg-slate-50 p-3 rounded border">
                <AlertCircle size={14} className="shrink-0 mt-0.5 text-primary" />
                Transferring ownership will reset the idle timers for these leads and log the event in the system audit trail.
             </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsReassignModalOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 font-bold uppercase text-[11px] px-6" onClick={handleBulkReassign} disabled={!targetAgentId || isProcessing}>
              {isProcessing ? <Loader2 className="animate-spin" size={14} /> : 'Transfer Ownership'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
