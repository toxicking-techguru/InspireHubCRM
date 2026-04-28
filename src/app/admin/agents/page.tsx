
"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { Agent, Tier, UserStatus, Role, Wallet, AgentPaymentDetails } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Download, 
  Loader2, 
  UserPlus, 
  MoreVertical, 
  Wallet as WalletIcon,
  CheckCircle2,
  XCircle,
  Edit2,
  ShieldAlert,
  Info,
  Banknote
} from 'lucide-react';
import { TierBadge } from '@/components/ui/tier-badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function AdminAgentsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Data Fetching
  const agentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'agents'), orderBy('name')) : null, [firestore]);
  const { data: agents, loading } = useCollection<Agent>(agentsQuery as any);

  const tiersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'tiers') : null, [firestore]);
  const { data: tiers } = useCollection<Tier>(tiersQuery as any);

  const walletsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'wallets') : null, [firestore]);
  const { data: wallets } = useCollection<Wallet>(walletsQuery as any);

  const managers = agents?.filter(a => ['Manager', 'Admin'].includes(a.role));

  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    return agents.filter(a => 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [agents, searchTerm]);

  // Form State for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    region: '',
    managerId: '',
    tierId: 't1',
    status: 'active' as UserStatus,
    role: 'Agent' as Role,
    paymentDetails: {
      bankName: '',
      accountName: '',
      accountNumber: '',
      paymentMethod: 'Bank Transfer'
    }
  });

  const handleEdit = (agent: Agent) => {
    if (agent.role === 'Admin' && agent.id !== user?.id) {
      toast({ variant: "destructive", title: "Access Denied", description: "Other Admin profiles cannot be modified." });
      return;
    }
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
      region: agent.region,
      managerId: agent.managerId || '',
      tierId: agent.tierId,
      status: agent.status,
      role: agent.role,
      paymentDetails: agent.paymentDetails || {
        bankName: '',
        accountName: '',
        accountNumber: '',
        paymentMethod: 'Bank Transfer'
      }
    });
    setIsDrawerOpen(true);
  };

  const handleAdd = () => {
    setEditingAgent(null);
    setFormData({
      name: '', email: '', phone: '', region: '', managerId: '', tierId: 't1', status: 'active', role: 'Agent',
      paymentDetails: { bankName: '', accountName: '', accountNumber: '', paymentMethod: 'Bank Transfer' }
    });
    setIsDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setIsSaving(true);
    try {
      const agentId = editingAgent ? editingAgent.id : `agent_${Date.now()}`;
      const finalData = {
        ...formData,
        managerId: formData.managerId === 'none' ? null : (formData.managerId || null),
        joinDate: editingAgent ? editingAgent.joinDate : new Date().toISOString(),
      };
      await setDoc(doc(firestore, 'agents', agentId), finalData, { merge: true });
      
      if (!editingAgent && formData.role === 'Agent') {
        await setDoc(doc(firestore, 'wallets', agentId), {
          agentId,
          totalEarned: 0,
          pending: 0,
          withdrawable: 0,
          withdrawn: 0
        });
      }

      toast({ title: editingAgent ? "Staff Updated" : "Staff Registered", description: `${formData.name} record saved.` });
      setIsDrawerOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Operation Failed", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || user.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="h-11 flex items-center justify-between gap-4">
          <h1 className="text-[16px] font-bold shrink-0 text-cyan-950">Team Directory & Onboarding</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-[12px] gap-2 border-cyan-200 text-cyan-700">
              <Download size={14} /> Export CSV
            </Button>
            <Button size="sm" className="h-8 text-[12px] bg-cyan-600 hover:bg-cyan-700 gap-2 shadow-md" onClick={handleAdd}>
              <UserPlus size={14} /> Add Team Member
            </Button>
          </div>
        </div>

        <div className="bg-card border rounded-md shadow-sm overflow-hidden border-cyan-100">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b h-9">
                    <th className="px-3 text-left w-[180px]">Person</th>
                    <th className="text-left w-[140px]">Manager</th>
                    <th className="text-center w-[90px]">Tier</th>
                    <th className="text-left w-[120px]">Role</th>
                    <th className="text-center w-[100px]">Status</th>
                    <th className="text-right w-[100px]">Wallet</th>
                    <th className="text-right px-3 w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAgents.map((agent) => {
                    const manager = managers?.find(m => m.id === agent.managerId);
                    const wallet = wallets?.find(w => w.agentId === agent.id);
                    const isAdmin = agent.role === 'Admin';
                    
                    return (
                      <tr key={agent.id} className={cn("h-10 hover:bg-cyan-50/30 group transition-colors", isAdmin && "bg-slate-50/50")}>
                        <td className="px-3">
                           <div className="flex flex-col">
                             <div className="flex items-center gap-1.5">
                               <span className="font-bold text-slate-800">{agent.name}</span>
                               {isAdmin && <ShieldAlert size={12} className="text-cyan-600" />}
                             </div>
                             <span className="text-[10px] text-slate-400 font-medium">{agent.email}</span>
                           </div>
                        </td>
                        <td>
                          <span className="text-slate-600 truncate">{manager?.name || '--'}</span>
                        </td>
                        <td className="text-center">
                          {agent.role === 'Agent' ? <TierBadge tierId={agent.tierId} /> : <span className="text-[10px] font-bold text-slate-400">N/A</span>}
                        </td>
                        <td className="text-slate-500 font-medium">{agent.role}</td>
                        <td className="text-center">
                             <span className={cn("text-[10px] font-bold uppercase", agent.status === 'active' ? "text-emerald-700" : "text-slate-400")}>{agent.status}</span>
                        </td>
                        <td className="text-right">
                            <div className="font-bold text-cyan-700">
                               ${(wallet?.withdrawable || 0).toLocaleString()}
                            </div>
                        </td>
                        <td className="px-3 text-right">
                            <button className="text-slate-400 hover:text-cyan-600" onClick={() => handleEdit(agent)}>
                                <Edit2 size={14} />
                            </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        </div>
      </div>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-[440px] sm:max-w-[440px] p-0 overflow-hidden flex flex-col">
          <SheetHeader className="p-4 border-b bg-cyan-50">
             <SheetTitle className="text-[16px] font-bold flex items-center gap-2">
               <UserPlus className="text-cyan-600" size={18} />
               {editingAgent ? 'Edit Staff Profile' : 'Register New Staff'}
             </SheetTitle>
          </SheetHeader>
          
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-6">
             <div className="space-y-4">
                <div className="space-y-1.5">
                   <Label className="text-[11px] font-bold uppercase text-slate-400">Full Name</Label>
                   <Input required className="h-9 text-[13px]" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase text-slate-400">Email</Label>
                      <Input required type="email" className="h-9 text-[13px]" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                   </div>
                   <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase text-slate-400">Phone</Label>
                      <Input required className="h-9 text-[13px]" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                   </div>
                </div>

                <div className="pt-4 border-t space-y-4">
                   <h3 className="text-[12px] font-bold text-cyan-700 flex items-center gap-2"><Banknote size={14} /> Official Payment Method (Locked for Agent)</h3>
                   <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase text-slate-400">Bank / Provider Name</Label>
                      <Input placeholder="e.g. Standard Chartered" className="h-8 text-[12px]" value={formData.paymentDetails.bankName} onChange={(e) => setFormData({...formData, paymentDetails: {...formData.paymentDetails, bankName: e.target.value}})} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold uppercase text-slate-400">Account Name</Label>
                        <Input placeholder="Full Legal Name" className="h-8 text-[12px]" value={formData.paymentDetails.accountName} onChange={(e) => setFormData({...formData, paymentDetails: {...formData.paymentDetails, accountName: e.target.value}})} />
                     </div>
                     <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold uppercase text-slate-400">Account Number</Label>
                        <Input placeholder="000000000" className="h-8 text-[12px]" value={formData.paymentDetails.accountNumber} onChange={(e) => setFormData({...formData, paymentDetails: {...formData.paymentDetails, accountNumber: e.target.value}})} />
                     </div>
                   </div>
                </div>

                <div className="pt-4 border-t space-y-4">
                   <h3 className="text-[12px] font-bold text-cyan-700">Assignment & Permissions</h3>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold uppercase text-slate-400">System Role</Label>
                        <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v as Role})}>
                           <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                           <SelectContent>
                              {['Agent', 'Manager', 'Admin'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                           </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold uppercase text-slate-400">Reporting Manager</Label>
                        <Select value={formData.managerId} onValueChange={(v) => setFormData({...formData, managerId: v})}>
                           <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select Manager" /></SelectTrigger>
                           <SelectContent>
                              <SelectItem value="none">None (Direct Report)</SelectItem>
                              {managers?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                           </SelectContent>
                        </Select>
                      </div>
                   </div>
                   
                   {formData.role === 'Agent' && (
                     <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold uppercase text-slate-400">Performance Tier</Label>
                        <Select value={formData.tierId} onValueChange={(v) => setFormData({...formData, tierId: v})}>
                           <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                           <SelectContent>
                              {tiers?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                           </SelectContent>
                        </Select>
                     </div>
                   )}
                </div>
             </div>
          </form>

          <SheetFooter className="p-4 border-t bg-slate-50/50">
             <Button variant="ghost" size="sm" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
             <Button className="h-9 px-10 bg-cyan-600 hover:bg-cyan-700 font-bold uppercase text-[11px]" disabled={isSaving} onClick={handleSave}>
                {isSaving ? <Loader2 className="animate-spin" size={14} /> : 'Confirm Save'}
             </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Shell>
  );
}
