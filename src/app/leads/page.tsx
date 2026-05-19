"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical,
  AlertCircle,
  Loader2,
  X,
  Building2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lead, Product } from '@/types/crm';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function LeadsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Naked query for leads to avoid composite index requirements
  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.id) return null;
    return collection(firestore, 'leads');
  }, [firestore, user?.id]);

  const { data: rawLeads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);
  
  const productsQuery = useMemoFirebase(() => 
    firestore ? collection(firestore, 'products') : null
  , [firestore]);
  const { data: products } = useCollection<Product>(productsQuery as any);

  // Filter and sort in memory
  const filteredLeads = useMemo(() => {
    if (!rawLeads || !user) return [];
    return rawLeads
      .filter(lead => {
        const matchesAgent = user.role !== 'Agent' || lead.agentId === user.id;
        const search = searchTerm.toLowerCase().trim();
        const matchesSearch = 
          (lead.companyName?.toLowerCase().includes(search)) ||
          (lead.clientName.toLowerCase().includes(search)) || 
          (lead.clientEmail.toLowerCase().includes(search)) ||
          (lead.status.toLowerCase().includes(search));
        return matchesAgent && matchesSearch;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [rawLeads, user, searchTerm]);

  return (
    <Shell>
      <div className="space-y-3">
        {/* Toolbar Row 44px */}
        <div className="h-11 flex items-center justify-between gap-4">
          <h1 className="text-[16px] font-bold shrink-0">My leads</h1>
          <div className="flex-1 max-w-[320px] relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input 
              placeholder="Search company, status, person..." 
              className="pl-8 h-8 text-[13px] bg-white" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
              className={cn("h-8 text-[13px] gap-2", showFilters && "bg-slate-100")}
            >
              <Filter size={14} /> Filters
            </Button>
            <Link href="/leads/new">
              <Button size="sm" className="h-8 text-[13px] gap-2">
                <Plus size={14} /> Add lead
              </Button>
            </Link>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="bg-card border rounded-md p-3 shadow-sm grid md:grid-cols-2 gap-3">
            <div className="space-y-2">
               <div className="grid grid-cols-2 gap-2">
                 <select className="bg-white border rounded h-8 px-2 text-[12px]">
                   <option>All Statuses</option>
                 </select>
                 <select className="bg-white border rounded h-8 px-2 text-[12px]">
                   <option>All Products</option>
                   {products?.map(p => <option key={p.id}>{p.name}</option>)}
                 </select>
               </div>
               <select className="w-full bg-white border rounded h-8 px-2 text-[12px]">
                 <option>All Channels</option>
               </select>
            </div>
            <div className="space-y-2">
               <div className="grid grid-cols-2 gap-2">
                  <Input type="date" className="h-8 text-[12px] p-1 px-2" />
                  <Input type="date" className="h-8 text-[12px] p-1 px-2" />
               </div>
               <div className="flex items-center gap-2 px-1">
                 <input type="checkbox" id="idle" className="rounded" />
                 <label htmlFor="idle" className="text-[12px]">Show Idle only (&gt;72h)</label>
               </div>
            </div>
          </div>
        )}

        {/* Filter Chips */}
        {searchTerm && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="h-5 text-[10px] gap-1 px-1.5 font-normal">
              Search: {searchTerm}
              <X size={10} className="cursor-pointer" onClick={() => setSearchTerm('')} />
            </Badge>
          </div>
        )}

        {/* Leads Table */}
        <div className="bg-card border rounded-md shadow-sm overflow-hidden">
          {leadsLoading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader2 size={24} className="animate-spin text-primary mb-2" />
              <p className="text-[13px] text-muted-foreground">Loading leads...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b h-9">
                    <th className="w-[180px] px-3 text-[12px] font-semibold text-left">Company name</th>
                    <th className="w-[140px] text-[12px] font-semibold text-left">Primary contact</th>
                    <th className="w-[120px] text-[12px] font-semibold text-left">Phone</th>
                    <th className="w-[140px] text-[12px] font-semibold text-left">Product</th>
                    <th className="w-[90px] text-[12px] font-semibold text-left">Status</th>
                    <th className="w-[110px] text-[12px] font-semibold text-left">Last activity</th>
                    <th className="w-[60px] text-[12px] font-semibold text-left">Days</th>
                    <th className="w-[80px] px-3 text-[12px] font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLeads.map((lead) => {
                    const days = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                    const isIdle = (Date.now() - new Date(lead.lastActivityAt || lead.createdAt).getTime()) > (72 * 60 * 60 * 1000);
                    
                    return (
                      <tr key={lead.id} className="h-11 hover:bg-slate-50/50 transition-colors group">
                        <td className="px-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/5 rounded border border-primary/10">
                              <Building2 size={14} className="text-primary" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[13px] font-bold truncate text-slate-800">{lead.companyName || 'Private Organization'}</span>
                              {isIdle && <span className="text-[8px] bg-red-100 text-red-600 px-1 rounded-full font-bold uppercase w-max">Idle</span>}
                            </div>
                          </div>
                        </td>
                        <td className="text-[13px] text-slate-600 font-medium">{lead.clientName}</td>
                        <td className="text-[13px] text-slate-500 font-mono">{lead.clientPhone || '--'}</td>
                        <td className="text-[13px] truncate">
                           {products?.find(p => p.id === lead.productId)?.name || 'Standard'}
                        </td>
                        <td><StatusBadge status={lead.status} /></td>
                        <td className="text-[12px] text-slate-500">
                          {lead.lastActivityAt ? formatDistanceToNow(new Date(lead.lastActivityAt)) + ' ago' : 'Never'}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <div className={cn("w-1.5 h-1.5 rounded-full", days < 8 ? "bg-emerald-500" : days < 22 ? "bg-amber-500" : "bg-red-500")} />
                            <span className="text-[13px]">{days}</span>
                          </div>
                        </td>
                        <td className="px-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/leads/${lead.id}`} className="text-[12px] text-primary hover:underline font-bold uppercase tracking-tight">View</Link>
                            <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical size={12} /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {!leadsLoading && filteredLeads.length === 0 && (
            <div className="py-10 flex flex-col items-center justify-center text-center px-4">
              <AlertCircle size={32} className="text-slate-200 mb-2" />
              <p className="text-[13px] font-medium">No leads match your search</p>
              <Button size="sm" variant="outline" className="mt-3 h-8 text-[12px]" onClick={() => setSearchTerm('')}>Clear Search</Button>
            </div>
          )}

          <div className="p-3 border-t bg-slate-50/30 flex items-center justify-between text-[12px] text-muted-foreground">
             <span>Showing {filteredLeads.length} of {rawLeads?.length || 0} records</span>
             <div className="flex items-center gap-2">
                <div className="flex gap-1">
                   <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" disabled>Prev</Button>
                   <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" disabled>Next</Button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
