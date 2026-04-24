
"use client"

import React, { useState, useMemo } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, setDoc, addDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Product, Tier } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Plus, 
  Search, 
  Video, 
  FileText, 
  FileCode, 
  HelpCircle, 
  Download, 
  Trash2, 
  Save, 
  Loader2,
  ChevronRight,
  ExternalLink,
  PlayCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function AdminProductsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Data Fetching
  const productsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'products'), orderBy('name')) : null, [firestore]);
  const { data: products, loading } = useCollection<Product>(productsQuery as any);

  const tiersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'tiers'), orderBy('rankLevel')) : null, [firestore]);
  const { data: tiers } = useCollection<Tier>(tiersQuery as any);

  const selectedProduct = products?.find(p => p.id === selectedProductId);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const handleAddProduct = async () => {
    if (!firestore) return;
    const newId = `prod_${Date.now()}`;
    const newProduct = {
      name: 'New Product',
      description: 'Enter description...',
      tierRequired: 't1',
      status: 'active',
      resources: { scripts: [], docs: [], videos: [], faqs: [] },
      commissionStructure: { base: 5 }
    };
    await setDoc(doc(firestore, 'products', newId), newProduct);
    setSelectedProductId(newId);
    toast({ title: "Product Created", description: "Start adding resources and configuring access." });
  };

  const handleUpdateProduct = async (data: Partial<Product>) => {
    if (!firestore || !selectedProductId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, 'products', selectedProductId), data);
      toast({ title: "Changes Saved" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save Failed", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || user.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="flex h-[calc(100vh-140px)] border rounded-md overflow-hidden bg-card">
        {/* Left Panel: List */}
        <div className="w-[280px] border-r flex flex-col bg-slate-50/30">
           <div className="p-3 border-b space-y-3">
              <div className="flex items-center justify-between">
                 <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">Catalog</h2>
                 <Button size="icon" variant="ghost" className="h-7 w-7 text-violet-600 hover:bg-violet-50" onClick={handleAddProduct}>
                    <Plus size={16} />
                 </Button>
              </div>
              <div className="relative">
                 <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                 <Input 
                   placeholder="Search products..." 
                   className="pl-8 h-8 text-[12px] bg-white" 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
           </div>
           <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></div>
              ) : filteredProducts.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => setSelectedProductId(p.id)}
                  className={cn(
                    "p-3 border-b cursor-pointer transition-colors hover:bg-violet-50/50 flex flex-col gap-1.5",
                    selectedProductId === p.id ? "bg-violet-50 border-r-2 border-r-violet-600" : ""
                  )}
                >
                   <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold truncate pr-2">{p.name}</span>
                      <Switch className="scale-75 data-[state=checked]:bg-violet-600" checked={(p as any).status === 'active'} />
                   </div>
                   <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-violet-100 bg-white text-violet-600 font-bold uppercase tracking-tight">
                         {tiers?.find(t => t.id === p.tierRequired)?.name || 'Base'}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-medium">Updated 2d ago</span>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Right Panel: Detail */}
        <div className="flex-1 flex flex-col overflow-hidden">
           {selectedProduct ? (
             <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                   <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                         <Input 
                           className="text-[18px] font-bold h-10 border-none px-0 focus-visible:ring-0 shadow-none bg-transparent" 
                           defaultValue={selectedProduct.name}
                           onBlur={(e) => handleUpdateProduct({ name: e.target.value })}
                         />
                         <Textarea 
                           className="text-[13px] text-slate-600 border-none px-0 focus-visible:ring-0 shadow-none bg-transparent min-h-[60px] resize-none"
                           defaultValue={selectedProduct.description}
                           placeholder="Enter product description..."
                           onBlur={(e) => handleUpdateProduct({ description: e.target.value })}
                         />
                      </div>
                      <Button className="bg-violet-600 hover:bg-violet-700 h-9 px-6 gap-2 text-[12px] font-bold" onClick={() => handleUpdateProduct({})} disabled={isSaving}>
                         {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save Product
                      </Button>
                   </div>

                   <div className="grid grid-cols-2 gap-8 pt-4 border-t">
                      <div className="space-y-4">
                         <h3 className="text-[12px] font-bold text-violet-700 uppercase tracking-widest">Configuration</h3>
                         <div className="space-y-3">
                            <div className="space-y-1.5">
                               <Label className="text-[11px] font-bold text-slate-400 uppercase">Primary Tier Access</Label>
                               <select 
                                 className="w-full h-9 border rounded-md px-3 text-[13px] bg-white"
                                 value={selectedProduct.tierRequired}
                                 onChange={(e) => handleUpdateProduct({ tierRequired: e.target.value })}
                               >
                                  {tiers?.map(t => <option key={t.id} value={t.id}>{t.name} (Rank {t.rankLevel})</option>)}
                               </select>
                            </div>
                            <div className="space-y-1.5">
                               <Label className="text-[11px] font-bold text-slate-400 uppercase">Commission Structure</Label>
                               <div className="p-3 bg-slate-50 rounded border font-mono text-[11px]">
                                  {JSON.stringify(selectedProduct.commissionStructure || {}, null, 2)}
                                  <Button variant="ghost" size="sm" className="h-6 mt-2 text-[10px] w-full border border-dashed text-violet-600">Edit JSON</Button>
                               </div>
                            </div>
                         </div>
                      </div>
                      <div className="space-y-4">
                         <h3 className="text-[12px] font-bold text-violet-700 uppercase tracking-widest">Tier Availability</h3>
                         <div className="space-y-2">
                            {tiers?.map(t => (
                              <div key={t.id} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                                 <Switch className="scale-75 data-[state=checked]:bg-violet-600" defaultChecked />
                                 <span className="text-[13px] font-medium">{t.name} Tier</span>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>

                   <div className="pt-6 border-t">
                      <Tabs defaultValue="scripts" className="w-full">
                         <TabsList className="bg-slate-100 p-0.5 rounded-md h-9 gap-1">
                            <TabsTrigger value="scripts" className="text-[12px] px-4 gap-2 data-[state=active]:text-violet-700"><FileCode size={14} /> Scripts</TabsTrigger>
                            <TabsTrigger value="docs" className="text-[12px] px-4 gap-2 data-[state=active]:text-violet-700"><FileText size={14} /> Docs</TabsTrigger>
                            <TabsTrigger value="videos" className="text-[12px] px-4 gap-2 data-[state=active]:text-violet-700"><Video size={14} /> Videos</TabsTrigger>
                            <TabsTrigger value="faqs" className="text-[12px] px-4 gap-2 data-[state=active]:text-violet-700"><HelpCircle size={14} /> FAQs</TabsTrigger>
                         </TabsList>
                         
                         <div className="mt-4">
                            <TabsContent value="scripts" className="m-0 space-y-4">
                               <ResourceManager type="scripts" productId={selectedProductId} items={(selectedProduct as any).resources?.scripts || []} />
                            </TabsContent>
                            <TabsContent value="docs" className="m-0 space-y-4">
                               <ResourceManager type="docs" productId={selectedProductId} items={(selectedProduct as any).resources?.docs || []} />
                            </TabsContent>
                            <TabsContent value="videos" className="m-0 space-y-4">
                               <ResourceManager type="videos" productId={selectedProductId} items={(selectedProduct as any).resources?.videos || []} />
                            </TabsContent>
                            <TabsContent value="faqs" className="m-0 space-y-4">
                               <ResourceManager type="faqs" productId={selectedProductId} items={(selectedProduct as any).resources?.faqs || []} />
                            </TabsContent>
                         </div>
                      </Tabs>
                   </div>
                </div>
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <Package size={48} className="mb-2 opacity-10" />
                <p className="text-[14px] font-medium">Select a product to manage resources and access.</p>
             </div>
           )}
        </div>
      </div>
    </Shell>
  );
}

function ResourceManager({ type, items, productId }: { type: string, items: any[], productId: string }) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '' });
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !formData.name || !formData.url) return;
    try {
      const productRef = doc(firestore, 'products', productId);
      const updatedItems = [...items, { ...formData, id: Date.now().toString(), dateAdded: new Date().toISOString() }];
      await updateDoc(productRef, { [`resources.${type}`]: updatedItems });
      setFormData({ name: '', url: '' });
      setIsAdding(false);
      toast({ title: "Resource Added" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    const updatedItems = items.filter(i => i.id !== id);
    await updateDoc(doc(firestore, 'products', productId), { [`resources.${type}`]: updatedItems });
    toast({ title: "Resource Deleted" });
  };

  return (
    <div className="space-y-4">
       <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">{type} Repository</h4>
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5 font-bold uppercase text-violet-600 border-violet-200" onClick={() => setIsAdding(!isAdding)}>
             {isAdding ? 'Cancel' : `+ Add ${type.slice(0, -1)}`}
          </Button>
       </div>

       {isAdding && (
         <form onSubmit={handleAdd} className="p-3 bg-violet-50/50 border border-violet-100 rounded-md grid grid-cols-4 gap-2 animate-in fade-in slide-in-from-top-1">
            <div className="col-span-1">
               <Input required placeholder="Title..." className="h-8 text-[12px]" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="col-span-2">
               <Input required placeholder="URL or File Path..." className="h-8 text-[12px]" value={formData.url} onChange={(e) => setFormData({...formData, url: e.target.value})} />
            </div>
            <Button type="submit" className="h-8 bg-violet-600 text-[11px] font-bold uppercase tracking-tight">Save {type.slice(0,-1)}</Button>
         </form>
       )}

       <div className="border rounded-md overflow-hidden shadow-sm">
          <table className="w-full text-[13px]">
             <thead>
                <tr className="bg-slate-50/80 border-b h-8">
                   <th className="px-3 text-left w-10"></th>
                   <th className="text-left">Resource Name</th>
                   <th className="text-left w-[120px]">Date Added</th>
                   <th className="text-right px-3 w-[100px]">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y bg-white">
                {items.map(item => (
                  <tr key={item.id} className="h-9 hover:bg-slate-50 group">
                     <td className="px-3">
                        {type === 'videos' ? <PlayCircle size={14} className="text-red-500" /> : type === 'docs' ? <FileText size={14} className="text-blue-500" /> : <FileCode size={14} className="text-indigo-500" />}
                     </td>
                     <td className="font-medium truncate max-w-[300px]">
                        <div className="flex flex-col">
                           <span className="text-slate-800">{item.name}</span>
                           <span className="text-[10px] text-slate-400 font-mono truncate">{item.url}</span>
                        </div>
                     </td>
                     <td className="text-slate-400 text-[11px]">
                        {item.dateAdded ? new Date(item.dateAdded).toLocaleDateString() : '--'}
                     </td>
                     <td className="px-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <a href={item.url} target="_blank" className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-violet-600">
                              <ExternalLink size={14} />
                           </a>
                           <TooltipProvider>
                              <Tooltip>
                                 <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-red-500" onClick={() => handleDelete(item.id)}>
                                       <Trash2 size={14} />
                                    </Button>
                                 </TooltipTrigger>
                                 <TooltipContent className="text-[11px] bg-red-600 text-white border-none">Delete this resource?</TooltipContent>
                              </Tooltip>
                           </TooltipProvider>
                        </div>
                     </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr className="h-20 text-center"><td colSpan={4} className="text-slate-400 italic text-[12px]">No {type} uploaded for this product yet.</td></tr>
                )}
             </tbody>
          </table>
       </div>
    </div>
  );
}

