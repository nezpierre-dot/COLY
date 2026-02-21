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
    const { ean_code } = await req.json();

    if (!ean_code || typeof ean_code !== 'string' || !/^\d{8,13}$/.test(ean_code)) {
      return new Response(JSON.stringify({ error: 'Code EAN invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

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
