"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, Target, Wallet, Package, Settings, LogOut,
  ChevronLeft, ChevronRight, Zap, Clock, BarChart3, ArrowUpCircle,
  Layers, GitBranch, History as HistoryIcon, Banknote,
  Menu, MapPin, StickyNote, X
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { TierBadge } from '@/components/ui/tier-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Scratchpad } from '@/components/notes/Scratchpad';

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, isInitializing, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
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
      label: 'Performance',
      items: [
        { label: 'Reports', icon: BarChart3, href: isAdmin ? '/admin/reports' : isManager ? '/manager/reports' : '/reports' },
        { label: 'Targets', icon: Target, href: isAdmin ? '/admin/targets' : isManager ? '/manager/targets' : '/targets' },
        ...(isManager ? [{ label: 'Upgrade Queue', icon: ArrowUpCircle, href: '/manager/upgrade' }] : []),
      ]
    },
    {
      label: 'Finance',
      items: [
        { label: 'Wallet', icon: Wallet, href: '/wallet' },
        ...(isAdmin ? [
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

  const NavContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <div className="space-y-6 py-4">
      {navGroups.map((group, idx) => (
        <div key={idx} className="space-y-1">
          <p className="text-[10px] font-bold uppercase text-slate-400 px-3 mb-2 tracking-widest">{group.label}</p>
          {group.items.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
            return (
              <Link 
                key={item.href}
                href={item.href}
                onClick={onLinkClick}
                className={cn(
                  "flex items-center h-9 px-3 rounded-[6px] transition-all gap-3 relative group",
                  isActive ? "bg-primary text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <item.icon size={16} className={cn("shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-primary")} />
                <span className="text-[13px] font-medium truncate">{item.label}</span>
                {item.badge && item.badge > 0 && (
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

  if (isInitializing) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Zap className="animate-pulse text-primary" size={32} /></div>;
  if (!user && pathname !== '/login') return null;
  if (!user) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col border-r bg-white transition-all duration-300 z-30 sticky top-0 h-screen",
        isCollapsed ? "w-[64px]" : "w-[240px]"
      )}>
        <div className="h-14 border-b flex items-center px-4 justify-between overflow-hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary text-white shadow-lg"><Zap size={18} /></div>
            {!isCollapsed && <span className="text-[15px] font-extrabold tracking-tight text-primary">NexusCRM</span>}
          </div>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 transition-colors">
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {isCollapsed ? (
             <div className="space-y-4 py-2">
                {navGroups.flatMap(g => g.items).map(item => (
                   <Link key={item.href} href={item.href} className={cn("flex justify-center p-2 rounded-md", pathname.startsWith(item.href) ? "bg-primary text-white" : "text-slate-400")}>
                      <item.icon size={20} />
                   </Link>
                ))}
             </div>
          ) : <NavContent />}
        </nav>
        <div className="p-3 border-t">
          <Button variant="ghost" className="w-full justify-start h-9 px-3 gap-3 text-[13px] text-slate-600 hover:text-primary hover:bg-primary/5" onClick={() => setIsScratchpadOpen(true)}>
             <StickyNote size={16} /> {!isCollapsed && "Scratchpad"}
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-white sticky top-0 z-20 flex items-center px-4 justify-between shadow-sm">
          <div className="flex items-center gap-3">
             {/* Mobile Menu Trigger */}
             <Sheet>
               <SheetTrigger asChild>
                 <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
                   <Menu size={20} />
                 </Button>
               </SheetTrigger>
               <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
                  <div className="h-14 border-b flex items-center px-6 gap-3 bg-primary text-white">
                     <Zap size={20} />
                     <span className="font-bold">NexusCRM Mobile</span>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4">
                     <NavContent onLinkClick={() => {}} />
                  </div>
                  <div className="p-4 border-t bg-slate-50">
                     <Button variant="outline" className="w-full gap-2 text-red-600 border-red-100 hover:bg-red-50" onClick={handleLogout}>
                        <LogOut size={16} /> Sign Out
                     </Button>
                  </div>
               </SheetContent>
             </Sheet>
             
             <div className="text-[13px] font-medium text-slate-400 hidden sm:block">
               <span className="font-bold text-primary">{user.role} Portal</span>
               <span className="mx-2 text-slate-200">/</span>
               <span className="text-slate-900 font-bold uppercase tracking-tight">{pathname.split('/').pop() || 'Home'}</span>
             </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full">
               <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm">{user.name[0]}</div>
               <span className="text-[12px] font-bold text-slate-700 hidden xs:inline-block">{user.name}</span>
               <div className="hidden xs:block"><TierBadge tierId={user.tierId} /></div>
            </div>
            <button onClick={handleLogout} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors border border-transparent hover:border-red-100">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
      <Scratchpad open={isScratchpadOpen} onOpenChange={setIsScratchpadOpen} />
    </div>
  );
}
