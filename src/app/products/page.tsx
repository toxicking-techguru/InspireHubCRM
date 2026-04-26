
"use client"

import React, { useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Product, Tier } from '@/types/crm';
import { collection, query, orderBy } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Video, 
  HelpCircle, 
  Download,
  Lock,
  Loader2,
  FileCode,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ProductsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();

  const productsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'products'), orderBy('name')) : null
  , [firestore]);
  
  const { data: products, loading: productsLoading } = useCollection<Product>(productsQuery as any);

  const tiersQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'tiers'), orderBy('rankLevel')) : null
  , [firestore]);
  
  const { data: tiers } = useCollection<Tier>(tiersQuery as any);

  const userTier = tiers?.find(t => t.id === user?.tierId);
  const userTierRank = userTier?.rankLevel || 0;

  if (productsLoading) {
    return (
      <Shell>
        <div className="py-20 flex flex-col items-center">
          <Loader2 className="animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading catalog...</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-bold">Product Resource Center</h1>
          <p className="text-[13px] text-muted-foreground">Access marketing collateral and sales aids approved for your tier.</p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {products?.map((product) => {
            const productTier = tiers?.find(t => t.id === product.tierRequired);
            const productTierRank = productTier?.rankLevel || 0;
            const isLocked = productTierRank > userTierRank;
            const commission = productTier?.commissionPct || 5;

            return (
              <div 
                key={product.id} 
                className={cn(
                  "bg-card border-[0.5px] rounded-lg shadow-sm flex flex-col relative group transition-all",
                  isLocked && "opacity-75"
                )}
              >
                {/* Locked Overlay */}
                {isLocked && (
                  <div className="absolute inset-0 z-10 bg-slate-100/40 dark:bg-slate-900/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center rounded-lg">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-md mb-2">
                      <Lock size={18} className="text-slate-400" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Locked Content</p>
                    <p className="text-[10px] text-slate-500 mt-1">Available at {productTier?.name || 'Higher'} Tier</p>
                  </div>
                )}

                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-[15px] font-bold leading-tight text-slate-900 dark:text-slate-100">{product.name}</h3>
                    <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 text-[10px] px-1.5 h-4 border-none font-bold">
                      {commission}% Comm
                    </Badge>
                  </div>
                  
                  <p className="text-[12px] text-slate-500 line-clamp-2 min-h-[32px] mb-4">
                    {product.description}
                  </p>

                  <div className={cn("flex-1", isLocked && "pointer-events-none")}>
                    <Tabs defaultValue="script" className="w-full">
                      <TabsList className="w-full grid grid-cols-5 h-8 bg-slate-50 dark:bg-slate-900 border p-0.5 rounded-md">
                        <TabsTrigger value="script" className="text-[9px] px-0">Script</TabsTrigger>
                        <TabsTrigger value="docs" className="text-[9px] px-0">Docs</TabsTrigger>
                        <TabsTrigger value="video" className="text-[9px] px-0">Videos</TabsTrigger>
                        <TabsTrigger value="manual" className="text-[9px] px-0">Manuals</TabsTrigger>
                        <TabsTrigger value="faq" className="text-[9px] px-0">FAQs</TabsTrigger>
                      </TabsList>
                      
                      <div className="mt-3">
                        <TabsContent value="script" className="m-0">
                          <ResourceList items={product.resources?.scripts || []} type="script" />
                        </TabsContent>
                        <TabsContent value="docs" className="m-0">
                          <ResourceList items={product.resources?.docs || []} type="docs" />
                        </TabsContent>
                        <TabsContent value="video" className="m-0">
                          <ResourceList items={product.resources?.videos || []} type="video" />
                        </TabsContent>
                        <TabsContent value="manual" className="m-0">
                          <ResourceList items={product.resources?.manuals || []} type="manual" />
                        </TabsContent>
                        <TabsContent value="faq" className="m-0">
                          <div className="space-y-2 py-1">
                            {(product.resources?.faqs || []).map((faq, i) => (
                              <div key={i} className="border-l-2 border-indigo-200 pl-2">
                                <p className="text-[10px] font-bold text-slate-700">{faq.name}</p>
                                <p className="text-[10px] text-slate-500">{faq.url}</p>
                              </div>
                            ))}
                            {(!product.resources?.faqs || product.resources.faqs.length === 0) && (
                              <p className="text-[10px] text-slate-400 italic">No FAQs yet</p>
                            )}
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

function ResourceList({ items, type }: { items: any[], type: string }) {
  if (!items || items.length === 0) {
    return <p className="text-[10px] text-slate-400 italic py-2">No {type} available</p>;
  }

  return (
    <div className="space-y-1">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between h-8 px-2 rounded-md hover:bg-slate-50 transition-colors group/item">
          <div className="flex items-center gap-2 overflow-hidden">
            {type === 'video' ? <Video size={12} className="text-red-500" /> : type === 'manual' ? <BookOpen size={12} className="text-emerald-500" /> : <FileText size={12} className="text-indigo-500" />}
            <span className="text-[11px] truncate text-slate-600 font-medium">{item.name}</span>
          </div>
          <a href={item.url} target="_blank" className="shrink-0 p-1 hover:bg-indigo-100 rounded text-slate-400 hover:text-indigo-600">
            <Download size={12} />
          </a>
        </div>
      ))}
    </div>
  );
}
