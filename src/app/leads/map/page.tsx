
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, collectionGroup } from 'firebase/firestore';
import { Lead, Product, LeadActivity, Agent } from '@/types/crm';
import { MapPin, Search, Filter, Loader2, Navigation, Target, Maximize2, History, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

// Required for Leaflet to work correctly in Next.js
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css';
import 'leaflet-defaulticon-compatibility';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const useMap = dynamic(() => import('react-leaflet').then(mod => mod.useMap), { ssr: false });

function MapFocusHandler({ center }: { center: [number, number] }) {
  const map = (useMap as any)();
  useEffect(() => {
    if (center && map && center[0] !== 0) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

export default function LeadsMapPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const leadsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'leads'), orderBy('createdAt', 'desc')) : null
  , [firestore]);
  const { data: allLeads, loading: leadsLoading } = useCollection<Lead>(leadsQuery as any);

  const agentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'agents') : null, [firestore]);
  const { data: agents } = useCollection<Agent>(agentsQuery as any);

  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products } = useCollection<Product>(productsQuery as any);

  const activitiesQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'activities') : null, [firestore]);
  const { data: allActivities } = useCollection<LeadActivity>(activitiesQuery as any);

  const filteredLeads = useMemo(() => {
    if (!allLeads) return [];
    return allLeads.filter(l => {
        const matchesUser = user?.role !== 'Agent' || l.agentId === user.id;
        
        const search = searchTerm.toLowerCase();
        const agentName = agents?.find(a => a.id === l.agentId)?.name.toLowerCase() || '';
        const productName = products?.find(p => p.id === l.productId)?.name.toLowerCase() || '';
        const clientName = l.clientName.toLowerCase();

        const matchesSearch = 
          clientName.includes(search) || 
          agentName.includes(search) || 
          productName.includes(search);

        return matchesUser && matchesSearch;
    });
  }, [allLeads, user, searchTerm, agents, products]);

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

  const mapCenter: [number, number] = useMemo(() => {
    if (selectedLead?.location) {
      return [selectedLead.location.lat, selectedLead.location.lng];
    }
    if (mapPins.length > 0) {
      return [mapPins[0].location!.lat, mapPins[0].location!.lng];
    }
    return [0, 0];
  }, [selectedLead, mapPins]);

  return (
    <Shell>
      <div className="flex flex-col h-[calc(100vh-140px)] gap-4 overflow-hidden">
        <div className="flex items-center justify-between shrink-0">
           <div>
              <h1 className="text-[18px] font-bold flex items-center gap-2">
                 <MapPin className="text-cyan-600" size={20} /> Pipeline Territory
              </h1>
              <p className="text-[12px] text-muted-foreground">Geographic distribution based on site visits. Search by client, agent, or product.</p>
           </div>
           <div className="flex items-center gap-2 w-full max-w-[320px]">
              <div className="relative flex-1">
                 <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                 <Input 
                   placeholder="Search client, staff or product..." 
                   className="pl-8 h-8 text-[12px] bg-white border-cyan-100" 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
           </div>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 border rounded-lg overflow-hidden bg-slate-50 border-cyan-100 shadow-sm min-h-0">
           {/* Sidebar: Lead Directory */}
           <div className="w-full lg:w-[280px] bg-white border-b lg:border-b-0 lg:border-r flex flex-col shrink-0 min-h-0">
              <div className="p-3 border-b bg-slate-50/50 flex justify-between items-center px-4 shrink-0">
                 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{filteredLeads.length} RECORDS</span>
                 <Filter size={14} className="text-slate-300" />
              </div>
              <div className="flex-1 overflow-y-auto divide-y">
                 {filteredLeads.map(l => {
                   const agent = agents?.find(a => a.id === l.agentId);
                   return (
                     <div 
                      key={l.id} 
                      onClick={() => setSelectedLeadId(l.id)}
                      className={cn(
                          "p-3 px-4 hover:bg-cyan-50/30 cursor-pointer transition-colors border-l-4",
                          selectedLeadId === l.id ? "bg-cyan-50/50 border-cyan-500" : "border-transparent"
                      )}
                     >
                        <div className="flex items-start justify-between mb-1">
                           <p className="font-bold text-slate-800 text-[13px] truncate">{l.clientName}</p>
                           {l.location && <div className="w-2 h-2 rounded-full bg-cyan-600 shrink-0 mt-1" title="Has GPS Pin" />}
                        </div>
                        <div className="flex flex-col gap-0.5">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[100px]">
                                 {products?.find(p => p.id === l.productId)?.name || 'Product'}
                              </span>
                              <Badge variant="outline" className="text-[8px] h-3.5 bg-slate-50 text-slate-400 border-none uppercase px-1">{l.status}</Badge>
                           </div>
                           {user?.role !== 'Agent' && (
                              <span className="text-[9px] text-cyan-600 font-bold uppercase truncate">Agent: {agent?.name || '...'}</span>
                           )}
                        </div>
                     </div>
                   );
                 })}
                 {filteredLeads.length === 0 && !leadsLoading && (
                   <div className="p-10 text-center text-slate-400 text-[11px] italic">No matching records found.</div>
                 )}
              </div>
           </div>

           {/* Main Map Hybrid */}
           <div className="flex-1 flex flex-col min-h-0 relative bg-white">
              {selectedLeadId ? (
                <div className="flex-1 flex flex-col min-h-0">
                   <div className="p-3 border-b bg-slate-50/50 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                         <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedLeadId(null)}>
                            <Maximize2 size={14} className="text-slate-400 rotate-45" />
                         </Button>
                         <div>
                            <h2 className="text-[13px] font-bold text-slate-900 leading-none">{selectedLead?.clientName}</h2>
                            <Link href={`/leads/${selectedLead?.id}`} className="text-[10px] font-bold text-cyan-600 uppercase hover:underline">Full Profile →</Link>
                         </div>
                      </div>
                      <div className="flex gap-2">
                        {selectedLead?.location ? (
                           <Badge className="bg-emerald-100 text-emerald-700 border-none h-4 text-[9px] gap-1 px-1.5"><Navigation size={8} /> Active Pin</Badge>
                        ) : (
                           <Badge variant="outline" className="h-4 text-[9px] text-slate-400 px-1.5">No Field Pin</Badge>
                        )}
                      </div>
                   </div>

                   <div className="flex-1 flex flex-col md:flex-row min-h-0">
                      <div className="flex-1 relative bg-slate-100/50 overflow-hidden min-h-0">
                         <MapContainer center={mapCenter} zoom={13} className="h-full w-full">
                           <TileLayer
                             url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                             attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                           />
                           {mapPins.map(l => (
                             <Marker 
                               key={l.id} 
                               position={[l.location!.lat, l.location!.lng]}
                               eventHandlers={{
                                 click: () => setSelectedLeadId(l.id),
                               }}
                             >
                               <Popup>
                                  <div className="p-1 min-w-[120px]">
                                    <p className="font-bold text-[12px]">{l.clientName}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">{l.status}</p>
                                    <hr className="my-1.5" />
                                    <Link href={`/leads/${l.id}`} className="text-[10px] font-bold text-cyan-600 block hover:underline">OPEN LEAD FILE</Link>
                                  </div>
                               </Popup>
                             </Marker>
                           ))}
                           <MapFocusHandler center={mapCenter} />
                         </MapContainer>
                      </div>

                      <div className="w-full md:w-[280px] border-t md:border-t-0 md:border-l bg-white flex flex-col shrink-0 min-h-0">
                         <div className="p-2.5 border-b bg-slate-50/50 flex items-center gap-2 px-4 shrink-0">
                            <History size={14} className="text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Site visit timeline</span>
                         </div>
                         <div className="flex-1 overflow-y-auto divide-y">
                            {selectedLeadSiteVisits.map(visit => (
                              <div key={visit.id} className="p-4 space-y-2 hover:bg-slate-50 transition-colors">
                                 <div className="flex justify-between items-start">
                                    <p className="text-[12px] font-bold text-slate-800">{visit.type}</p>
                                    <span className="text-[9px] font-bold text-slate-300 uppercase">{format(parseISO(visit.createdAt), 'MMM d')}</span>
                                 </div>
                                 <p className="text-[11px] text-slate-500 leading-snug line-clamp-3">{visit.remark}</p>
                                 <div className="flex items-center gap-1.5 text-[8px] font-bold text-emerald-600 bg-emerald-50 w-max px-1.5 py-0.5 rounded border border-emerald-100/50 uppercase tracking-tighter">
                                    <Navigation size={8} /> GPS Verified Log
                                 </div>
                              </div>
                            ))}
                            {selectedLeadSiteVisits.length === 0 && (
                              <div className="p-10 text-center space-y-2 opacity-50">
                                 <Clock size={24} className="mx-auto text-slate-200" />
                                 <p className="text-[10px] text-slate-400 italic">No geo-stamped visits logged.</p>
                              </div>
                            )}
                         </div>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="flex-1 relative overflow-hidden bg-slate-50">
                   {leadsLoading ? (
                     <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
                        <Loader2 className="animate-spin text-cyan-200" size={40} />
                     </div>
                   ) : (
                     <div className="h-full w-full">
                        <MapContainer center={mapCenter} zoom={mapPins.length > 0 ? 10 : 2} className="h-full w-full">
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          />
                          {mapPins.map(l => (
                            <Marker 
                              key={l.id} 
                              position={[l.location!.lat, l.location!.lng]}
                              eventHandlers={{
                                click: () => setSelectedLeadId(l.id),
                              }}
                            >
                              <Popup>
                                 <div className="p-1">
                                    <p className="font-bold text-[12px]">{l.clientName}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">{l.status}</p>
                                    <button onClick={() => setSelectedLeadId(l.id)} className="text-[10px] font-bold text-cyan-600 mt-2 block hover:underline">VIEW JOURNEY</button>
                                 </div>
                              </Popup>
                            </Marker>
                          ))}
                        </MapContainer>
                        {!selectedLeadId && mapPins.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <div className="bg-white/95 border p-8 rounded-xl shadow-2xl max-w-[320px] text-center backdrop-blur-sm border-cyan-100">
                               <Target size={42} className="mx-auto text-cyan-100 mb-4" />
                               <p className="text-[15px] font-bold text-slate-800 mb-1">Global Pipeline Viewer</p>
                               <p className="text-[11px] text-slate-500 leading-relaxed">Field agents must log site visits using the GPS button while recording activity to visualize territory coverage here.</p>
                            </div>
                          </div>
                        )}
                     </div>
                   )}
                </div>
              )}
           </div>
        </div>
      </div>
    </Shell>
  );
}
