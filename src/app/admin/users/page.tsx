"use client"

import React, { useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Agent } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  Database, 
  Loader2, 
  CheckCircle2,
  XCircle,
  MoreHorizontal
} from 'lucide-react';
import { TierBadge } from '@/components/ui/tier-badge';
import { seedDatabase } from '@/lib/seed-db';
import { useToast } from '@/hooks/use-toast';

export default function AdminUsersPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [seeding, setSeeding] = useState(false);

  const agentsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'agents'), orderBy('name')) : null
  , [firestore]);
  
  const { data: agents, loading } = useCollection<Agent>(agentsQuery as any);

  const filteredAgents = agents?.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSeed = async () => {
    if (!firestore) return;
    setSeeding(true);
    try {
      await seedDatabase(firestore);
      toast({ title: "Seed Complete", description: "Default data has been successfully initialized." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Seed Failed", description: e.message });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Team Management</h1>
            <p className="text-sm text-muted-foreground">Manage agents, roles, and view team performance data.</p>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === 'Admin' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSeed} 
                disabled={seeding}
                className="gap-2 h-9"
              >
                {seeding ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                Seed Data
              </Button>
            )}
            <Button size="sm" className="gap-2 h-9">
              <UserPlus size={14} /> Invite Agent
            </Button>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-3 shadow-sm flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input 
              placeholder="Search by name, email or region..." 
              className="pl-9 h-9 text-xs" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Filter size={14} /> Filter Team
          </Button>
        </div>

        <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4">Agent Name</th>
                  <th>Region</th>
                  <th>Role</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th className="text-right px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Loader2 size={24} className="animate-spin text-primary mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Loading team records...</p>
                    </td>
                  </tr>
                ) : filteredAgents?.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{agent.name}</span>
                        <span className="text-[10px] text-muted-foreground">{agent.email}</span>
                      </div>
                    </td>
                    <td className="text-xs text-slate-600 dark:text-slate-400">{agent.region}</td>
                    <td className="text-xs font-medium">{agent.role}</td>
                    <td><TierBadge tierId={agent.tierId} /></td>
                    <td>
                      <div className="flex items-center gap-1">
                        {agent.status === 'active' ? (
                          <CheckCircle2 size={12} className="text-emerald-500" />
                        ) : (
                          <XCircle size={12} className="text-red-400" />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-tight capitalize">
                          {agent.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}
