import { supabase } from './client';
import {
  Outlet,
  Product,
  InventoryItem,
  Expense,
  Order,
  OrderItem,
  StockOpnameRecord,
  StockDepletionLog,
} from '@/types';
import { DEFAULT_ORDER_ITEMS_MAP } from '@/lib/data/mockData';

export interface SyncResult {
  success: boolean;
  message: string;
  details?: {
    outletsCount?: number;
    productsCount?: number;
    ingredientsCount?: number;
    expensesCount?: number;
    ordersCount?: number;
  };
  error?: string;
}

export interface SyncOrderResult {
  success: boolean;
  error?: string;
}

/**
 * Resiliently sync single ingredient to Supabase
 */
export async function syncIngredientToSupabase(item: InventoryItem): Promise<boolean> {
  if (!supabase) return false;
  try {
    const payload: Record<string, unknown> = {
      id: item.id,
      outlet_id: item.outletId,
      name: item.name,
      category: item.category,
      current_stock: item.currentStock,
      unit: item.unit,
      min_threshold: item.minThreshold,
      cost_per_unit: item.costPerUnit,
      expiry_date: item.expiryDate || null,
      last_updated: item.lastUpdated || new Date().toISOString(),
    };
    const { error } = await supabase.from('ingredients').upsert(payload);
    if (error) {
      if (error.message.includes('expiry_date')) {
        delete payload.expiry_date;
        await supabase.from('ingredients').upsert(payload);
        return true;
      }
      console.warn('Supabase sync ingredient error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase sync ingredient caught:', err);
    return false;
  }
}

/**
 * Resiliently sync single expense to Supabase
 */
export async function syncExpenseToSupabase(expense: Expense): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('expenses').upsert({
      id: expense.id,
      outlet_id: expense.outletId,
      outlet_name: expense.outletName || '',
      category: expense.category,
      title: expense.title,
      amount: expense.amount,
      date: expense.date,
      payment_method: expense.paymentMethod,
      recorded_by: expense.recordedBy,
      notes: expense.notes || '',
    });
    if (error) {
      console.warn('Supabase sync expense error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase sync expense caught:', err);
    return false;
  }
}

/**
 * Resiliently sync single order & its items to Supabase
 */
