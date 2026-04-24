"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Lead, Agent, Product } from '@/types/crm';
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
  CheckSquare, 
  Square,
  ChevronRight,
  AlertCircle,
  X
} from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function AdminAllLeadsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Data fetching - System wide for Admin
  const leadsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'leads'), orderBy('createdAt', 'desc'));
  }, [firestore]);
  const { data: leads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);

  const agentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'agents'), orderBy('name'));
  }, [firestore]);
  const { data: allAgents } = useCollection<Agent>(agentsQuery as any);

  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsQuery as any);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(l => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        l.clientName.toLowerCase().includes(search) || 
        l.clientEmail.toLowerCase().includes(search) ||
        allAgents?.find(a => a.id === l.agentId)?.name.toLowerCase().includes(search);
      return matchesSearch;
    });
  }, [leads, searchTerm, allAgents]);

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
    const headers = ['Client Name', 'Email', 'Phone', 'Status', 'Agent', 'Manager', 'Created At'];
    const rows = filteredLeads.map(l => {
      const agent = allAgents?.find(a => a.id === l.agentId);
      const manager = allAgents?.find(a => a.id === agent?.managerId);
      return [
        l.clientName,
        l.clientEmail,
        l.clientPhone,
        l.status,
        agent?.name || 'Unknown',
        manager?.name || 'None',
        l.createdAt
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `system_leads_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user || user.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="h-11 flex items-center justify-between gap-4">
          <h1 className="text-[16px] font-bold text-violet-900">System-Wide Leads</h1>
          <div className="flex-1 max-w-[280px] relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input 
              placeholder="Search leads, email or agent..." 
              className="pl-8 h-8 text-[13px] border-violet-100" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            {selectedLeads.length > 0 && (
              <Button size="sm" className="h-8 text-[12px] bg-violet-600 hover:bg-violet-700 gap-2 shadow-md" onClick={() => setIsReassignModalOpen(true)}>
                <UserPlus size={14} /> Reassign ({selectedLeads.length})
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 text-[12px] gap-2 border-violet-200 text-violet-700" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={14} /> {showFilters ? 'Hide Filters' : 'Filters'}
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[12px] gap-2 border-violet-200 text-violet-700" onClick={exportCSV}>
              <Download size={14} /> Export CSV
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-violet-50/50 p-3 rounded-md border border-violet-100 grid md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Agent</label>
              <select className="w-full h-8 bg-white border rounded text-[12px] px-2">
                <option>All Agents</option>
                {allAgents?.map(a => <option key={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Lead Status</label>
              <select className="w-full h-8 bg-white border rounded text-[12px] px-2">
                <option>All Statuses</option>
                {['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'dormant'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Idle Filter</label>
              <div className="flex items-center h-8 gap-2">
                 <Checkbox id="idle-only" />
                 <label htmlFor="idle-only" className="text-[12px] cursor-pointer">Show Idle (&gt;72h) only</label>
              </div>
            </div>
            <div className="flex items-end">
              <Button variant="ghost" size="sm" className="h-8 w-full text-[11px] text-violet-600 hover:bg-violet-100" onClick={() => setShowFilters(false)}>Close Filters</Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-card border rounded-md shadow-sm overflow-hidden border-violet-100">
          {leadsLoading ? (
            <div className="py-20 flex flex-col items-center">
              <Loader2 className="animate-spin text-violet-600 mb-2" />
              <p className="text-[13px] text-muted-foreground">Loading system lead database...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-slate-50 border-b h-9">
                    <th className="w-[40px] px-3">
                      <Checkbox 
                        checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="w-[180px] text-left">Client name</th>
                    <th className="w-[140px] text-left">Agent</th>
                    <th className="w-[140px] text-left">Manager</th>
                    <th className="w-[120px] text-left">Product</th>
                    <th className="w-[90px] text-left">Status</th>
                    <th className="w-[110px] text-left">Last activity</th>
                    <th className="w-[60px] text-left">Days</th>
                    <th className="text-right px-3 w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLeads.map((lead) => {
                    const agent = allAgents?.find(a => a.id === lead.agentId);
                    const manager = allAgents?.find(a => a.id === agent?.managerId);
                    const days = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                    const isIdle = (Date.now() - new Date(lead.lastActivityAt || lead.createdAt).getTime()) > (72 * 60 * 60 * 1000);
                    
                    return (
                      <tr key={lead.id} className={cn("h-10 hover:bg-violet-50/30 group transition-colors", isIdle && "bg-amber-50/30")}>
                        <td className="px-3">
                          <Checkbox 
                            checked={selectedLeads.includes(lead.id)}
                            onCheckedChange={() => toggleLeadSelection(lead.id)}
                          />
                        </td>
                        <td className="font-bold text-slate-800">
                          <div className="flex items-center gap-1.5 truncate">
                            {lead.clientName}
                            {isIdle && <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded-full font-bold uppercase">Idle</span>}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-violet-100 text-violet-700 flex items-center justify-center text-[9px] font-bold">
                              {agent?.name.split(' ').map(n => n[0]).join('') || '??'}
                            </div>
                            <span className="text-slate-600 truncate">{agent?.name || 'Unassigned'}</span>
                          </div>
                        </td>
                        <td className="text-slate-500 italic">
                           {manager?.name || '--'}
                        </td>
                        <td className="text-[12px] text-slate-600 truncate">
                           {products?.find(p => p.id === lead.productId)?.name || 'Standard'}
                        </td>
                        <td><StatusBadge status={lead.status} /></td>
                        <td className="text-[12px] text-slate-400">
                          {lead.lastActivityAt ? formatDistanceToNow(new Date(lead.lastActivityAt)) + ' ago' : 'Never'}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <div className={cn("w-1.5 h-1.5 rounded-full", days < 8 ? "bg-emerald-500" : days < 22 ? "bg-amber-500" : "bg-red-500")} />
                            <span className="text-slate-600">{days}</span>
                          </div>
                        </td>
                        <td className="px-3 text-right">
                          <Link href={`/leads/${lead.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-violet-600 hover:text-violet-700 hover:bg-violet-100 text-[11px] font-bold uppercase tracking-tight">View</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLeads.length === 0 && (
                    <tr className="h-40">
                      <td colSpan={9} className="text-center text-muted-foreground italic text-[13px]">
                        No system leads match the current search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="p-3 border-t bg-slate-50/30 flex items-center justify-between text-[11px] text-slate-400 font-medium">
             <span>Total Records: {filteredLeads.length}</span>
             <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]" disabled>Previous Page</Button>
                <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]" disabled>Next Page</Button>
             </div>
          </div>
        </div>
      </div>

      {/* Bulk Reassign Modal */}
      <Dialog open={isReassignModalOpen} onOpenChange={setIsReassignModalOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-violet-900">Reassign {selectedLeads.length} Leads</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="space-y-1.5">
               <label className="text-[12px] font-bold text-slate-500 uppercase">Target System Agent</label>
               <Select value={targetAgentId} onValueChange={setTargetAgentId}>
                 <SelectTrigger className="h-9 text-[13px] border-violet-100">
                   <SelectValue placeholder="Select new owner..." />
                 </SelectTrigger>
                 <SelectContent>
                   {allAgents?.map(a => (
                     <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.region})
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div className="text-[12px] text-violet-700 flex items-start gap-2 bg-violet-50 p-3 rounded border border-violet-100">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>Administrative reassignment will update ownership for all selected records. This event will be logged in the system audit trail.</span>
             </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsReassignModalOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={handleBulkReassign} disabled={!targetAgentId || isProcessing}>
              {isProcessing ? <Loader2 className="animate-spin" size={14} /> : 'Transfer Ownership'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
