"use client"

import React from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Product, Tier } from '@/types/crm';
import { collection, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { TierBadge } from '@/components/ui/tier-badge';
import { 
  FileText, 
  Video, 
  HelpCircle, 
  Download,
  ExternalLink,
  Lock,
  Loader2
} from 'lucide-react';
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

  const userTierRank = tiers?.find(t => t.id === user?.tierId)?.rankLevel || 1;

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
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Product Catalog</h1>
          <p className="text-sm text-muted-foreground">Access approved sales materials and technical documentation.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products?.map((product) => {
            const productTier = tiers?.find(t => t.id === product.tierRequired);
            const productTierRank = productTier?.rankLevel || 1;
            const isLocked = productTierRank > userTierRank;

            return (
              <div key={product.id} className={`bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col ${isLocked ? 'opacity-75 grayscale' : ''}`}>
                <div className="p-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold truncate">{product.name}</h3>
                    <TierBadge tierId={product.tierRequired} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 h-8">
                    {product.description}
                  </p>
                </div>

                <div className="flex-1 p-4">
                  {isLocked ? (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                      <Lock size={24} className="text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Locked</p>
                      <p className="text-[10px] text-slate-400 mt-1">Upgrade to {productTier?.name || 'Higher Tier'} to access.</p>
                    </div>
                  ) : (
                    <Tabs defaultValue="script" className="w-full">
                      <TabsList className="w-full grid grid-cols-4 h-8 bg-slate-100/50">
                        <TabsTrigger value="script" className="text-[10px]">Script</TabsTrigger>
                        <TabsTrigger value="docs" className="text-[10px]">Docs</TabsTrigger>
                        <TabsTrigger value="video" className="text-[10px]">Video</TabsTrigger>
                        <TabsTrigger value="faq" className="text-[10px]">FAQ</TabsTrigger>
                      </TabsList>
                      
                      <div className="mt-4 space-y-2">
                        <TabsContent value="script" className="mt-0">
                          <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border text-[10px] font-code leading-relaxed">
                            <span className="text-primary font-bold">AGENT:</span> "Hi, I'm reaching out from Nexus regarding your scaling needs..."
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="docs" className="mt-0 space-y-1">
                          {[
                            { name: 'Specifications.pdf', icon: FileText },
                            { name: 'Pricing_Matrix.xlsx', icon: FileText }
                          ].map((doc, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <doc.icon size={12} className="text-primary shrink-0" />
                                <span className="text-[10px] truncate">{doc.name}</span>
                              </div>
                              <Download size={12} className="text-muted-foreground cursor-pointer hover:text-primary shrink-0" />
                            </div>
                          ))}
                        </TabsContent>

                        <TabsContent value="video" className="mt-0">
                          <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded flex items-center justify-center">
                            <Video size={20} className="text-slate-400" />
                          </div>
                        </TabsContent>

                        <TabsContent value="faq" className="mt-0 space-y-2">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold">Q: How long is deployment?</p>
                            <p className="text-[10px] text-muted-foreground">A: Typical enterprise setup is 2-4 weeks.</p>
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  )}
                </div>

                {!isLocked && (
                  <div className="p-3 border-t bg-slate-50/30">
                    <Button variant="outline" size="sm" className="w-full h-8 text-[11px] gap-2">
                      <ExternalLink size={12} /> External Sales Portal
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
