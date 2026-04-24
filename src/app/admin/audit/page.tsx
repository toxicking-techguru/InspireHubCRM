
"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Loader2,
  Calendar,
  User,
  Activity
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function AdminAuditPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch Audit Logs (Limited to 100 for performance, ideally server-side paginated)
  const auditQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'audit_logs'), orderBy('timestamp', 'desc'), limit(100)) : null, [firestore]);
  const { data: logs, loading } = useCollection<any>(auditQuery as any);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter(l => 
      l.actorName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.actionType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.entityId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  const getBadgeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('create')) return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (t.includes('update')) return "bg-blue-50 text-blue-700 border-blue-100";
    if (t.includes('delete')) return "bg-red-50 text-red-700 border-red-100";
    if (t.includes('login')) return "bg-slate-100 text-slate-600 border-slate-200";
    if (t.includes('upgrade')) return "bg-purple-50 text-purple-700 border-purple-100";
    return "bg-slate-50 text-slate-500 border-slate-100";
  };

  if (!user || user.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <div>
              <h1 className="text-[18px] font-bold flex items-center gap-2 text-violet-900">
                 <History className="text-violet-600" size={20} /> System Audit Trail
              </h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">Immutable record of all administrative and automated system actions.</p>
           </div>
           <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-2 border-violet-200 text-violet-700">
                 <Download size={14} /> Export CSV (500)
              </Button>
           </div>
        </div>

        <div className="bg-card border rounded-md shadow-sm p-3 flex flex-wrap items-center gap-3">
           <div className="relative flex-1 max-w-[300px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input 
                placeholder="Search actor or entity..." 
                className="pl-8 h-8 text-[12px] bg-white border-violet-100 shadow-none" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <Button variant="outline" size="sm" className="h-8 gap-2 text-[12px] text-slate-500">
              <Calendar size={14} /> Date Range
           </Button>
           <Button variant="outline" size="sm" className="h-8 gap-2 text-[12px] text-slate-500">
              <User size={14} /> Actor Role
           </Button>
           <Button variant="outline" size="sm" className="h-8 gap-2 text-[12px] text-slate-500">
              <Activity size={14} /> Action Type
           </Button>
        </div>

        <div className="bg-card border rounded-md shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                 <thead>
                    <tr className="bg-slate-50/80 border-b h-9 font-semibold uppercase tracking-wider text-[11px] text-slate-500">
                       <th className="px-3 text-left w-[160px]">Timestamp</th>
                       <th className="text-left w-[180px]">Actor</th>
                       <th className="text-left w-[120px]">Action</th>
                       <th className="text-left w-[140px]">Entity Type</th>
                       <th className="text-left">Details</th>
                       <th className="px-3 text-right w-[60px]"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y">
                    {loading ? (
                       <tr className="h-40"><td colSpan={6} className="text-center"><Loader2 className="animate-spin mx-auto text-violet-200" /></td></tr>
                    ) : filteredLogs.map(log => {
                       const isExpanded = expandedId === log.id;
                       return (
                          <React.Fragment key={log.id}>
                             <tr className={cn("h-10 hover:bg-slate-50 cursor-pointer transition-colors group", isExpanded && "bg-violet-50/30")}>
                                <td className="px-3 text-slate-500 font-medium">{format(parseISO(log.timestamp), 'MMM d, HH:mm:ss')}</td>
                                <td className="">
                                   <div className="flex flex-col">
                                      <span className="font-bold text-slate-800">{log.actorName}</span>
                                      <span className="text-[10px] text-slate-400 font-bold uppercase">{log.actorRole}</span>
                                   </div>
                                </td>
                                <td>
                                   <Badge variant="outline" className={cn("text-[9px] h-3.5 px-1 font-bold uppercase", getBadgeColor(log.actionType))}>
                                      {log.actionType}
                                   </Badge>
                                </td>
                                <td className="text-slate-600 font-medium">{log.entityType}</td>
                                <td className="text-slate-400 text-[11px] truncate max-w-[200px]">{log.remark || `ID: ${log.entityId}`}</td>
                                <td className="px-3 text-right">
                                   <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-violet-600" onClick={() => setExpandedId(isExpanded ? null : log.id)}>
                                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                   </Button>
                                </td>
                             </tr>
                             {isExpanded && (
                                <tr className="bg-slate-50/50 border-b">
                                   <td colSpan={6} className="p-4 px-10">
                                      <div className="grid grid-cols-2 gap-10">
                                         <div className="space-y-2">
                                            <h4 className="text-[11px] font-bold uppercase text-slate-400">Previous State</h4>
                                            <div className="p-3 bg-white border rounded shadow-inner font-mono text-[11px] overflow-auto max-h-[200px] text-slate-400">
                                               {log.oldValue ? JSON.stringify(log.oldValue, null, 2) : 'NONE'}
                                            </div>
                                         </div>
                                         <div className="space-y-2">
                                            <h4 className="text-[11px] font-bold uppercase text-violet-700">New State</h4>
                                            <div className="p-3 bg-white border border-violet-100 rounded shadow-inner font-mono text-[11px] overflow-auto max-h-[200px] text-violet-800">
                                               {log.newValue ? JSON.stringify(log.newValue, null, 2) : 'NONE'}
                                            </div>
                                         </div>
                                      </div>
                                      <div className="mt-4 flex items-center gap-6 text-[11px] text-slate-400 font-medium">
                                         <span>Entity ID: <b className="text-slate-600">{log.entityId}</b></span>
                                         <span>IP Address: <b className="text-slate-600">{log.ipAddress || '192.168.1.1'}</b></span>
                                         <span>Reference: <b className="text-slate-600">{log.reference || 'SYSTEM_EVENT'}</b></span>
                                      </div>
                                   </td>
                                </tr>
                             )}
                          </React.Fragment>
                       );
                    })}
                    {filteredLogs.length === 0 && !loading && (
                      <tr className="h-40 text-center"><td colSpan={6} className="text-slate-300 italic">No audit records found matching criteria.</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
           <div className="p-3 border-t bg-slate-50/30 flex items-center justify-between text-[11px] text-slate-400">
              <span>Showing last 100 system events</span>
              <div className="flex gap-2">
                 <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]" disabled>Prev</Button>
                 <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]">Next</Button>
              </div>
           </div>
        </div>
      </div>
    </Shell>
  );
}

