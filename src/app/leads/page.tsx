
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function LeadsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Naked query for leads
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
        
        const product = products?.find(p => p.id === lead.productId);
        
        const matchesSearch = 
          (lead.companyName?.toLowerCase().includes(search)) ||
          (lead.clientName.toLowerCase().includes(search)) || 
          (lead.clientEmail.toLowerCase().includes(search)) ||
          (lead.status.toLowerCase().includes(search)) ||
          (product?.name.toLowerCase().includes(search));
          
        return matchesAgent && matchesSearch;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [rawLeads, user, searchTerm, products]);

  const truncate = (str: string, len: number = 8) => {
    if (!str) return '--';
    if (str.length <= len) return str;
    return str.slice(0, len) + '...';
  };

  return (
    <Shell>
      <TooltipProvider>
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="h-11 flex items-center justify-between gap-4">
            <h1 className="text-[16px] font-bold shrink-0">My leads</h1>
            <div className="flex-1 max-w-[320px] relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <Input 
                placeholder="Search company, status, product, name..." 
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

          {/* Table */}
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
                    <tr className="bg-slate-50 border-b h-9">
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
                      const productName = products?.find(p => p.id === lead.productId)?.name || 'Standard';
                      const lastActivityStr = lead.lastActivityAt ? formatDistanceToNow(new Date(lead.lastActivityAt)) + ' ago' : 'Never';
                      
                      return (
                        <tr key={lead.id} className="h-11 hover:bg-slate-50/50 transition-colors group">
                          <td className="px-3">
                            <div className="flex items-center gap-2">
                              <Building2 size={14} className="text-primary/30" />
                              <div className="flex flex-col min-w-0">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-[13px] font-bold truncate text-slate-800 cursor-help">
                                      {truncate(lead.companyName || 'Private Org')}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent><p>{lead.companyName || 'Private Org'}</p></TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </td>
                          <td className="text-[13px] text-slate-600 font-medium">{lead.clientName}</td>
                          <td className="text-[13px] text-slate-500 font-mono">{lead.clientPhone || '--'}</td>
                          <td className="text-[13px] truncate">
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <span className="cursor-help">{truncate(productName, 10)}</span>
                               </TooltipTrigger>
                               <TooltipContent><p>{productName}</p></TooltipContent>
                             </Tooltip>
                          </td>
                          <td><StatusBadge status={lead.status} /></td>
                          <td className="text-[12px] text-slate-500">
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
                              <span className="text-[13px]">{days}</span>
                            </div>
                          </td>
                          <td className="px-3 text-right">
                             <Link href={`/leads/${lead.id}`} className="text-[12px] text-primary hover:underline font-bold uppercase tracking-tight">View</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {!leadsLoading && filteredLeads.length === 0 && (
              <div className="py-10 text-center">
                <AlertCircle size={32} className="text-slate-200 mx-auto mb-2" />
                <p className="text-[13px] font-medium">No results found.</p>
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>
    </Shell>
  );
}
