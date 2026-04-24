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
  AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { TierBadge } from '@/components/ui/tier-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, setAuth, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const auth = useAuth();
  const db = useFirestore();

  const isManager = user?.role === 'Manager';
  const isAdmin = user?.role === 'Admin';
  const isAgent = user?.role === 'Agent';

  useEffect(() => {
    if (!auth || !db) return;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        if (!user) {
          const userDoc = await getDoc(doc(db, 'agents', fbUser.uid));
          if (userDoc.exists()) {
            setAuth({ id: userDoc.id, ...userDoc.data() } as any);
          }
        }
      } else {
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, [pathname, router, setAuth, user, auth, db]);

  const handleLogout = async () => {
    if (auth) await signOut(auth);
    logout();
    router.push('/login');
  };

  // Role-based Navigation
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
    { label: 'All leads', icon: Users, href: '/leads', sub: 'Team leads with filters' },
    { label: 'Idle leads', icon: AlertTriangle, href: '/manager/idle', sub: 'Leads needing action' },
    { label: 'Reports', icon: BarChart3, href: '/manager/reports', sub: 'Conversion & revenue' },
    { label: 'Targets', icon: Target, href: '/targets', sub: 'Set & review targets' },
    { label: 'Upgrade queue', icon: ArrowUpCircle, href: '/manager/upgrade', sub: 'Tier upgrade candidates' },
    { label: 'Notifications', icon: Bell, href: '/manager/notifications', sub: 'Team alerts' },
  ];

  const adminNav = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Team', icon: Users, href: '/admin/users' },
    { label: 'Admin Tiers', icon: Settings, href: '/admin/tiers' },
  ];

  const activeNav = isManager ? managerNav : (isAdmin ? adminNav : agentNav);

  const themeClasses = isManager 
    ? {
        active: "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-l-2 border-cyan-600",
        hover: "hover:bg-slate-50 dark:hover:bg-slate-800/50",
        icon: isManager ? "text-cyan-600" : "text-indigo-600"
      }
    : {
        active: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-600",
        hover: "hover:bg-slate-50 dark:hover:bg-slate-800/50",
        icon: "text-indigo-600"
      };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-primary rounded-xl mb-4 flex items-center justify-center text-white">
             <Zap size={24} />
          </div>
          <p className="text-xs font-medium text-slate-400">Initializing NexusCRM...</p>
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
            <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0", isManager ? "bg-cyan-600" : "bg-primary")}>
              <Zap size={14} className="text-white" />
            </div>
            {!isCollapsed && <span className="text-[13px] font-medium text-sidebar-foreground truncate">NexusCRM</span>}
          </div>
          {!isCollapsed && (
            <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(true)} className="h-7 w-7">
              <ChevronLeft size={14} />
            </Button>
          )}
        </div>

        <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden">
          <TooltipProvider delayDuration={0}>
            <div className="space-y-0.5">
              {activeNav.map((item) => {
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
                        <item.icon size={14} className={cn("shrink-0", isActive ? "" : "")} />
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
          </TooltipProvider>
        </nav>

        <div className="h-[52px] border-t p-2 flex items-center bg-sidebar overflow-hidden shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold truncate leading-tight">{user.name}</p>
                {isManager ? (
                   <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 text-[9px] h-3.5 px-1.5 font-bold uppercase tracking-tight">Manager</Badge>
                ) : (
                  <TierBadge tierId={user.tierId} />
                )}
              </div>
              <Link href="/settings" className="shrink-0 text-muted-foreground hover:text-primary">
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
            NexusCRM <span className="mx-1 text-slate-300">/</span> <span className="text-foreground capitalize font-semibold">{pathname.split('/')[1] || 'Dashboard'}</span>
          </div>
          <div className="md:hidden flex items-center gap-2">
             <Zap size={16} className={isManager ? "text-cyan-600" : "text-primary"} />
             <span className="text-[13px] font-bold">NexusCRM</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[12px] h-3 px-0.5 bg-destructive rounded-full border border-white text-[8px] text-white font-bold">
                9+
              </span>
            </Button>
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
        {activeNav.slice(0, 5).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn("flex flex-col items-center justify-center flex-1 gap-1 h-full", isActive ? (isManager ? "text-cyan-600" : "text-primary") : "text-muted-foreground")}>
              <item.icon size={18} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
