
"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, Target, Wallet, Package, Settings, Bell, LogOut,
  ChevronLeft, ChevronRight, Plus, Zap, Clock, BarChart3, ArrowUpCircle,
  Layers, GitBranch, ShieldCheck, History as HistoryIcon, Banknote,
  AlertTriangle, Loader2, Coins, Menu, PlusCircle, Home, MapPin, StickyNote
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { TierBadge } from '@/components/ui/tier-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Scratchpad } from '@/components/notes/Scratchpad';

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, isInitializing, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const auth = useAuth();
  const db = useFirestore();

  const isManager = user?.role === 'Manager';
  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    if (!db || !isAdmin || !user) return;
    const qW = query(collection(db, 'withdrawals'), where('status', '==', 'pending'));
    const unsubW = onSnapshot(qW, (snap) => setPendingWithdrawals(snap.size));
    return () => unsubW();
  }, [db, isAdmin, user?.id]);

  const handleLogout = async () => {
    if (auth) await signOut(auth);
    logout();
    router.push('/login');
  };

  const navGroups = [
    {
      label: 'Main',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, href: isAdmin ? '/admin/dashboard' : isManager ? '/manager/dashboard' : '/dashboard' },
        { label: 'Leads', icon: Users, href: isAdmin ? '/admin/leads' : isManager ? '/manager/leads' : '/leads' },
        { label: 'Map View', icon: MapPin, href: '/leads/map' },
        { label: 'Activities', icon: Clock, href: isAdmin || isManager ? '/admin/activities' : '/activities' },
      ]
    },
    {
      label: 'Reports & Performance',
      items: [
        { label: 'Reports', icon: BarChart3, href: isAdmin ? '/admin/reports' : '/manager/reports' },
        { label: 'Targets', icon: Target, href: isAdmin ? '/admin/targets' : isManager ? '/manager/targets' : '/targets' },
        ...(isManager ? [{ label: 'Upgrade Queue', icon: ArrowUpCircle, href: '/manager/upgrade' }] : []),
      ]
    },
    {
      label: 'Finance',
      items: [
        { label: 'Wallet', icon: Wallet, href: '/wallet' },
        ...(isAdmin ? [
          { label: 'Commissions', icon: Coins, href: '/admin/commissions' },
          { label: 'Withdrawals', icon: Banknote, href: '/admin/withdrawals', badge: pendingWithdrawals },
        ] : []),
      ]
    },
    {
      label: 'System',
      items: [
        ...(isAdmin ? [
          { label: 'Team', icon: Users, href: '/admin/agents' },
          { label: 'Tiers', icon: Layers, href: '/admin/tiers' },
          { label: 'Products', icon: Package, href: '/admin/products' },
          { label: 'Channels', icon: GitBranch, href: '/admin/channels' },
          { label: 'Audit Log', icon: HistoryIcon, href: '/admin/audit' },
        ] : []),
        ...(isManager ? [{ label: 'My Team', icon: Users, href: '/manager/team' }] : []),
        { label: 'Settings', icon: Settings, href: isAdmin ? '/admin/settings' : '/settings' },
      ]
    }
  ];

  const NavItems = () => (
    <div className="space-y-4 py-2">
      {navGroups.map((group, idx) => (
        <div key={idx} className="space-y-1">
          {!isCollapsed && <p className="text-[10px] font-bold uppercase text-slate-400 px-3 mb-1">{group.label}</p>}
          {group.items.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
            return (
              <Link 
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center h-[32px] px-3 rounded-[6px] transition-colors gap-[10px] relative",
                  isActive ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <item.icon size={14} className="shrink-0" />
                {!isCollapsed && <span className="text-[12px] font-medium truncate">{item.label}</span>}
                {item.badge && item.badge > 0 && !isCollapsed && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );

  if (isInitializing) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary" /></div>;
  if (!user && pathname !== '/login') return null;
  if (!user) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn(
        "hidden md:flex flex-col border-r bg-white transition-all duration-300 z-30 sticky top-0 h-screen",
        isCollapsed ? "w-[48px]" : "w-[200px]"
      )}>
        <div className="h-12 border-b flex items-center px-3 justify-between overflow-hidden shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-primary text-white"><Zap size={14} /></div>
            {!isCollapsed && <span className="text-[13px] font-bold tracking-tight">NexusCRM</span>}
          </div>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400">
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden"><NavItems /></nav>
        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full justify-start h-8 px-2 gap-2 text-[12px]" onClick={() => setIsScratchpadOpen(true)}>
             <StickyNote size={14} /> {!isCollapsed && "Scratchpad"}
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[48px] border-b bg-white sticky top-0 z-20 flex items-center px-4 justify-between">
          <div className="flex items-center gap-3">
             <div className="text-[12px] font-medium text-slate-400 hidden md:block">
               {user.role} Portal <span className="mx-1">/</span> <span className="text-slate-900 font-bold">{pathname.split('/').pop() || 'Home'}</span>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-4 bg-slate-100 px-2 py-1 rounded-full">
               <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">{user.name[0]}</div>
               <span className="text-[11px] font-bold text-slate-700">{user.name}</span>
               <TierBadge tierId={user.tierId} />
            </div>
            <button onClick={handleLogout} className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-auto">
          <div className="max-w-screen-2xl mx-auto">{children}</div>
        </main>
      </div>
      <Scratchpad open={isScratchpadOpen} onOpenChange={setIsScratchpadOpen} />
    </div>
  );
}
