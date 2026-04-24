"use client"

import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('agent@nexus.com');
  const [password, setPassword] = useState('password');
  const { login } = useAuthStore();
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(email);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground mb-4 shadow-lg">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">NexusCRM</h1>
          <p className="text-sm text-muted-foreground">Enter your credentials to access your leads</p>
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
                <a href="#" className="text-[11px] text-primary hover:underline">Forgot password?</a>
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
            <Button type="submit" className="w-full h-10 mt-2">
              Sign In
            </Button>
          </form>
          
          <div className="bg-slate-50 dark:bg-slate-900 border-t p-4 text-center">
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold mb-2">Demo Credentials</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button 
                onClick={() => setEmail('agent@nexus.com')}
                className="text-[10px] px-2 py-1 bg-white dark:bg-slate-800 border rounded shadow-sm hover:bg-slate-100"
              >
                Agent Login
              </button>
              <button 
                onClick={() => setEmail('manager@nexus.com')}
                className="text-[10px] px-2 py-1 bg-white dark:bg-slate-800 border rounded shadow-sm hover:bg-slate-100"
              >
                Manager Login
              </button>
              <button 
                onClick={() => setEmail('admin@nexus.com')}
                className="text-[10px] px-2 py-1 bg-white dark:bg-slate-800 border rounded shadow-sm hover:bg-slate-100"
              >
                Admin Login
              </button>
            </div>
          </div>
        </div>

        <p className="text-center mt-8 text-[11px] text-muted-foreground">
          &copy; 2024 NexusCRM System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
