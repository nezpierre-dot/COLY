import { createContext, useContext, useEffect, useState } from "react";

interface FavRoute {
  id: string;
  from: string;
  to: string;
  addedAt: string;
}

interface FavoritesContextType {
  favorites: FavRoute[];
  addFavorite: (from: string, to: string) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (from: string, to: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavRoute[]>(() => {
    try {
      const stored = localStorage.getItem("coly-fav-routes");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("coly-fav-routes", JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (from: string, to: string) => {
    if (isFavorite(from, to)) return;
    setFavorites((prev) => [
      ...prev,
      { id: `${from}-${to}-${Date.now()}`, from, to, addedAt: new Date().toISOString() },
    ]);
  };

  const removeFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const isFavorite = (from: string, to: string) => {
    return favorites.some(
      (f) => f.from.toLowerCase() === from.toLowerCase() && f.to.toLowerCase() === to.toLowerCase()
    );
  };

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
