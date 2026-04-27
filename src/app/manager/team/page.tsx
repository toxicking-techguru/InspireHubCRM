"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Agent, Lead, Commission } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, Wallet as WalletIcon, MoreVertical } from 'lucide-react';
import { TierBadge } from '@/components/ui/tier-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';

export default function ManagerTeamPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Use naked queries + in-memory filtering to avoid index management
  const agentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'agents') : null, [firestore]);
  const { data: allAgents, loading: agentsLoading } = useCollection<Agent>(agentsQuery as any);

  const leadsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'leads') : null, [firestore]);
  const { data: allLeads } = useCollection<Lead>(leadsQuery as any);

  const commissionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'commissions') : null, [firestore]);
  const { data: allCommissions } = useCollection<Commission>(commissionsQuery as any);

  const teamAgents = useMemo(() => {
    if (!allAgents || !user) return [];
    return allAgents.filter(a => a.managerId === user.id);
  }, [allAgents, user?.id]);

  const filteredAgents = useMemo(() => {
    return teamAgents.filter(a => 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teamAgents, searchTerm]);

  const selectedAgent = teamAgents.find(a => a.id === selectedAgentId);

  if (!user || user.role !== 'Manager') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-cyan-950">Team Directory</h1>
            <p className="text-sm text-muted-foreground">Monitor performance and managed portfolios for your {teamAgents.length} agents.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <Input 
                placeholder="Search team member..." 
                className="pl-9 h-9 text-[13px] border-cyan-100" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-2 border-cyan-100 text-cyan-700">
              <Filter size={14} /> Filter
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {agentsLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[220px] rounded-lg" />) : 
            filteredAgents.map(agent => {
              const agentLeads = allLeads?.filter(l => l.agentId === agent.id) || [];
              const wonLeads = agentLeads.filter(l => l.status === 'won').length;
              const earnings = allCommissions?.filter(c => c.agentId === agent.id).reduce((sum, c) => sum + c.amount, 0) || 0;

              return (
                <div key={agent.id} className="bg-card border-[0.5px] rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100 flex items-center justify-center font-bold text-sm">
                         {agent.name.split(' ').map(n => n[0]).join('')}
                       </div>
                       <div>
                         <h3 className="text-[14px] font-bold leading-tight text-slate-900">{agent.name}</h3>
                         <TierBadge tierId={agent.tierId} />
                       </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-slate-600"><MoreVertical size={14} /></Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-[11px]">
                     <div className="space-y-0.5">
                        <p className="text-slate-400 font-bold uppercase tracking-tight">Territory</p>
                        <p className="font-bold text-slate-700 truncate">{agent.region}</p>
                     </div>
                     <div className="space-y-0.5">
                        <p className="text-slate-400 font-bold uppercase tracking-tight">Onboarded</p>
                        <p className="font-bold text-slate-700">{format(parseISO(agent.joinDate), 'MMM yyyy')}</p>
                     </div>
                  </div>

                  <div className="bg-cyan-50/30 rounded border border-cyan-50 p-2.5 flex justify-between gap-2 mb-4">
                     <div className="text-center flex-1">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Total Leads</p>
                        <p className="text-[14px] font-bold text-slate-800">{agentLeads.length}</p>
                     </div>
                     <div className="w-px h-6 bg-cyan-100 self-center" />
                     <div className="text-center flex-1">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Wins</p>
                        <p className="text-[14px] font-bold text-emerald-600">{wonLeads}</p>
                     </div>
                     <div className="w-px h-6 bg-cyan-100 self-center" />
                     <div className="text-center flex-1">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Commission</p>
                        <p className="text-[14px] font-bold text-cyan-700">${Math.round(earnings).toLocaleString()}</p>
                     </div>
                  </div>

                  <Button 
                    className="w-full h-8 text-[12px] bg-cyan-600 hover:bg-cyan-700 text-white font-bold uppercase tracking-tight"
                    onClick={() => setSelectedAgentId(agent.id)}
                  >
                    View Agent Profile
                  </Button>
                </div>
              );
            })
          }
          {filteredAgents.length === 0 && !agentsLoading && (
            <div className="col-span-full py-20 text-center border border-dashed rounded-lg">
               <p className="text-slate-400 italic text-sm">No team members match your search.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selectedAgentId} onOpenChange={() => setSelectedAgentId(null)}>
        <DialogContent className="max-w-[640px] p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-slate-50/50">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 rounded-full bg-cyan-100 text-cyan-700 border-2 border-white shadow-sm flex items-center justify-center font-bold text-xl">
                 {selectedAgent?.name.split(' ').map(n => n[0]).join('')}
               </div>
               <div>
                 <DialogTitle className="text-[18px] font-bold text-slate-900">{selectedAgent?.name}</DialogTitle>
                 <div className="flex items-center gap-2 mt-1">
                   <TierBadge tierId={selectedAgent?.tierId || ''} />
                   <span className="text-[11px] text-slate-500 font-medium">{selectedAgent?.email}</span>
                 </div>
               </div>
            </div>
          </DialogHeader>
          
          <Tabs defaultValue="overview" className="w-full">
             <TabsList className="w-full h-9 bg-white border-b rounded-none px-4 justify-start gap-6">
                {['Overview', 'Leads', 'Commission'].map(t => (
                  <TabsTrigger 
                    key={t} 
                    value={t.toLowerCase()} 
                    className="text-[11px] h-full px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-600 data-[state=active]:text-cyan-700 bg-transparent shadow-none font-bold uppercase tracking-widest"
                  >
                    {t}
                  </TabsTrigger>
                ))}
             </TabsList>
             
             <div className="p-4 max-h-[60vh] overflow-y-auto">
                <TabsContent value="overview" className="m-0 space-y-4">
                   <div className="grid grid-cols-2 gap-y-4 gap-x-12 py-2">
                      {[
                        { label: 'Full Name', value: selectedAgent?.name },
                        { label: 'Email Address', value: selectedAgent?.email },
                        { label: 'Contact Phone', value: selectedAgent?.phone },
                        { label: 'Region / Territory', value: selectedAgent?.region },
                        { label: 'System Status', value: selectedAgent?.status },
                        { label: 'Join Date', value: selectedAgent ? format(parseISO(selectedAgent.joinDate), 'PPP') : '' },
                      ].map((item, i) => (
                        <div key={i} className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.label}</span>
                          <span className="text-[14px] font-semibold text-slate-800">{item.value}</span>
                        </div>
                      ))}
                   </div>
                </TabsContent>

                <TabsContent value="leads" className="m-0">
                   <div className="bg-white border rounded-md overflow-hidden">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="bg-slate-50 h-9 font-bold text-slate-500 uppercase tracking-tighter">
                            <th className="px-3 text-left">Client Entity</th>
                            <th className="text-left">Stage</th>
                            <th className="text-right px-3">Deal Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {allLeads?.filter(l => l.agentId === selectedAgentId).map(l => (
                            <tr key={l.id} className="h-9 hover:bg-slate-50/50">
                              <td className="px-3 font-bold text-slate-700">{l.clientName}</td>
                              <td><Badge variant="outline" className="text-[9px] h-3.5 px-1.5 font-bold uppercase">{l.status}</Badge></td>
                              <td className="text-right px-3 font-bold text-slate-900">${l.estimatedBudget.toLocaleString()}</td>
                            </tr>
                          ))}
                          {allLeads?.filter(l => l.agentId === selectedAgentId).length === 0 && (
                            <tr className="h-20"><td colSpan={3} className="text-center text-slate-300 italic">No leads managed yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                   </div>
                </TabsContent>

                <TabsContent value="commission" className="m-0">
                   <div className="bg-white border rounded-md overflow-hidden">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="bg-slate-50 h-9 font-bold text-slate-500 uppercase tracking-tighter">
                            <th className="px-3 text-left">Trigger Lead</th>
                            <th className="text-center">Rate</th>
                            <th className="text-right px-3">Earned Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {allCommissions?.filter(c => c.agentId === selectedAgentId).map(c => (
                            <tr key={c.id} className="h-9 hover:bg-slate-50/50">
                              <td className="px-3 font-medium text-slate-700">{(c as any).clientName || 'Private Lead'}</td>
                              <td className="text-center text-slate-400 font-bold">{c.commissionPct}%</td>
                              <td className="text-right px-3 font-bold text-emerald-600">${c.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                          {allCommissions?.filter(c => c.agentId === selectedAgentId).length === 0 && (
                            <tr className="h-20"><td colSpan={3} className="text-center text-slate-300 italic">No earnings recorded.</td></tr>
                          )}
                        </tbody>
                      </table>
                   </div>
                </TabsContent>
             </div>
          </Tabs>

          <div className="p-4 border-t bg-slate-50/50 flex justify-end gap-3">
             <Button variant="outline" size="sm" className="h-9 text-[11px] font-bold uppercase" onClick={() => setSelectedAgentId(null)}>Close</Button>
             <Button className="h-9 text-[11px] bg-cyan-600 hover:bg-cyan-700 font-bold uppercase tracking-tight">Direct Message</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
