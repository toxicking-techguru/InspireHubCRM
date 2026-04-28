
"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, collectionGroup } from 'firebase/firestore';
import { Lead, Product, LeadActivity } from '@/types/crm';
import { MapPin, Search, Filter, Loader2, Navigation, Target, Maximize2, History, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

export default function LeadsMapPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const leadsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'leads'), orderBy('createdAt', 'desc')) : null
  , [firestore]);
  const { data: allLeads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);

  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsQuery as any);

  // Fetch all activities globally to find geo-stamped interactions
  const activitiesQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'activities') : null, [firestore]);
  const { data: allActivities } = useCollection<LeadActivity>(activitiesQuery as any);

  const filteredLeads = useMemo(() => {
    if (!allLeads) return [];
    return allLeads.filter(l => {
        const matchesUser = user?.role !== 'Agent' || l.agentId === user.id;
        const matchesSearch = l.clientName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesUser && matchesSearch;
    });
  }, [allLeads, user, searchTerm]);

  const mapPins = useMemo(() => {
    if (!filteredLeads) return [];
    return filteredLeads.filter(l => l.location);
  }, [filteredLeads]);

  const selectedLead = filteredLeads.find(l => l.id === selectedLeadId);
  const selectedLeadSiteVisits = useMemo(() => {
    if (!selectedLeadId || !allActivities) return [];
    return allActivities
      .filter(a => a.leadId === selectedLeadId && a.location)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [selectedLeadId, allActivities]);

  const bounds = useMemo(() => {
    if (mapPins.length === 0) return { minLat: -90, maxLat: 90, minLng: -180, maxLng: 180 };
    const lats = mapPins.map(l => l.location!.lat);
    const lngs = mapPins.map(l => l.location!.lng);
    return {
      minLat: Math.min(...lats) - 0.05,
      maxLat: Math.max(...lats) + 0.05,
      minLng: Math.min(...lngs) - 0.05,
      maxLng: Math.max(...lngs) + 0.05
    };
  }, [mapPins]);

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <div>
              <h1 className="text-[18px] font-bold flex items-center gap-2">
                 <MapPin className="text-cyan-600" size={20} /> Pipeline Territory
              </h1>
              <p className="text-[12px] text-muted-foreground">Distribution of leads and interaction history based on GPS check-ins.</p>
           </div>
           <div className="flex items-center gap-2 w-full max-w-[300px]">
              <div className="relative flex-1">
                 <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                 <Input 
                   placeholder="Filter team leads..." 
                   className="pl-8 h-8 text-[12px]" 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
           </div>
        </div>

        <div className="flex flex-col lg:flex-row h-[calc(100vh-220px)] border rounded-lg overflow-hidden bg-slate-50">
           {/* Sidebar: Lead Directory */}
           <div className="w-full lg:w-[320px] bg-white border-r flex flex-col">
              <div className="p-3 border-b bg-slate-50/50 flex justify-between items-center">
                 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{filteredLeads.length} RECORDS</span>
                 <Filter size={14} className="text-slate-300" />
              </div>
              <div className="flex-1 overflow-y-auto divide-y">
                 {filteredLeads.map(l => (
                   <div 
                    key={l.id} 
                    onClick={() => setSelectedLeadId(l.id)}
                    className={cn(
                        "p-4 hover:bg-cyan-50/30 cursor-pointer transition-colors border-l-4",
                        selectedLeadId === l.id ? "bg-cyan-50/50 border-cyan-500" : "border-transparent"
                    )}
                   >
                      <div className="flex items-start justify-between mb-1">
                         <p className="font-bold text-slate-800 text-[13px] truncate">{l.clientName}</p>
                         {l.location && <div className="w-2 h-2 rounded-full bg-cyan-600" title="Has GPS Pin" />}
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] text-slate-400 font-bold uppercase">{products?.find(p => p.id === l.productId)?.name || 'Product'}</span>
                         <span className="text-[10px] text-slate-300">{(l as any).idleHours ? `${(l as any).idleHours}h idle` : ''}</span>
                      </div>
                   </div>
                 ))}
                 {filteredLeads.length === 0 && !leadsLoading && (
                   <div className="p-10 text-center text-slate-400 text-[11px] italic">No matching records found.</div>
                 )}
              </div>
           </div>

           {/* Main Detail/Map Hybrid */}
           <div className="flex-1 relative bg-white overflow-hidden flex">
              {selectedLeadId ? (
                <div className="w-full flex flex-col animate-in fade-in duration-300">
                   <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedLeadId(null)}>
                            <Maximize2 size={14} className="text-slate-400 rotate-45" />
                         </Button>
                         <div>
                            <h2 className="text-[14px] font-bold text-slate-900">{selectedLead?.clientName}</h2>
                            <Link href={`/leads/${selectedLead?.id}`} className="text-[10px] font-bold text-cyan-600 uppercase hover:underline">View Lead Profile →</Link>
                         </div>
                      </div>
                      <div className="flex gap-2">
                        {selectedLead?.location ? (
                           <Badge className="bg-emerald-100 text-emerald-700 border-none h-5 text-[10px] gap-1"><Navigation size={10} /> Live Coordinates</Badge>
                        ) : (
                           <Badge variant="outline" className="h-5 text-[10px] text-slate-400">No Field Pin</Badge>
                        )}
                      </div>
                   </div>

                   <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                      <div className="flex-1 relative bg-slate-100/50 overflow-hidden flex items-center justify-center p-10">
                         {/* Visual Grid Map */}
                         <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0891b2 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                         
                         {selectedLead?.location ? (
                           <div className="relative animate-in zoom-in-50 duration-500">
                              <MapPin className="text-cyan-600 drop-shadow-xl" size={64} />
                              <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400 opacity-20 scale-150" />
                              <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 bg-white p-3 rounded-lg shadow-xl border border-slate-100 text-center whitespace-nowrap">
                                 <p className="text-[11px] font-bold uppercase text-slate-400">Primary Location</p>
                                 <p className="text-[13px] font-mono text-slate-700">{selectedLead.location.lat.toFixed(4)}, {selectedLead.location.lng.toFixed(4)}</p>
                              </div>
                           </div>
                         ) : (
                           <div className="text-center space-y-3 opacity-30">
                              <MapPin size={48} className="mx-auto" />
                              <p className="text-[12px] font-medium max-w-[200px]">Lead has not been geo-verified in the field yet.</p>
                           </div>
                         )}
                      </div>

                      <div className="w-full md:w-[300px] border-l bg-white flex flex-col overflow-hidden">
                         <div className="p-3 border-b bg-slate-50/50 flex items-center gap-2">
                            <History size={14} className="text-slate-400" />
                            <span className="text-[11px] font-bold text-slate-500 uppercase">Field Visit Logs</span>
                         </div>
                         <div className="flex-1 overflow-y-auto divide-y">
                            {selectedLeadSiteVisits.map(visit => (
                              <div key={visit.id} className="p-4 space-y-2">
                                 <div className="flex justify-between items-start">
                                    <p className="text-[12px] font-bold text-slate-800">{visit.type}</p>
                                    <span className="text-[9px] font-bold text-slate-300 uppercase">{format(parseISO(visit.createdAt), 'MMM d')}</span>
                                 </div>
                                 <p className="text-[11px] text-slate-500 line-clamp-3">{visit.remark}</p>
                                 <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 w-max px-1.5 py-0.5 rounded border border-emerald-100/50">
                                    <Navigation size={8} /> Verified Log
                                 </div>
                              </div>
                            ))}
                            {selectedLeadSiteVisits.length === 0 && (
                              <div className="p-10 text-center space-y-2 opacity-50 grayscale">
                                 <Clock size={24} className="mx-auto text-slate-200" />
                                 <p className="text-[10px] text-slate-400 italic">No interaction-level coordinates recorded.</p>
                              </div>
                            )}
                         </div>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                   <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0891b2 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                   
                   {leadsLoading ? (
                     <Loader2 className="animate-spin text-cyan-200" size={40} />
                   ) : (
                     <>
                        <div className="absolute inset-0 p-20">
                           {mapPins.map((l, i) => {
                             const latRange = bounds.maxLat - bounds.minLat || 0.1;
                             const lngRange = bounds.maxLng - bounds.minLng || 0.1;
                             const left = ((l.location!.lng - bounds.minLng) / lngRange) * 100;
                             const top = 100 - (((l.location!.lat - bounds.minLat) / latRange) * 100);
                             
                             return (
                               <div 
                                 key={l.id} 
                                 onClick={() => setSelectedLeadId(l.id)}
                                 className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center group cursor-pointer transition-transform hover:scale-125 z-10"
                                 style={{ left: `${left}%`, top: `${top}%` }}
                               >
                                  <MapPin className="text-cyan-600 drop-shadow-md" size={24} />
                                  <div className="absolute bottom-full mb-1 scale-0 group-hover:scale-100 transition-all bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
                                     {l.clientName}
                                  </div>
                               </div>
                             );
                           })}
                        </div>
                        
                        <div className="bg-white/80 border p-6 rounded-xl shadow-xl z-10 max-w-[320px] text-center backdrop-blur-sm border-cyan-100">
                           <Target size={40} className="mx-auto text-cyan-100 mb-4" />
                           <p className="text-[15px] font-bold text-slate-800 mb-1">Field Intelligence Map</p>
                           <p className="text-[11px] text-slate-500">Select a lead from the directory to trace field activities and physical interaction points.</p>
                        </div>

                        <div className="absolute bottom-4 left-4 flex gap-4 px-4 py-2 bg-white/90 border rounded-full shadow-lg backdrop-blur-sm z-10 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-cyan-50">
                           <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-cyan-600" /> Active Pins</div>
                           <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-200" /> Territory Bounds Loaded</div>
                        </div>
                     </>
                   )}
                </div>
              )}
           </div>
        </div>
      </div>
    </Shell>
  );
}
