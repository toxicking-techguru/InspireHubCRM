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
  FileCode
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
          <h1 className="text-lg font-bold">Product Catalog</h1>
          <p className="text-[13px] text-muted-foreground">Approved sales materials and technical documentation based on your tier.</p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {products?.map((product) => {
            const productTier = tiers?.find(t => t.id === product.tierRequired);
            const productTierRank = productTier?.rankLevel || 0;
            const isLocked = productTierRank > userTierRank;
            
            // Mocking commission based on tier if not product-specific
            const commission = productTier?.commissionPct || 0;

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

                <div className="p-[14px] flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-[14px] font-medium leading-tight text-slate-900 dark:text-slate-100">{product.name}</h3>
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 text-[10px] px-1.5 h-4 border-none shrink-0 font-bold">
                      {commission}% Commission
                    </Badge>
                  </div>
                  
                  <p className="text-[12px] text-slate-500 line-clamp-2 min-h-[32px] mb-4">
                    {product.description}
                  </p>

                  <div className={cn("flex-1", isLocked && "pointer-events-none")}>
                    <Tabs defaultValue="script" className="w-full">
                      <TabsList className="w-full grid grid-cols-4 h-8 bg-slate-50 dark:bg-slate-900 border p-0.5 rounded-md">
                        <TabsTrigger value="script" className="text-[10px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none data-[state=active]:border-none">Script</TabsTrigger>
                        <TabsTrigger value="docs" className="text-[10px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600">Docs</TabsTrigger>
                        <TabsTrigger value="video" className="text-[10px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600">Videos</TabsTrigger>
                        <TabsTrigger value="faq" className="text-[10px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600">FAQs</TabsTrigger>
                      </TabsList>
                      
                      <div className="mt-3">
                        <TabsContent value="script" className="m-0">
                          <ResourceList 
                            items={[{ name: 'Sales_Pitch_V2.txt', type: 'txt' }]} 
                            type="script"
                          />
                        </TabsContent>
                        
                        <TabsContent value="docs" className="m-0">
                          <ResourceList 
                            items={[
                              { name: 'Feature_Guide.pdf', type: 'pdf' },
                              { name: 'Pricing_Matrix_Q2.xlsx', type: 'xlsx' }
                            ]} 
                            type="docs"
                          />
                        </TabsContent>

                        <TabsContent value="video" className="m-0">
                          <ResourceList 
                            items={[{ name: 'Product_Demo_Full.mp4', type: 'mp4' }]} 
                            type="video"
                          />
                        </TabsContent>

                        <TabsContent value="faq" className="m-0">
                          <div className="space-y-2 py-1">
                            <div className="border-l-2 border-indigo-200 pl-2">
                              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Q: Deployment timeline?</p>
                              <p className="text-[10px] text-slate-500">A: Standard setup takes 14 business days.</p>
                            </div>
                            <div className="border-l-2 border-indigo-200 pl-2">
                              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Q: Support levels?</p>
                              <p className="text-[10px] text-slate-500">A: 24/7 technical assistance included.</p>
                            </div>
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

function ResourceList({ items, type }: { items: { name: string, type: string }[], type: string }) {
  if (items.length === 0) {
    return <p className="text-[10px] text-slate-400 italic py-2">No {type} added yet</p>;
  }

  return (
    <div className="space-y-0.5">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between h-8 px-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group/item">
          <div className="flex items-center gap-2 overflow-hidden">
            {type === 'script' ? <FileCode size={12} className="text-indigo-500 shrink-0" /> : <FileText size={12} className="text-indigo-500 shrink-0" />}
            <span className="text-[11px] truncate text-slate-600 dark:text-slate-400 font-medium">{item.name}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className="text-[9px] px-1 h-3.5 font-bold uppercase text-slate-400 border-slate-200">
              {item.type}
            </Badge>
            <Download size={12} className="text-slate-300 hover:text-indigo-600 cursor-pointer transition-colors" />
          </div>
        </div>
      ))}
    </div>
  );
}
