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
  Clock
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { TierBadge } from '@/components/ui/tier-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, setAuth, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const auth = useAuth();
  const db = useFirestore();

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

  // Define Navigation based on Role
  const navItems = [
    { label: 'Dashboard', desc: 'Overview & tasks', icon: LayoutDashboard, href: '/dashboard', roles: ['Agent', 'Manager', 'Admin'] },
    { label: 'My leads', desc: 'Full lead list', icon: Users, href: '/leads', roles: ['Agent', 'Manager', 'Admin'] },
    { label: 'Add lead', desc: 'New lead form', icon: Plus, href: '/leads/new', roles: ['Agent', 'Manager', 'Admin'] },
    { label: 'Activities', desc: 'My interactions', icon: Clock, href: '/activities', roles: ['Agent', 'Manager', 'Admin'] },
    { label: 'Products', desc: 'Tier catalog', icon: Package, href: '/products', roles: ['Agent', 'Manager', 'Admin'] },
    { label: 'Wallet', desc: 'My earnings', icon: Wallet, href: '/wallet', roles: ['Agent', 'Manager', 'Admin'] },
    { label: 'Targets', desc: 'Performance', icon: Target, href: '/targets', roles: ['Agent', 'Manager', 'Admin'] },
  ].filter(item => user && item.roles.includes(user.role));

  const adminItems = [
    { label: 'Team', icon: Users, href: '/admin/users', roles: ['Manager', 'Admin'] },
    { label: 'Admin Tiers', icon: Settings, href: '/admin/tiers', roles: ['Admin'] },
  ].filter(item => user && item.roles.includes(user.role));

  // Role Guard for specific paths
  useEffect(() => {
    if (!user || initializing) return;

    const isAdminPath = pathname.startsWith('/admin');
    if (isAdminPath) {
      if (pathname.includes('/admin/tiers') && user.role !== 'Admin') {
        router.push('/dashboard');
      }
      if (pathname.includes('/admin/users') && !['Admin', 'Manager'].includes(user.role)) {
        router.push('/dashboard');
      }
    }
  }, [pathname, user, initializing, router]);

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
      {/* Sidebar - Desktop */}
      <aside className={cn(
        "hidden md:flex flex-col border-r bg-sidebar transition-all duration-300 ease-in-out z-30 sticky top-0 h-screen",
        isCollapsed ? "w-[48px]" : "w-[200px]"
      )}>
        {/* Header row 48px */}
        <div className="h-12 border-b flex items-center px-3 justify-between overflow-hidden bg-sidebar">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center shrink-0">
              <Zap size={14} className="text-white" />
            </div>
            {!isCollapsed && <span className="text-[13px] font-bold text-sidebar-foreground truncate">NexusCRM</span>}
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
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link 
                        href={item.href}
                        className={cn(
                          "flex items-center h-[36px] px-3 rounded-[6px] transition-colors gap-[10px]",
                          isActive 
                            ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-600 rounded-l-none" 
                            : "text-sidebar-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        )}
                      >
                        <item.icon size={14} className="shrink-0" />
                        {!isCollapsed && (
                          <div className="flex-1 flex items-center justify-between overflow-hidden">
                            <span className="text-[13px] font-medium truncate">{item.label}</span>
                          </div>
                        )}
                      </Link>
                    </TooltipTrigger>
                    {isCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                  </Tooltip>
                );
              })}
            </div>

            {adminItems.length > 0 && (
              <>
                <div className="mt-4 mb-1 px-3">
                  {!isCollapsed && <span className="text-[10px] uppercase font-bold text-slate-400">Administration</span>}
                </div>
                <div className="space-y-0.5">
                  {adminItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <Link 
                            href={item.href}
                            className={cn(
                              "flex items-center h-[36px] px-3 rounded-[6px] transition-colors gap-[10px]",
                              isActive 
                                ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-600 rounded-l-none" 
                                : "text-sidebar-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            )}
                          >
                            <item.icon size={14} className="shrink-0" />
                            {!isCollapsed && <span className="text-[13px] font-medium truncate">{item.label}</span>}
                          </Link>
                        </TooltipTrigger>
                        {isCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                      </Tooltip>
                    );
                  })}
                </div>
              </>
            )}
          </TooltipProvider>
        </nav>

        {/* Footer 52px */}
        <div className="h-[52px] border-t p-2 flex items-center bg-sidebar overflow-hidden">
          {!isCollapsed ? (
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold truncate leading-tight">{user.name}</p>
                <TierBadge tierId={user.tierId} />
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

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col min-w-0 pb-[60px] md:pb-0">
        {/* Topbar */}
        <header className="h-[48px] border-b bg-card sticky top-0 z-20 flex items-center px-4 justify-between">
          <div className="text-[12px] font-medium text-muted-foreground hidden md:block">
            NexusCRM <span className="mx-1 text-slate-300">/</span> <span className="text-foreground capitalize font-semibold">{pathname.split('/')[1] || 'Dashboard'}</span>
          </div>
          <div className="md:hidden flex items-center gap-2">
             <Zap size={16} className="text-primary" />
             <span className="text-[13px] font-bold">NexusCRM</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full border border-white"></span>
            </Button>
            <div className="h-4 w-px bg-border mx-1"></div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-muted-foreground">
              <LogOut size={16} />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-3 md:p-4 overflow-x-hidden overflow-y-auto">
          <div className="max-w-screen-xl mx-auto space-y-4">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[56px] bg-background border-t z-40 flex items-center justify-around px-2">
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-1 h-full",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon size={18} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}