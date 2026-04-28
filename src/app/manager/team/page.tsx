
"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Agent, Lead, Commission, UserStatus, Role } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, Wallet as WalletIcon, MoreVertical, UserPlus, Loader2, Banknote } from 'lucide-react';
import { TierBadge } from '@/components/ui/tier-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function ManagerTeamPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Data Fetching
  const agentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'agents') : null, [firestore]);
  const { data: allAgents, loading: agentsLoading } = useCollection<Agent>(agentsQuery as any);

  const leadsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'leads') : null, [firestore]);
  const { data: allLeads } = useCollection<Lead>(leadsQuery as any);

  const commissionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'commissions') : null, [firestore]);
  const { data: allCommissions } = useCollection<Commission>(commissionsQuery as any);

  const tiersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'tiers') : null, [firestore]);
  const { data: tiers } = useCollection<any>(tiersQuery as any);

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

  // Onboarding Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    region: '',
    tierId: 't1',
    status: 'active' as UserStatus,
    paymentDetails: {
      bankName: '',
      accountName: '',
      accountNumber: '',
      paymentMethod: 'Bank Transfer'
    }
  });

  const handleAddAgent = () => {
    setFormData({ 
      name: '', email: '', phone: '', region: '', tierId: 't1', status: 'active',
      paymentDetails: { bankName: '', accountName: '', accountNumber: '', paymentMethod: 'Bank Transfer' }
    });
    setIsDrawerOpen(true);
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    setIsSaving(true);
    try {
      const agentId = `agent_${Date.now()}`;
      const finalData = {
        ...formData,
        role: 'Agent' as Role,
        managerId: user.id,
        joinDate: new Date().toISOString(),
      };
      
      await setDoc(doc(firestore, 'agents', agentId), finalData);
      await setDoc(doc(firestore, 'wallets', agentId), {
        agentId, totalEarned: 0, pending: 0, withdrawable: 0, withdrawn: 0
      });

      toast({ title: "Agent Onboarded", description: `${formData.name} is now registered.` });
      setIsDrawerOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Onboarding Failed", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || user.role !== 'Manager') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-cyan-950">Territory Directory</h1>
            <p className="text-sm text-muted-foreground">Manage agent profiles and capture locked payment details.</p>
          </div>
          <Button size="sm" className="h-9 gap-2 bg-cyan-600" onClick={handleAddAgent}>
            <UserPlus size={14} /> New Agent
          </Button>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {agentsLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[220px] rounded-lg" />) : 
            filteredAgents.map(agent => (
              <div key={agent.id} className="bg-card border rounded-lg p-4 shadow-sm relative group">
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">{agent.name[0]}</div>
                      <div>
                        <p className="font-bold text-slate-900 leading-none">{agent.name}</p>
                        <TierBadge tierId={agent.tierId} />
                      </div>
                   </div>
                   <button onClick={() => setSelectedAgentId(agent.id)} className="text-cyan-600 font-bold text-[11px] uppercase tracking-tighter hover:underline">Profile →</button>
                </div>
                <div className="space-y-2 text-[11px] text-slate-500 mb-4">
                   <div className="flex justify-between"><span>Region:</span> <b className="text-slate-800">{agent.region}</b></div>
                   <div className="flex justify-between"><span>Email:</span> <b className="text-slate-800">{agent.email}</b></div>
                   <div className="flex justify-between items-center pt-2 border-t">
                      <span className="flex items-center gap-1"><Banknote size={10} /> Bank Setup:</span>
                      <Badge variant={agent.paymentDetails?.accountNumber ? "outline" : "destructive"} className="h-3.5 text-[8px] border-none uppercase">
                        {agent.paymentDetails?.accountNumber ? "Configured" : "Incomplete"}
                      </Badge>
                   </div>
                </div>
                <Button size="sm" variant="outline" className="w-full h-8 text-[11px] font-bold" onClick={() => setSelectedAgentId(agent.id)}>Review Assignments</Button>
              </div>
            ))
          }
        </div>
      </div>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-[450px] sm:max-w-[450px] p-0 overflow-hidden flex flex-col">
          <SheetHeader className="p-4 border-b bg-cyan-50">
             <SheetTitle className="text-[16px] font-bold flex items-center gap-2">Onboard New Team Member</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSaveAgent} className="flex-1 overflow-y-auto p-5 space-y-6">
             <div className="space-y-4">
                <div className="space-y-1.5"><Label className="text-[11px] font-bold uppercase text-slate-400">Full Name</Label><Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                <div className="space-y-1.5"><Label className="text-[11px] font-bold uppercase text-slate-400">Work Email</Label><Input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
                
                <div className="pt-4 border-t space-y-4">
                   <h3 className="text-[12px] font-bold text-cyan-700 uppercase tracking-tight flex items-center gap-2"><Banknote size={14} /> Disbursement Details (Locked for Agent)</h3>
                   <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase text-slate-400">Bank / Provider</Label>
                      <Input required className="h-8 text-[12px]" value={formData.paymentDetails.bankName} onChange={(e) => setFormData({...formData, paymentDetails: {...formData.paymentDetails, bankName: e.target.value}})} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold uppercase text-slate-400">Account Name</Label>
                        <Input required className="h-8 text-[12px]" value={formData.paymentDetails.accountName} onChange={(e) => setFormData({...formData, paymentDetails: {...formData.paymentDetails, accountName: e.target.value}})} />
                     </div>
                     <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold uppercase text-slate-400">Account Number</Label>
                        <Input required className="h-8 text-[12px]" value={formData.paymentDetails.accountNumber} onChange={(e) => setFormData({...formData, paymentDetails: {...formData.paymentDetails, accountNumber: e.target.value}})} />
                     </div>
                   </div>
                </div>

                <div className="pt-4 border-t space-y-1.5">
                   <Label className="text-[11px] font-bold uppercase text-slate-400">Starting Tier</Label>
                   <Select value={formData.tierId} onValueChange={(v) => setFormData({...formData, tierId: v})}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{tiers?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                   </Select>
                </div>
             </div>
          </form>
          <SheetFooter className="p-4 border-t bg-slate-50/50">
             <Button variant="ghost" size="sm" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
             <Button className="h-9 px-8 bg-cyan-600" disabled={isSaving} onClick={handleSaveAgent}>Onboard Agent</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={!!selectedAgentId} onOpenChange={() => setSelectedAgentId(null)}>
        <DialogContent className="max-w-[640px] p-0">
          <div className="p-6 space-y-6">
             <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-cyan-100 flex items-center justify-center font-bold text-xl">{selectedAgent?.name[0]}</div>
                <div>
                   <h2 className="text-lg font-bold">{selectedAgent?.name}</h2>
                   <TierBadge tierId={selectedAgent?.tierId || ''} />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border">
                <div className="space-y-3">
                   <p className="text-[11px] font-bold uppercase text-slate-400">Bank Details</p>
                   <div className="space-y-1 text-[13px]">
                      <div className="flex justify-between"><span>Bank:</span> <b className="text-slate-800">{selectedAgent?.paymentDetails?.bankName || '--'}</b></div>
                      <div className="flex justify-between"><span>Account:</span> <b className="text-slate-800">{selectedAgent?.paymentDetails?.accountName || '--'}</b></div>
                      <div className="flex justify-between"><span>Number:</span> <b className="text-slate-800">{selectedAgent?.paymentDetails?.accountNumber || '--'}</b></div>
                   </div>
                </div>
                <div className="flex flex-col justify-center items-center gap-2 border-l">
                   <p className="text-[11px] font-bold uppercase text-slate-400">Quick Note</p>
                   <p className="text-center text-[12px] text-slate-500 italic">"Only Managers and Admins can modify these payment details to ensure payout security."</p>
                </div>
             </div>
             <div className="flex justify-end pt-4"><Button variant="outline" onClick={() => setSelectedAgentId(null)}>Close Profile</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
