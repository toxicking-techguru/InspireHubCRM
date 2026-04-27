"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where } from 'firebase/firestore';
import { LeadActivity } from '@/types/crm';
import { format, parseISO } from 'date-fns';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  FileText, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ActivitiesPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Removed orderBy to avoid index requirements for prototype
  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collectionGroup(firestore, 'activities'),
      where('agentId', '==', user.id)
    );
  }, [firestore, user?.id]);

  const { data: rawActivities, loading } = useCollection<LeadActivity>(activitiesQuery as any);

  // Sort in memory to bypass index requirements
  const activities = useMemo(() => {
    if (!rawActivities) return [];
    return [...rawActivities].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [rawActivities]);

  const upcomingActions = useMemo(() => {
    if (!activities) return [];
    const today = new Date().toISOString().split('T')[0];
    return activities.filter(a => 
      a.nextActionDate && 
      a.nextActionDate <= today && 
      a.outcomeStatus !== 'Success' &&
      a.outcomeStatus !== 'Closed won'
    ).sort((a, b) => a.nextActionDate.localeCompare(b.nextActionDate));
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
          <h1 className="text-xl font-bold">Activities</h1>
          <p className="text-sm text-muted-foreground">Monitor all lead interactions and pending follow-ups.</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            <h2 className="text-[14px] font-bold uppercase tracking-tight text-slate-500">Upcoming Next Actions</h2>
          </div>
          <div className="bg-card border rounded-md shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b h-9">
                    <th className="px-3 text-left w-[180px]">Lead</th>
                    <th className="text-left w-[150px]">Next Action Type</th>
                    <th className="text-left w-[120px]">Due Date</th>
                    <th className="text-right px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {upcomingActions.slice(0, 5).map((action) => {
                    const isOverdue = action.nextActionDate < new Date().toISOString().split('T')[0];
                    return (
                      <tr key={action.id} className="h-9 hover:bg-slate-50/50 transition-colors">
                        <td className="px-3">
                          <Link href={`/leads/${action.leadId}`} className="text-primary font-bold hover:underline">
                            {action.clientName || 'Unknown Lead'}
                          </Link>
                        </td>
                        <td className="text-slate-600">{action.nextActionType}</td>
                        <td>
                          <span className={cn(
                            "inline-flex items-center gap-1 font-medium",
                            isOverdue ? "text-red-600" : "text-amber-600"
                          )}>
                            {isOverdue && <AlertCircle size={12} />}
                            {action.nextActionDate}
                          </span>
                        </td>
                        <td className="px-3 text-right">
                          <Link href={`/leads/${action.leadId}`}>
                            <Button variant="outline" size="sm" className="h-6 text-[11px] px-2">Quick Log</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {upcomingActions.length === 0 && !loading && (
                    <tr className="h-20">
                      <td colSpan={4} className="text-center text-muted-foreground italic text-[12px]">
                        No pending next actions for today.
                      </td>
                    </tr>
                  )}
                  {loading && upcomingActions.length === 0 && (
                    <tr className="h-20">
                      <td colSpan={4} className="text-center"><Loader2 className="animate-spin inline-block mr-2" size={14} /> Loading...</td>
                    </tr>
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
              <h2 className="text-[14px] font-bold uppercase tracking-tight text-slate-500">Activity Log</h2>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <Input 
                  placeholder="Search activities or leads..." 
                  className="pl-8 h-8 text-[12px]" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-2 text-[12px]" onClick={() => setShowFilters(!showFilters)}>
                <Filter size={14} /> Filters
              </Button>
            </div>
          </div>

          <div className="bg-card border rounded-md shadow-sm overflow-hidden">
            {loading && activities.length === 0 ? (
              <div className="py-20 flex flex-col items-center">
                <Loader2 className="animate-spin text-primary mb-2" />
                <p className="text-[13px] text-muted-foreground">Loading interaction history...</p>
              </div>
            ) : (
              <div className={cn("overflow-x-auto transition-opacity", loading && "opacity-50")}>
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b h-9">
                      <th className="px-3 text-left w-[140px]">Date & Time</th>
                      <th className="text-left w-[160px]">Lead Name</th>
                      <th className="text-left w-[130px]">Activity Type</th>
                      <th className="text-left w-[100px]">Outcome</th>
                      <th className="text-left">Remark</th>
                      <th className="text-right px-3 w-[60px]">File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredActivities.map((activity) => (
                      <tr key={activity.id} className="h-9 hover:bg-slate-50/50 transition-colors group">
                        <td className="px-3 text-slate-500">
                          {format(parseISO(activity.createdAt), 'MMM d, HH:mm')}
                        </td>
                        <td>
                          <Link href={`/leads/${activity.leadId}`} className="text-primary font-bold hover:underline">
                            {activity.clientName || 'Unknown Lead'}
                          </Link>
                        </td>
                        <td>
                          <span className="font-medium">{activity.type}</span>
                        </td>
                        <td>
                          <Badge variant="outline" className="text-[10px] px-1.5 h-4 font-bold uppercase">
                            {activity.outcomeStatus}
                          </Badge>
                        </td>
                        <td className="max-w-[300px]">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="truncate text-slate-600 text-[12px]">
                                  {activity.remark}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[400px] text-[12px]">
                                {activity.remark}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="px-3 text-right">
                          {activity.fileUrl && (
                            <a href={activity.fileUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary transition-colors">
                              <FileText size={14} />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredActivities.length === 0 && !loading && (
                      <tr className="h-20">
                        <td colSpan={6} className="text-center text-muted-foreground italic text-[12px]">
                          No activities found matching the criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="p-3 border-t bg-slate-50/30 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Showing {filteredActivities.length} interactions</span>
              {loading && activities.length > 0 && <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Syncing...</span>}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
