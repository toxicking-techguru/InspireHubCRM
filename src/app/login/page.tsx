
"use client"

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, Info } from 'lucide-react';
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
    if (e) e.preventDefault();
    if (!auth || !db) return;

    const targetEmail = email.trim().toLowerCase();
    const targetPass = password;

    if (!targetEmail || !targetPass) return;

    setLoading(true);

    try {
      let userCredential;
      try {
        // 1. Attempt standard login
        userCredential = await signInWithEmailAndPassword(auth, targetEmail, targetPass);
      } catch (authErr: any) {
        // 2. If user doesn't exist in Auth, check if they are pre-authorized in Firestore
        if (
          authErr.code === 'auth/user-not-found' || 
          authErr.code === 'auth/invalid-credential' || 
          authErr.code === 'auth/invalid-email'
        ) {
          const q = query(collection(db, 'agents'), where('email', '==', targetEmail));
          const snap = await getDocs(q);
          
          if (!snap.empty && targetPass === 'password123') {
            // First time login with activation password
            userCredential = await createUserWithEmailAndPassword(auth, targetEmail, targetPass);
            const seededData = snap.docs[0].data();
            const oldId = snap.docs[0].id;
            
            // Migrate Firestore record to match Auth UID
            await setDoc(doc(db, 'agents', userCredential.user.uid), {
              ...seededData,
              email: targetEmail
            });

            // Delete old record if it was a custom ID
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
            throw new Error("Access denied. Please contact your administrator for an invitation.");
          }
        } else {
          throw authErr;
        }
      }

      // 3. Sync Session
      let userDoc = await getDoc(doc(db, 'agents', userCredential.user.uid));

      // 4. Late Migration Check: If UID record is missing but an email-based record exists
      // This handles users who were created in Auth but whose Firestore profile wasn't keyed to UID yet
      if (!userDoc.exists()) {
        const q = query(collection(db, 'agents'), where('email', '==', targetEmail));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const oldDoc = snap.docs[0];
          const oldData = oldDoc.data();
          const oldId = oldDoc.id;
          
          // Link pre-authorized profile to the new Auth UID
          await setDoc(doc(db, 'agents', userCredential.user.uid), {
            ...oldData,
            email: targetEmail
          });

          if (oldId !== userCredential.user.uid) {
            await deleteDoc(doc(db, 'agents', oldId));
          }
          
          // Migrate matching wallet if applicable
          if (oldData.role === 'Agent') {
            const wSnap = await getDoc(doc(db, 'wallets', oldId));
            if (wSnap.exists()) {
              await setDoc(doc(db, 'wallets', userCredential.user.uid), wSnap.data());
              await deleteDoc(doc(db, 'wallets', oldId));
            }
          }

          // Re-fetch the newly linked doc
          userDoc = await getDoc(doc(db, 'agents', userCredential.user.uid));
        }
      }

      if (userDoc.exists()) {
        const agentData = { id: userDoc.id, ...userDoc.data() } as any;
        setGlobalAuth(agentData);
        toast({ title: "Welcome", description: `Signed in as ${agentData.name}` });
      } else {
        throw new Error("Profile synchronization failed. Contact support.");
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
          <h1 className="text-2xl font-bold tracking-tight text-cyan-950">InspireHubCRM</h1>
          <p className="text-sm text-muted-foreground">Internal Management System</p>
        </div>

        <div className="bg-card border rounded-xl shadow-xl overflow-hidden border-cyan-100">
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@inspirehub.com" 
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
               <p>New staff? Use your activation password (password123) for your first sign-in to create your account.</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
