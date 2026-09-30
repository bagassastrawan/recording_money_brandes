'use client';

import { useState } from 'react';
import Link from 'next/link';
import { testSupabaseConnection, TestConnectionResult } from '@/app/actions';
import { SCHEMA_SQL } from '@/lib/supabase/schemaSqlContent';

export default function SupabaseTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestConnectionResult | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleTest = async () => {
    setLoading(true);
    try {
      const res = await testSupabaseConnection();
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-6 text-slate-800">
      <div className="w-full max-w-xl bg-white border border-[#e5ece7] rounded-2xl p-6 shadow-sm space-y-6">
        <div className="border-b border-[#e5ece7] pb-4">
          <h1 className="text-xl font-bold text-slate-800">Supabase Connection Test</h1>
          <p className="text-xs text-slate-500 mt-1">
            Tests the Next.js Server Action with <code>@supabase/ssr</code> querying the <code>products</code> table.
          </p>
        </div>

        <div>
          <button
            onClick={handleTest}
            disabled={loading}
            className="w-full py-3 px-4 bg-[#618873] hover:bg-[#507160] text-white font-semibold text-sm rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Testing connection...' : '⚡ Test Supabase Connection (Fetch Products)'}
          </button>
        </div>

        {result && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-3 ${
              result.success && !result.error
                ? 'bg-[#eef4f0] border-[#d6e3da] text-[#507160]'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              <span>{result.success && !result.error ? '✅ Connection Successful' : '⚠️ Skema Perlu Diperbarui'}</span>
            </div>
            <p className="leading-relaxed">{result.message}</p>

            {result.error && (
              <div className="p-2.5 rounded-lg bg-white/90 border border-amber-300 font-mono text-[11px] text-amber-950">
                Notice: {result.error}
              </div>
            )}

            {/* Quick Action Buttons to Fix Schema in 1 Click */}
            {(!result.outletsStatus?.hasCodeColumn || !result.ordersStatus?.ok) && (
              <div className="pt-2 border-t border-amber-200/80 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopySql}
                  className="px-3 py-1.5 bg-[#618873] hover:bg-[#507160] text-white font-bold rounded-lg text-xs shadow-2xs transition-all cursor-pointer"
                >
                  {copiedSql ? '✓ Script SQL Tersalin!' : '1. Salin Script SQL (1-Klik)'}
                </button>
                <a
                  href="https://supabase.com/dashboard/project/jbmxbkboumpgnippzmux/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold rounded-lg text-xs shadow-2xs transition-all"
                >
                  2. Buka Supabase SQL Editor ↗
                </a>
              </div>
            )}

            {result.success && result.data && (
              <div className="mt-3 pt-3 border-t border-[#d6e3da]/60">
                <p className="font-semibold mb-2">Fetched {result.productsCount} products:</p>
                <div className="space-y-1.5 font-mono text-[11px]">
                  {result.data.length === 0 ? (
                    <p className="italic text-slate-500">Products table is connected but empty.</p>
                  ) : (
                    result.data.map((p) => (
                      <div key={p.id} className="bg-white p-2 rounded-md border border-[#d6e3da] flex justify-between">
                        <span>{p.name}</span>
                        <span className="font-bold">Rp {p.price?.toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-[#618873] font-semibold hover:underline">
            ← Back to Brandes Money Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
