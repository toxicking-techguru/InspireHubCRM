
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
  CheckSquare, 
  Square,
  ChevronRight,
  AlertCircle
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
      const matchesSearch = l.clientName.toLowerCase().includes(search) || l.clientEmail.toLowerCase().includes(search);
      // Manager only sees their team's leads (simplified for MVP, usually filtered by agentIds)
      const agentIds = agents?.map(a => a.id) || [];
      return matchesSearch && agentIds.includes(l.agentId);
    });
  }, [leads, searchTerm, agents]);

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
    const headers = ['Client Name', 'Email', 'Phone', 'Status', 'Agent', 'Created At'];
    const rows = filteredLeads.map(l => [
      l.clientName,
      l.clientEmail,
      l.clientPhone,
      l.status,
      agents?.find(a => a.id === l.agentId)?.name || 'Unknown',
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
          <h1 className="text-[16px] font-bold">All Team Leads</h1>
          <div className="flex-1 max-w-[240px] relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input 
              placeholder="Search leads..." 
              className="pl-8 h-8 text-[13px]" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            {selectedLeads.length > 0 && (
              <Button size="sm" className="h-8 text-[12px] bg-cyan-600 hover:bg-cyan-700 gap-2" onClick={() => setIsReassignModalOpen(true)}>
                <UserPlus size={14} /> Reassign ({selectedLeads.length})
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 text-[12px] gap-2" onClick={exportCSV}>
              <Download size={14} /> Export CSV
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border rounded-md shadow-sm overflow-hidden">
          {leadsLoading ? (
            <div className="py-20 flex flex-col items-center">
              <Loader2 className="animate-spin text-primary mb-2" />
              <p className="text-[13px] text-muted-foreground">Loading team leads...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
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
                    const days = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                    const isIdle = (Date.now() - new Date(lead.lastActivityAt || lead.createdAt).getTime()) > (72 * 60 * 60 * 1000);
                    
                    return (
                      <tr key={lead.id} className={cn("h-9 hover:bg-slate-50/50 group transition-colors", isIdle && "bg-amber-50/30")}>
                        <td className="px-3">
                          <Checkbox 
                            checked={selectedLeads.includes(lead.id)}
                            onCheckedChange={() => toggleLeadSelection(lead.id)}
                          />
                        </td>
                        <td className="font-medium">
                          <div className="flex items-center gap-1.5 truncate">
                            {lead.clientName}
                            {isIdle && <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded-full font-bold uppercase">Idle</span>}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-[9px] font-bold">
                              {agent?.name.split(' ').map(n => n[0]).join('') || '??'}
                            </div>
                            <span className="text-[12px] truncate">{agent?.name || 'Unassigned'}</span>
                          </div>
                        </td>
                        <td className="text-[12px] truncate">
                           {products?.find(p => p.id === lead.productId)?.name || 'Standard'}
                        </td>
                        <td><StatusBadge status={lead.status} /></td>
                        <td className="text-[12px] text-slate-500">
                          {lead.lastActivityAt ? formatDistanceToNow(new Date(lead.lastActivityAt)) + ' ago' : 'Never'}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <div className={cn("w-1.5 h-1.5 rounded-full", days < 8 ? "bg-emerald-500" : days < 22 ? "bg-amber-500" : "bg-red-500")} />
                            <span className="text-[12px]">{days}</span>
                          </div>
                        </td>
                        <td className="px-3 text-right">
                          <Link href={`/leads/${lead.id}`}>
                            <Button variant="ghost" size="sm" className="h-6 text-primary hover:underline text-[12px] p-0 px-2">View</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLeads.length === 0 && (
                    <tr className="h-20">
                      <td colSpan={8} className="text-center text-muted-foreground italic text-[13px]">
                        No leads found matching current filters.
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
            <DialogTitle>Reassign {selectedLeads.length} Leads</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="space-y-1.5">
               <label className="text-[12px] font-bold">Target Agent</label>
               <Select value={targetAgentId} onValueChange={setTargetAgentId}>
                 <SelectTrigger className="h-9 text-[13px]">
                   <SelectValue placeholder="Select new agent..." />
                 </SelectTrigger>
                 <SelectContent>
                   {agents?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
             <p className="text-[12px] text-muted-foreground flex items-start gap-2 bg-slate-50 p-3 rounded border">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                This will transfer all selected leads and update their last activity timestamp. This action is logged.
             </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsReassignModalOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700" onClick={handleBulkReassign} disabled={!targetAgentId || isProcessing}>
              {isProcessing ? <Loader2 className="animate-spin" size={14} /> : 'Confirm Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