export async function syncOrderToSupabase(order: Order): Promise<SyncOrderResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase client is not configured' };
  }

  try {
    // Encode items into order_notes as a resilient backup payload
    const itemsJson = JSON.stringify(order.items || []);
    const cleanNotes = order.orderNotes?.replace(/\n?\[ITEMS_PAYLOAD\]:[\s\S]*$/, '').trim() || '';
    const orderNotesWithBackup = cleanNotes 
      ? `${cleanNotes}\n[ITEMS_PAYLOAD]:${itemsJson}` 
      : `[ITEMS_PAYLOAD]:${itemsJson}`;

    // 1. Insert or update master order
    const orderPayload = {
      id: order.id,
      order_number: order.orderNumber,
      outlet_id: order.outletId,
      outlet_name: order.outletName || '',
      cashier_id: order.cashierId || 'usr-cashier',
      cashier_name: order.cashierName || 'Kasir',
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      payment_method: order.paymentMethod,
      amount_tendered: order.amountTendered || null,
      change: order.change || 0,
      payment_status: 'paid',
      order_notes: orderNotesWithBackup,
      created_at: order.createdAt || new Date().toISOString(),
    };

    const { error: orderError } = await supabase.from('orders').upsert(orderPayload);

    if (orderError) {
      const isMissingTable =
        orderError.message.includes('orders') ||
        orderError.message.includes('schema cache') ||
        (orderError as { code?: string }).code === 'PGRST205';

      if (isMissingTable) {
        console.warn(
          'Supabase schema notice: Tabel public.orders belum dibuat di database. Jalankan supabase/schema.sql di Supabase SQL Editor.'
        );
        return {
          success: false,
          error:
            'Tabel "orders" belum dibuat di Supabase. Silakan jalankan script supabase/schema.sql di Supabase Dashboard -> SQL Editor.',
        };
      }

      console.error('Supabase sync order error:', orderError.message);
      return { success: false, error: `Order master failed: ${orderError.message}` };
    }

    // 2. Insert or update order items
    if (order.items && order.items.length > 0) {
      const itemsToInsert = order.items.map((item, idx) => ({
        id: `${order.id}-item-${idx + 1}`,
        order_id: order.id,
        product_id: item.productId || null,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.quantity * item.price,
        sugar_level: item.sugarLevel || null,
        notes: item.notes || '',
        created_at: order.createdAt || new Date().toISOString(),
      }));

      const { error: itemsError } = await supabase.from('order_items').upsert(itemsToInsert);
      if (itemsError) {
        console.warn('Supabase sync order_items first attempt warning:', itemsError.message);
        // Resilient Fallback: Retry inserting with product_id set to null in case of foreign key mismatch
        const fallbackItems = itemsToInsert.map((it) => ({ ...it, product_id: null }));
        const { error: retryError } = await supabase.from('order_items').upsert(fallbackItems);
        if (retryError) {
          console.warn('Supabase sync order_items fallback error:', retryError.message);
          return { success: true, error: `Items note: ${retryError.message}` };
        }
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Supabase sync order exception:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Resiliently delete single expense from Supabase
 */
export async function deleteExpenseFromSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete expense error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase delete expense exception:', err);
    return false;
  }
}

/**
 * Resilient outlet sync: tries full schema first, gracefully falls back if columns are missing
 */
async function syncOutletsResiliently(outlets: Outlet[]) {
  if (!supabase) throw new Error('Supabase not configured');

  // Attempt 1: Full payload (all columns)
  const fullPayload = outlets.map((o) => ({
    id: o.id,
    name: o.name,
    code: o.code,
    address: o.address,
    phone: o.phone,
    is_primary: o.isPrimary ?? false,
  }));

  const { error: firstErr } = await supabase.from('outlets').upsert(fullPayload);

  if (!firstErr) return;

  // Check if error is due to UUID type mismatch (e.g. database still has id UUID from initial template)
  const isUuidError =
    firstErr.message.includes('invalid input syntax for type uuid') ||
    firstErr.message.includes('uuid');

  if (isUuidError) {
    console.warn(
      'Notice: Tabel outlets di Supabase masih menggunakan tipe UUID alih-alih TEXT. Silakan jalankan script supabase/schema.sql di Supabase SQL Editor.'
    );
    return;
  }

  // Check if error is due to missing columns (e.g. 'code', 'phone') in older database schemas
  const isMissingColumn =
    firstErr.message.includes('column') ||
    firstErr.message.includes('schema cache') ||
    firstErr.message.includes('code');

  if (isMissingColumn) {
    console.warn(
      'Notice: Outlets table in Supabase does not have all columns yet. Fallback to basic fields (id, name, address). Please run the updated supabase/schema.sql in Supabase SQL Editor.'
    );

    // Fallback: minimal columns
    const minimalPayload = outlets.map((o) => ({
      id: o.id,
      name: o.name,
      address: o.address,
    }));

    const { error: fallbackErr } = await supabase.from('outlets').upsert(minimalPayload);
    if (fallbackErr) {
      if (
        fallbackErr.message.includes('invalid input syntax for type uuid') ||
        fallbackErr.message.includes('uuid')
      ) {
        console.warn(
          'Notice: Outlets table di Supabase masih bertipe UUID. Jalankan supabase/schema.sql di Supabase SQL Editor.'
        );
        return;
      }
      console.warn('Outlets sync fallback warning:', fallbackErr.message);
      return;
    }
    return;
  }

  console.warn(`Outlets sync note: ${firstErr.message}`);
}

/**
 * Bulk sync all master and transactional data to Supabase
 */
export async function syncAllToSupabaseService(params: {
  outlets: Outlet[];
  products: Product[];
  inventory: InventoryItem[];
  expenses: Expense[];
  orders: Order[];
}): Promise<SyncResult> {
  if (!supabase) {
    return {
      success: false,
      message: 'Supabase client is not configured. Silakan periksa .env.local',
    };
  }

  try {
    // 1. Sync Outlets (Must be first for Foreign Keys)
    await syncOutletsResiliently(params.outlets);

    // 2. Sync Products (Must be second so BOM & order items can reference)
    if (params.products.length > 0) {
      const productPayload = params.products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        description: p.description,
        is_active: p.isActive,
      }));
      const { error: prodErr } = await supabase.from('products').upsert(productPayload);
      if (prodErr) throw new Error(`Products sync error: ${prodErr.message}`);
    }

    // 3. Sync Ingredients (All Outlets with Expiry Date)
    if (params.inventory.length > 0) {
      const ingredientPayload = params.inventory.map((inv) => ({
        id: inv.id,
        outlet_id: inv.outletId,
        name: inv.name,
        category: inv.category,
        current_stock: inv.currentStock,
        unit: inv.unit,
        min_threshold: inv.minThreshold,
        cost_per_unit: inv.costPerUnit,
        expiry_date: inv.expiryDate || null,
        last_updated: inv.lastUpdated || new Date().toISOString(),
      }));
      const { error: ingErr } = await supabase.from('ingredients').upsert(ingredientPayload);
      if (ingErr) {
        if (ingErr.message.includes('expiry_date')) {
          // Fallback without expiry_date
          const fallback = ingredientPayload.map(({ expiry_date, ...rest }) => rest);
          await supabase.from('ingredients').upsert(fallback);
        } else if (ingErr.message.includes('uuid') || ingErr.message.includes('invalid input syntax')) {
          console.warn('Notice: Tabel ingredients masih bertipe UUID. Perlu update schema.');
        } else {
          console.warn(`Ingredients sync note: ${ingErr.message}`);
        }
      }
    }

    // 3b. Sync Product BOM Recipes to product_ingredients
    for (const prod of params.products) {
      if (prod.bom && prod.bom.length > 0) {
        const bomPayload = prod.bom.map((b) => ({
          id: `bom-${prod.id}-${b.rawMaterialId}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
          product_id: prod.id,
          ingredient_name: b.rawMaterialName,
          quantity: b.quantity,
          unit: b.unit,
        }));
        await supabase.from('product_ingredients').upsert(bomPayload);
      }
    }

    // 4. Sync Expenses (Pembelian & Operasional)
    if (params.expenses.length > 0) {
      const expensePayload = params.expenses.map((e) => ({
        id: e.id,
        outlet_id: e.outletId,
        outlet_name: e.outletName || '',
        category: e.category,
        title: e.title,
        amount: e.amount,
        date: e.date,
        payment_method: e.paymentMethod,
        recorded_by: e.recordedBy,
        notes: e.notes || '',
      }));
      const { error: expErr } = await supabase.from('expenses').upsert(expensePayload);
      if (expErr) {
        if (expErr.message.includes('category') || expErr.message.includes('uuid')) {
          console.warn('Notice: Tabel expenses belum memiliki kolom category atau bertipe UUID. Perlu update schema.');
        } else {
          console.warn(`Expenses sync note: ${expErr.message}`);
        }
      }
    }

    // 5. Sync Orders (Semua Penjualan Tiap Cabang)
    let syncedOrdersCount = 0;
    const orderErrors: string[] = [];

    if (params.orders.length > 0) {
      for (const ord of params.orders) {
        const orderRes = await syncOrderToSupabase(ord);
        if (orderRes.success) {
          syncedOrdersCount++;
        } else if (orderRes.error) {
          orderErrors.push(orderRes.error);
        }
      }
    }

    if (orderErrors.length > 0 && syncedOrdersCount === 0) {
      const isMissingTable =
        orderErrors[0].includes('orders') ||
        orderErrors[0].includes('schema cache');

      if (isMissingTable) {
        return {
          success: false,
          message:
            'Data master siap, namun tabel "orders" belum dibuat di Supabase. Silakan jalankan script supabase/schema.sql di Supabase Dashboard -> SQL Editor.',
          details: {
            outletsCount: params.outlets.length,
            productsCount: params.products.length,
            ingredientsCount: params.inventory.length,
            expensesCount: params.expenses.length,
            ordersCount: 0,
          },
          error: orderErrors[0],
        };
      }
      return {
        success: false,
        message: `Sinkronisasi pesanan terkendala: ${orderErrors[0]}. Silakan jalankan script supabase/schema.sql di Supabase SQL Editor.`,
        error: orderErrors[0],
      };
    }

    return {
      success: true,
      message: `Semua data berhasil disinkronkan ke Supabase!`,
      details: {
        outletsCount: params.outlets.length,
        productsCount: params.products.length,
        ingredientsCount: params.inventory.length,
        expensesCount: params.expenses.length,
        ordersCount: syncedOrdersCount,
      },
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const isUuidOrSchema =
      msg.includes('uuid') ||
      msg.includes('schema cache') ||
      msg.includes('column');

    return {
      success: false,
      message: isUuidOrSchema
        ? `Perhatian: Skema database Supabase masih menggunakan format lama. Silakan salin dan jalankan script supabase/schema.sql di Supabase Dashboard -> SQL Editor.`
        : `Gagal sinkronisasi ke Supabase: ${msg}`,
      error: msg,
    };
  }
}

/**
 * Helper to parse Supabase order row and reliably resolve product items
 * Sources checked in order:
 * 1. Direct order_items query map
 * 2. Embedded order_items relation
 * 3. [ITEMS_PAYLOAD] JSON backup in order_notes
 * 4. DEFAULT_ORDER_ITEMS_MAP for seed orders
 */
function parseOrderRow(
  row: Record<string, unknown>,
  itemsByOrderId?: Record<string, OrderItem[]>
): Order {
  const ordId = String(row.id);
  const orderNumber = String(row.order_number || row.orderNumber || `#ORD-${ordId}`);
  const rawNotes = String(row.order_notes || row.orderNotes || '');

  // 1. Direct query map from order_items table
  let items: OrderItem[] = itemsByOrderId && itemsByOrderId[ordId] ? [...itemsByOrderId[ordId]] : [];

  // 2. Embedded order_items relation if present
  if (items.length === 0 && Array.isArray(row.order_items) && row.order_items.length > 0) {
    items = (row.order_items as Array<Record<string, unknown>>).map((item) => ({
      productId: String(item.product_id || ''),
      productName: String(item.product_name || 'Product'),
      quantity: Number(item.quantity || 1),
      price: Number(item.unit_price || item.price || 0),
      sugarLevel: item.sugar_level ? (item.sugar_level as OrderItem['sugarLevel']) : undefined,
      notes: item.notes ? String(item.notes) : undefined,
    }));
  }

  // 3. Serialized JSON backup payload in order_notes
  if (items.length === 0 && rawNotes.includes('[ITEMS_PAYLOAD]:')) {
    try {
      const parts = rawNotes.split('[ITEMS_PAYLOAD]:');
      const payloadStr = parts[1]?.trim();
      if (payloadStr) {
        const parsed = JSON.parse(payloadStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          items = parsed;
        }
      }
    } catch (e) {
      console.warn('Error parsing [ITEMS_PAYLOAD]:', e);
    }
  }

  // 4. Fallback to DEFAULT_ORDER_ITEMS_MAP for known seed transactions
  if (items.length === 0) {
    if (DEFAULT_ORDER_ITEMS_MAP[orderNumber]) {
      items = [...DEFAULT_ORDER_ITEMS_MAP[orderNumber]];
    } else if (DEFAULT_ORDER_ITEMS_MAP[ordId]) {
      items = [...DEFAULT_ORDER_ITEMS_MAP[ordId]];
    }
  }

  // Strip metadata payload from user-facing notes
  const cleanNotes = rawNotes.replace(/\n?\[ITEMS_PAYLOAD\]:[\s\S]*$/, '').trim();

  return {
    id: ordId,
    orderNumber,
    outletId: String(row.outlet_id || row.outletId || 'outlet-1'),
    outletName: String(row.outlet_name || row.outletName || 'Outlet'),
    cashierId: String(row.cashier_id || row.cashierId || 'usr-cashier'),
    cashierName: String(row.cashier_name || row.cashierName || 'Kasir'),
    items,
    subtotal: Number(row.subtotal || 0),
    tax: Number(row.tax || 0),
    total: Number(row.total || 0),
    paymentMethod: (row.payment_method as Order['paymentMethod']) || 'cash',
    amountTendered: row.amount_tendered ? Number(row.amount_tendered) : undefined,
    change: row.change ? Number(row.change) : undefined,
    orderNotes: cleanNotes || undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

/**
 * DIRECT LIVE QUERY: Fetch today's sales directly from Supabase
 * Specifically used for generating daily sales reports per branch or consolidated
 */
export async function fetchTodaySalesFromSupabase(outletId?: string): Promise<{
  success: boolean;
  data: Order[] | null;
  error?: string;
  source: 'supabase' | 'fallback';
}> {
  if (!supabase) {
    return { success: false, data: null, error: 'Supabase client not configured', source: 'fallback' };
  }

  try {
    // 24-48 hours window to safely cover today in local time and UTC
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    // Buffer back 14 hours to cover UTC difference (e.g. UTC+8 or UTC+7)
    const bufferStart = new Date(startOfToday.getTime() - 14 * 60 * 60 * 1000).toISOString();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const bufferEnd = new Date(endOfToday.getTime() + 14 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('orders')
      .select('*')
      .gte('created_at', bufferStart)
      .lte('created_at', bufferEnd)
      .order('created_at', { ascending: false });

    if (outletId && outletId !== 'all') {
      query = query.eq('outlet_id', outletId);
    }

    const { data: ordersData, error: ordersError } = await query;

    if (ordersError) {
      console.warn('Direct fetch today sales from Supabase error:', ordersError.message);
      const isMissingTable = ordersError.message.includes('orders') || ordersError.message.includes('schema cache');
      return {
        success: false,
        data: null,
        error: isMissingTable
          ? 'Tabel "orders" belum dibuat di Supabase. Silakan jalankan script supabase/schema.sql di Supabase SQL Editor.'
          : ordersError.message,
        source: 'fallback',
      };
    }

    if (!ordersData || ordersData.length === 0) {
      return { success: true, data: [], source: 'supabase' };
    }

    const orderIds = ordersData.map((r: Record<string, unknown>) => String(r.id));
    const itemsByOrderId: Record<string, OrderItem[]> = {};

    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      if (!itemsError && itemsData && itemsData.length > 0) {
        itemsData.forEach((itemRow: Record<string, unknown>) => {
          const ordId = String(itemRow.order_id);
          if (!itemsByOrderId[ordId]) itemsByOrderId[ordId] = [];
          itemsByOrderId[ordId].push({
            productId: String(itemRow.product_id || ''),
            productName: String(itemRow.product_name || 'Product'),
            quantity: Number(itemRow.quantity || 1),
            price: Number(itemRow.unit_price || itemRow.price || 0),
            sugarLevel: itemRow.sugar_level ? (itemRow.sugar_level as OrderItem['sugarLevel']) : undefined,
            notes: itemRow.notes ? String(itemRow.notes) : undefined,
          });
        });
      }
    } catch (err) {
      console.warn('order_items direct query note in today sales:', err);
    }

    const formattedOrders: Order[] = ordersData.map((row: Record<string, unknown>) =>
      parseOrderRow(row, itemsByOrderId)
    );

    return { success: true, data: formattedOrders, source: 'supabase' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, data: null, error: msg, source: 'fallback' };
  }
}

/**
 * DIRECT LIVE QUERY: Fetch all orders across branches from Supabase
 */
export async function fetchAllOrdersFromSupabase(outletId?: string): Promise<{
  success: boolean;
  data: Order[] | null;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, data: null, error: 'Supabase client not configured' };
  }

  try {
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (outletId && outletId !== 'all') {
      query = query.eq('outlet_id', outletId);
    }

    const { data: ordersData, error: ordersError } = await query;

    if (ordersError) {
      return { success: false, data: null, error: ordersError.message };
    }

    if (!ordersData || ordersData.length === 0) {
      return { success: true, data: [] };
    }

    const orderIds = ordersData.map((r: Record<string, unknown>) => String(r.id));
    const itemsByOrderId: Record<string, OrderItem[]> = {};

    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      if (!itemsError && itemsData && itemsData.length > 0) {
        itemsData.forEach((itemRow: Record<string, unknown>) => {
          const ordId = String(itemRow.order_id);
          if (!itemsByOrderId[ordId]) itemsByOrderId[ordId] = [];
          itemsByOrderId[ordId].push({
            productId: String(itemRow.product_id || ''),
            productName: String(itemRow.product_name || 'Product'),
            quantity: Number(itemRow.quantity || 1),
            price: Number(itemRow.unit_price || itemRow.price || 0),
            sugarLevel: itemRow.sugar_level ? (itemRow.sugar_level as OrderItem['sugarLevel']) : undefined,
            notes: itemRow.notes ? String(itemRow.notes) : undefined,
          });
        });
      }
    } catch (err) {
      console.warn('order_items direct query note in all orders:', err);
    }

    const formattedOrders: Order[] = ordersData.map((row: Record<string, unknown>) =>
      parseOrderRow(row, itemsByOrderId)
    );

    return { success: true, data: formattedOrders };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, data: null, error: msg };
  }
}

/**
 * Direct Live Query: Fetch all raw materials / stock items directly from Supabase
 */
export async function fetchIngredientsFromSupabase(): Promise<{
  success: boolean;
  data: InventoryItem[] | null;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, data: null, error: 'Supabase client not configured' };
  }

  try {
    const { data, error } = await supabase.from('ingredients').select('*').order('name');
    if (error) {
      return { success: false, data: null, error: error.message };
    }
    if (!data || data.length === 0) {
      return { success: true, data: [] };
    }

    const formatted: InventoryItem[] = data.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      outletId: String(row.outlet_id || row.outletId || 'outlet-1'),
      name: String(row.name),
      category: (row.category as InventoryItem['category']) || 'Other',
      currentStock: Number(row.current_stock ?? row.currentStock ?? 0),
      unit: (row.unit as InventoryItem['unit']) || 'pack',
      minThreshold: Number(row.min_threshold ?? row.minThreshold ?? 0),
      costPerUnit: Number(row.cost_per_unit ?? row.costPerUnit ?? 0),
      expiryDate: (row.expiry_date || row.expiryDate) ? String(row.expiry_date || row.expiryDate) : undefined,
      lastUpdated: String(row.last_updated || row.lastUpdated || new Date().toISOString()),
    }));

    return { success: true, data: formatted };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, data: null, error: msg };
  }
}

