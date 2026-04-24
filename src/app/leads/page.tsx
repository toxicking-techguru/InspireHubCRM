"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  MoreHorizontal,
  ChevronRight,
  Mail,
  Phone,
  Globe,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { Lead, Product } from '@/types/crm';
import { format } from 'date-fns';

export default function LeadsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    let q = collection(firestore, 'leads');
    
    if (user.role === 'Agent') {
      return query(q, where('agentId', '==', user.id), orderBy('createdAt', 'desc'));
    }
    
    return query(q, orderBy('createdAt', 'desc'));
  }, [firestore, user?.id, user?.role]);

  const { data: leads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);
  
  const productsQuery = useMemoFirebase(() => 
    firestore ? collection(firestore, 'products') : null
  , [firestore]);
  
  const { data: products } = useCollection<Product>(productsQuery as any);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(lead => {
      const search = searchTerm.toLowerCase();
      return lead.clientName.toLowerCase().includes(search) || 
             lead.clientEmail.toLowerCase().includes(search);
    });
  }, [leads, searchTerm]);

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Leads Management</h1>
            <p className="text-sm text-muted-foreground">Manage your sales pipeline and track interactions.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Download size={14} /> Export
            </Button>
            <Link href="/leads/new">
              <Button size="sm" className="h-9 gap-2">
                <Plus size={14} /> New Lead
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-card border rounded-lg p-3 shadow-sm flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input 
              placeholder="Search leads by name or email..." 
              className="pl-9 h-9" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-2 shrink-0">
              <Filter size={14} /> Filters
            </Button>
            <select className="bg-background border rounded-md h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option>All Products</option>
              {products?.map(p => <option key={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
          {leadsLoading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader2 size={32} className="animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Fetching pipeline...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="w-[40px] px-3">
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="px-4">Lead Info</th>
                    <th>Product</th>
                    <th>Status</th>
                    <th>Last Active</th>
                    <th className="text-right px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="group">
                      <td className="px-3">
                        <input type="checkbox" className="rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{lead.clientName}</span>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Mail size={10} /> {lead.clientEmail}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Phone size={10} /> {lead.clientPhone}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="text-sm">{products?.find(p => p.id === lead.productId)?.name || 'Unknown'}</span>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Globe size={10} /> {lead.businessCountry}
                          </span>
                        </div>
                      </td>
                      <td><StatusBadge status={lead.status} /></td>
                      <td>
                        <span className="text-xs text-muted-foreground">
                          {lead.lastActivityAt ? format(new Date(lead.lastActivityAt), 'MMM d, yyyy') : 'Never'}
                        </span>
                      </td>
                      <td className="px-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/leads/${lead.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ChevronRight size={16} />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {!leadsLoading && filteredLeads.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <Search size={24} className="text-slate-300" />
              </div>
              <p className="text-sm font-medium">No leads found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your filters or search term.</p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
