'use server';

import { createClient } from '@/utils/supabase/server';

export interface TestConnectionResult {
  success: boolean;
  message: string;
  productsCount: number;
  outletsStatus?: { ok: boolean; hasCodeColumn: boolean; message: string };
  ordersStatus?: { ok: boolean; message: string };
  data: Array<{
    id: string;
    name: string;
    price: number;
    category?: string;
  }> | null;
  error?: string | null;
}

export async function testSupabaseConnection(): Promise<TestConnectionResult> {
  try {
    const supabase = await createClient();

    // 1. Query products table
    const { data: prodData, error: prodError } = await supabase
      .from('products')
      .select('*')
      .limit(10);

    if (prodError) {
      return {
        success: false,
        message: `Terhubung ke Supabase, namun query 'products' error: ${prodError.message}`,
        productsCount: 0,
        data: null,
        error: prodError.message,
      };
    }

    // 2. Diagnostic test on outlets (checking code column)
    const { error: outletErr } = await supabase.from('outlets').select('id, name, code').limit(1);
    const hasCodeColumn = !outletErr || !outletErr.message.includes('code');
    const outletsStatus = {
      ok: !outletErr,
      hasCodeColumn,
      message: outletErr
        ? outletErr.message
        : 'Tabel outlets aktif dengan kolom code.',
    };

    // 3. Diagnostic test on orders
    const { error: orderErr } = await supabase.from('orders').select('id, order_number').limit(1);
    const ordersStatus = {
      ok: !orderErr,
      message: orderErr
        ? orderErr.message
        : 'Tabel orders aktif dan siap menerima data transaksi.',
    };

    const formattedData = (prodData ?? []).map((item: Record<string, unknown>) => ({
      id: String(item.id ?? ''),
      name: String(item.name ?? item.title ?? 'Product'),
      price: Number(item.price ?? 0),
      category: item.category ? String(item.category) : undefined,
    }));

    let summaryMessage = 'Koneksi ke Supabase berhasil!';
    if (!hasCodeColumn || !ordersStatus.ok) {
      summaryMessage =
        'Koneksi Supabase aktif, namun skema tabel perlu diperbarui (kolom code pada outlets atau tabel orders belum ada). Silakan jalankan script supabase/schema.sql di Supabase SQL Editor.';
    }

    return {
      success: true,
      message: summaryMessage,
      productsCount: formattedData.length,
      outletsStatus,
      ordersStatus,
      data: formattedData,
      error: !hasCodeColumn || !ordersStatus.ok ? outletsStatus.message : null,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: 'Gagal terhubung ke Supabase. Periksa NEXT_PUBLIC_SUPABASE_URL dan kunci anon di .env.local.',
      productsCount: 0,
      data: null,
      error: errorMessage,
    };
  }
}
