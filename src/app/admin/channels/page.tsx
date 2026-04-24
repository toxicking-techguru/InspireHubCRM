
"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  GitBranch, 
  Plus, 
  Trash2, 
  Edit2, 
  GripVertical, 
  ChevronRight, 
  AlertCircle, 
  Loader2,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function AdminChannelsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [selectedMainId, setSelectedMainId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newSubChannelName, setNewSubChannelName] = useState('');

  // Data Fetching (Mocked tree structure from flat collection for MVP)
  const channelsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'channels'), orderBy('name')) : null, [firestore]);
  const { data: channels, loading } = useCollection<any>(channelsQuery as any);

  const mainChannels = channels?.filter(c => !c.parentId) || [];
  const subChannels = channels?.filter(c => c.parentId === selectedMainId) || [];

  const handleAddMain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !newChannelName.trim()) return;
    const id = `ch_${Date.now()}`;
    await setDoc(doc(firestore, 'channels', id), { name: newChannelName, active: true, usageCount: 0 });
    setNewChannelName('');
    toast({ title: "Channel Added" });
  };

  const handleAddSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !newSubChannelName.trim() || !selectedMainId) return;
    const id = `sub_${Date.now()}`;
    await setDoc(doc(firestore, 'channels', id), { name: newSubChannelName, active: true, parentId: selectedMainId, usageCount: 0 });
    setNewSubChannelName('');
    toast({ title: "Sub-channel Added" });
  };

  const handleStartEdit = (item: any) => {
    setEditingId(item.id);
    setEditValue(item.name);
  };

  const handleSaveEdit = async () => {
    if (!firestore || !editingId) return;
    await updateDoc(doc(firestore, 'channels', editingId), { name: editValue });
    setEditingId(null);
    toast({ title: "Renamed Successfully" });
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'channels', id), { active: !current });
  };

  const handleDelete = async (id: string, usage: number) => {
    if (!firestore || usage > 0) return;
    await deleteDoc(doc(firestore, 'channels', id));
    toast({ title: "Deleted Successfully" });
  };

  if (!user || user.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div>
           <h1 className="text-[18px] font-bold flex items-center gap-2 text-violet-900">
              <GitBranch className="text-violet-600" size={20} /> Lead Acquisition Channels
           </h1>
           <p className="text-[12px] text-muted-foreground mt-0.5">Define the hierarchical source tree used in lead registration forms.</p>
        </div>

        <div className="flex h-[calc(100vh-220px)] gap-6">
           {/* Main Channels List */}
           <div className="w-[340px] flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                 <h2 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Main Channels</h2>
                 <Badge variant="outline" className="text-[9px] h-4 bg-slate-50">{mainChannels.length}</Badge>
              </div>
              
              <div className="bg-white border rounded-md shadow-sm overflow-hidden flex flex-col flex-1">
                 <form onSubmit={handleAddMain} className="p-3 border-b bg-slate-50/50 flex gap-2">
                    <Input placeholder="Add main source..." className="h-8 text-[12px]" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} />
                    <Button size="icon" className="h-8 w-8 shrink-0 bg-violet-600"><Plus size={16} /></Button>
                 </form>
                 
                 <div className="flex-1 overflow-y-auto">
                    {loading ? (
                      <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-200" /></div>
                    ) : mainChannels.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => setSelectedMainId(item.id)}
                        className={cn(
                          "group p-3 border-b flex items-center justify-between cursor-pointer transition-all hover:bg-slate-50",
                          selectedMainId === item.id ? "bg-violet-50 border-r-2 border-r-violet-600" : "",
                          !item.active && "opacity-50"
                        )}
                      >
                         <div className="flex items-center gap-3 flex-1 min-w-0">
                            <GripVertical size={14} className="text-slate-200 group-hover:text-slate-400 shrink-0" />
                            {editingId === item.id ? (
                               <div className="flex items-center gap-1 flex-1">
                                  <Input autoFocus className="h-7 text-[12px] px-1.5" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()} />
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600" onClick={handleSaveEdit}><Check size={14} /></Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => setEditingId(null)}><X size={14} /></Button>
                               </div>
                            ) : (
                               <div className="flex flex-col min-w-0">
                                  <span className="text-[13px] font-bold text-slate-800 truncate">{item.name}</span>
                                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Used in {item.usageCount || 0} leads</span>
                               </div>
                            )}
                         </div>
                         <div className="flex items-center gap-1.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Switch className="scale-75 data-[state=checked]:bg-violet-600" checked={item.active} onClick={(e) => { e.stopPropagation(); handleToggleActive(item.id, item.active); }} />
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-violet-600" onClick={(e) => { e.stopPropagation(); handleStartEdit(item); }}>
                               <Edit2 size={14} />
                            </Button>
                            <TooltipProvider>
                               <Tooltip>
                                  <TooltipTrigger asChild>
                                     <span className="inline-block">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-200 hover:text-red-500 disabled:opacity-20" disabled={item.usageCount > 0} onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.usageCount); }}>
                                           <Trash2 size={14} />
                                        </Button>
                                     </span>
                                  </TooltipTrigger>
                                  {item.usageCount > 0 && <TooltipContent className="text-[11px] bg-slate-900 border-none">Cannot delete: used in {item.usageCount} leads. Deactivate instead.</TooltipContent>}
                               </Tooltip>
                            </TooltipProvider>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Sub-channels List */}
           <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                 <h2 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                    {selectedMainId ? `Sub-channels for ${mainChannels.find(c => c.id === selectedMainId)?.name}` : 'Select a Main Channel'}
                 </h2>
                 {selectedMainId && <Badge variant="outline" className="text-[9px] h-4 bg-slate-50">{subChannels.length}</Badge>}
              </div>

              <div className="bg-white border rounded-md shadow-sm overflow-hidden flex flex-col flex-1">
                 {selectedMainId ? (
                    <>
                       <form onSubmit={handleAddSub} className="p-3 border-b bg-slate-50/50 flex gap-2">
                          <Input placeholder="Add sub-source detail..." className="h-8 text-[12px]" value={newSubChannelName} onChange={(e) => setNewSubChannelName(e.target.value)} />
                          <Button size="icon" className="h-8 w-8 shrink-0 bg-violet-600"><Plus size={16} /></Button>
                       </form>
                       <div className="flex-1 overflow-y-auto">
                          {subChannels.map(item => (
                             <div 
                               key={item.id} 
                               className={cn(
                                 "group p-3 border-b flex items-center justify-between transition-all hover:bg-slate-50",
                                 !item.active && "opacity-50"
                               )}
                             >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                   <ChevronRight size={14} className="text-slate-300 shrink-0" />
                                   {editingId === item.id ? (
                                      <div className="flex items-center gap-1 flex-1">
                                         <Input autoFocus className="h-7 text-[12px] px-1.5" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()} />
                                         <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600" onClick={handleSaveEdit}><Check size={14} /></Button>
                                         <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => setEditingId(null)}><X size={14} /></Button>
                                      </div>
                                   ) : (
                                      <div className="flex flex-col min-w-0">
                                         <span className="text-[13px] font-bold text-slate-700 truncate">{item.name}</span>
                                         <span className="text-[10px] text-slate-400 font-medium">Used in {item.usageCount || 0} leads</span>
                                      </div>
                                   )}
                                </div>
                                <div className="flex items-center gap-1.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <Switch className="scale-75 data-[state=checked]:bg-violet-600" checked={item.active} onClick={() => handleToggleActive(item.id, item.active)} />
                                   <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-violet-600" onClick={() => handleStartEdit(item)}>
                                      <Edit2 size={14} />
                                   </Button>
                                   <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-200 hover:text-red-500 disabled:opacity-20" disabled={item.usageCount > 0} onClick={() => handleDelete(item.id, item.usageCount)}>
                                      <Trash2 size={14} />
                                   </Button>
                                </div>
                             </div>
                          ))}
                          {subChannels.length === 0 && (
                            <div className="p-10 text-center text-slate-300 italic text-[12px]">No sub-channels defined for this source.</div>
                          )}
                       </div>
                    </>
                 ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-10 text-center">
                       <GitBranch size={48} className="mb-2 opacity-5" />
                       <p className="text-[13px] font-medium">Select a main channel on the left to manage its granular sub-sources.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </Shell>
  );
}

