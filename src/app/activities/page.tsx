
"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collectionGroup, query } from 'firebase/firestore';
import { LeadActivity } from '@/types/crm';
import { format, parseISO, isAfter } from 'date-fns';
import { 
  Search, 
  Calendar, 
  Clock, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Filter
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

  // Fetch all activities globally or per-agent
  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'activities'));
  }, [firestore]);

  const { data: rawActivities, loading } = useCollection<LeadActivity>(activitiesQuery as any);

  // Filter and Sort in memory for maximum reliability without extra indexing
  const activities = useMemo(() => {
    if (!rawActivities || !user) return [];
    return [...rawActivities]
      .filter(a => user.role !== 'Agent' || a.agentId === user.id)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [rawActivities, user?.id, user?.role]);

  /**
   * RESOLUTION LOGIC:
   * A "Next Action" is active ONLY if it is the latest scheduled action for a lead
   * AND no subsequent activities have been logged for that lead since it was created.
   */
  const upcomingActions = useMemo(() => {
    if (!activities) return [];
    
    // 1. Group by Lead and find the absolute latest scheduled action
    const latestActionsMap: Record<string, LeadActivity> = {};
    
    // Iterate chronological order (oldest to newest) to let newer scheduled dates override older ones
    [...activities].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).forEach(a => {
      if (a.nextActionDate) {
        latestActionsMap[a.leadId] = a;
      }
    });

    // 2. Filter: Only keep actions where NO newer interaction exists for that lead
    return Object.values(latestActionsMap).filter(action => {
      const newerActivityExists = activities.some(other => 
        other.leadId === action.leadId && 
        other.createdAt > action.createdAt
      );
      return !newerActivityExists;
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Activity Hub</h1>
          <p className="text-sm text-slate-500">Monitor interaction history and manage automated task resolutions.</p>
        </div>

        {/* Action Queue: Dynamic resolution logic based on interaction timeline */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-primary" />
              <h2 className="text-[12px] font-bold uppercase tracking-widest text-slate-400">Action Queue (Live Reminders)</h2>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                   <AlertCircle size={14} className="text-slate-300 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[240px] text-[11px]">
                  Tasks are "Resolved" automatically when you log a new activity for the lead after the scheduled date.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden border-primary/10">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 border-b h-10 text-[11px] font-bold uppercase text-slate-400">
                    <th className="px-4 text-left min-w-[200px]">Lead Identity</th>
                    <th className="text-left min-w-[180px]">Planned Activity</th>
                    <th className="text-left min-w-[120px]">Target Date</th>
                    <th className="text-right px-4">Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[13px]">
                  {upcomingActions.map((action) => {
                    const isOverdue = action.nextActionDate! < new Date().toISOString().split('T')[0];
                    return (
                      <tr key={action.id} className={cn("h-14 transition-colors", isOverdue ? "bg-red-50/10" : "hover:bg-slate-50/30")}>
                        <td className="px-4">
                          <Link href={`/leads/${action.leadId}`} className="text-primary font-bold hover:underline block truncate">
                            {action.clientName || 'Unknown Lead'}
                          </Link>
                          {user.role !== 'Agent' && <span className="text-[10px] text-slate-400">{action.agentName}</span>}
                        </td>
                        <td className="text-slate-600 font-medium">
                           <div className="flex items-center gap-2">
                              <ChevronRight size={14} className="text-slate-300" />
                              <span className="truncate">{action.nextActionType || 'Follow up interaction'}</span>
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
                            <Button size="sm" className="h-8 text-[11px] gap-2 bg-primary hover:bg-primary/90 font-bold uppercase tracking-tight shadow-sm px-4">
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
                           <p className="text-[14px] font-bold text-slate-500 italic px-4">No active reminders. Your action queue is resolved.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr className="h-20"><td colSpan={4} className="text-center"><Loader2 className="animate-spin inline-block mr-2" size={14} /> Syncing pipeline...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Chronological Log */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              <h2 className="text-[12px] font-bold uppercase tracking-widest text-slate-400">Interaction Timeline</h2>
            </div>
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input 
                placeholder="Search remark, lead or agent..." 
                className="pl-9 h-9 text-[13px] bg-white border-primary/10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden border-primary/10">
            {loading && activities.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-primary mb-3" size={32} />
                <p className="text-[13px] text-slate-500 font-medium">Fetching history...</p>
              </div>
            ) : (
              <div className={cn("overflow-x-auto", loading && "opacity-50")}>
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 border-b h-10 text-[11px] font-bold uppercase text-slate-400">
                      <th className="px-4 text-left w-[150px]">Synced At</th>
                      <th className="text-left w-[180px]">Client</th>
                      <th className="text-left w-[130px]">Type</th>
                      <th className="text-left min-w-[300px]">Remarks</th>
                      <th className="text-right px-4 w-[100px]">Visit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredActivities.map((activity) => (
                      <tr key={activity.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-4 text-slate-400 text-[11px] font-bold">
                          {activity.createdAt ? format(parseISO(activity.createdAt), 'MMM d, HH:mm') : 'Unknown'}
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <Link href={`/leads/${activity.leadId}`} className="text-slate-900 font-extrabold hover:underline text-[13px] tracking-tight truncate max-w-[160px]">
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
                             <div className="inline-flex h-7 w-7 items-center justify-center bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100" title="GPS Verified">
                                <MapPin size={14} />
                             </div>
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
