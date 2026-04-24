
"use client"

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@nexus.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const { setAuth: setGlobalAuth, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Helper to ensure Firestore profile exists and matches Auth UID
  const syncUserSession = async (uid: string, userEmail: string) => {
    if (!db) return null;

    // 1. Try direct UID lookup
    let userDoc = await getDoc(doc(db, 'agents', uid));
    
    if (!userDoc.exists()) {
      // 2. If UID lookup fails, check if a seeded record exists with this email but wrong ID
      const q = query(collection(db, 'agents'), where('email', '==', userEmail));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const seededData = snap.docs[0].data();
        const oldId = snap.docs[0].id;
        
        // Migrate seeded data to correct UID
        await setDoc(doc(db, 'agents', uid), seededData);
        if (oldId !== uid) {
          await deleteDoc(doc(db, 'agents', oldId));
        }
        userDoc = await getDoc(doc(db, 'agents', uid));
      } else {
        // 3. If no record at all, create a default Agent profile
        const isDefaultAdmin = userEmail === 'admin@nexus.com';
        const isDefaultManager = userEmail === 'manager@nexus.com';
        
        const userData = {
          name: userEmail.split('@')[0],
          email: userEmail,
          phone: '+1 000 000 0000',
          region: 'Global',
          status: 'active',
          role: isDefaultAdmin ? 'Admin' : (isDefaultManager ? 'Manager' : 'Agent'),
          tierId: isDefaultAdmin ? 't4' : 't1',
          managerId: null,
          joinDate: new Date().toISOString()
        };
        await setDoc(doc(db, 'agents', uid), userData);
        
        // Initialize wallet
        await setDoc(doc(db, 'wallets', uid), {
          agentId: uid,
          totalEarned: 0,
          pending: 0,
          withdrawable: 0,
          withdrawn: 0
        });
        
        userDoc = await getDoc(doc(db, 'agents', uid));
      }
    }

    return { id: userDoc.id, ...userDoc.data() } as any;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const agentData = await syncUserSession(userCredential.user.uid, email);
      
      if (agentData) {
        setGlobalAuth(agentData);
        toast({ title: "Login Successful", description: `Welcome back, ${agentData.name}` });
        router.push('/dashboard');
      } else {
        throw new Error("Failed to sync account data.");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid credentials or account record missing."
      });
      setLoading(false);
    }
  };

  const handleDevLogin = async (role: 'Agent' | 'Manager' | 'Admin') => {
    if (!auth || !db) return;
    setLoading(true);
    
    const devEmail = role === 'Agent' ? 'agent@nexus.com' : role === 'Manager' ? 'manager@nexus.com' : 'admin@nexus.com';
    const devPassword = 'password';

    try {
      let uid = '';
      try {
        const cred = await signInWithEmailAndPassword(auth, devEmail, devPassword);
        uid = cred.user.uid;
      } catch (err: any) {
        // If sign in fails, try to create
        const cred = await createUserWithEmailAndPassword(auth, devEmail, devPassword);
        uid = cred.user.uid;
      }

      const agentData = await syncUserSession(uid, devEmail);
      if (agentData) {
        setGlobalAuth(agentData);
        toast({ title: "Welcome", description: `Signed in as ${role}.` });
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Access Error",
        description: err.message
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground mb-4 shadow-lg">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">NexusCRM</h1>
          <p className="text-sm text-muted-foreground">Production-ready CRM Automation</p>
        </div>

        <div className="bg-card border rounded-xl shadow-xl overflow-hidden">
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@nexus.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="text-[11px] text-primary hover:underline">Forgot?</a>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10"
              />
            </div>
            <Button type="submit" className="w-full h-10 mt-2" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Sign In'}
            </Button>
          </form>
          
          <div className="bg-slate-50 dark:bg-slate-900 border-t p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-2">Development Access</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button 
                onClick={() => handleDevLogin('Agent')}
                disabled={loading}
                className="text-[10px] px-3 py-1.5 bg-white dark:bg-slate-800 border rounded shadow-sm hover:bg-slate-100 disabled:opacity-50 transition-colors font-medium border-slate-200"
              >
                Agent
              </button>
              <button 
                onClick={() => handleDevLogin('Manager')}
                disabled={loading}
                className="text-[10px] px-3 py-1.5 bg-white dark:bg-slate-800 border rounded shadow-sm hover:bg-slate-100 disabled:opacity-50 transition-colors font-medium border-slate-200"
              >
                Manager
              </button>
              <button 
                onClick={() => handleDevLogin('Admin')}
                disabled={loading}
                className="text-[10px] px-3 py-1.5 bg-white dark:bg-slate-800 border rounded shadow-sm hover:bg-slate-100 disabled:opacity-50 transition-colors font-medium border-slate-200"
              >
                Admin
              </button>
            </div>
            <div className="mt-3 flex items-center justify-center gap-1 text-[9px] text-muted-foreground">
              <AlertCircle size={10} />
              <span>Auto-registers missing profiles after seed.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
