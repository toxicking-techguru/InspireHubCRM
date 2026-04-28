
"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Lead, Product } from '@/types/crm';
import { MapPin, Search, Filter, Loader2, Navigation, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function LeadsMapPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const leadsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'leads'), orderBy('createdAt', 'desc')) : null
  , [firestore]);
  const { data: allLeads, loading } = useCollection<Lead>(leadsQuery as any);

  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsQuery as any);

  const mapLeads = useMemo(() => {
    if (!allLeads) return [];
    return allLeads.filter(l => {
        const matchesUser = user?.role !== 'Agent' || l.agentId === user.id;
        const matchesSearch = l.clientName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesUser && matchesSearch && l.location;
    });
  }, [allLeads, user, searchTerm]);

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <div>
              <h1 className="text-[18px] font-bold flex items-center gap-2">
                 <MapPin className="text-cyan-600" size={20} /> Pipeline Territory Visualization
              </h1>
              <p className="text-[12px] text-muted-foreground">Interactive distribution of field-acquired leads and site visit check-ins.</p>
           </div>
           <div className="flex items-center gap-2 w-full max-w-[300px]">
              <div className="relative flex-1">
                 <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                 <Input 
                   placeholder="Filter mapped clients..." 
                   className="pl-8 h-8 text-[12px]" 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
           </div>
        </div>

        <div className="flex flex-col lg:flex-row h-[calc(100vh-220px)] border rounded-lg overflow-hidden bg-slate-50">
           {/* Sidebar: List of mapped leads */}
           <div className="w-full lg:w-[320px] bg-white border-r flex flex-col">
              <div className="p-3 border-b bg-slate-50/50 flex justify-between items-center">
                 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{mapLeads.length} PINNED LEADS</span>
                 <Filter size={14} className="text-slate-300" />
              </div>
              <div className="flex-1 overflow-y-auto divide-y">
                 {mapLeads.map(l => (
                   <Link key={l.id} href={`/leads/${l.id}`}>
                      <div className="p-4 hover:bg-cyan-50/50 transition-colors group">
                         <div className="flex items-start justify-between mb-2">
                            <p className="font-bold text-slate-800 text-[14px] group-hover:text-cyan-700">{l.clientName}</p>
                            <div className="w-2 h-2 rounded-full bg-cyan-600 shadow-sm" />
                         </div>
                         <div className="space-y-1 text-[11px] text-slate-500 font-medium">
                            <div className="flex items-center gap-1.5"><Target size={12} className="text-slate-300" /> {products?.find(p => p.id === l.productId)?.name || 'Product'}</div>
                            <div className="flex items-center gap-1.5"><Navigation size={12} className="text-slate-300" /> {l.location?.lat.toFixed(4)}, {l.location?.lng.toFixed(4)}</div>
                         </div>
                      </div>
                   </Link>
                 ))}
                 {mapLeads.length === 0 && !loading && (
                   <div className="p-10 text-center space-y-2">
                      <MapPin size={24} className="mx-auto text-slate-200" />
                      <p className="text-[11px] text-slate-400 italic">No field locations captured for the current criteria.</p>
                   </div>
                 )}
              </div>
           </div>

           {/* Main Area: "Map" Visualization */}
           <div className="flex-1 relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] flex items-center justify-center">
              {loading ? (
                <Loader2 className="animate-spin text-cyan-200" size={40} />
              ) : (
                <>
                  <div className="absolute inset-0 p-10">
                     {mapLeads.map((l, i) => {
                       // Purely visual distribution logic for prototype map
                       const left = ((l.location!.lng + 180) % 360) / 360 * 100;
                       const top = ((90 - l.location!.lat) % 180) / 180 * 100;
                       return (
                         <div 
                           key={l.id} 
                           className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center group animate-in zoom-in-50 duration-500"
                           style={{ left: `${left}%`, top: `${top}%` }}
                         >
                            <MapPin className="text-cyan-600 group-hover:text-red-500 transition-colors drop-shadow-md cursor-pointer" size={24} />
                            <div className="absolute bottom-full mb-1 scale-0 group-hover:scale-100 transition-transform bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap z-10">
                               {l.clientName}
                            </div>
                         </div>
                       );
                     })}
                  </div>
                  <div className="bg-white/80 border p-3 rounded-md shadow-sm z-10 max-w-[280px] text-center backdrop-blur-sm">
                     <p className="text-[12px] font-bold text-slate-600 mb-1">Global Pipeline Visualization</p>
                     <p className="text-[10px] text-slate-400">Showing pinned leads based on field-captured coordinates. Pins represent outreach and site visit locations.</p>
                  </div>
                </>
              )}
           </div>
        </div>
      </div>
    </Shell>
  );
}
