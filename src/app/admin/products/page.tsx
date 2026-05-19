
"use client"

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, setDoc, addDoc, writeBatch } from 'firebase/firestore';
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
  X,
  ChevronRight,
  TrendingUp,
  ChevronFirst,
  ChevronLast
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertDialog, 
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

  // Local State for standard form fields
  const [localName, setLocalName] = useState('');
  const [localDescription, setLocalDescription] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Bulk Deletion State
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  // Data Fetching
  const productsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'products'), orderBy('name')) : null, [firestore]);
  const { data: products, loading } = useCollection<Product>(productsQuery as any);

  const tiersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'tiers'), orderBy('rankLevel')) : null, [firestore]);
  const { data: tiers } = useCollection<Tier>(tiersQuery as any);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const selectedProduct = products?.find(p => p.id === selectedProductId);

  // Auto-selection of first item on load
  useEffect(() => {
    if (!loading && filteredProducts.length > 0 && !selectedProductId && !selectionMode) {
      setSelectedProductId(filteredProducts[0].id);
    }
  }, [filteredProducts, selectedProductId, loading, selectionMode]);

  // Sync local fields when selected product changes
  useEffect(() => {
    if (selectedProduct) {
      setLocalName(selectedProduct.name || '');
      setLocalDescription(selectedProduct.description || '');
    }
  }, [selectedProductId, selectedProduct]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

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
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) throw new Error("File is empty.");

        const batch = writeBatch(firestore);
        let count = 0;

        for (const row of jsonData as any[]) {
          const rowKeys = Object.keys(row);
          const nameKey = rowKeys.find(k => k.toLowerCase().trim() === 'cost item');
          const descKey = rowKeys.find(k => k.toLowerCase().trim() === 'description');

          if (nameKey) {
            const name = String(row[nameKey] || '').trim();
            const rawDesc = descKey ? String(row[descKey] || '').trim() : '';
            const description = rawDesc || name; 

            if (name) {
              const newId = `prod_bulk_${Date.now()}_${count}`;
              const productData = {
                name,
                description,
                tierRequired: 't1',
                status: 'active',
                resources: { scripts: [], docs: [], videos: [], manuals: [], faqs: [] },
                commissionStructure: { base: 5 },
                importedAt: new Date().toISOString()
              };
              batch.set(doc(firestore, 'products', newId), productData);
              count++;
            }
          }
        }

        await batch.commit();
        toast({ title: "Import Successful", description: `${count} products added.` });
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
      await updateDoc(doc(firestore, 'products', selectedProductId), {
        ...data,
        name: localName,
        description: localDescription
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
      selectedIds.forEach(id => batch.delete(doc(firestore, 'products', id)));
      await batch.commit();
      
      if (selectedProductId && selectedIds.includes(selectedProductId)) setSelectedProductId(null);
      
      setSelectedProductIds([]);
      setSelectionMode(false);
      setIsBulkDeleteDialogOpen(false);
      toast({ title: "Batch Removal Complete" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Operation Failed", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedProductIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedProductIds(paginatedProducts.map(p => p.id));
    else setSelectedProductIds([]);
  };

  if (!user || user.role !== 'Admin') return null;

  return (
    <Shell>
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-140px)] border rounded-md overflow-hidden bg-card border-primary-100 shadow-sm">
        {/* Sidebar Catalog */}
        <div className={cn(
          "w-full lg:w-[340px] border-r flex flex-col bg-slate-50/30 shrink-0",
          selectedProductId && !selectionMode && "hidden lg:flex"
        )}>
           <div className="p-3 border-b space-y-3 bg-white">
              <div className="flex items-center justify-between">
                 <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">Catalog</h2>
                 <div className="flex items-center gap-1">
                    {!selectionMode ? (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => setSelectionMode(true)}>
                           <CheckSquare size={16} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => setIsImportModalOpen(true)}>
                           <FileUp size={16} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={handleAddProduct}>
                           <Plus size={16} />
                        </Button>
                      </>
                    ) : (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => { setSelectionMode(false); setSelectedProductIds([]); }}>
                         <X size={16} />
                      </Button>
                    )}
                 </div>
              </div>

              <div className="relative">
                 <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                 <Input 
                   placeholder="Search products..." 
                   className="pl-8 h-8 text-[12px] bg-white border-primary-50" 
                   value={searchTerm}
                   onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                 />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto">
              {selectionMode && (
                <div className="p-2 px-3 border-b flex items-center justify-between bg-primary-50/50">
                   <div className="flex items-center gap-2">
                      <Checkbox 
                        id="select-all" 
                        checked={selectedIds.length > 0 && selectedIds.length === paginatedProducts.length} 
                        onCheckedChange={toggleAll} 
                      />
                      <label htmlFor="select-all" className="text-[10px] font-bold text-primary-700 uppercase cursor-pointer">Page ({selectedIds.length})</label>
                   </div>
                   <Button variant="destructive" size="sm" className="h-6 text-[9px] font-bold uppercase" disabled={selectedIds.length === 0} onClick={() => setIsBulkDeleteDialogOpen(true)}>
                     Delete Selected
                   </Button>
                </div>
              )}

              {loading ? (
                <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-200" /></div>
              ) : paginatedProducts.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => !selectionMode && setSelectedProductId(p.id)}
                  className={cn(
                    "p-3 border-b cursor-pointer transition-colors hover:bg-primary-50/30 flex items-center gap-3",
                    selectedProductId === p.id && !selectionMode ? "bg-primary-50 border-r-2 border-r-primary shadow-sm" : ""
                  )}
                >
                   {selectionMode && (
                     <Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={() => toggleSelect(p.id)} onClick={(e) => e.stopPropagation()} />
                   )}
                   <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                         <span className="text-[13px] font-bold truncate text-slate-800">{p.name}</span>
                         <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-primary-100 text-primary bg-white shrink-0">
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

           {/* Pagination Footer */}
           <div className="p-2 border-t bg-white flex items-center justify-between shrink-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Page {currentPage} / {totalPages || 1}</span>
              <div className="flex gap-1">
                 <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                    <ChevronFirst size={14} />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                    <ChevronLeft size={14} />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                    <ChevronRight size={14} />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)}>
                    <ChevronLast size={14} />
                 </Button>
              </div>
           </div>
        </div>

        {/* Product Workspace - Keyed by ID to fix switching bug */}
        <div className={cn(
          "flex-1 flex flex-col overflow-hidden bg-white",
          !selectedProductId && "hidden lg:flex"
        )}>
           {selectedProduct ? (
             <div className="flex-1 flex flex-col overflow-hidden" key={selectedProduct.id}>
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
                              value={localName}
                              onChange={(e) => setLocalName(e.target.value)}
                            />
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description & USP</Label>
                            <Textarea 
                              className="text-[13px] text-slate-600 border-none px-0 focus-visible:ring-0 shadow-none bg-transparent min-h-[60px] resize-none"
                              value={localDescription}
                              onChange={(e) => setLocalDescription(e.target.value)}
                            />
                         </div>
                      </div>
                      <div className="w-full lg:w-[260px] space-y-4">
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
                            <div className="pt-2 border-t border-primary-100">
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                                     <TrendingUp size={12} className="text-primary-400" /> Commission
                                  </div>
                                  <span className="text-[13px] font-bold text-primary">
                                     {tiers?.find(t => t.id === selectedProduct.tierRequired)?.commissionPct || 5}%
                                  </span>
                               </div>
                               <p className="text-[9px] text-slate-400 mt-1 italic">Inherited from the required access tier.</p>
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
                    <Button size="sm" className="bg-primary hover:bg-primary/90 gap-2 h-8 px-6 font-bold uppercase text-[11px]" disabled={isSaving} onClick={() => handleUpdateProduct({})}>
                       {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Commit Changes
                    </Button>
                </div>
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8 text-center bg-slate-50/20">
                <Package size={64} className="mb-4 opacity-10" />
                <p className="text-[15px] font-bold text-slate-500 uppercase tracking-widest">Catalog Administration</p>
                <p className="text-[12px] max-w-[280px] mx-auto mt-2">Select a product to configure access or materials. Use pagination below the list to navigate the catalog.</p>
             </div>
           )}
        </div>
      </div>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileUp className="text-primary" size={20} /> Bulk Import</DialogTitle>
            <DialogDescription className="text-xs">Excel/CSV with columns <b>cost item</b> and <b>description</b>.</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
             <div className="border-2 border-dashed border-primary/20 rounded-xl p-10 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-primary/5 transition-all cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {isImporting ? <Loader2 className="animate-spin text-primary mb-2" size={32} /> : <Upload className="text-primary/30 mb-2" size={32} />}
                <p className="text-[13px] font-bold">Select Spreadsheet</p>
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx, .xls" onChange={handleImport} />
             </div>
          </div>
          <DialogFooter><Button variant="ghost" size="sm" onClick={() => setIsImportModalOpen(false)}>Cancel</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Deletion Modal */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[400px]">
           <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Confirm Batch Delete</AlertDialogTitle>
              <AlertDialogDescription>Permanently delete <b>{selectedIds.length}</b> items and materials?</AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
              <AlertDialogCancel className="h-8 text-[11px] font-bold uppercase">Cancel</AlertDialogCancel>
              <Button variant="destructive" className="h-8 text-[11px] font-bold uppercase px-6" onClick={confirmBulkDelete} disabled={isSaving}>
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
      const newItem = { ...formData, id: Date.now().toString(), dateAdded: new Date().toISOString() };
      const updatedItems = [...items, newItem];
      const fieldPath = type === 'script' ? 'scripts' : type === 'docs' ? 'docs' : type === 'video' ? 'videos' : type === 'manual' ? 'manuals' : 'faqs';
      await updateDoc(doc(firestore, 'products', productId), { [`resources.${fieldPath}`]: updatedItems });
      setFormData({ name: '', url: '' });
      setIsAdding(false);
      toast({ title: "Resource Linked" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    const updatedItems = items.filter(i => i.id !== id);
    const fieldPath = type === 'script' ? 'scripts' : type === 'docs' ? 'docs' : type === 'video' ? 'videos' : type === 'manual' ? 'manuals' : 'faqs';
    await updateDoc(doc(firestore, 'products', productId), { [`resources.${fieldPath}`]: updatedItems });
    toast({ title: "Resource Removed" });
  };

  return (
    <div className="space-y-4">
       <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Repository: {type}</h4>
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5 font-bold uppercase text-primary border-primary-100" onClick={() => setIsAdding(!isAdding)}>
             {isAdding ? 'Cancel' : `+ Add ${type.slice(0, -1)}`}
          </Button>
       </div>

       {isAdding && (
         <form onSubmit={handleAdd} className="p-3 bg-primary-50/50 border border-primary-100 rounded-md flex flex-col lg:grid lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1">
            <div className="lg:col-span-1"><Input required placeholder="Name..." className="h-8 text-[12px]" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
            <div className="lg:col-span-2"><Input required placeholder="URL..." className="h-8 text-[12px]" value={formData.url} onChange={(e) => setFormData({...formData, url: e.target.value})} /></div>
            <Button type="submit" className="h-8 bg-primary text-[11px] font-bold uppercase">Save Item</Button>
         </form>
       )}

       <div className="border rounded-md overflow-hidden bg-white">
          <table className="w-full text-[13px]">
             <thead>
                <tr className="bg-slate-50/80 border-b h-8 text-[11px] font-bold text-slate-500 uppercase">
                   <th className="px-3 w-10"></th>
                   <th>Resource Name</th>
                   <th className="text-right px-3 w-[100px]">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y">
                {items.map(item => (
                  <tr key={item.id} className="h-10 hover:bg-slate-50 group">
                     <td className="px-3 text-slate-400">
                        {type === 'videos' ? <PlayCircle size={14} className="text-red-500" /> : <FileText size={14} className="text-primary" />}
                     </td>
                     <td className="truncate font-medium">{item.name}</td>
                     <td className="px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                           <a href={item.url} target="_blank" className="p-1.5 text-slate-400 hover:text-primary"><ExternalLink size={14} /></a>
                           <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                     </td>
                  </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}
