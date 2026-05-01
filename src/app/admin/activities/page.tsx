
"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, orderBy } from 'firebase/firestore';
import { LeadActivity } from '@/types/crm';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { 
  Search, Calendar, Clock, Loader2, Filter, MapPin, User, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function GlobalActivitiesPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  const activitiesQuery = useMemoFirebase(() => firestore ? query(collectionGroup(firestore, 'activities'), orderBy('createdAt', 'desc')) : null, [firestore]);
  const { data: activities, loading } = useCollection<LeadActivity>(activitiesQuery as any);

  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    return activities.filter(a => {
      const matchesSearch = 
        a.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.agentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.remark.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesDate = true;
      if (startDate && endDate) {
        const activityDate = parseISO(a.createdAt);
        matchesDate = isWithinInterval(activityDate, {
          start: startOfDay(parseISO(startDate)),
          end: endOfDay(parseISO(endDate))
        });
      }

      return matchesSearch && matchesDate;
    });
  }, [activities, searchTerm, startDate, endDate]);

  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredActivities.slice(start, start + rowsPerPage);
  }, [filteredActivities, currentPage]);

  const totalPages = Math.ceil(filteredActivities.length / rowsPerPage);

  if (!user || (user.role !== 'Admin' && user.role !== 'Manager')) return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <div>
              <h1 className="text-xl font-bold text-slate-900">Global Activity Feed</h1>
              <p className="text-sm text-slate-500">Real-time interaction history across all agents and managers.</p>
           </div>
        </div>

        <div className="bg-white border rounded-xl p-3 shadow-sm flex flex-wrap items-center gap-4">
           <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input 
                placeholder="Search remark, agent or client..." 
                className="pl-9 h-9 text-[13px] bg-slate-50/50 border-slate-200" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <Input type="date" className="h-9 text-[12px] w-[140px]" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <span className="text-slate-300">to</span>
              <Input type="date" className="h-9 text-[12px] w-[140px]" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              {(startDate || endDate) && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {setStartDate(''); setEndDate('');}}><X size={14}/></Button>}
           </div>
        </div>

        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                 <thead>
                    <tr className="bg-slate-50 h-10 border-b font-bold uppercase text-[10px] text-slate-400">
                       <th className="px-4 text-left w-[160px]">Timestamp</th>
                       <th className="text-left w-[150px]">Agent</th>
                       <th className="text-left w-[180px]">Client</th>
                       <th className="text-left w-[120px]">Type</th>
                       <th className="text-left">Remark</th>
                       <th className="px-4 text-right">Location</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y">
                    {loading ? (
                       <tr className="h-40"><td colSpan={6} className="text-center"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                    ) : paginatedActivities.map(a => (
                       <tr key={a.id} className="h-12 hover:bg-slate-50 transition-colors">
                          <td className="px-4 text-slate-500">{format(parseISO(a.createdAt), 'MMM d, HH:mm:ss')}</td>
                          <td>
                             <div className="flex items-center gap-2">
                                <User size={12} className="text-primary" />
                                <span className="font-bold text-slate-700">{a.agentName || 'Unknown'}</span>
                             </div>
                          </td>
                          <td className="font-medium text-slate-800">{a.clientName}</td>
                          <td>
                             <Badge variant="outline" className="text-[9px] font-bold uppercase border-primary/20 text-primary bg-primary/5">{a.type}</Badge>
                          </td>
                          <td className="max-w-[300px] truncate italic text-slate-500" title={a.remark}>{a.remark}</td>
                          <td className="px-4 text-right">
                             {a.location ? <MapPin size={14} className="text-emerald-500 inline-block" /> : '--'}
                          </td>
                       </tr>
                    ))}
                    {filteredActivities.length === 0 && !loading && (
                       <tr className="h-40 text-center"><td colSpan={6} className="text-slate-300 italic">No activity logs found matching the filters.</td></tr>
                    )}
                 </tbody>
              </table>
           </div>

           <div className="p-3 border-t bg-slate-50/30 flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-400">Showing {paginatedActivities.length} of {filteredActivities.length} logs</p>
              <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" className="h-7 px-2 gap-1 text-[11px]" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={12}/> Prev</Button>
                 <span className="text-[11px] font-bold px-2">Page {currentPage} of {totalPages || 1}</span>
                 <Button variant="outline" size="sm" className="h-7 px-2 gap-1 text-[11px]" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next <ChevronRight size={12}/></Button>
              </div>
           </div>
        </div>
      </div>
    </Shell>
  );
}
