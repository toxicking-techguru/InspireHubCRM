"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, writeBatch, deleteDoc, getDocs } from 'firebase/firestore';
import { Lead, Agent, Product } from '@/types/crm';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Download, 
  Loader2, 
  UserPlus, 
  Trash2,
  AlertCircle,
  X,
  Building2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function AdminAllLeadsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // New Filter States
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterIdle, setFilterIdle] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  // Data fetching - System wide for Admin
  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.id) return null;
    return query(collection(firestore, 'leads'), orderBy('createdAt', 'desc'));
  }, [firestore, user?.id]);
  const { data: leads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);

  const agentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'agents'), orderBy('name'));
  }, [firestore]);
  const { data: allAgents } = useCollection<Agent>(agentsQuery as any);

  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsQuery as any);

  // Filtered Leads logic
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(l => {
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        (l.companyName?.toLowerCase().includes(search)) ||
        (l.clientName.toLowerCase().includes(search)) || 
        (l.clientEmail.toLowerCase().includes(search)) ||
        (l.status.toLowerCase().includes(search)) ||
        (allAgents?.find(a => a.id === l.agentId)?.name.toLowerCase().includes(search));
      
      const matchesAgent = filterAgent === 'all' || l.agentId === filterAgent;
      const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
      
      let matchesIdle = true;
      if (filterIdle) {
        const lastTouch = new Date(l.lastActivityAt || l.createdAt).getTime();
        matchesIdle = (Date.now() - lastTouch) > (72 * 60 * 60 * 1000);
      }

      return matchesSearch && matchesAgent && matchesStatus && matchesIdle;
    });
  }, [leads, searchTerm, allAgents, filterAgent, filterStatus, filterIdle]);

  // Paginated data
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredLeads.slice(start, start + rowsPerPage);
  }, [filteredLeads, currentPage]);

  const totalPages = Math.ceil(filteredLeads.length / rowsPerPage);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(paginatedLeads.map(l => l.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const truncate = (str: string, len: number = 8) => {
    if (!str) return '--';
    if (str.length <= len) return str;
    return str.slice(0, len) + '...';
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

  const handleBulkDelete = async () => {
    if (!firestore || selectedLeads.length === 0) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(firestore);
      for (const leadId of selectedLeads) {
        const ref = doc(firestore, 'leads', leadId);
        batch.delete(ref);
      }
      await batch.commit();
      toast({ title: "Leads Purged", description: `Permanently removed ${selectedLeads.length} records.` });
      setSelectedLeads([]);
      setIsDeleteDialogOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Deletion Failed", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const exportCSV = () => {
    if (filteredLeads.length === 0) return;
    const headers = ['Company', 'Contact Person', 'Email', 'Phone', 'Status', 'Agent', 'Manager', 'Created At'];
    const rows = filteredLeads.map(l => {
      const agent = allAgents?.find(a => a.id === l.agentId);
      const manager = allAgents?.find(a => a.id === agent?.managerId);
      return [
        l.companyName || 'Private',
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
      <TooltipProvider>
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="h-11 flex items-center justify-between gap-4">
            <h1 className="text-[16px] font-bold text-primary-900">System-Wide Leads</h1>
            <div className="flex-1 max-w-[320px] relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <Input 
                placeholder="Search company, status, staff..." 
                className="pl-8 h-8 text-[13px] border-primary-100" 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="flex items-center gap-2">
              {selectedLeads.length > 0 && (
                <>
                  <Button size="sm" className="h-8 text-[12px] bg-primary-600 hover:bg-primary-700 gap-2 shadow-md" onClick={() => setIsReassignModalOpen(true)}>
                    <UserPlus size={14} /> Reassign ({selectedLeads.length})
                  </Button>
                  <Button variant="destructive" size="sm" className="h-8 text-[12px] gap-2 shadow-md font-bold uppercase tracking-tight" onClick={() => setIsDeleteDialogOpen(true)}>
                    <Trash2 size={14} /> Delete
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" className={cn("h-8 text-[12px] gap-2 border-primary-200 text-primary-700", showFilters && "bg-primary-50")} onClick={() => setShowFilters(!showFilters)}>
                <Filter size={14} /> {showFilters ? 'Hide Filters' : 'Filters'}
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[12px] gap-2 border-primary-200 text-primary-700" onClick={exportCSV}>
                <Download size={14} /> Export CSV
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="bg-primary-50/50 p-3 rounded-md border border-primary-100 grid md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Agent</label>
                <select 
                  className="w-full h-8 bg-white border rounded text-[12px] px-2 outline-none"
                  value={filterAgent}
                  onChange={(e) => { setFilterAgent(e.target.value); setCurrentPage(1); }}
                >
                  <option value="all">All Staff</option>
                  {allAgents?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Lead Status</label>
                <select 
                  className="w-full h-8 bg-white border rounded text-[12px] px-2 outline-none capitalize"
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                >
                  <option value="all">All Statuses</option>
                  {['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'dormant'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Idle Filter</label>
                <div className="flex items-center h-8 gap-2">
                  <Checkbox 
                    id="idle-only" 
                    checked={filterIdle} 
                    onCheckedChange={(checked) => { setFilterIdle(!!checked); setCurrentPage(1); }} 
                  />
                  <label htmlFor="idle-only" className="text-[12px] cursor-pointer">Show Idle (&gt;72h) only</label>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 flex-1 text-[11px] text-primary-600 hover:bg-primary-100" 
                  onClick={() => {
                    setFilterAgent('all');
                    setFilterStatus('all');
                    setFilterIdle(false);
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                >Reset All</Button>
                <Button variant="ghost" size="sm" className="h-8 flex-1 text-[11px] text-slate-400" onClick={() => setShowFilters(false)}>Close Filters</Button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-card border rounded-md shadow-sm overflow-hidden border-primary-100">
            {leadsLoading ? (
              <div className="py-20 flex flex-col items-center">
                <Loader2 className="animate-spin text-primary-600 mb-2" />
                <p className="text-[13px] text-muted-foreground">Loading system lead database...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 border-b h-10">
                      <th className="w-[40px] px-3">
                        <Checkbox 
                          checked={selectedLeads.length === paginatedLeads.length && paginatedLeads.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="w-[180px] text-left">Company name</th>
                      <th className="w-[140px] text-left">Contact person</th>
                      <th className="w-[140px] text-left">Agent</th>
                      <th className="w-[120px] text-left">Product</th>
                      <th className="w-[90px] text-left">Status</th>
                      <th className="w-[110px] text-left">Last activity</th>
                      <th className="w-[60px] text-left">Days</th>
                      <th className="text-right px-3 w-[80px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedLeads.map((lead) => {
                      const agent = allAgents?.find(a => a.id === lead.agentId);
                      const days = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                      const isIdle = (Date.now() - new Date(lead.lastActivityAt || lead.createdAt).getTime()) > (72 * 60 * 60 * 1000);
                      const productName = products?.find(p => p.id === lead.productId)?.name || 'Standard';
                      const lastActivityStr = lead.lastActivityAt ? formatDistanceToNow(new Date(lead.lastActivityAt)) + ' ago' : 'Never';
                      const agentName = agent?.name || 'Unassigned';
                      
                      return (
                        <tr key={lead.id} className={cn("h-11 hover:bg-primary-50/30 group transition-colors", isIdle && "bg-amber-50/30")}>
                          <td className="px-3">
                            <Checkbox 
                              checked={selectedLeads.includes(lead.id)}
                              onCheckedChange={() => toggleLeadSelection(lead.id)}
                            />
                          </td>
                          <td className="font-bold text-slate-800">
                            <div className="flex items-center gap-2 truncate">
                              <Building2 size={12} className="text-primary/50" />
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help truncate max-w-[120px]">
                                    {truncate(lead.companyName || 'Private Org')}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent><p>{lead.companyName || 'Private Org'}</p></TooltipContent>
                              </Tooltip>
                              {isIdle && <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded-full font-bold uppercase">Idle</span>}
                            </div>
                          </td>
                          <td className="text-slate-600 font-medium">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">{truncate(lead.clientName, 10)}</span>
                              </TooltipTrigger>
                              <TooltipContent><p>{lead.clientName}</p></TooltipContent>
                            </Tooltip>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-slate-600 truncate cursor-help">{truncate(agentName, 10)}</span>
                                </TooltipTrigger>
                                <TooltipContent><p>{agentName}</p></TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                          <td className="text-[12px] text-slate-600 truncate">
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <span className="cursor-help">{truncate(productName, 10)}</span>
                               </TooltipTrigger>
                               <TooltipContent><p>{productName}</p></TooltipContent>
                             </Tooltip>
                          </td>
                          <td><StatusBadge status={lead.status} /></td>
                          <td className="text-[12px] text-slate-400">
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <span className="cursor-help">{truncate(lastActivityStr, 12)}</span>
                               </TooltipTrigger>
                               <TooltipContent><p>{lastActivityStr}</p></TooltipContent>
                             </Tooltip>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-1.5 h-1.5 rounded-full", days < 8 ? "bg-emerald-500" : days < 22 ? "bg-amber-500" : "bg-red-500")} />
                              <span className="text-slate-600">{days}</span>
                            </div>
                          </td>
                          <td className="px-3 text-right">
                            <Link href={`/leads/${lead.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 text-primary-600 hover:text-primary-700 hover:bg-primary-50 text-[11px] font-bold uppercase tracking-tight">View</Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredLeads.length === 0 && (
                      <tr className="h-40">
                        <td colSpan={9} className="text-center text-muted-foreground italic text-[13px]">
                          No system leads match the current search or filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="p-3 border-t bg-slate-50/30 flex items-center justify-between text-[11px] text-slate-400 font-medium">
               <span>Showing {paginatedLeads.length} of {filteredLeads.length} records</span>
               <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 px-2 text-[11px] gap-1" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <ChevronLeft size={14} /> Previous
                  </Button>
                  <div className="flex items-center px-2">
                    <span className="text-primary font-bold">{currentPage}</span>
                    <span className="mx-1">/</span>
                    <span>{totalPages || 1}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 px-2 text-[11px] gap-1" 
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    Next <ChevronRight size={14} />
                  </Button>
               </div>
            </div>
          </div>
        </div>

        {/* Bulk Reassign Modal */}
        <Dialog open={isReassignModalOpen} onOpenChange={setIsReassignModalOpen}>
          <DialogContent className="max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-primary-950">Reassign {selectedLeads.length} Leads</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Target System User</label>
                <Select value={targetAgentId} onValueChange={setTargetAgentId}>
                  <SelectTrigger className="h-9 text-[13px] border-primary-100">
                    <SelectValue placeholder="Select new owner..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {allAgents?.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                          {a.name} ({a.region})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-[12px] text-primary-700 flex items-start gap-2 bg-primary-50 p-3 rounded border border-primary-100">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>Administrative reassignment will update ownership for all selected records. This event will be logged in the system audit trail.</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setIsReassignModalOpen(false)}>Cancel</Button>
              <Button size="sm" className="bg-primary-600 hover:bg-primary-700" onClick={handleBulkReassign} disabled={!targetAgentId || isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin" size={14} /> : 'Transfer Ownership'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="max-w-[400px]">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">Permanent Removal</AlertDialogTitle>
                <AlertDialogDescription className="text-[13px]">
                  You are about to permanently delete **{selectedLeads.length}** lead records. This action will also orphan any associated interaction logs and cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className="h-8 text-[11px] font-bold uppercase">Cancel</AlertDialogCancel>
                <Button 
                  variant="destructive" 
                  className="h-8 text-[11px] font-bold uppercase px-6" 
                  onClick={handleBulkDelete}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={14} /> : 'Delete Permanently'}
                </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </Shell>
  );
}
