"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, addDoc } from 'firebase/firestore';
import { Agent, Lead, Commission, Target, Wallet } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar, 
  TrendingUp, 
  Wallet as WalletIcon, 
  Briefcase,
  X,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { TierBadge } from '@/components/ui/tier-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function ManagerTeamPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const teamQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'agents'), where('managerId', '==', user.id));
  }, [firestore, user?.id]);
  const { data: agents, loading: agentsLoading } = useCollection<Agent>(teamQuery as any);

  const leadsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'leads') : null, [firestore]);
  const { data: allLeads } = useCollection<Lead>(leadsQuery as any);

  const commissionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'commissions') : null, [firestore]);
  const { data: allCommissions } = useCollection<Commission>(commissionsQuery as any);

  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    return agents.filter(a => 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [agents, searchTerm]);

  const selectedAgent = agents?.find(a => a.id === selectedAgentId);

  if (!user || user.role !== 'Manager') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">My team</h1>
            <p className="text-sm text-muted-foreground">Manage your assigned agents and monitor individual performance.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <Input 
                placeholder="Search agent by name..." 
                className="pl-9 h-9 text-[13px]" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Filter size={14} /> Filter Team
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
                       <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-sm">
                         {agent.name.split(' ').map(n => n[0]).join('')}
                       </div>
                       <div>
                         <h3 className="text-[14px] font-bold leading-tight">{agent.name}</h3>
                         <TierBadge tierId={agent.tierId} />
                       </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical size={14} /></Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-[11px]">
                     <div className="space-y-0.5">
                        <p className="text-slate-400 font-medium uppercase tracking-wider">Region</p>
                        <p className="font-bold text-slate-700">{agent.region}</p>
                     </div>
                     <div className="space-y-0.5">
                        <p className="text-slate-400 font-medium uppercase tracking-wider">Join Date</p>
                        <p className="font-bold text-slate-700">{format(parseISO(agent.joinDate), 'MMM yyyy')}</p>
                     </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded p-2.5 flex justify-between gap-2 mb-4">
                     <div className="text-center flex-1">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Leads</p>
                        <p className="text-[14px] font-bold">{agentLeads.length}</p>
                     </div>
                     <div className="w-px h-6 bg-slate-200 self-center" />
                     <div className="text-center flex-1">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Won</p>
                        <p className="text-[14px] font-bold text-emerald-600">{wonLeads}</p>
                     </div>
                     <div className="w-px h-6 bg-slate-200 self-center" />
                     <div className="text-center flex-1">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Earned</p>
                        <p className="text-[14px] font-bold text-cyan-700">${earnings.toLocaleString()}</p>
                     </div>
                  </div>

                  <Button 
                    className="w-full h-8 text-[12px] bg-cyan-600 hover:bg-cyan-700 text-white"
                    onClick={() => setSelectedAgentId(agent.id)}
                  >
                    View Agent Profile
                  </Button>
                </div>
              );
            })
          }
        </div>
      </div>

      {/* Agent Detail Modal */}
      <Dialog open={!!selectedAgentId} onOpenChange={() => setSelectedAgentId(null)}>
        <DialogContent className="max-w-[640px] p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-slate-50">
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-lg">
                 {selectedAgent?.name.split(' ').map(n => n[0]).join('')}
               </div>
               <div>
                 <DialogTitle className="text-[16px] font-bold">{selectedAgent?.name}</DialogTitle>
                 <div className="flex items-center gap-2 mt-1">
                   <TierBadge tierId={selectedAgent?.tierId || ''} />
                   <span className="text-[11px] text-slate-500">{selectedAgent?.email}</span>
                 </div>
               </div>
            </div>
          </DialogHeader>
          
          <Tabs defaultValue="overview" className="w-full">
             <TabsList className="w-full h-9 bg-white border-b rounded-none px-4 justify-start gap-4">
                {['Overview', 'Leads', 'Commission', 'Targets', 'Wallet'].map(t => (
                  <TabsTrigger 
                    key={t} 
                    value={t.toLowerCase()} 
                    className="text-[12px] h-full px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-600 data-[state=active]:text-cyan-700 bg-transparent shadow-none"
                  >
                    {t}
                  </TabsTrigger>
                ))}
             </TabsList>
             
             <div className="p-4 max-h-[60vh] overflow-y-auto">
                <TabsContent value="overview" className="m-0 space-y-4">
                   <div className="grid grid-cols-2 gap-y-4 gap-x-8 py-2">
                      {[
                        { label: 'Full Name', value: selectedAgent?.name },
                        { label: 'Email', value: selectedAgent?.email },
                        { label: 'Phone', value: selectedAgent?.phone },
                        { label: 'Region', value: selectedAgent?.region },
                        { label: 'Status', value: selectedAgent?.status },
                        { label: 'Join Date', value: selectedAgent ? format(parseISO(selectedAgent.joinDate), 'PPP') : '' },
                      ].map((item, i) => (
                        <div key={i} className="flex flex-col gap-0.5">
                          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">{item.label}</span>
                          <span className="text-[13px] font-medium text-slate-800">{item.value}</span>
                        </div>
                      ))}
                   </div>
                </TabsContent>

                <TabsContent value="leads" className="m-0">
                   <div className="bg-white border rounded-md overflow-hidden">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="bg-slate-50 h-8">
                            <th className="px-3 text-left">Client</th>
                            <th className="text-left">Status</th>
                            <th className="text-right px-3">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {allLeads?.filter(l => l.agentId === selectedAgentId).map(l => (
                            <tr key={l.id} className="h-8">
                              <td className="px-3 font-medium">{l.clientName}</td>
                              <td><Badge variant="outline" className="text-[9px] h-3.5 px-1">{l.status}</Badge></td>
                              <td className="text-right px-3 font-bold">${l.estimatedBudget.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                </TabsContent>

                <TabsContent value="targets" className="m-0">
                  <p className="text-[12px] text-slate-400 italic">Target monitoring for {selectedAgent?.name} will be shown here.</p>
                </TabsContent>

                <TabsContent value="commission" className="m-0">
                   <div className="bg-white border rounded-md overflow-hidden">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="bg-slate-50 h-8">
                            <th className="px-3 text-left">Lead</th>
                            <th className="text-right px-3">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {allCommissions?.filter(c => c.agentId === selectedAgentId).map(c => (
                            <tr key={c.id} className="h-8">
                              <td className="px-3">{(c as any).clientName || 'Lead'}</td>
                              <td className="text-right px-3 font-bold text-emerald-600">${c.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                </TabsContent>

                <TabsContent value="wallet" className="m-0">
                  <div className="bg-slate-50 p-4 rounded-md border border-dashed text-center">
                    <WalletIcon className="mx-auto text-slate-300 mb-2" size={24} />
                    <p className="text-[12px] text-slate-500">Wallet balance and payout history is read-only.</p>
                  </div>
                </TabsContent>
             </div>
          </Tabs>

          <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
             <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => setSelectedAgentId(null)}>Close</Button>
             <Button className="h-8 text-[12px] bg-cyan-600 hover:bg-cyan-700">Message Agent</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
