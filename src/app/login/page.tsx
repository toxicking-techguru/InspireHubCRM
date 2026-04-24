"use client"

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('agent@nexus.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const { setAuth, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const auth = getAuth();
      const db = getFirestore();
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'agents', userCredential.user.uid));

      if (userDoc.exists()) {
        const agentData = { id: userDoc.id, ...userDoc.data() } as any;
        setAuth(agentData);
        router.push('/dashboard');
      } else {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "Your account record was not found in the database."
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid credentials."
      });
    } finally {
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
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-2">Development Access</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button 
                onClick={() => { setEmail('agent@nexus.com'); setPassword('password'); }}
                className="text-[10px] px-2 py-1 bg-white dark:bg-slate-800 border rounded shadow-sm hover:bg-slate-100"
              >
                Agent
              </button>
              <button 
                onClick={() => { setEmail('manager@nexus.com'); setPassword('password'); }}
                className="text-[10px] px-2 py-1 bg-white dark:bg-slate-800 border rounded shadow-sm hover:bg-slate-100"
              >
                Manager
              </button>
              <button 
                onClick={() => { setEmail('admin@nexus.com'); setPassword('password'); }}
                className="text-[10px] px-2 py-1 bg-white dark:bg-slate-800 border rounded shadow-sm hover:bg-slate-100"
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
