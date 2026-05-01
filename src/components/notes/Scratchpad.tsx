"use client"

import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { UserNote } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Pin, Loader2, StickyNote, Bell, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function Scratchpad({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newContent, setNewContent] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Simplified query for scratchpad
  const notesQuery = useMemoFirebase(() => 
    firestore && user ? query(collection(firestore, 'scratchpad'), where('agentId', '==', user.id)) : null
  , [firestore, user?.id]);

  const { data: rawNotes, loading } = useCollection<UserNote>(notesQuery as any);

  // Sort notes in memory: Pinned first, then by date desc
  const sortedNotes = useMemo(() => {
    if (!rawNotes) return [];
    return [...rawNotes].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [rawNotes]);

  const handleAdd = async () => {
    if (!newContent.trim() || !user || !firestore) return;
    setIsAdding(true);
    try {
      await addDoc(collection(firestore, 'scratchpad'), {
        agentId: user.id,
        content: newContent,
        reminderAt: reminderDate || null,
        createdAt: new Date().toISOString(),
        isPinned: false
      });
      setNewContent('');
      setReminderDate('');
      toast({ title: "Note Captured" });
    } catch (e) {
      toast({ variant: "destructive", title: "Persistence Error" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, 'scratchpad', id));
  };

  const handleTogglePin = async (note: UserNote) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'scratchpad', note.id), { isPinned: !note.isPinned });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[350px] p-0 flex flex-col bg-white border-l shadow-2xl">
        <SheetHeader className="p-4 border-b bg-slate-50">
           <SheetTitle className="text-sm font-bold flex items-center gap-2">
             <StickyNote size={18} className="text-primary"/> Personal Scratchpad
           </SheetTitle>
        </SheetHeader>
        
        <div className="p-4 space-y-3 border-b bg-white">
           <Textarea 
             className="min-h-[80px] text-[13px] bg-slate-50 border-slate-200 focus:bg-white transition-colors" 
             placeholder="Quick thoughts, reminders, client numbers..." 
             value={newContent}
             onChange={e => setNewContent(e.target.value)}
           />
           <div className="flex gap-2">
              <div className="relative flex-1">
                 <CalendarIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                 <Input 
                   type="date" 
                   className="h-8 pl-8 text-[11px] bg-slate-50 border-slate-200" 
                   value={reminderDate}
                   onChange={e => setReminderDate(e.target.value)}
                 />
              </div>
              <Button className="h-8 px-4 gap-2 font-bold uppercase text-[10px] bg-primary hover:bg-primary/90" disabled={isAdding || !newContent.trim()} onClick={handleAdd}>
                 {isAdding ? <Loader2 size={12} className="animate-spin"/> : <Plus size={12}/>} Save
              </Button>
           </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3 bg-slate-50">
           {loading ? (
             <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-slate-300"/></div>
           ) : (
            sortedNotes.map(note => (
              <div key={note.id} className={cn(
                "bg-white border rounded-xl p-3 shadow-sm relative group transition-all", 
                note.isPinned ? "border-primary/40 ring-1 ring-primary/5" : "hover:border-slate-300"
              )}>
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                       <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">{format(parseISO(note.createdAt), 'MMM d, HH:mm')}</p>
                       {note.reminderAt && (
                         <div className="flex items-center gap-1 text-[9px] font-bold text-primary mt-0.5 uppercase">
                            <Bell size={10} /> {format(parseISO(note.reminderAt), 'MMM d')}
                         </div>
                       )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => handleTogglePin(note)} className={cn("p-1 rounded hover:bg-slate-100", note.isPinned ? "text-primary" : "text-slate-300")}>
                         <Pin size={12}/>
                       </button>
                       <button onClick={() => handleDelete(note.id)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500">
                         <Trash2 size={12}/>
                       </button>
                    </div>
                 </div>
                 <p className="text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
              </div>
            ))
           )}
           {sortedNotes.length === 0 && !loading && (
             <div className="py-20 text-center opacity-40">
               <StickyNote size={32} className="mx-auto mb-2 text-slate-300" />
               <p className="text-[11px] italic">Your scratchpad is empty.</p>
             </div>
           )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
