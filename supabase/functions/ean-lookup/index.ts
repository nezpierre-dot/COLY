import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, ean_code } = body;

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Mutation actions require admin role
    const userId = claimsData.claims.sub as string;
    if (action === 'manual_add' || action === 'delete' || action === 'bulk_add') {
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Manual add action
    if (action === 'manual_add') {
      const { product_name, brand, weight, category, image_url } = body;
      if (!ean_code || !/^\d{8,14}$/.test(ean_code) || !product_name) {
        return new Response(JSON.stringify({ error: 'Code EAN et nom requis' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase.from('ean_products').upsert({
        ean_code,
        product_name,
        brand: brand || null,
        weight: weight || null,
        category: category || null,
        image_url: image_url || null,
        source: 'manual',
      }, { onConflict: 'ean_code' });

      if (error) {
        console.error('Manual add error:', error);
        return new Response(JSON.stringify({ error: 'Erreur lors de l\'ajout' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete action
    if (action === 'delete') {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: 'ID requis' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase.from('ean_products').delete().eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        return new Response(JSON.stringify({ error: 'Erreur lors de la suppression' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Bulk add action (CSV import)
    if (action === 'bulk_add') {
      const { products } = body;
      if (!Array.isArray(products) || products.length === 0) {
        return new Response(JSON.stringify({ error: 'Liste de produits vide' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const rows = products.slice(0, 500).map((p: any) => ({
        ean_code: String(p.ean_code || '').trim(),
        product_name: p.product_name || null,
        brand: p.brand || null,
        weight: p.weight || null,
        category: p.category || null,
        image_url: p.image_url || null,
        source: 'csv_import',
      })).filter((r: any) => /^\d{8,14}$/.test(r.ean_code) && r.product_name);

      if (rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Aucun produit valide trouvé' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase.from('ean_products').upsert(rows, { onConflict: 'ean_code' });

      if (error) {
        console.error('Bulk add error:', error);
        return new Response(JSON.stringify({ error: 'Erreur lors de l\'import' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, imported: rows.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!ean_code || typeof ean_code !== 'string' || !/^\d{8,13}$/.test(ean_code)) {
      return new Response(JSON.stringify({ error: 'Code EAN invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // serviceRoleKey and supabase already defined above

    // 1. Check local cache first
    const { data: cached } = await supabase
      .from('ean_products')
      .select('*')
      .eq('ean_code', ean_code)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ product: cached, source: 'cache' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Lookup on Open Food Facts
    const offRes = await fetch(`https://world.openfoodfacts.net/api/v2/product/${ean_code}?fields=product_name,brands,image_url,quantity,categories`);
    const offData = await offRes.json();

    if (offData.status === 1 && offData.product) {
      const product = {
        ean_code,
        product_name: offData.product.product_name || null,
        brand: offData.product.brands || null,
        image_url: offData.product.image_url || null,
        weight: offData.product.quantity || null,
        category: offData.product.categories?.split(',')[0]?.trim() || null,
        source: 'openfoodfacts',
      };

      // Cache in local DB
      await supabase.from('ean_products').upsert(product, { onConflict: 'ean_code' });

      return new Response(JSON.stringify({ product, source: 'openfoodfacts' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Not found
    return new Response(JSON.stringify({ product: null, source: 'not_found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('EAN lookup error:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
