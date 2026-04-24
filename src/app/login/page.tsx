
"use client"

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc 
} from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('agent@nexus.com');
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

  const performLogin = async (emailInput: string, passwordInput: string) => {
    if (!auth || !db) return false;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailInput, passwordInput);
      const userDoc = await getDoc(doc(db, 'agents', userCredential.user.uid));

      if (userDoc.exists()) {
        const agentData = { id: userDoc.id, ...userDoc.data() } as any;
        setGlobalAuth(agentData);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Login attempt failed:", error.code);
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await performLogin(email, password);
    if (!success) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid credentials or account record missing."
      });
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  const handleDevLogin = async (role: 'Agent' | 'Manager' | 'Admin') => {
    if (!auth || !db) return;
    setLoading(true);
    
    const devEmail = role === 'Agent' ? 'agent@nexus.com' : role === 'Manager' ? 'manager@nexus.com' : 'admin@nexus.com';
    const devPassword = 'password';

    try {
      let uid = '';
      let userData: any = null;

      try {
        // 1. Try to sign in
        const cred = await signInWithEmailAndPassword(auth, devEmail, devPassword);
        uid = cred.user.uid;
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          // 2. If not found, create user
          const cred = await createUserWithEmailAndPassword(auth, devEmail, devPassword);
          uid = cred.user.uid;
        } else {
          throw err;
        }
      }

      // 3. Check/Create Firestore Profile
      const userDoc = await getDoc(doc(db, 'agents', uid));
      if (!userDoc.exists()) {
        userData = {
          name: `Dev ${role}`,
          email: devEmail,
          phone: '+1 000 000 0000',
          region: 'Global',
          status: 'active',
          role: role,
          tierId: role === 'Agent' ? 't1' : 't4',
          managerId: null,
          joinDate: new Date().toISOString()
        };
        await setDoc(doc(db, 'agents', uid), userData);
        
        // Create initial wallet
        await setDoc(doc(db, 'wallets', uid), {
          agentId: uid,
          totalEarned: 0,
          pending: 0,
          withdrawable: 0,
          withdrawn: 0
        });
      } else {
        userData = userDoc.data();
      }

      setGlobalAuth({ id: uid, ...userData });
      toast({ title: "Welcome back", description: `Signed in as ${role}.` });
      router.push('/dashboard');

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
                placeholder="agent@nexus.com" 
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
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-2">One-Click Dev Login</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button 
                onClick={() => handleDevLogin('Agent')}
                disabled={loading}
                className="text-[10px] px-3 py-1.5 bg-white dark:bg-slate-800 border rounded shadow-sm hover:bg-slate-100 disabled:opacity-50 transition-colors font-medium"
              >
                Agent
              </button>
              <button 
                onClick={() => handleDevLogin('Manager')}
                disabled={loading}
                className="text-[10px] px-3 py-1.5 bg-white dark:bg-slate-800 border rounded shadow-sm hover:bg-slate-100 disabled:opacity-50 transition-colors font-medium"
              >
                Manager
              </button>
              <button 
                onClick={() => handleDevLogin('Admin')}
                disabled={loading}
                className="text-[10px] px-3 py-1.5 bg-white dark:bg-slate-800 border rounded shadow-sm hover:bg-slate-100 disabled:opacity-50 transition-colors font-medium"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
