"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collectionGroup } from 'firebase/firestore';
import { LeadActivity } from '@/types/crm';
import { format, parseISO } from 'date-fns';
import { 
  Search, 
  Filter, 
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

  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collectionGroup(firestore, 'activities');
  }, [firestore]);

  const { data: rawActivities, loading } = useCollection<LeadActivity>(activitiesQuery as any);

  const activities = useMemo(() => {
    if (!rawActivities || !user) return [];
    return [...rawActivities]
      .filter(a => a.agentId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [rawActivities, user?.id]);

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
    }).sort((a, b) => a.nextActionDate!.localeCompare(b.nextActionDate!));
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    return activities.filter(a => {
      const search = searchTerm.toLowerCase();
      const leadName = a.clientName || 'Unknown Lead';
      return (
        a.type.toLowerCase().includes(search) ||
        a.remark.toLowerCase().includes(search) ||
        leadName.toLowerCase().includes(search)
      );
    });
  }, [activities, searchTerm]);

  if (!user) return null;

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Field Interactions & Tasks</h1>
          <p className="text-sm text-muted-foreground">Manage your site visit logs and verify upcoming next steps.</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            <h2 className="text-[14px] font-bold uppercase tracking-tight text-slate-500">Action Tracker (Reminders)</h2>
          </div>
          <div className="bg-card border rounded-md shadow-sm overflow-hidden border-blue-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b h-9 text-[11px] font-bold uppercase text-slate-400">
                    <th className="px-3 text-left w-[200px]">Client / Lead</th>
                    <th className="text-left w-[180px]">Planned Activity</th>
                    <th className="text-left w-[120px]">Target Date</th>
                    <th className="text-right px-3">Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[13px]">
                  {upcomingActions.map((action) => {
                    const isOverdue = action.nextActionDate! < new Date().toISOString().split('T')[0];
                    return (
                      <tr key={action.id} className={cn("h-11 transition-colors", isOverdue ? "bg-red-50/20" : "hover:bg-slate-50/50")}>
                        <td className="px-3">
                          <Link href={`/leads/${action.leadId}`} className="text-primary font-bold hover:underline">
                            {action.clientName || 'Unknown Lead'}
                          </Link>
                        </td>
                        <td className="text-slate-600 font-medium">
                           <div className="flex items-center gap-2">
                              <ChevronRight size={14} className="text-slate-300" />
                              {action.nextActionType}
                           </div>
                        </td>
                        <td>
                          <span className={cn(
                            "inline-flex items-center gap-1 font-bold text-[12px]",
                            isOverdue ? "text-red-600" : "text-amber-600"
                          )}>
                            {isOverdue && <AlertCircle size={12} />}
                            {action.nextActionDate}
                          </span>
                        </td>
                        <td className="px-3 text-right">
                          <Link href={`/leads/${action.leadId}`}>
                            <Button size="sm" className="h-7 text-[11px] gap-2 bg-primary hover:bg-primary/90 uppercase font-bold tracking-tight">
                               <CheckCircle2 size={12} /> Log Progress
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {upcomingActions.length === 0 && !loading && (
                    <tr className="h-24">
                      <td colSpan={4} className="text-center text-slate-400 italic text-[12px] py-10">
                        <div className="flex flex-col items-center gap-2">
                           <CheckCircle2 size={32} className="text-emerald-500/20" />
                           <p>All reminders are checked out. No pending actions found.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {loading && upcomingActions.length === 0 && (
                    <tr className="h-20"><td colSpan={4} className="text-center"><Loader2 className="animate-spin inline-block mr-2" size={14} /> Loading tasks...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 h-9">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              <h2 className="text-[14px] font-bold uppercase tracking-tight text-slate-500">Interaction Log</h2>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <Input 
                  placeholder="Search remarks or clients..." 
                  className="pl-8 h-8 text-[12px] bg-white border-blue-50" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-md shadow-sm overflow-hidden">
            {loading && activities.length === 0 ? (
              <div className="py-20 flex flex-col items-center">
                <Loader2 className="animate-spin text-primary mb-2" />
                <p className="text-[13px] text-muted-foreground">Fetching interaction history...</p>
              </div>
            ) : (
              <div className={cn("overflow-x-auto transition-opacity", loading && "opacity-50")}>
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b h-9 text-[11px] font-bold uppercase text-slate-400">
                      <th className="px-3 text-left w-[140px]">Sync Date</th>
                      <th className="text-left w-[160px]">Client</th>
                      <th className="text-left w-[130px]">Type</th>
                      <th className="text-left">Details</th>
                      <th className="text-right px-3 w-[80px]">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredActivities.map((activity) => (
                      <tr key={activity.id} className="h-10 hover:bg-slate-50/50 transition-colors group">
                        <td className="px-3 text-slate-400 text-[11px] font-medium">
                          {format(parseISO(activity.createdAt), 'MMM d, HH:mm')}
                        </td>
                        <td>
                          <Link href={`/leads/${activity.leadId}`} className="text-slate-900 font-bold hover:underline text-[13px]">
                            {activity.clientName || 'Lead'}
                          </Link>
                        </td>
                        <td>
                          <Badge variant="outline" className="text-[9px] px-1.5 h-4 font-bold uppercase border-blue-100 text-primary bg-primary/5">
                            {activity.type}
                          </Badge>
                        </td>
                        <td className="max-w-[400px]">
                           <div className="text-slate-600 text-[12px]">
                              <MarkdownText content={activity.remark} className="line-clamp-2" />
                           </div>
                        </td>
                        <td className="px-3 text-right">
                          {activity.location ? (
                            <TooltipProvider>
                               <Tooltip>
                                  <TooltipTrigger asChild>
                                     <MapPin size={14} className="text-emerald-500 inline-block" />
                                  </TooltipTrigger>
                                  <TooltipContent className="text-[10px] bg-slate-900 text-white">Verified site visit captured.</TooltipContent>
                               </Tooltip>
                            </TooltipProvider>
                          ) : (
                             <span className="text-[10px] text-slate-200">--</span>
                          )}
                        </td>
                      </tr>
                    ))}
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
