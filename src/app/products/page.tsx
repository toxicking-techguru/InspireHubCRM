
"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Product, Tier } from '@/types/crm';
import { collection, query, orderBy, doc, setDoc, addDoc, updateDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Video, 
  HelpCircle, 
  Download,
  Lock,
  Loader2,
  FileCode,
  BookOpen,
  Plus,
  Package,
  Settings2,
  Save,
  Trash2,
  ExternalLink,
  PlayCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function ProductsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    tierRequired: 't1'
  });

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

  const handleAddProduct = async () => {
    if (!firestore || !user || !newProduct.name) return;
    setIsSaving(true);
    try {
      const id = `prod_agent_${Date.now()}`;
      const productData = {
        ...newProduct,
        id,
        status: 'active',
        resources: { scripts: [], docs: [], videos: [], manuals: [], faqs: [] },
        commissionStructure: { base: 5 },
        createdBy: user.name,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(firestore, 'products', id), productData);
      
      await addDoc(collection(firestore, 'audit_logs'), {
        timestamp: new Date().toISOString(),
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        actionType: 'AGENT_CREATE_PRODUCT',
        entityType: 'Product',
        entityId: id,
        remark: `Agent added new product to repository: ${newProduct.name}`,
        newValue: productData
      });

      toast({ title: "Product Registered", description: "The catalog has been updated successfully." });
      setIsAddModalOpen(false);
      setNewProduct({ name: '', description: '', tierRequired: 't1' });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Registration Failed", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (productsLoading) {
    return (
      <Shell>
        <div className="py-20 flex flex-col items-center">
          <Loader2 className="animate-spin text-primary mb-2" size={32} />
          <p className="text-sm text-muted-foreground">Loading catalog...</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Product Resource Center</h1>
            <p className="text-[13px] text-muted-foreground">Access marketing collateral and sales aids approved for your tier.</p>
          </div>
          <Button size="sm" className="h-9 gap-2 bg-primary hover:bg-primary/90 font-bold uppercase text-[11px]" onClick={() => setIsAddModalOpen(true)}>
             <Plus size={16} /> New Product
          </Button>
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
                  "bg-card border-[0.5px] rounded-lg shadow-sm flex flex-col relative group transition-all h-[340px]",
                  isLocked && "opacity-75"
                )}
              >
                {isLocked && (
                  <div className="absolute inset-0 z-10 bg-slate-100/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center rounded-lg">
                    <div className="bg-white p-2 rounded-full shadow-md mb-2">
                      <Lock size={18} className="text-slate-400" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Locked Content</p>
                    <p className="text-[10px] text-slate-500 mt-1">Available at {productTier?.name || 'Higher'} Tier</p>
                  </div>
                )}

                <div className="p-4 flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-start justify-between gap-2 mb-2 shrink-0">
                    <h3 className="text-[15px] font-bold leading-tight text-slate-900 truncate">{product.name}</h3>
                    <Badge className="bg-primary/5 text-primary text-[10px] px-1.5 h-4 border-none font-bold">
                      {commission}% Comm
                    </Badge>
                  </div>
                  
                  <p className="text-[12px] text-slate-500 line-clamp-2 min-h-[32px] mb-4 shrink-0">
                    {product.description}
                  </p>

                  <div className={cn("flex-1 min-h-0", isLocked && "pointer-events-none")}>
                    <Tabs defaultValue="script" className="h-full flex flex-col">
                      <TabsList className="w-full grid grid-cols-5 h-8 bg-slate-100 border p-0.5 rounded-md shrink-0">
                        <TabsTrigger value="script" className="text-[9px] px-0 uppercase font-bold">Script</TabsTrigger>
                        <TabsTrigger value="docs" className="text-[9px] px-0 uppercase font-bold">Docs</TabsTrigger>
                        <TabsTrigger value="video" className="text-[9px] px-0 uppercase font-bold">Video</TabsTrigger>
                        <TabsTrigger value="manual" className="text-[9px] px-0 uppercase font-bold">Manual</TabsTrigger>
                        <TabsTrigger value="faq" className="text-[9px] px-0 uppercase font-bold">FAQ</TabsTrigger>
                      </TabsList>
                      
                      <div className="mt-3 flex-1 overflow-y-auto no-scrollbar">
                        <TabsContent value="script" className="m-0">
                          <ResourceList items={product.resources?.scripts || []} type="script" productId={product.id} canAdd />
                        </TabsContent>
                        <TabsContent value="docs" className="m-0">
                          <ResourceList items={product.resources?.docs || []} type="docs" productId={product.id} canAdd />
                        </TabsContent>
                        <TabsContent value="video" className="m-0">
                          <ResourceList items={product.resources?.videos || []} type="video" productId={product.id} canAdd />
                        </TabsContent>
                        <TabsContent value="manual" className="m-0">
                          <ResourceList items={product.resources?.manuals || []} type="manual" productId={product.id} canAdd />
                        </TabsContent>
                        <TabsContent value="faq" className="m-0">
                          <div className="space-y-2 py-1">
                            {(product.resources?.faqs || []).map((faq, i) => (
                              <div key={i} className="border-l-2 border-primary/20 pl-2">
                                <p className="text-[10px] font-bold text-slate-700">{faq.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{faq.url}</p>
                              </div>
                            ))}
                            {(!product.resources?.faqs || product.resources.faqs.length === 0) && (
                              <p className="text-[10px] text-slate-400 italic">No community FAQs available.</p>
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

      {/* Add Product Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Register New Product</DialogTitle>
            <DialogDescription className="text-xs">Field registration allows other agents to access community resources.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase text-slate-400">Product Title</Label>
                <Input placeholder="e.g. Specialized Enterprise Cloud" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
             </div>
             <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase text-slate-400">Core Value Proposition</Label>
                <Textarea placeholder="Explain what this product solves..." className="min-h-[80px]" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
             </div>
             <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase text-slate-400">Default Access Tier</Label>
                <Select value={newProduct.tierRequired} onValueChange={v => setNewProduct({...newProduct, tierRequired: v})}>
                   <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                   <SelectContent>
                      {tiers?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                   </SelectContent>
                </Select>
             </div>
          </div>
          <DialogFooter>
             <Button variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
             <Button size="sm" className="bg-primary hover:bg-primary/90 font-bold uppercase text-[11px] px-8" disabled={isSaving || !newProduct.name} onClick={handleAddProduct}>
                {isSaving ? <Loader2 className="animate-spin" size={14} /> : 'Confirm Registration'}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

function ResourceList({ items, type, productId, canAdd }: { items: any[], type: string, productId: string, canAdd?: boolean }) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '' });
  const [saving, setSaving] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleAdd = async () => {
    if (!firestore || !formData.name || !formData.url) return;
    setSaving(true);
    try {
      const productRef = doc(firestore, 'products', productId);
      const newItem = { ...formData, id: Date.now().toString(), dateAdded: new Date().toISOString() };
      const updatedItems = [...items, newItem];
      const fieldPath = type === 'script' ? 'scripts' : type === 'docs' ? 'docs' : type === 'video' ? 'videos' : type === 'manual' ? 'manuals' : 'faqs';
      await updateDoc(productRef, { [`resources.${fieldPath}`]: updatedItems });
      setFormData({ name: '', url: '' });
      setIsAdding(false);
      toast({ title: "Resource Contributed" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between h-8 px-2 rounded-md hover:bg-slate-50 transition-colors group/item">
          <div className="flex items-center gap-2 overflow-hidden">
            {type === 'video' ? <PlayCircle size={12} className="text-red-500" /> : type === 'manual' ? <BookOpen size={12} className="text-emerald-500" /> : <FileText size={12} className="text-primary-500" />}
            <span className="text-[11px] truncate text-slate-600 font-medium">{item.name}</span>
          </div>
          <a href={item.url} target="_blank" className="shrink-0 p-1 hover:bg-primary/10 rounded text-slate-400 hover:text-primary transition-colors">
            <ExternalLink size={12} />
          </a>
        </div>
      ))}
      
      {isAdding ? (
        <div className="p-2 border rounded-md bg-slate-50 space-y-2 mt-2">
           <Input placeholder="Name..." className="h-7 text-[10px]" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
           <Input placeholder="URL..." className="h-7 text-[10px]" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} />
           <div className="flex gap-1">
              <Button size="sm" className="h-6 text-[9px] flex-1 bg-primary" disabled={saving || !formData.name} onClick={handleAdd}>
                 {saving ? <Loader2 size={10} className="animate-spin" /> : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-[9px]" onClick={() => setIsAdding(false)}>X</Button>
           </div>
        </div>
      ) : canAdd && (
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full h-8 mt-1 border border-dashed rounded-md text-[10px] font-bold text-slate-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all"
        >
           + CONTRIBUTE RESOURCE
        </button>
      )}

      {items.length === 0 && !isAdding && (
        <p className="text-[10px] text-slate-400 italic py-2">No community {type} yet.</p>
      )}
    </div>
  );
}
