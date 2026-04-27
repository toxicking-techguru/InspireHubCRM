"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Target, 
  Wallet, 
  Package, 
  Settings, 
  Bell, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  Zap,
  Clock,
  BarChart3,
  ArrowUpCircle,
  Layers,
  GitBranch,
  ShieldCheck,
  History as HistoryIcon,
  Banknote,
  AlertTriangle
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, isInitializing, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const auth = useAuth();
  const db = useFirestore();

  const isManager = user?.role === 'Manager';
  const isAdmin = user?.role === 'Admin';

  // Listen for pending withdrawals if admin
  useEffect(() => {
    if (!db || !isAdmin) return;
    const q = query(collection(db, 'withdrawals'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snap) => setPendingWithdrawals(snap.size));
    return () => unsub();
  }, [db, isAdmin]);

  const handleLogout = async () => {
    if (auth) await signOut(auth);
    logout();
    router.push('/login');
  };

  useEffect(() => {
    if (!isInitializing) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user) {
        if (pathname.startsWith('/admin') && !isAdmin) router.push('/dashboard');
        if (pathname.startsWith('/manager') && !isManager) router.push('/dashboard');
      }
    }
  }, [pathname, user, isInitializing, isAdmin, isManager, router]);

  const agentNav = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'My leads', icon: Users, href: '/leads' },
    { label: 'Add lead', icon: Plus, href: '/leads/new' },
    { label: 'Activities', icon: Clock, href: '/activities' },
    { label: 'Products', icon: Package, href: '/products' },
    { label: 'Wallet', icon: Wallet, href: '/wallet' },
    { label: 'Targets', icon: Target, href: '/targets' },
  ];

  const managerNav = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/manager/dashboard', sub: 'Team overview' },
    { label: 'My team', icon: Users, href: '/manager/team', sub: 'Agent list & profiles' },
    { label: 'All leads', icon: Users, href: '/manager/leads', sub: 'Team leads with filters' },
    { label: 'Idle leads', icon: AlertTriangle, href: '/manager/idle', sub: 'Leads needing action' },
    { label: 'Reports', icon: BarChart3, href: '/manager/reports', sub: 'Conversion & revenue' },
    { label: 'Targets', icon: Target, href: '/manager/targets', sub: 'Set & review targets' },
    { label: 'Upgrade queue', icon: ArrowUpCircle, href: '/manager/upgrade', sub: 'Tier upgrade candidates' },
  ];

  const adminNav = [
    { section: 'Operations', items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard', sub: 'Global system overview' },
      { label: 'Agents', icon: Users, href: '/admin/agents', sub: 'All agents CRUD' },
      { label: 'All leads', icon: Users, href: '/admin/leads', sub: 'System-wide leads' },
      { label: 'Tiers', icon: Layers, href: '/admin/tiers', sub: 'Commission & criteria' },
      { label: 'Products', icon: Package, href: '/admin/products', sub: 'Product & resource mgmt' },
      { label: 'Channels', icon: GitBranch, href: '/admin/channels', sub: 'Contact channel tree' },
    ]},
    { section: 'System', items: [
      { label: 'Withdrawals', icon: Banknote, href: '/admin/withdrawals', sub: 'Approve/reject queue', badge: pendingWithdrawals },
      { label: 'Reports', icon: BarChart3, href: '/admin/reports', sub: 'System-wide analytics' },
      { label: 'Targets', icon: Target, href: '/admin/targets', sub: 'Set team targets' },
      { label: 'Audit log', icon: HistoryIcon, href: '/admin/audit', sub: 'All system actions' },
      { label: 'Settings', icon: Settings, href: '/admin/settings', sub: 'System config' },
    ]}
  ];

  const themeClasses = isAdmin 
    ? {
        active: "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-l-2 border-violet-600",
        hover: "hover:bg-slate-50 dark:hover:bg-slate-800/50",
        icon: "text-violet-600"
      }
    : isManager 
    ? {
        active: "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-l-2 border-cyan-600",
        hover: "hover:bg-slate-50 dark:hover:bg-slate-800/50",
        icon: "text-cyan-600"
      }
    : {
        active: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-600",
        hover: "hover:bg-slate-50 dark:hover:bg-slate-800/50",
        icon: "text-indigo-600"
      };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className={cn("w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white shadow-lg", isAdmin ? "bg-violet-600" : isManager ? "bg-cyan-600" : "bg-primary")}>
             <Zap size={24} />
          </div>
          <p className="text-xs font-medium text-slate-400">Restoring InspireHubCRM session...</p>
        </div>
      </div>
    );
  }

  if (!user && pathname !== '/login') return null;
  if (!user) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn(
        "hidden md:flex flex-col border-r bg-sidebar transition-all duration-300 ease-in-out z-30 sticky top-0 h-screen",
        isCollapsed ? "w-[48px]" : "w-[200px]"
      )}>
        <div className="h-12 border-b flex items-center px-3 justify-between overflow-hidden bg-sidebar shrink-0">
          <div className="flex items-center gap-2">
            <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0 shadow-sm", isAdmin ? "bg-violet-600" : isManager ? "bg-cyan-600" : "bg-primary")}>
              <Zap size={14} className="text-white" />
            </div>
            {!isCollapsed && <span className="text-[13px] font-medium text-sidebar-foreground truncate tracking-tight">InspireHubCRM</span>}
          </div>
          {!isCollapsed && (
            <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(true)} className="h-7 w-7">
              <ChevronLeft size={14} />
            </Button>
          )}
        </div>

        <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden">
          <TooltipProvider delayDuration={0}>
            {isAdmin ? (
              <div className="space-y-4">
                {adminNav.map((section, idx) => (
                  <div key={idx} className="space-y-0.5">
                    {!isCollapsed && <p className="text-[10px] font-bold uppercase text-slate-400 px-3 mt-2 mb-1">{section.section}</p>}
                    {section.items.map((item) => {
                      const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>
                            <Link 
                              href={item.href}
                              className={cn(
                                "flex items-center h-[36px] px-3 rounded-[6px] transition-colors gap-[10px] relative",
                                isActive ? themeClasses.active : cn("text-sidebar-foreground", themeClasses.hover)
                              )}
                            >
                              <item.icon size={14} className={cn("shrink-0", isActive ? themeClasses.icon : "text-slate-400")} />
                              {!isCollapsed && (
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[13px] font-medium truncate leading-tight">{item.label}</span>
                                  {item.sub && <span className="text-[9px] text-slate-400 truncate font-normal">{item.sub}</span>}
                                </div>
                              )}
                              {item.badge && item.badge > 0 && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center">
                                  {item.badge > 9 ? '9+' : item.badge}
                                </span>
                              )}
                            </Link>
                          </TooltipTrigger>
                          {isCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-0.5">
                {(isManager ? managerNav : agentNav).map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link 
                          href={item.href}
                          className={cn(
                            "flex items-center h-[36px] px-3 rounded-[6px] transition-colors gap-[10px]",
                            isActive ? themeClasses.active : cn("text-sidebar-foreground", themeClasses.hover)
                          )}
                        >
                          <item.icon size={14} className={cn("shrink-0", isActive ? themeClasses.icon : "text-slate-400")} />
                          {!isCollapsed && (
                            <div className="flex flex-col min-w-0">
                              <span className="text-[13px] font-medium truncate leading-tight">{item.label}</span>
                              {(item as any).sub && <span className="text-[9px] text-slate-400 truncate font-normal">{(item as any).sub}</span>}
                            </div>
                          )}
                        </Link>
                      </TooltipTrigger>
                      {isCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </TooltipProvider>
        </nav>

        <div className="h-[52px] border-t p-2 flex items-center bg-sidebar overflow-hidden shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold truncate leading-tight">{user.name}</p>
                {isAdmin ? (
                  <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 text-[9px] h-3.5 px-1.5 font-bold uppercase tracking-tight">Admin</Badge>
                ) : isManager ? (
                   <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 text-[9px] h-3.5 px-1.5 font-bold uppercase tracking-tight">Manager</Badge>
                ) : (
                  <TierBadge tierId={user.tierId} />
                )}
              </div>
              <Link href="/admin/settings" className="shrink-0 text-muted-foreground hover:text-primary">
                <Settings size={14} />
              </Link>
            </div>
          ) : (
            <div className="flex justify-center w-full">
              <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(false)} className="h-8 w-8">
                <ChevronRight size={14} />
              </Button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 pb-[60px] md:pb-0">
        <header className="h-[48px] border-b bg-card sticky top-0 z-20 flex items-center px-4 justify-between">
          <div className="text-[12px] font-medium text-muted-foreground hidden md:block">
            InspireHubCRM <span className="mx-1 text-slate-300">/</span> <span className="text-foreground capitalize font-semibold">{pathname.split('/').slice(-1)[0] || 'Dashboard'}</span>
          </div>
          <div className="md:hidden flex items-center gap-2">
             <Zap size={16} className={isAdmin ? "text-violet-600" : isManager ? "text-cyan-600" : "text-primary"} />
             <span className="text-[13px] font-bold">InspireHubCRM</span>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8">
                  <Bell size={16} />
                  <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[12px] h-3 px-0.5 bg-destructive rounded-full border border-white text-[8px] text-white font-bold">
                    2
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[280px]">
                <DropdownMenuLabel className="text-[12px]">Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] font-bold text-primary uppercase">New Lead Assigned</span>
                      <span className="text-[9px] text-slate-400">2m ago</span>
                    </div>
                    <p className="text-[12px] text-slate-600">TechFlow Inc. has been assigned to your pipeline.</p>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] font-bold text-amber-600 uppercase">Target Reminder</span>
                      <span className="text-[9px] text-slate-400">1h ago</span>
                    </div>
                    <p className="text-[12px] text-slate-600">You are $500 away from your revenue target this month.</p>
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center text-primary text-[11px] font-bold py-2">
                  View All Notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="h-4 w-px bg-border mx-1"></div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-muted-foreground">
              <LogOut size={16} />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-3 md:p-4 overflow-x-hidden overflow-y-auto">
          <div className="max-w-screen-xl mx-auto space-y-4">
            {children}
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[56px] bg-background border-t z-40 flex items-center justify-around px-2">
        {(isAdmin ? adminNav[0].items.slice(0, 5) : (isManager ? managerNav : agentNav).slice(0, 5)).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn("flex flex-col items-center justify-center flex-1 gap-1 h-full", isActive ? (isAdmin ? "text-violet-600" : isManager ? "text-cyan-600" : "text-primary") : "text-muted-foreground")}>
              <item.icon size={18} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
