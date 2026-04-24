"use client"

import React from 'react';
import { Shell } from '@/components/layout/Shell';
import { PRODUCTS, TIERS } from '@/lib/mock-data';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { TierBadge } from '@/components/ui/tier-badge';
import { 
  FileText, 
  Video, 
  HelpCircle, 
  BookOpen, 
  Download,
  ExternalLink,
  Lock
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ProductsPage() {
  const { user } = useAuthStore();
  
  const userTierRank = TIERS.find(t => t.id === user?.tier_id)?.rank_level || 1;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Product Catalog</h1>
            <p className="text-sm text-muted-foreground">Access sales materials and technical documentation.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRODUCTS.map((product) => {
            const productTierRank = TIERS.find(t => t.id === product.tier_required)?.rank_level || 1;
            const isLocked = productTierRank > userTierRank;

            return (
              <div key={product.id} className={`bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col ${isLocked ? 'opacity-75 grayscale' : ''}`}>
                <div className="p-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold truncate">{product.name}</h3>
                    <TierBadge tierId={product.tier_required} />
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
                      <p className="text-[10px] text-slate-400 mt-1">Upgrade to {TIERS.find(t => t.id === product.tier_required)?.name} to access.</p>
                    </div>
                  ) : (
                    <Tabs defaultValue="script" className="w-full">
                      <TabsList className="w-full grid grid-cols-4 h-8">
                        <TabsTrigger value="script" className="text-[10px]">Script</TabsTrigger>
                        <TabsTrigger value="docs" className="text-[10px]">Docs</TabsTrigger>
                        <TabsTrigger value="video" className="text-[10px]">Video</TabsTrigger>
                        <TabsTrigger value="faq" className="text-[10px]">FAQ</TabsTrigger>
                      </TabsList>
                      
                      <div className="mt-4 space-y-2">
                        <TabsContent value="script" className="mt-0">
                          <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border text-[10px] font-code leading-relaxed">
                            <span className="text-primary font-bold">AGENT:</span> "Hi [Name], I noticed your business is looking to scale its ERP..."
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="docs" className="mt-0 space-y-1">
                          {[
                            { name: 'Product Specs.pdf', icon: FileText },
                            { name: 'Pricing Matrix.xlsx', icon: FileText }
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
