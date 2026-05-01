
"use client"

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, doc, deleteDoc, updateDoc, orderBy } from 'firebase/firestore';
import { UserNote } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Pin, Bell, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function Scratchpad({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newContent, setNewContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const notesQuery = useMemoFirebase(() => 
    firestore && user ? query(collection(firestore, 'scratchpad'), where('agentId', '==', user.id), orderBy('createdAt', 'desc')) : null
  , [firestore, user?.id]);

  const { data: notes, loading } = useCollection<UserNote>(notesQuery as any);

  const handleAdd = async () => {
    if (!newContent.trim() || !user || !firestore) return;
    setIsAdding(true);
    try {
      await addDoc(collection(firestore, 'scratchpad'), {
        agentId: user.id,
        content: newContent,
        createdAt: new Date().toISOString(),
        isPinned: false
      });
      setNewContent('');
      toast({ title: "Note Captured" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error" });
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
      <SheetContent side="right" className="w-[350px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b bg-slate-50">
           <SheetTitle className="text-sm font-bold flex items-center gap-2"><StickyNote size={18} className="text-primary"/> Personal Scratchpad</SheetTitle>
        </SheetHeader>
        
        <div className="p-4 space-y-4 border-b bg-white">
           <Textarea 
             className="min-h-[100px] text-[13px] bg-slate-50 border-slate-100" 
             placeholder="Quick thoughts, reminders, client numbers..." 
             value={newContent}
             onChange={e => setNewContent(e.target.value)}
           />
           <Button className="w-full h-9 gap-2 font-bold uppercase text-[11px]" disabled={isAdding || !newContent.trim()} onClick={handleAdd}>
              {isAdding ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>} Save Scratch Note
           </Button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3 bg-slate-50/50">
           {loading ? <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-300"/></div> : 
            notes?.map(note => (
              <div key={note.id} className={cn("bg-white border rounded-xl p-3 shadow-sm relative group", note.isPinned && "border-primary/30 ring-1 ring-primary/10")}>
                 <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">{format(parseISO(note.createdAt), 'MMM d, HH:mm')}</p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => handleTogglePin(note)} className={cn("p-1 rounded hover:bg-slate-100", note.isPinned ? "text-primary" : "text-slate-300")}><Pin size={12}/></button>
                       <button onClick={() => handleDelete(note.id)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={12}/></button>
                    </div>
                 </div>
                 <p className="text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
              </div>
            ))
           }
           {notes?.length === 0 && !loading && (
             <div className="py-20 text-center opacity-40"><p className="text-[12px] italic">No active notes.</p></div>
           )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { cn } from '@/lib/utils';
import { StickyNote } from 'lucide-react';