/**
 * Direct Live Query: Fetch all operational expenses directly from Supabase
 */
export async function fetchExpensesFromSupabase(): Promise<{
  success: boolean;
  data: Expense[] | null;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, data: null, error: 'Supabase client not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      return { success: false, data: null, error: error.message };
    }
    if (!data || data.length === 0) {
      return { success: true, data: [] };
    }

    const formatted: Expense[] = data.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      outletId: String(row.outlet_id || row.outletId || 'outlet-1'),
      outletName: String(row.outlet_name || row.outletName || 'Outlet'),
      category: (row.category as Expense['category']) || 'other',
      title: String(row.title),
      amount: Number(row.amount || 0),
      date: String(row.date || new Date().toISOString().split('T')[0]),
      paymentMethod: String(row.payment_method || row.paymentMethod || 'Bank Transfer'),
      recordedBy: String(row.recorded_by || row.recordedBy || 'Manager'),
      notes: row.notes ? String(row.notes) : undefined,
    }));

    return { success: true, data: formatted };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, data: null, error: msg };
  }
}

/**
 * Insert or update all operational expenses to Supabase
 */
export async function syncAllExpensesToSupabase(expenses: Expense[]): Promise<SyncResult> {
  if (!supabase) {
    return { success: false, message: 'Supabase client tidak terkonfigurasi' };
  }

  try {
    const payload = expenses.map((e) => ({
      id: e.id,
      outlet_id: e.outletId,
      outlet_name: e.outletName || '',
      category: e.category,
      title: e.title,
      amount: e.amount,
      date: e.date,
      payment_method: e.paymentMethod,
      recorded_by: e.recordedBy,
      notes: e.notes || '',
    }));

    const { error } = await supabase.from('expenses').upsert(payload);
    if (error) {
      const isMissingColOrTable =
        error.message.includes('category') ||
        error.message.includes('schema cache') ||
        error.message.includes('uuid') ||
        (error as { code?: string }).code === '42703';

      if (isMissingColOrTable) {
        return {
          success: false,
          message:
            'Gagal menyimpan pengeluaran: Skema tabel "expenses" di Supabase belum diperbarui (kolom category belum ada). Silakan jalankan script supabase/schema.sql di Supabase Dashboard -> SQL Editor.',
          error: error.message,
        };
      }
      throw new Error(error.message);
    }

    return {
      success: true,
      message: `Berhasil menyimpan ${expenses.length} data pengeluaran operasional ke Supabase!`,
      details: { expensesCount: expenses.length },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Gagal menyimpan pengeluaran: ${msg}`, error: msg };
  }
}

/**
 * Insert or update all ingredients/stock items to Supabase
 */
export async function syncAllIngredientsToSupabase(inventory: InventoryItem[]): Promise<SyncResult> {
  if (!supabase) {
    return { success: false, message: 'Supabase client tidak terkonfigurasi' };
  }

  try {
    const payload = inventory.map((inv) => ({
      id: inv.id,
      outlet_id: inv.outletId,
      name: inv.name,
      category: inv.category,
      current_stock: inv.currentStock,
      unit: inv.unit,
      min_threshold: inv.minThreshold,
      cost_per_unit: inv.costPerUnit,
      last_updated: inv.lastUpdated || new Date().toISOString(),
    }));

    const { error } = await supabase.from('ingredients').upsert(payload);
    if (error) throw new Error(error.message);

    return {
      success: true,
      message: `Berhasil menyinkronkan ${inventory.length} data stok bahan baku ke Supabase!`,
      details: { ingredientsCount: inventory.length },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Gagal menyimpan stok bahan: ${msg}`, error: msg };
  }
}

