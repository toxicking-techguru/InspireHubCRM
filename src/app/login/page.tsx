
"use client"

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, AlertCircle, Info } from 'lucide-react';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth: setGlobalAuth, isAuthenticated, user: currentUser } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      if (currentUser.role === 'Admin') router.push('/admin/dashboard');
      else if (currentUser.role === 'Manager') router.push('/manager/dashboard');
      else router.push('/dashboard');
    }
  }, [isAuthenticated, currentUser, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;
    setLoading(true);

    try {
      let userCredential;
      try {
        // 1. Attempt standard login
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (authErr: any) {
        // 2. If user doesn't exist in Auth, check if they are pre-authorized in Firestore
        if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
          const q = query(collection(db, 'agents'), where('email', '==', email));
          const snap = await getDocs(q);
          
          if (!snap.empty && password === '12345678') {
            // First time login with default password
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const seededData = snap.docs[0].data();
            const oldId = snap.docs[0].id;
            
            // Migrate Firestore record to match Auth UID
            await setDoc(doc(db, 'agents', userCredential.user.uid), seededData);
            if (oldId !== userCredential.user.uid) {
              await deleteDoc(doc(db, 'agents', oldId));
            }
            
            // If Agent, migrate wallet too
            if (seededData.role === 'Agent') {
               const wSnap = await getDoc(doc(db, 'wallets', oldId));
               if (wSnap.exists()) {
                 await setDoc(doc(db, 'wallets', userCredential.user.uid), wSnap.data());
                 await deleteDoc(doc(db, 'wallets', oldId));
               }
            }
          } else {
            throw new Error("Account not found or not authorized. Please contact your administrator.");
          }
        } else {
          throw authErr;
        }
      }

      // 3. Sync Session
      const userDoc = await getDoc(doc(db, 'agents', userCredential.user.uid));
      if (userDoc.exists()) {
        const agentData = { id: userDoc.id, ...userDoc.data() } as any;
        setGlobalAuth(agentData);
        toast({ title: "Login Successful", description: `Welcome back, ${agentData.name}` });
      } else {
        throw new Error("Authorized profile missing from database.");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Access Denied",
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
          <h1 className="text-2xl font-bold tracking-tight">InspireHubCRM</h1>
          <p className="text-sm text-muted-foreground">Internal Management System</p>
        </div>

        <div className="bg-card border rounded-xl shadow-xl overflow-hidden">
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@nexus.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
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
            
            <div className="mt-4 p-3 bg-cyan-50 rounded-lg flex gap-3 text-cyan-800 text-[11px] leading-tight">
               <Info size={14} className="shrink-0 text-cyan-600" />
               <p>New staff member? Use the default password provided by your manager for your first login.</p>
            </div>
          </form>
          
          <div className="bg-slate-50 dark:bg-slate-900 border-t p-4 text-center">
             <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Secure Authentication Environment</p>
          </div>
        </div>
      </div>
    </div>
  );
}
