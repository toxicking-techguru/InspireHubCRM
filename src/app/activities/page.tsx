"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collectionGroup, query } from 'firebase/firestore';
import { LeadActivity } from '@/types/crm';
import { format, parseISO } from 'date-fns';
import { 
  Search, 
  Calendar, 
  Clock, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MarkdownText } from '@/components/ui/markdown-text';

export default function ActivitiesPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  // Remove orderBy from query to avoid missing index errors in prototype
  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'activities'));
  }, [firestore]);

  const { data: rawActivities, loading } = useCollection<LeadActivity>(activitiesQuery as any);

  // Sort and filter in memory for better reliability
  const activities = useMemo(() => {
    if (!rawActivities || !user) return [];
    return [...rawActivities]
      .filter(a => user.role !== 'Agent' || a.agentId === user.id)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [rawActivities, user?.id, user?.role]);

  const upcomingActions = useMemo(() => {
    if (!activities) return [];
    
    // Group activities by lead to find the *latest* scheduled action
    const latestActionsMap: Record<string, LeadActivity> = {};
    
    [...activities].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).forEach(a => {
      if (a.nextActionDate) {
        latestActionsMap[a.leadId] = a;
      }
    });

    return Object.values(latestActionsMap).filter(a => {
      // Logic: A task is "checked out" if there's an activity created *after* this activity's createdAt timestamp
      const subsequentActivity = activities.find(sub => 
        sub.leadId === a.leadId && sub.createdAt > a.createdAt
      );
      return !subsequentActivity;
    }).sort((a, b) => (a.nextActionDate || '').localeCompare(b.nextActionDate || ''));
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    return activities.filter(a => {
      const search = searchTerm.toLowerCase();
      const leadName = a.clientName || 'Unknown Lead';
      const agentName = a.agentName || 'Unknown Agent';
      return (
        a.type.toLowerCase().includes(search) ||
        a.remark.toLowerCase().includes(search) ||
        leadName.toLowerCase().includes(search) ||
        agentName.toLowerCase().includes(search)
      );
    });
  }, [activities, searchTerm]);

  if (!user) return null;

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Interaction Hub & Task Tracker</h1>
          <p className="text-sm text-slate-500">Manage field visit logs and verify upcoming project milestones.</p>
        </div>

        {/* Action Tracker Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-400">Action Queue (Reminders)</h2>
          </div>
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden border-primary/10">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 border-b h-10 text-[11px] font-bold uppercase text-slate-400">
                    <th className="px-4 text-left min-w-[200px]">Lead / Client</th>
                    <th className="text-left min-w-[180px]">Planned Activity</th>
                    <th className="text-left min-w-[120px]">Target Date</th>
                    <th className="text-right px-4">Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[13px]">
                  {upcomingActions.map((action) => {
                    const isOverdue = action.nextActionDate! < new Date().toISOString().split('T')[0];
                    return (
                      <tr key={action.id} className={cn("h-12 transition-colors", isOverdue ? "bg-red-50/20" : "hover:bg-slate-50/30")}>
                        <td className="px-4">
                          <Link href={`/leads/${action.leadId}`} className="text-primary font-bold hover:underline">
                            {action.clientName || 'Unknown Lead'}
                          </Link>
                        </td>
                        <td className="text-slate-600 font-medium">
                           <div className="flex items-center gap-2">
                              <ChevronRight size={14} className="text-slate-300" />
                              {action.nextActionType || 'Follow up interaction'}
                           </div>
                        </td>
                        <td>
                          <span className={cn(
                            "inline-flex items-center gap-1.5 font-extrabold text-[12px]",
                            isOverdue ? "text-red-600" : "text-amber-600"
                          )}>
                            {isOverdue && <AlertCircle size={14} />}
                            {action.nextActionDate}
                          </span>
                        </td>
                        <td className="px-4 text-right">
                          <Link href={`/leads/${action.leadId}`}>
                            <Button size="sm" className="h-8 text-[11px] gap-2 bg-primary hover:bg-primary/90 uppercase font-bold tracking-tight shadow-sm">
                               <CheckCircle2 size={12} /> Log Progress
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {upcomingActions.length === 0 && !loading && (
                    <tr className="h-32">
                      <td colSpan={4} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3 opacity-20">
                           <CheckCircle2 size={40} className="text-emerald-500" />
                           <p className="text-[14px] font-bold text-slate-500 italic">All task reminders are checked out. No pending actions found.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr className="h-20"><td colSpan={4} className="text-center"><Loader2 className="animate-spin inline-block mr-2" size={14} /> Fetching task queue...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Global Interaction Log Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-400">Chronological Activity Log</h2>
            </div>
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input 
                placeholder="Filter logs by client, agent or remark..." 
                className="pl-9 h-9 text-[13px] bg-white border-primary/10 shadow-sm" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden border-primary/10">
            {loading && activities.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-primary mb-3" size={32} />
                <p className="text-[13px] text-slate-500 font-medium">Fetching interaction history...</p>
              </div>
            ) : (
              <div className={cn("overflow-x-auto transition-opacity", loading && "opacity-50")}>
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 border-b h-10 text-[11px] font-bold uppercase text-slate-400">
                      <th className="px-4 text-left w-[150px]">Synced At</th>
                      <th className="text-left w-[180px]">Client identity</th>
                      <th className="text-left w-[130px]">Category</th>
                      <th className="text-left min-w-[300px]">Details & Remarks</th>
                      <th className="text-right px-4 w-[100px]">Visit GPS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredActivities.map((activity) => (
                      <tr key={activity.id} className="h-11 hover:bg-slate-50/30 transition-colors group">
                        <td className="px-4 text-slate-400 text-[11px] font-bold">
                          {activity.createdAt ? format(parseISO(activity.createdAt), 'MMM d, HH:mm') : 'Unknown'}
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <Link href={`/leads/${activity.leadId}`} className="text-slate-900 font-extrabold hover:underline text-[13px] tracking-tight">
                              {activity.clientName || 'Lead'}
                            </Link>
                            {user.role !== 'Agent' && (
                              <span className="text-[10px] text-primary font-medium">{activity.agentName || 'Agent'}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <Badge variant="outline" className="text-[9px] px-2 h-4.5 font-bold uppercase border-primary/10 text-primary bg-primary/5">
                            {activity.type}
                          </Badge>
                        </td>
                        <td className="py-3">
                           <div className="text-slate-600 text-[13px] leading-snug">
                              <MarkdownText content={activity.remark} className="line-clamp-2" />
                           </div>
                        </td>
                        <td className="px-4 text-right">
                          {activity.location ? (
                            <TooltipProvider>
                               <Tooltip>
                                  <TooltipTrigger asChild>
                                     <div className="inline-flex h-7 w-7 items-center justify-center bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 cursor-help">
                                        <MapPin size={14} />
                                     </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-[11px] bg-slate-900 text-white border-none p-2">GPS Verification: Site Visit Verified.</TooltipContent>
                               </Tooltip>
                            </TooltipProvider>
                          ) : (
                             <span className="text-[10px] text-slate-200">--</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredActivities.length === 0 && (
                       <tr className="h-32">
                          <td colSpan={5} className="text-center text-slate-300 italic py-10">No interactions match your current filter.</td>
                       </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
