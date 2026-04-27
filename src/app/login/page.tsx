
"use client"

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, Info, UserCheck } from 'lucide-react';
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

  const handleLogin = async (e: React.FormEvent | null, demoEmail?: string, demoPass?: string) => {
    if (e) e.preventDefault();
    if (!auth || !db) return;

    const targetEmail = (demoEmail || email).trim().toLowerCase();
    const targetPass = demoPass || password;

    if (!targetEmail || !targetPass) return;

    setLoading(true);

    try {
      let userCredential;
      try {
        // 1. Attempt standard login
        userCredential = await signInWithEmailAndPassword(auth, targetEmail, targetPass);
      } catch (authErr: any) {
        // 2. If user doesn't exist in Auth, check if they are pre-authorized in Firestore
        // error codes: auth/user-not-found, auth/invalid-credential, auth/invalid-email
        if (
          authErr.code === 'auth/user-not-found' || 
          authErr.code === 'auth/invalid-credential' || 
          authErr.code === 'auth/invalid-email'
        ) {
          const q = query(collection(db, 'agents'), where('email', '==', targetEmail));
          const snap = await getDocs(q);
          
          if (!snap.empty && targetPass === '12345678') {
            // First time login with default password
            userCredential = await createUserWithEmailAndPassword(auth, targetEmail, targetPass);
            const seededData = snap.docs[0].data();
            const oldId = snap.docs[0].id;
            
            // Migrate Firestore record to match Auth UID
            await setDoc(doc(db, 'agents', userCredential.user.uid), {
              ...seededData,
              email: targetEmail // Ensure normalized email
            });

            // Delete old record if it was a custom ID (like 'adm' or 'agent_...')
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
            // If we are here, either email not in DB or password isn't 12345678
            throw new Error("Access denied. Please check your credentials or contact your administrator.");
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
        toast({ title: "Welcome", description: `Signed in as ${agentData.name}` });
      } else {
        throw new Error("User profile not found in system database.");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid email or password."
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
          <h1 className="text-2xl font-bold tracking-tight text-cyan-950">InspireHubCRM</h1>
          <p className="text-sm text-muted-foreground">Internal Management System</p>
        </div>

        <div className="bg-card border rounded-xl shadow-xl overflow-hidden border-cyan-100">
          <form onSubmit={(e) => handleLogin(e)} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@nexus.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 border-cyan-50"
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
                className="h-10 border-cyan-50"
              />
            </div>
            <Button type="submit" className="w-full h-10 mt-2 font-bold uppercase tracking-tight bg-cyan-600 hover:bg-cyan-700" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Sign In'}
            </Button>
            
            <div className="mt-4 p-3 bg-cyan-50 rounded-lg flex gap-3 text-cyan-800 text-[11px] leading-tight">
               <Info size={14} className="shrink-0 text-cyan-600" />
               <p>New staff? Use the default password <code>12345678</code> for your first sign-in to activate your account.</p>
            </div>
          </form>
          
          <div className="bg-slate-50 border-t p-4 space-y-3">
             <div className="flex items-center gap-2">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Administrative Access</span>
                <div className="h-px bg-slate-200 flex-1" />
             </div>
             <Button 
               variant="outline" 
               className="w-full h-9 text-[11px] font-bold uppercase tracking-tight gap-2 border-cyan-200 text-cyan-700 bg-white hover:bg-cyan-50"
               onClick={() => handleLogin(null, 'admin@nexus.com', '12345678')}
               disabled={loading}
             >
                <UserCheck size={14} /> Log in as Admin (Demo)
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
