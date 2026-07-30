import { supabase } from './supabaseClient';

export type EnquiryItemSearchResult = {
  name: string;
  itemCode?: string;
  suggestedPrice?: number | null;
  lastQuotedPrice?: number | null;
  lastQuotedRef?: string | null;
  company?: string;
};

export async function fetchItemSearchResults(query: string): Promise<EnquiryItemSearchResult[]> {
  const q = (query || '').trim();
  if (q.length < 2) return [];

  try {
    const [rProducts, rQuotationItems] = await Promise.all([
      supabase
        .from('products')
        .select('item_code, item_name, rate, brand_name')
        .or(`item_code.ilike.%${q}%,item_name.ilike.%${q}%`)
        .limit(10),
      supabase
        .from('quotation_items')
        .select('id, parent, item_code, item_name, rate, amount')
        .or(`item_code.ilike.%${q}%,item_name.ilike.%${q}%`)
        .order('id', { ascending: false })
        .limit(25),
    ]);

    const itemMap = new Map<string, EnquiryItemSearchResult>();

    // Process quotation items (most recent first)
    (rQuotationItems.data || []).forEach((qItem: any) => {
      const name = (qItem.item_name || qItem.item_code || '').trim();
      if (!name) return;

      const rate = Number(qItem.rate) || Number(qItem.amount) || 0;
      const lowerName = name.toLowerCase();
      const company = (lowerName.includes('sino') || lowerName.includes('powerstar') || lowerName.includes('shantui'))
        ? 'Sinopower'
        : 'Machinery Exchange';

      if (!itemMap.has(lowerName)) {
        itemMap.set(lowerName, {
          name,
          itemCode: qItem.item_code,
          suggestedPrice: rate > 0 ? rate : null,
          lastQuotedPrice: rate > 0 ? rate : null,
          lastQuotedRef: qItem.parent || null,
          company,
        });
      } else {
        const existing = itemMap.get(lowerName)!;
        if (!existing.lastQuotedPrice && rate > 0) {
          existing.lastQuotedPrice = rate;
          existing.lastQuotedRef = qItem.parent || null;
        }
      }
    });

    // Process products master
    (rProducts.data || []).forEach((pItem: any) => {
      const name = (pItem.item_name || pItem.item_code || '').trim();
      if (!name) return;
      const lowerName = name.toLowerCase();

      const rate = Number(pItem.rate) || 0;
      const brand = (pItem.brand_name || '').toLowerCase();
      const company = (brand.includes('sino') || brand.includes('shantui') || lowerName.includes('powerstar'))
        ? 'Sinopower'
        : 'Machinery Exchange';

      if (!itemMap.has(lowerName)) {
        itemMap.set(lowerName, {
          name,
          itemCode: pItem.item_code,
          suggestedPrice: rate > 0 ? rate : null,
          lastQuotedPrice: null,
          lastQuotedRef: null,
          company,
        });
      } else {
        const existing = itemMap.get(lowerName)!;
        if (!existing.suggestedPrice && rate > 0) {
          existing.suggestedPrice = rate;
        }
      }
    });

    return Array.from(itemMap.values());
  } catch (e) {
    console.error('[fetchItemSearchResults] Error:', e);
    return [];
  }
}
