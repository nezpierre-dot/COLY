import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Package, Loader2, ScanBarcode, FileSpreadsheet, X, Download, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BottomNav from "@/components/BottomNav";
import EanScanner from "@/components/EanScanner";

interface EanProduct {
  id: string;
  ean_code: string;
  product_name: string | null;
  brand: string | null;
  weight: string | null;
  category: string | null;
  image_url: string | null;
  source: string;
  created_at: string;
}

const ManageEanProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<EanProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newEan, setNewEan] = useState("");
  const [newName, setNewName] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  const loadProducts = async () => {
    setLoading(true);
    let query = supabase
      .from("ean_products")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (searchQuery.trim()) {
      query = query.or(`ean_code.ilike.%${searchQuery}%,product_name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (!error && data) setProducts(data);
    setLoading(false);
  };

  useEffect(() => { loadProducts(); }, [searchQuery]);

  const handleAdd = async () => {
    if (!newEan.trim() || !newName.trim()) { toast.error("Code EAN et nom du produit requis"); return; }
    if (!/^\d{8,14}$/.test(newEan.trim())) { toast.error("Le code EAN doit contenir 8 à 14 chiffres"); return; }
    setSaving(true);
    const { error } = await supabase.functions.invoke("ean-lookup", {
      body: { action: "manual_add", ean_code: newEan.trim(), product_name: newName.trim(), brand: newBrand.trim() || null, weight: newWeight.trim() || null, category: newCategory.trim() || null, image_url: newImageUrl.trim() || null },
    });
    setSaving(false);
    if (error) { toast.error("Erreur lors de l'ajout"); } else { toast.success("Produit ajouté !"); setDialogOpen(false); resetForm(); loadProducts(); }
  };

  const resetForm = () => { setNewEan(""); setNewName(""); setNewBrand(""); setNewWeight(""); setNewCategory(""); setNewImageUrl(""); };

  const handleScanResult = (product: { ean_code: string; product_name: string | null; brand: string | null; weight: string | null; category: string | null; image_url: string | null }) => {
    setNewEan(product.ean_code);
    setNewName(product.product_name || "");
    setNewBrand(product.brand || "");
    setNewWeight(product.weight || "");
    setNewCategory(product.category || "");
    setNewImageUrl(product.image_url || "");
    setShowScanner(false);
    setDialogOpen(true);
    toast.success("Produit scanné ! Vérifiez et ajoutez-le.");
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.functions.invoke("ean-lookup", {
      body: { action: "delete", id },
    });
    setDeletingId(null);
    if (error) { toast.error("Erreur lors de la suppression"); } else { toast.success("Produit supprimé"); setProducts((prev) => prev.filter((p) => p.id !== id)); }
  };

  const handleExportCsv = () => {
    if (products.length === 0) { toast.error("Aucun produit à exporter"); return; }
    const headers = ["ean_code", "product_name", "brand", "weight", "category", "image_url", "source", "created_at"];
    const csvRows = [headers.join(";")];
    for (const p of products) {
      csvRows.push(headers.map((h) => {
        const val = (p as any)[h] ?? "";
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(";"));
    }
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `produits_ean_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${products.length} produit(s) exporté(s)`);
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { toast.error("Fichier CSV vide ou invalide"); setCsvImporting(false); return; }
      const headerLine = lines[0].toLowerCase();
      const separator = headerLine.includes(";") ? ";" : ",";
      const headers = headerLine.split(separator).map((h) => h.trim().replace(/^"|"$/g, ""));
      const eanIdx = headers.findIndex((h) => h.includes("ean") || h.includes("code") || h.includes("barcode"));
      const nameIdx = headers.findIndex((h) => h.includes("nom") || h.includes("name") || h.includes("produit") || h.includes("product"));
      const brandIdx = headers.findIndex((h) => h.includes("marque") || h.includes("brand"));
      const weightIdx = headers.findIndex((h) => h.includes("poids") || h.includes("weight") || h.includes("quantity"));
      const categoryIdx = headers.findIndex((h) => h.includes("categ") || h.includes("category"));
      const imageIdx = headers.findIndex((h) => h.includes("image") || h.includes("photo") || h.includes("url"));
      if (eanIdx === -1 || nameIdx === -1) { toast.error("Colonnes 'ean/code' et 'nom/name' requises"); setCsvImporting(false); return; }
      const prods = lines.slice(1).map((line) => {
        const cols = line.split(separator).map((c) => c.trim().replace(/^"|"$/g, ""));
        return { ean_code: cols[eanIdx] || "", product_name: cols[nameIdx] || "", brand: brandIdx >= 0 ? cols[brandIdx] || null : null, weight: weightIdx >= 0 ? cols[weightIdx] || null : null, category: categoryIdx >= 0 ? cols[categoryIdx] || null : null, image_url: imageIdx >= 0 ? cols[imageIdx] || null : null };
      });
      const { data, error } = await supabase.functions.invoke("ean-lookup", { body: { action: "bulk_add", products: prods } });
      if (error) { toast.error("Erreur lors de l'import CSV"); } else { toast.success(`${data?.imported || 0} produit(s) importé(s) !`); loadProducts(); }
    } catch { toast.error("Erreur de lecture du fichier CSV"); } finally { setCsvImporting(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  return (
    <div className="page-shell">
      <div className="px-6 pt-12">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-foreground"><ArrowLeft size={24} /></button>
          <h1 className="text-[26px] font-bold text-foreground leading-tight">Produits EAN</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6 pl-10">Gérez votre base de produits interne</p>

        {showScanner && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">Scanner un code-barres</p>
              <button onClick={() => setShowScanner(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <EanScanner mode="scan" onProductFound={handleScanResult} />
          </div>
        )}

        <div className="flex gap-2 mb-4 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowScanner(!showScanner)} className="gap-1.5">
            <ScanBarcode size={16} />Scanner
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={csvImporting} className="gap-1.5">
            {csvImporting ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
            <Download size={16} />Export CSV
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCsvImport} />
        </div>

        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher EAN, nom, marque..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" className="shrink-0"><Plus size={18} /></Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><ScanBarcode size={20} />Ajouter un produit</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <Input placeholder="Code EAN (8-14 chiffres) *" value={newEan} onChange={(e) => setNewEan(e.target.value.replace(/\D/g, ""))} maxLength={14} />
                <Input placeholder="Nom du produit *" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <Input placeholder="Marque" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Poids (ex: 500g)" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} />
                  <Input placeholder="Catégorie" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                </div>
                <Input placeholder="URL image (optionnel)" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} />
                <Button onClick={handleAdd} disabled={saving} className="w-full">
                  {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}Ajouter le produit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-4 p-3 rounded-xl bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">
            <strong>Format CSV :</strong> colonnes <code className="bg-muted px-1 rounded">ean_code</code>, <code className="bg-muted px-1 rounded">product_name</code> (requises), + optionnelles : <code className="bg-muted px-1 rounded">brand</code>, <code className="bg-muted px-1 rounded">weight</code>, <code className="bg-muted px-1 rounded">category</code>, <code className="bg-muted px-1 rounded">image_url</code>. Max 500 lignes.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" size={28} /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">{searchQuery ? "Aucun produit trouvé" : "Aucun produit dans la base"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((p) => (
              <div key={p.id} className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.product_name || ""} className="w-14 h-14 rounded-lg object-cover bg-muted" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center"><Package size={20} className="text-muted-foreground" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{p.product_name || "Sans nom"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">EAN: {p.ean_code}{p.brand && ` • ${p.brand}`}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {p.weight && <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{p.weight}</span>}
                    {p.category && <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{p.category}</span>}
                    <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded-full text-primary">{p.source}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={deletingId === p.id}
                  className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  {deletingId === p.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default ManageEanProducts;
