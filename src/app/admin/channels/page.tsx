"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
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
  Loader2,
  Check,
  X,
  ChevronLeft
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

  // Data Fetching
  const channelsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'channels'), orderBy('name')) : null, [firestore]);
  const { data: channels, loading } = useCollection<any>(channelsQuery as any);

  const mainChannels = useMemo(() => channels?.filter(c => !c.parentId) || [], [channels]);
  const subChannels = useMemo(() => channels?.filter(c => c.parentId === selectedMainId) || [], [channels, selectedMainId]);

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
        <div className="flex items-center justify-between">
           <div>
              <h1 className="text-[18px] font-bold flex items-center gap-2 text-cyan-900">
                 <GitBranch className="text-cyan-600" size={20} /> Acquisition Channels
              </h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">Define the hierarchical source tree for lead registration.</p>
           </div>
        </div>

        <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-220px)] border rounded-md overflow-hidden bg-card border-cyan-100 shadow-sm">
           {/* Main Channels List */}
           <div className={cn(
             "w-full lg:w-[340px] border-b lg:border-b-0 lg:border-r flex flex-col bg-slate-50/30 shrink-0",
             selectedMainId && "hidden lg:flex"
           )}>
              <div className="p-3 border-b flex items-center justify-between px-4">
                 <h2 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Main Categories</h2>
                 <Badge variant="outline" className="text-[10px] h-4.5 bg-white border-cyan-100 text-cyan-600">{mainChannels.length}</Badge>
              </div>
              
              <div className="flex flex-col flex-1 overflow-hidden">
                 <form onSubmit={handleAddMain} className="p-3 border-b bg-white flex gap-2">
                    <Input placeholder="Add main category..." className="h-8 text-[12px] bg-cyan-50/30" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} />
                    <Button size="icon" className="h-8 w-8 shrink-0 bg-cyan-600"><Plus size={16} /></Button>
                 </form>
                 
                 <div className="flex-1 overflow-y-auto">
                    {loading ? (
                      <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-cyan-200" size={24} /></div>
                    ) : mainChannels.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => setSelectedMainId(item.id)}
                        className={cn(
                          "group p-3 px-4 border-b flex items-center justify-between cursor-pointer transition-all hover:bg-white",
                          selectedMainId === item.id ? "bg-white border-r-4 border-r-cyan-600 shadow-inner" : "",
                          !item.active && "opacity-50"
                        )}
                      >
                         <div className="flex items-center gap-3 flex-1 min-w-0">
                            <GripVertical size={14} className="text-slate-200 group-hover:text-slate-400 shrink-0" />
                            {editingId === item.id ? (
                               <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                                  <Input autoFocus className="h-7 text-[12px] px-1.5" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()} />
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600" onClick={handleSaveEdit}><Check size={14} /></Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => setEditingId(null)}><X size={14} /></Button>
                               </div>
                            ) : (
                               <div className="flex flex-col min-w-0">
                                  <span className="text-[13px] font-bold text-slate-800 truncate">{item.name}</span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                     {channels?.filter((c: any) => c.parentId === item.id).length || 0} Sub-channels
                                  </span>
                               </div>
                            )}
                         </div>
                         <div className="flex items-center gap-1.5 ml-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <Switch className="scale-75 data-[state=checked]:bg-cyan-600" checked={item.active} onCheckedChange={() => handleToggleActive(item.id, item.active)} onClick={e => e.stopPropagation()} />
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-cyan-600" onClick={(e) => { e.stopPropagation(); handleStartEdit(item); }}>
                               <Edit2 size={14} />
                            </Button>
                            <TooltipProvider>
                               <Tooltip>
                                  <TooltipTrigger asChild>
                                     <span className="inline-block" onClick={e => e.stopPropagation()}>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-200 hover:text-red-500 disabled:opacity-20" disabled={(item.usageCount || 0) > 0} onClick={() => handleDelete(item.id, item.usageCount)}>
                                           <Trash2 size={14} />
                                        </Button>
                                     </span>
                                  </TooltipTrigger>
                                  {(item.usageCount || 0) > 0 && <TooltipContent className="text-[11px] bg-slate-900 border-none text-white">Active usage prevents deletion.</TooltipContent>}
                               </Tooltip>
                            </TooltipProvider>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Sub-channels List */}
           <div className={cn(
             "flex-1 flex flex-col bg-white",
             !selectedMainId && "hidden lg:flex"
           )}>
              {selectedMainId ? (
                 <>
                    <div className="p-3 border-b flex items-center justify-between lg:justify-start gap-4 px-4 bg-slate-50/50">
                       <Button variant="ghost" size="sm" className="lg:hidden h-8 gap-2 text-[12px] font-bold text-cyan-700" onClick={() => setSelectedMainId(null)}>
                          <ChevronLeft size={16} /> All Sources
                       </Button>
                       <h2 className="text-[11px] font-bold uppercase text-slate-500 tracking-widest truncate">
                          Sub-channels for <span className="text-cyan-700">{mainChannels.find(c => c.id === selectedMainId)?.name}</span>
                       </h2>
                    </div>

                    <div className="flex flex-col flex-1 overflow-hidden">
                       <form onSubmit={handleAddSub} className="p-4 border-b flex gap-3">
                          <Input placeholder="Add granular detail (e.g. TikTok)..." className="h-9 text-[13px] border-cyan-50" value={newSubChannelName} onChange={(e) => setNewSubChannelName(e.target.value)} />
                          <Button size="sm" className="h-9 px-6 bg-cyan-600 hover:bg-cyan-700 font-bold uppercase text-[11px] shrink-0">Link Sub-Source</Button>
                       </form>
                       <div className="flex-1 overflow-y-auto">
                          {subChannels.map(item => (
                             <div 
                               key={item.id} 
                               className={cn(
                                 "group p-3 px-6 border-b flex items-center justify-between transition-all hover:bg-cyan-50/20",
                                 !item.active && "opacity-50"
                               )}
                             >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                   <ChevronRight size={14} className="text-cyan-200 shrink-0" />
                                   {editingId === item.id ? (
                                      <div className="flex items-center gap-1 flex-1">
                                         <Input autoFocus className="h-7 text-[12px] px-1.5" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()} />
                                         <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600" onClick={handleSaveEdit}><Check size={14} /></Button>
                                         <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => setEditingId(null)}><X size={14} /></Button>
                                      </div>
                                   ) : (
                                      <div className="flex flex-col min-w-0">
                                         <span className="text-[13px] font-bold text-slate-700 truncate">{item.name}</span>
                                         <span className="text-[10px] text-slate-400 font-medium tracking-tight uppercase font-bold">
                                            In {item.usageCount || 0} leads
                                         </span>
                                      </div>
                                   )}
                                </div>
                                <div className="flex items-center gap-1.5 ml-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                   <Switch className="scale-75 data-[state=checked]:bg-cyan-600" checked={item.active} onCheckedChange={() => handleToggleActive(item.id, item.active)} />
                                   <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-cyan-600" onClick={() => handleStartEdit(item)}>
                                      <Edit2 size={14} />
                                   </Button>
                                   <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-200 hover:text-red-500 disabled:opacity-20" disabled={(item.usageCount || 0) > 0} onClick={() => handleDelete(item.id, item.usageCount)}>
                                      <Trash2 size={14} />
                                   </Button>
                                </div>
                             </div>
                          ))}
                          {subChannels.length === 0 && (
                            <div className="py-20 text-center flex flex-col items-center justify-center opacity-40 grayscale">
                               <GitBranch size={48} className="mb-2" />
                               <p className="text-[12px] italic">No granular details defined for this channel.</p>
                            </div>
                          )}
                       </div>
                    </div>
                 </>
              ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-10 text-center">
                    <GitBranch size={64} className="mb-4 opacity-10" />
                    <p className="text-[15px] font-bold text-slate-400">Source Tree Configuration</p>
                    <p className="text-[12px] max-w-[280px] mx-auto mt-1">Select a main acquisition source from the list to define its specific sub-channels.</p>
                 </div>
              )}
           </div>
        </div>
      </div>
    </Shell>
  );
}
