
"use client"

import React, { useState, useMemo, useRef } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, setDoc, deleteDoc, addDoc, writeBatch } from 'firebase/firestore';
import { Product, Tier } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Package, 
  Plus, 
  Search, 
  Video, 
  FileText, 
  FileCode, 
  HelpCircle, 
  Trash2, 
  Save, 
  Loader2, 
  ExternalLink, 
  PlayCircle, 
  BookOpen, 
  Settings2, 
  ChevronLeft,
  Upload,
  FileUp,
  CheckSquare,
  Square,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import * as XLSX from 'xlsx';

export default function AdminProductsPage() {
  const { user } = useAuthStore();
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Bulk Deletion State
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

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
    if (!firestore || !user) return;
    const newId = `prod_${Date.now()}`;
    const newProduct = {
      name: 'New Product',
      description: 'Enter description...',
      tierRequired: 't1',
      status: 'active',
      resources: { scripts: [], docs: [], videos: [], manuals: [], faqs: [] },
      commissionStructure: { base: 5 }
    };
    await setDoc(doc(firestore, 'products', newId), newProduct);
    
    await addDoc(collection(firestore, 'audit_logs'), {
      timestamp: new Date().toISOString(),
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      actionType: 'CREATE_PRODUCT',
      entityType: 'Product',
      entityId: newId,
      remark: `Added new product: ${newProduct.name}`,
      newValue: newProduct
    });

    setSelectedProductId(newId);
    toast({ title: "Product Created" });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore || !user) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) throw new Error("File is empty or missing data rows.");

        const batch = writeBatch(firestore);
        let count = 0;

        for (const row of jsonData as any[]) {
          // Normalize keys to find "cost item" and "description"
          const rowKeys = Object.keys(row);
          const nameKey = rowKeys.find(k => k.toLowerCase().trim() === 'cost item');
          const descKey = rowKeys.find(k => k.toLowerCase().trim() === 'description');

          if (nameKey) {
            const name = String(row[nameKey] || '').trim();
            const rawDesc = descKey ? String(row[descKey] || '').trim() : '';
            const description = rawDesc || name; // Fallback to name if description is empty

            if (name) {
              const newId = `prod_bulk_${Date.now()}_${count}`;
              const newProduct = {
                name,
                description,
                tierRequired: 't1',
                status: 'active',
                resources: { scripts: [], docs: [], videos: [], manuals: [], faqs: [] },
                commissionStructure: { base: 5 },
                importedAt: new Date().toISOString()
              };
              batch.set(doc(firestore, 'products', newId), newProduct);
              count++;
            }
          }
        }

        if (count === 0) throw new Error("Required column 'cost item' not found in the sheet.");

        await batch.commit();
        
        await addDoc(collection(firestore, 'audit_logs'), {
          timestamp: new Date().toISOString(),
          actorId: user.id,
          actorName: user.name,
          actorRole: user.role,
          actionType: 'BULK_IMPORT_PRODUCTS',
          entityType: 'System',
          entityId: 'catalog',
          remark: `Bulk imported ${count} products via spreadsheet.`
        });

        toast({ title: "Import Successful", description: `${count} products added to catalog.` });
        setIsImportModalOpen(false);
      } catch (err: any) {
        toast({ variant: "destructive", title: "Import Failed", description: err.message });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleUpdateProduct = async (data: Partial<Product>) => {
    if (!firestore || !selectedProductId || !user) return;
    setIsSaving(true);
    try {
      const prevValue = products?.find(p => p.id === selectedProductId);
      await updateDoc(doc(firestore, 'products', selectedProductId), data);
      
      await addDoc(collection(firestore, 'audit_logs'), {
        timestamp: new Date().toISOString(),
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        actionType: 'UPDATE_PRODUCT',
        entityType: 'Product',
        entityId: selectedProductId,
        remark: `Updated product properties for: ${prevValue?.name}`,
        oldValue: prevValue || null,
        newValue: data
      });

      toast({ title: "Changes Saved" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save Failed", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (!firestore || selectedIds.length === 0 || !user) return;
    setIsSaving(true);
    try {
      const batch = writeBatch(firestore);
      selectedIds.forEach(id => {
        batch.delete(doc(firestore, 'products', id));
      });
      
      await batch.commit();
      
      await addDoc(collection(firestore, 'audit_logs'), {
        timestamp: new Date().toISOString(),
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        actionType: 'BULK_DELETE_PRODUCTS',
        entityType: 'Product',
        entityId: 'multiple',
        remark: `Permanently removed ${selectedIds.length} products from the catalog.`
      });

      if (selectedProductId && selectedIds.includes(selectedProductId)) {
        setSelectedProductId(null);
      }
      
      setSelectedProductIds([]);
      setSelectionMode(false);
      setIsBulkDeleteDialogOpen(false);
      toast({ title: "Bulk Removal Complete", description: `${selectedIds.length} records purged.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Operation Failed", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    } else {
      setSelectedProductIds([]);
    }
  };

  if (!user || user.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-140px)] border rounded-md overflow-hidden bg-card border-primary-100 shadow-sm">
        {/* Sidebar Catalog */}
        <div className={cn(
          "w-full lg:w-[320px] border-r flex flex-col bg-slate-50/30 shrink-0",
          selectedProductId && !selectionMode && "hidden lg:flex"
        )}>
           <div className="p-3 border-b space-y-3 bg-white">
              <div className="flex items-center justify-between">
                 <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">Catalog</h2>
                 <div className="flex items-center gap-1">
                    {!selectionMode ? (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary-600 hover:bg-primary-50" onClick={() => setSelectionMode(true)}>
                           <CheckSquare size={16} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary-600 hover:bg-primary-50" onClick={() => setIsImportModalOpen(true)}>
                           <FileUp size={16} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary-600 hover:bg-primary-50" onClick={handleAddProduct}>
                           <Plus size={16} />
                        </Button>
                      </>
                    ) : (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:bg-slate-50" onClick={() => { setSelectionMode(false); setSelectedProductIds([]); }}>
                         <X size={16} />
                      </Button>
                    )}
                 </div>
              </div>

              {selectionMode ? (
                <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                   <div className="flex items-center gap-2">
                      <Checkbox 
                        id="select-all" 
                        checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0} 
                        onCheckedChange={toggleAll} 
                      />
                      <label htmlFor="select-all" className="text-[11px] font-bold text-slate-500 uppercase cursor-pointer">All ({selectedIds.length})</label>
                   </div>
                   <Button 
                    variant="destructive" 
                    size="sm" 
                    className="h-7 text-[10px] font-bold uppercase gap-1"
                    disabled={selectedIds.length === 0}
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                   >
                     <Trash2 size={12} /> Bulk Delete
                   </Button>
                </div>
              ) : (
                <div className="relative">
                   <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                   <Input 
                     placeholder="Search products..." 
                     className="pl-8 h-8 text-[12px] bg-white border-primary-50" 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
              )}
           </div>

           <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-200" /></div>
              ) : filteredProducts.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => !selectionMode && setSelectedProductId(p.id)}
                  className={cn(
                    "p-3 border-b cursor-pointer transition-colors hover:bg-primary-50/30 flex items-center gap-3 group relative",
                    selectedProductId === p.id && !selectionMode ? "bg-primary-50 border-r-2 border-r-primary-600 shadow-sm" : ""
                  )}
                >
                   {selectionMode && (
                     <Checkbox 
                        checked={selectedIds.includes(p.id)} 
                        onCheckedChange={() => toggleSelect(p.id)}
                        onClick={(e) => e.stopPropagation()}
                     />
                   )}
                   <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                         <span className="text-[13px] font-bold truncate text-slate-800">{p.name}</span>
                         <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-primary-100 text-primary-600 bg-white shrink-0">
                            {tiers?.find(t => t.id === p.tierRequired)?.name || 'Base'}
                         </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{p.description}</p>
                   </div>
                </div>
              ))}
              {!loading && filteredProducts.length === 0 && (
                 <div className="p-10 text-center text-slate-300 italic text-[11px]">No items found.</div>
              )}
           </div>
        </div>

        {/* Product Workspace */}
        <div className={cn(
          "flex-1 flex flex-col overflow-hidden bg-white",
          !selectedProductId && "hidden lg:flex"
        )}>
           {selectedProduct ? (
             <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 border-b lg:hidden flex items-center">
                  <Button variant="ghost" size="sm" className="h-8 gap-2 text-[12px]" onClick={() => setSelectedProductId(null)}>
                    <ChevronLeft size={16} /> Back to Catalog
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
                   <div className="flex flex-col lg:flex-row items-start justify-between gap-6 lg:gap-8">
                      <div className="flex-1 w-full space-y-4">
                         <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Title</Label>
                            <Input 
                              className="text-[18px] font-bold h-10 border-none px-0 focus-visible:ring-0 shadow-none bg-transparent" 
                              defaultValue={selectedProduct.name}
                              onBlur={(e) => handleUpdateProduct({ name: e.target.value })}
                            />
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description & USP</Label>
                            <Textarea 
                              className="text-[13px] text-slate-600 border-none px-0 focus-visible:ring-0 shadow-none bg-transparent min-h-[60px] resize-none"
                              defaultValue={selectedProduct.description}
                              onBlur={(e) => handleUpdateProduct({ description: e.target.value })}
                            />
                         </div>
                      </div>
                      <div className="w-full lg:w-[240px] space-y-4">
                         <div className="p-4 bg-primary-50 rounded-lg border border-primary-100 space-y-4">
                            <h3 className="text-[11px] font-bold text-primary-700 uppercase flex items-center gap-2"><Settings2 size={14} /> Access Control</h3>
                            <div className="space-y-1.5">
                               <Label className="text-[10px] font-bold text-slate-500 uppercase">Min. Tier Required</Label>
                               <Select value={selectedProduct.tierRequired} onValueChange={(v) => handleUpdateProduct({ tierRequired: v })}>
                                  <SelectTrigger className="h-8 text-[12px] bg-white border-primary-100">
                                     <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white">
                                     {tiers?.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.rankLabel})</SelectItem>)}
                                  </SelectContent>
                               </Select>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="pt-6 border-t">
                      <Tabs defaultValue="scripts" className="w-full">
                         <TabsList className="bg-slate-100 p-0.5 rounded-md h-9 gap-1 flex w-full overflow-x-auto no-scrollbar justify-start">
                            {['scripts', 'docs', 'videos', 'manuals', 'faqs'].map(tab => (
                               <TabsTrigger key={tab} value={tab} className="text-[11px] px-3 gap-2 data-[state=active]:text-primary-700 capitalize shrink-0">
                                  {tab === 'scripts' ? <FileCode size={14} /> : tab === 'docs' ? <FileText size={14} /> : tab === 'videos' ? <Video size={14} /> : tab === 'manuals' ? <BookOpen size={14} /> : <HelpCircle size={14} />}
                                  {tab}
                               </TabsTrigger>
                            ))}
                         </TabsList>
                         <div className="mt-4">
                            {['scripts', 'docs', 'videos', 'manuals', 'faqs'].map(tab => (
                               <TabsContent key={tab} value={tab} className="m-0">
                                  <ResourceManager type={tab} productId={selectedProductId!} items={selectedProduct.resources?.[tab as keyof typeof selectedProduct.resources] || []} />
                               </TabsContent>
                            ))}
                         </div>
                      </Tabs>
                   </div>
                </div>
                <div className="p-4 border-t bg-slate-50/50 flex justify-end">
                    <Button size="sm" className="bg-primary hover:bg-primary/90 gap-2 h-8 px-6 font-bold uppercase text-[11px] shadow-sm" disabled={isSaving} onClick={() => handleUpdateProduct({})}>
                       {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Commit All Changes
                    </Button>
                </div>
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8 text-center bg-slate-50/20">
                <Package size={64} className="mb-4 opacity-10" />
                <p className="text-[15px] font-bold text-slate-500 uppercase tracking-widest">Catalog Administration</p>
                <p className="text-[12px] max-w-[280px] mx-auto mt-2">Select a product from the left to configure access and materials, or enter batch mode to prune the catalog.</p>
             </div>
           )}
        </div>
      </div>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
               <FileUp className="text-primary" size={20} />
               Bulk Catalog Import
            </DialogTitle>
            <DialogDescription className="text-xs">
               Upload <b>.xlsx</b> or <b>.csv</b> files with columns <b>cost item</b> and optional <b>description</b>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
             <div 
               className="border-2 border-dashed border-primary/20 rounded-xl p-10 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-primary/5 hover:border-primary/40 transition-all cursor-pointer"
               onClick={() => fileInputRef.current?.click()}
             >
                {isImporting ? (
                  <Loader2 className="animate-spin text-primary mb-2" size={32} />
                ) : (
                  <Upload className="text-primary/30 mb-2" size={32} />
                )}
                <p className="text-[13px] font-bold text-slate-600">Select Spreadsheet File</p>
                <p className="text-[11px] text-slate-400 mt-1">Excel (.xlsx) or CSV supported</p>
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx, .xls" onChange={handleImport} />
             </div>
             
             <div className="bg-primary-50 p-3 rounded-lg border border-primary-100 space-y-2">
                <p className="text-[10px] font-bold uppercase text-primary-600">Required Columns:</p>
                <div className="font-mono text-[10px] text-slate-500 bg-white p-2 border rounded">
                   cost item | description (optional)
                </div>
                <p className="text-[9px] text-slate-400 italic">Description defaults to Item Name if left blank.</p>
             </div>
          </div>
          <DialogFooter>
             <Button variant="ghost" size="sm" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Deletion Modal */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[400px]">
           <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive flex items-center gap-2">
                 <Trash2 size={20} /> Batch Removal
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[13px]">
                 You are about to permanently delete <b>{selectedIds.length}</b> products and all their associated sales materials. This action is irreversible.
              </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
              <AlertDialogCancel className="h-8 text-[11px] font-bold uppercase">Cancel</AlertDialogCancel>
              <Button 
                variant="destructive" 
                className="h-8 text-[11px] font-bold uppercase px-6 shadow-md" 
                onClick={confirmBulkDelete}
                disabled={isSaving}
              >
                 {isSaving ? <Loader2 className="animate-spin" size={14} /> : 'Delete Records'}
              </Button>
           </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}

function ResourceManager({ type, items, productId }: { type: string, items: any[], productId: string }) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '' });
  const firestore = useFirestore();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !formData.name || !formData.url || !user) return;
    try {
      const productRef = doc(firestore, 'products', productId);
      const newItem = { ...formData, id: Date.now().toString(), dateAdded: new Date().toISOString() };
      const updatedItems = [...items, newItem];
      await updateDoc(productRef, { [`resources.${type}`]: updatedItems });
      
      setFormData({ name: '', url: '' });
      setIsAdding(false);
      toast({ title: "Resource Linked" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !user) return;
    const updatedItems = items.filter(i => i.id !== id);
    await updateDoc(doc(firestore, 'products', productId), { [`resources.${type}`]: updatedItems });
    toast({ title: "Resource Removed" });
  };

  return (
    <div className="space-y-4">
       <div className="flex items-center justify-between gap-2">
          <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Repository: {type}</h4>
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5 font-bold uppercase text-primary-600 border-primary-100" onClick={() => setIsAdding(!isAdding)}>
             {isAdding ? 'Cancel' : `+ Add ${type.slice(0, -1)}`}
          </Button>
       </div>

       {isAdding && (
         <form onSubmit={handleAdd} className="p-3 bg-primary-50/50 border border-primary-100 rounded-md flex flex-col lg:grid lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1">
            <div className="lg:col-span-1">
               <Input required placeholder="Display Name..." className="h-8 text-[12px] bg-white border-primary-100" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="lg:col-span-2">
               <Input required placeholder="HTTPS URL or File Resource..." className="h-8 text-[12px] bg-white border-primary-100" value={formData.url} onChange={(e) => setFormData({...formData, url: e.target.value})} />
            </div>
            <Button type="submit" className="h-8 bg-primary text-[11px] font-bold uppercase tracking-tight">Save Item</Button>
         </form>
       )}

       <div className="border rounded-md overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
               <thead>
                  <tr className="bg-slate-50/80 border-b h-8 text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                     <th className="px-3 text-left w-10"></th>
                     <th className="text-left">Resource Name</th>
                     <th className="text-right px-3 w-[100px]">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y bg-white">
                  {items.map(item => (
                    <tr key={item.id} className="h-10 hover:bg-slate-50 group">
                       <td className="px-3 text-slate-400">
                          {type === 'videos' ? <PlayCircle size={14} className="text-red-500" /> : type === 'manuals' ? <BookOpen size={14} className="text-emerald-500" /> : type === 'scripts' ? <FileCode size={14} className="text-blue-500" /> : <FileText size={14} className="text-primary-500" />}
                       </td>
                       <td className="font-medium truncate max-w-[150px] lg:max-w-[300px]">
                          <div className="flex flex-col">
                             <span className="text-slate-800 truncate">{item.name}</span>
                             <span className="text-[10px] text-slate-400 font-mono truncate">{item.url}</span>
                          </div>
                       </td>
                       <td className="px-3 text-right">
                          <div className="flex items-center justify-end gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                             <a href={item.url} target="_blank" className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
                                <ExternalLink size={14} />
                             </a>
                             <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-red-500" onClick={() => handleDelete(item.id)}>
                                <Trash2 size={14} />
                             </Button>
                          </div>
                       </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr className="h-20 text-center"><td colSpan={3} className="text-slate-400 italic text-[12px]">No materials uploaded.</td></tr>
                  )}
               </tbody>
            </table>
          </div>
       </div>
    </div>
  );
}