/**
 * Resiliently sync single product & its BOM recipe to Supabase
 */
export async function syncProductToSupabase(product: Product): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('products').upsert({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      description: product.description,
      is_active: product.isActive,
    });
    if (error) {
      console.warn('Supabase sync product error:', error.message);
      return false;
    }

    // Sync BOM recipes if present
    if (product.bom && product.bom.length > 0) {
      const bomPayload = product.bom.map((b, idx) => ({
        id: `${product.id}-bom-${idx + 1}`,
        product_id: product.id,
        ingredient_name: b.rawMaterialName,
        quantity: b.quantity,
        unit: b.unit,
      }));
      await supabase.from('product_ingredients').upsert(bomPayload);
    }
    return true;
  } catch (err) {
    console.warn('Supabase sync product caught:', err);
    return false;
  }
}

/**
 * Resiliently delete single product from Supabase
 */
export async function deleteProductFromSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete product error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase delete product caught:', err);
    return false;
  }
}

/**
 * Direct Live Query: Fetch all products from Supabase
 */
export async function fetchProductsFromSupabase(): Promise<{
  success: boolean;
  data: Product[] | null;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, data: null, error: 'Supabase client not configured' };
  }

  try {
    const { data: prodData, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (prodErr) {
      return { success: false, data: null, error: prodErr.message };
    }
    if (!prodData || prodData.length === 0) {
      return { success: true, data: [] };
    }

    // Fetch BOM recipes
    const { data: bomData } = await supabase.from('product_ingredients').select('*');
    const bomMap: Record<
      string,
      Array<{ rawMaterialId: string; rawMaterialName: string; quantity: number; unit: Product['bom'][0]['unit'] }>
    > = {};

    if (bomData) {
      bomData.forEach((row: Record<string, unknown>) => {
        const pId = String(row.product_id);
        if (!bomMap[pId]) bomMap[pId] = [];
        bomMap[pId].push({
          rawMaterialId: String(row.id),
          rawMaterialName: String(row.ingredient_name),
          quantity: Number(row.quantity || 0),
          unit: (row.unit as Product['bom'][0]['unit']) || 'pack',
        });
      });
    }

    const formatted: Product[] = prodData.map((row: Record<string, unknown>) => {
      const pId = String(row.id);
      return {
        id: pId,
        name: String(row.name),
        category: (row.category as Product['category']) || 'Coffee',
        price: Number(row.price || 0),
        description: String(row.description || ''),
        isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
        bom: bomMap[pId] || [],
      };
    });

    return { success: true, data: formatted };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, data: null, error: msg };
  }
}

