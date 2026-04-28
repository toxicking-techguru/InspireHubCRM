"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Lead, Product } from '@/types/crm';
import { MapPin, Search, Filter, Loader2, Navigation, Target, Maximize2 } from 'lucide-react';
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

  // Dynamic bounds calculation to ensure pins are always visible in the viewport
  const bounds = useMemo(() => {
    if (mapLeads.length === 0) return { minLat: -90, maxLat: 90, minLng: -180, maxLng: 180 };
    const lats = mapLeads.map(l => l.location!.lat);
    const lngs = mapLeads.map(l => l.location!.lng);
    return {
      minLat: Math.min(...lats) - 0.1,
      maxLat: Math.max(...lats) + 0.1,
      minLng: Math.min(...lngs) - 0.1,
      maxLng: Math.max(...lngs) + 0.1
    };
  }, [mapLeads]);

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
                      <div className="p-4 hover:bg-cyan-50/50 transition-colors group border-l-4 border-transparent hover:border-cyan-500">
                         <div className="flex items-start justify-between mb-2">
                            <p className="font-bold text-slate-800 text-[14px] group-hover:text-cyan-700 truncate">{l.clientName}</p>
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
           <div className="flex-1 relative bg-white overflow-hidden flex items-center justify-center">
              {/* Grid Overlay for context */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0891b2 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
              
              {loading ? (
                <Loader2 className="animate-spin text-cyan-200" size={40} />
              ) : (
                <>
                  <div className="absolute inset-0 p-20">
                     {mapLeads.map((l, i) => {
                       // Relative position calculation based on local bounds to ensure visibility
                       const latRange = bounds.maxLat - bounds.minLat || 0.1;
                       const lngRange = bounds.maxLng - bounds.minLng || 0.1;
                       
                       const left = ((l.location!.lng - bounds.minLng) / lngRange) * 100;
                       const top = 100 - (((l.location!.lat - bounds.minLat) / latRange) * 100);
                       
                       return (
                         <div 
                           key={l.id} 
                           className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center group animate-in zoom-in-50 duration-500"
                           style={{ left: `${left}%`, top: `${top}%` }}
                         >
                            <div className="relative">
                               <MapPin className="text-cyan-600 group-hover:text-red-500 transition-colors drop-shadow-md cursor-pointer" size={24} />
                               {/* Pulsing indicator for active leads */}
                               <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400 opacity-20 scale-150" />
                            </div>
                            <div className="absolute bottom-full mb-2 scale-0 group-hover:scale-100 transition-all origin-bottom bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xl whitespace-nowrap z-50">
                               <p>{l.clientName}</p>
                               <p className="text-slate-400 font-normal">Last Activity: {formatDistanceToNow(parseISO(l.lastActivityAt))} ago</p>
                            </div>
                         </div>
                       );
                     })}
                  </div>
                  
                  {/* Status Bar */}
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center px-4 py-2 bg-white/90 border rounded-full shadow-lg backdrop-blur-sm z-10">
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-cyan-600" />
                           <span className="text-[10px] font-bold text-slate-500 uppercase">Field Pin</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                           Territory Bounds: {bounds.minLat.toFixed(2)} to {bounds.maxLat.toFixed(2)} Lat
                        </div>
                     </div>
                     <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1.5 uppercase font-bold text-cyan-600" onClick={() => window.location.reload()}>
                        <Maximize2 size={12} /> Reset View
                     </Button>
                  </div>

                  {mapLeads.length === 0 && (
                    <div className="bg-white/80 border p-6 rounded-xl shadow-xl z-10 max-w-[320px] text-center backdrop-blur-sm">
                       <MapPin size={40} className="mx-auto text-slate-200 mb-4" />
                       <p className="text-[14px] font-bold text-slate-700 mb-1">Waiting for Field Data</p>
                       <p className="text-[11px] text-slate-500">Capture your current GPS location when adding a lead or logging site activities to visualize your pipeline here.</p>
                    </div>
                  )}
                </>
              )}
           </div>
        </div>
      </div>
    </Shell>
  );
}
