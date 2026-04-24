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
  Menu,
  Briefcase
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { TierBadge } from '@/components/ui/tier-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, setAuth, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        if (!user) {
          const db = getFirestore();
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
  }, [pathname, router, setAuth, user]);

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    logout();
    router.push('/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['Agent', 'Manager', 'Admin'] },
    { label: 'Leads', icon: Users, href: '/leads', roles: ['Agent', 'Manager', 'Admin'] },
    { label: 'Wallet', icon: Wallet, href: '/wallet', roles: ['Agent', 'Manager', 'Admin'] },
    { label: 'Products', icon: Package, href: '/products', roles: ['Agent', 'Manager', 'Admin'] },
    { label: 'Admin Tiers', icon: Settings, href: '/admin/tiers', roles: ['Admin'] },
    { label: 'Admin Users', icon: Briefcase, href: '/admin/users', roles: ['Admin', 'Manager'] },
  ].filter(item => user && item.roles.includes(user.role));

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-primary rounded-xl mb-4"></div>
          <p className="text-xs font-medium text-slate-400">Initializing NexusCRM...</p>
        </div>
      </div>
    );
  }

  if (!user && pathname !== '/login') return null;
  if (!user) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col border-r bg-sidebar transition-all duration-300 ease-in-out z-30 sticky top-0 h-screen",
        isCollapsed ? "w-16" : "w-56"
      )}>
        <div className="h-14 border-b flex items-center px-4 justify-between overflow-hidden">
          {!isCollapsed && <span className="font-headline font-bold text-primary truncate">NexusCRM</span>}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-primary"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon size={18} className="shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t space-y-1">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive px-3"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            {!isCollapsed && <span className="text-sm">Logout</span>}
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b bg-card sticky top-0 z-20 flex items-center px-4 justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu size={20} />
            </Button>
            <div className="text-xs font-medium text-muted-foreground hidden sm:block">
              NexusCRM <span className="mx-1">/</span> <span className="text-foreground capitalize">{pathname.split('/')[1] || 'Home'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-white"></span>
            </Button>
            <div className="h-8 w-px bg-border mx-1"></div>
            <div className="flex flex-col items-end mr-1 hidden sm:flex">
              <span className="text-xs font-bold leading-none">{user.name}</span>
              <span className="text-[10px] text-muted-foreground">{user.role}</span>
            </div>
            <TierBadge tierId={user.tierId} />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
