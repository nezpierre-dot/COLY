import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Package, Loader2, Trash2, ScanBarcode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BottomNav from "@/components/BottomNav";

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

  // Form state
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

  useEffect(() => {
    loadProducts();
  }, [searchQuery]);

  const handleAdd = async () => {
    if (!newEan.trim() || !newName.trim()) {
      toast.error("Code EAN et nom du produit requis");
      return;
    }
    if (!/^\d{8,14}$/.test(newEan.trim())) {
      toast.error("Le code EAN doit contenir 8 à 14 chiffres");
      return;
    }

    setSaving(true);

    // Use edge function to insert (ean_products has no direct insert for users)
    const { data, error } = await supabase.functions.invoke("ean-lookup", {
      body: {
        action: "manual_add",
        ean_code: newEan.trim(),
        product_name: newName.trim(),
        brand: newBrand.trim() || null,
        weight: newWeight.trim() || null,
        category: newCategory.trim() || null,
        image_url: newImageUrl.trim() || null,
      },
    });

    setSaving(false);

    if (error) {
      toast.error("Erreur lors de l'ajout");
    } else {
      toast.success("Produit ajouté !");
      setDialogOpen(false);
      resetForm();
      loadProducts();
    }
  };

  const resetForm = () => {
    setNewEan("");
    setNewName("");
    setNewBrand("");
    setNewWeight("");
    setNewCategory("");
    setNewImageUrl("");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-foreground">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[26px] font-bold text-foreground leading-tight">Produits EAN</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6 pl-10">
          Gérez votre base de produits interne
        </p>

        {/* Search + Add */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher EAN, nom, marque..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" className="shrink-0">
                <Plus size={18} />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ScanBarcode size={20} />
                  Ajouter un produit
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <Input
                  placeholder="Code EAN (8-14 chiffres) *"
                  value={newEan}
                  onChange={(e) => setNewEan(e.target.value.replace(/\D/g, ""))}
                  maxLength={14}
                />
                <Input
                  placeholder="Nom du produit *"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Input
                  placeholder="Marque"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Poids (ex: 500g)"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                  />
                  <Input
                    placeholder="Catégorie"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                </div>
                <Input
                  placeholder="URL image (optionnel)"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                />
                <Button onClick={handleAdd} disabled={saving} className="w-full">
                  {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                  Ajouter le produit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Product List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-muted-foreground" size={28} />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">
              {searchQuery ? "Aucun produit trouvé" : "Aucun produit dans la base"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((p) => (
              <div key={p.id} className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.product_name || ""}
                    className="w-14 h-14 rounded-lg object-cover bg-muted"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                    <Package size={20} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">
                    {p.product_name || "Sans nom"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    EAN: {p.ean_code}
                    {p.brand && ` • ${p.brand}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {p.weight && (
                      <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {p.weight}
                      </span>
                    )}
                    {p.category && (
                      <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {p.category}
                      </span>
                    )}
                    <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded-full text-primary">
                      {p.source}
                    </span>
                  </div>
                </div>
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