/**
 * Direct Live Query: Fetch all outlets from Supabase
 */
export async function fetchOutletsFromSupabase(): Promise<{
  success: boolean;
  data: Outlet[] | null;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, data: null, error: 'Supabase client not configured' };
  }

  try {
    const { data, error } = await supabase.from('outlets').select('*').order('name');
    if (error) {
      return { success: false, data: null, error: error.message };
    }
    if (!data || data.length === 0) {
      return { success: true, data: [] };
    }

    const formatted: Outlet[] = data.map((row: Record<string, unknown>) => {
      const outletName = String(row.name || '');
      return {
        id: String(row.id),
        name: outletName,
        code: String(row.code || outletName.slice(0, 3).toUpperCase()),
        address: String(row.address || ''),
        phone: String(row.phone || ''),
        isPrimary: Boolean(row.is_primary),
      };
    });

    return { success: true, data: formatted };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, data: null, error: msg };
  }
}

/**
 * Resiliently sync single Stock Opname audit to Supabase
 */
export async function syncStockOpnameToSupabase(record: StockOpnameRecord): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('stock_opnames').upsert({
      id: record.id,
      outlet_id: record.outletId,
      outlet_name: record.outletName,
      performed_by: record.performedBy,
      audit_date: record.date,
      items: record.items,
      total_variance_cost: record.totalVarianceCost,
      notes: record.notes || '',
      status: record.status || 'approved',
    });
    if (error) {
      console.warn('Supabase sync stock_opname note:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase sync stock_opname caught:', err);
    return false;
  }
}

/**
 * Resiliently sync single Stock Depletion Log to Supabase
 */
export async function syncDepletionLogToSupabase(log: StockDepletionLog): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('stock_depletion_logs').upsert({
      id: log.id,
      order_id: log.orderId,
      order_number: log.orderNumber,
      outlet_id: log.outletId,
      outlet_name: log.outletName,
      raw_material_id: log.rawMaterialId,
      raw_material_name: log.rawMaterialName,
      quantity_deducted: log.quantityDeducted,
      unit: log.unit,
      created_at: log.createdAt,
    });
    if (error) {
      console.warn('Supabase sync depletion log note:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase sync depletion log caught:', err);
    return false;
  }
}

