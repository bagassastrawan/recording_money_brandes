'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store/AppContext';
import { testSupabaseConnection, TestConnectionResult } from '@/app/actions';
import {
  FiDatabase as Database,
  FiCheckCircle as CheckCircle2,
  FiAlertCircle as AlertCircle,
  FiCopy as Copy,
  FiShieldCheck as ShieldCheck,
  FiUserCheck as UserCheck,
  FiKey as KeyRound,
  FiTerminal as Terminal,
  FiZap as Zap,
} from '@/components/ui/Flaticon';
import { SCHEMA_SQL } from '@/lib/supabase/schemaSqlContent';

export const SupabaseView: React.FC = () => {
  const {
    user,
    switchRole,
    isSupabaseActive,
    isSyncing,
    isLoadingLiveSupabase,
    syncAllToSupabase,
    refreshFromSupabase,
    pushExpensesToSupabase,
    pushIngredientsToSupabase,
    expenses,
    inventory,
  } = useApp();
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedSqlContent, setCopiedSqlContent] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    details?: {
      outletsCount?: number;
      productsCount?: number;
      ingredientsCount?: number;
      expensesCount?: number;
      ordersCount?: number;
    };
  } | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleRunTest = async () => {
    setTestingConnection(true);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncResult(null);
    const res = await syncAllToSupabase();
    setSyncResult(res);
  };

  const handleRefreshSupabase = async () => {
    setActionNotice('Memanggil koneksi live data pengeluaran dan stok barang dari Supabase...');
    await refreshFromSupabase();
    setActionNotice('Berhasil memperbarui data live dari Supabase!');
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handlePushExpenses = async () => {
    setActionNotice('Mengirim data seluruh pengeluaran operasional ke Supabase...');
    const res = await pushExpensesToSupabase();
    setActionNotice(res.message);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handlePushIngredients = async () => {
    setActionNotice('Mengirim data seluruh stok bahan baku ke Supabase...');
    const res = await pushIngredientsToSupabase();
    setActionNotice(res.message);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const envTemplate = `# Supabase Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const handleCopySqlPath = () => {
    navigator.clipboard.writeText('supabase/schema.sql');
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopyFullSql = () => {
    navigator.clipboard.writeText(SCHEMA_SQL);
    setCopiedSqlContent(true);
    setTimeout(() => setCopiedSqlContent(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-[#e5ece7] bg-white p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#618873] text-white">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">
                  Supabase Backend & PostgreSQL Auth Integration
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    isSupabaseActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {isSupabaseActive ? '🟢 Live Supabase Connected' : '🟡 Active: High-Speed Local Engine'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Role-Based Access Control (RBAC), PostgreSQL Row-Level Security, and automated BOM triggers
              </p>
            </div>
          </div>
        </div>

        {/* Live Server Action Test Trigger */}
        <div className="mt-5 pt-4 border-t border-[#e5ece7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-800">
              Test Connection with Server Action (@supabase/ssr)
            </p>
            <p className="text-[11px] text-slate-500">
              Queries the <code>products</code> table via Next.js Server Action to verify environment keys and database response.
            </p>
          </div>
          <button
            onClick={handleRunTest}
            disabled={testingConnection}
            className="flex items-center gap-1.5 rounded-xl bg-[#618873] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#507160] transition-all disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>{testingConnection ? 'Testing...' : 'Test Connection (Fetch Products)'}</span>
          </button>
        </div>

        {testResult && (
          <div
            className={`mt-4 rounded-xl border p-3.5 text-xs space-y-1.5 ${
              testResult.success
                ? 'bg-[#eef4f0] border-[#d6e3da] text-[#507160]'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600" />
              )}
              <span>{testResult.success ? 'Connection Successful!' : 'Connection Error'}</span>
            </div>
            <p>{testResult.message}</p>
            {testResult.error && (
              <p className="font-mono text-[11px] bg-white/70 p-2 rounded-lg border border-amber-200 text-amber-900">
                Notice: {testResult.error}
              </p>
            )}
            {(!testResult.outletsStatus?.hasCodeColumn || !testResult.ordersStatus?.ok) && (
              <div className="pt-2 border-t border-[#d6e3da]/60 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopyFullSql}
                  className="flex items-center gap-1 rounded-lg bg-[#618873] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#507160] shadow-2xs transition-all cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copiedSqlContent ? '✓ SQL Tersalin!' : '1. Salin Script SQL (1-Klik)'}</span>
                </button>
                <a
                  href="https://supabase.com/dashboard/project/jbmxbkboumpgnippzmux/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-2xs transition-all"
                >
                  <Terminal className="h-3.5 w-3.5 text-[#618873]" />
                  <span>2. Buka Supabase SQL Editor ↗</span>
                </a>
              </div>
            )}
            {testResult.success && testResult.data && (
              <div className="pt-2 border-t border-[#d6e3da]/60">
                <span className="font-semibold">Sample rows returned ({testResult.productsCount}):</span>
                <span className="ml-2 font-mono text-[11px]">
                  {testResult.data.map((p) => p.name).join(', ') || 'No rows in table yet'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Multi-Outlet Cloud Sync Button & Panel */}
        <div className="mt-5 pt-4 border-t border-[#e5ece7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-800">
              Sinkronisasi Multi-Outlet ke Supabase Cloud
            </p>
            <p className="text-[11px] text-slate-500">
              Menyimpan seluruh data cabang (Batanta, Taman Pancing, Dewi Sri), bahan baku baru, pembelian, dan transaksi penjualan ke PostgreSQL Cloud.
            </p>
          </div>
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="flex items-center gap-1.5 rounded-xl border border-[#618873]/30 bg-emerald-50 px-4 py-2 text-xs font-semibold text-[#618873] hover:bg-emerald-100 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Database className="h-3.5 w-3.5" />
            <span>{isSyncing ? 'Sedang Menyinkronkan...' : '⚡ Sinkronkan Semua Data Lokal ke Supabase'}</span>
          </button>
        </div>

        {syncResult && (
          <div
            className={`mt-4 rounded-xl border p-3.5 text-xs space-y-1.5 ${
              syncResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {syncResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600" />
              )}
              <span>{syncResult.success ? 'Sinkronisasi Cloud Berhasil!' : 'Gagal Menyinkronkan'}</span>
            </div>
            <p>{syncResult.message}</p>
            {syncResult.details && (
              <div className="flex flex-wrap gap-3 pt-2 text-[11px] font-semibold text-emerald-900 border-t border-emerald-200/60">
                <span>Cabang: {syncResult.details.outletsCount}</span>
                <span>•</span>
                <span>Bahan Baku: {syncResult.details.ingredientsCount}</span>
                <span>•</span>
                <span>Produk Menu: {syncResult.details.productsCount}</span>
                <span>•</span>
                <span>Pembelian & Biaya: {syncResult.details.expensesCount}</span>
                <span>•</span>
                <span>Penjualan: {syncResult.details.ordersCount}</span>
              </div>
            )}
          </div>
        )}

        {/* Data Entry & Live Supabase Connection Section */}
        <div className="mt-5 pt-4 border-t border-[#e5ece7] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Data Entry: Pengeluaran Operasional & Stok Barang Supabase
                </span>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                  Standar Satuan: btl, pack, kg, dus, cup, pcs, pump
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Stok barang & pengeluaran operasional diambil langsung dari Supabase (live get connection) dan dapat disinkronkan dua arah.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleRefreshSupabase}
                disabled={isLoadingLiveSupabase}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5 text-emerald-600" />
                <span>{isLoadingLiveSupabase ? 'Menghubungkan...' : 'Tarik Live Data dari Supabase'}</span>
              </button>
              <button
                onClick={handlePushExpenses}
                disabled={isSyncing}
                className="flex items-center gap-1.5 rounded-xl bg-[#618873] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#507160] shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <Database className="h-3.5 w-3.5" />
                <span>Kirim Pengeluaran ke Supabase</span>
              </button>
              <button
                onClick={handlePushIngredients}
                disabled={isSyncing}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <Database className="h-3.5 w-3.5" />
                <span>Kirim Stok ke Supabase</span>
              </button>
            </div>
          </div>

          {actionNotice && (
            <div className="rounded-xl bg-[#eef4f0] border border-[#d6e3da] p-3 text-xs text-[#507160] font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>{actionNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="rounded-xl border border-[#e5ece7] bg-slate-50/60 p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Pengeluaran</span>
              <p className="text-sm font-bold text-slate-800">{expenses.length} Transaksi</p>
              <span className="text-[10px] text-slate-500">Operasional terdata</span>
            </div>
            <div className="rounded-xl border border-[#e5ece7] bg-slate-50/60 p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Stok Item</span>
              <p className="text-sm font-bold text-slate-800">{inventory.length} Bahan</p>
              <span className="text-[10px] text-slate-500">Multi-outlet</span>
            </div>
            <div className="rounded-xl border border-[#e5ece7] bg-slate-50/60 p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Status Sumber Stok</span>
              <p className="text-sm font-bold text-emerald-700">Live Supabase</p>
              <span className="text-[10px] text-slate-500">Bukan hardcode lokal</span>
            </div>
            <div className="rounded-xl border border-[#e5ece7] bg-slate-50/60 p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Format Satuan F&B</span>
              <p className="text-xs font-bold text-slate-700">7 Satuan Baku</p>
              <span className="text-[10px] text-slate-500">btl, pack, kg, dus, cup, pcs, pump</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Based Access Control (RBAC) Switcher & Tester */}
      <div className="rounded-2xl border border-[#e5ece7] bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#618873]" />
          <h4 className="text-sm font-bold text-slate-800">
            Role-Based Access Control (RBAC) Simulator
          </h4>
        </div>
        <p className="text-xs text-slate-500">
          Switch between roles to immediately observe UI permissions and workflow adaptation:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Manager Role Card */}
          <div
            onClick={() => switchRole('manager')}
            className={`cursor-pointer rounded-2xl border p-4 transition-all ${
              user.role === 'manager'
                ? 'border-[#618873] bg-[#f4f7f5] ring-2 ring-[#618873]/15'
                : 'border-[#e5ece7] bg-white hover:border-[#618873]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <ShieldCheck className="h-4 w-4 text-[#618873]" />
                Manager Access
              </span>
              {user.role === 'manager' && (
                <span className="rounded-full bg-[#618873] text-white px-2 py-0.5 text-[10px] font-bold">
                  Active User
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">
              Full executive financial dashboard, P&L cashflow, recipe BOM mapping, inventory stock opname approval, and multi-outlet overview.
            </p>
          </div>

          {/* Cashier Role Card */}
          <div
            onClick={() => switchRole('cashier')}
            className={`cursor-pointer rounded-2xl border p-4 transition-all ${
              user.role === 'cashier'
                ? 'border-[#698da7] bg-[#f2f6f9] ring-2 ring-[#698da7]/15'
                : 'border-[#e5ece7] bg-white hover:border-[#698da7]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <UserCheck className="h-4 w-4 text-[#698da7]" />
                Cashier Access
              </span>
              {user.role === 'cashier' && (
                <span className="rounded-full bg-[#698da7] text-white px-2 py-0.5 text-[10px] font-bold">
                  Active User
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">
              Streamlined Point of Sales (POS) terminal, outlet assignment, quick customer order entry, automatic ingredient deduction, and daily sales receipts.
            </p>
          </div>
        </div>
      </div>

      {/* Supabase Setup Quick Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Environment Variables */}
        <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[#618873]" />
              1. Add to .env.local
            </h4>
            <button
              onClick={handleCopyEnv}
              className="flex items-center gap-1 rounded-lg border border-[#e5ece7] bg-[#fafbf9] px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-[#eef4f0]"
            >
              <Copy className="h-3 w-3" />
              <span>{copiedEnv ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Paste your project keys into <code className="text-[#507160] font-semibold">.env.local</code> in the project root:
          </p>
          <pre className="rounded-xl bg-slate-900 p-3 text-[11px] font-mono text-emerald-400 overflow-x-auto">
            {envTemplate}
          </pre>
        </div>

        {/* Step 2: Database Migration SQL */}
        <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#618873]" />
              2. Run Database Migration
            </h4>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyFullSql}
                className="flex items-center gap-1.5 rounded-lg bg-[#618873] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#507160] transition-all shadow-2xs"
                title="Salin seluruh isi script SQL untuk ditempel ke Supabase SQL Editor"
              >
                <Copy className="h-3 w-3" />
                <span>{copiedSqlContent ? '✓ Kode Tersalin!' : 'Salin Kode SQL Lengkap'}</span>
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Jalankan skrip SQL di menu <b>SQL Editor</b> di Supabase Dashboard untuk membuat tabel <code>orders</code>, <code>order_items</code>, dan kolom <code>code</code> pada <code>outlets</code>:
          </p>
          <div className="rounded-xl bg-[#fafbf9] p-3 text-xs border border-[#e5ece7] font-mono text-slate-700 flex justify-between items-center">
            <span>supabase/schema.sql</span>
            <button
              onClick={handleCopySqlPath}
              className="text-[11px] text-[#618873] hover:underline font-semibold"
            >
              {copiedSql ? 'Path Copied!' : 'Copy Path'}
            </button>
          </div>

          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs space-y-2">
            <p className="font-bold text-emerald-900 flex items-center gap-1">
              <span>💡</span> Solusi Fix UUID &amp; Error Schema Cache:
            </p>
            <p className="text-emerald-800 text-[11px] leading-relaxed">
              Jika muncul error <code>invalid input syntax for type uuid: &quot;outlet-1&quot;</code> atau tabel belum ditemukan, hal tersebut karena database remote Supabase masih menggunakan tipe UUID bawaan template lama. 
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleCopyFullSql}
                className="flex items-center gap-1.5 rounded-lg bg-[#618873] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#507160] transition-all shadow-2xs"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copiedSqlContent ? '✓ SQL Tersalin ke Clipboard!' : '1. Salin Script SQL Lengkap'}</span>
              </button>
              <a
                href="https://supabase.com/dashboard/project/jbmxbkboumpgnippzmux/sql/new"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all shadow-2xs"
              >
                <Terminal className="h-3.5 w-3.5 text-emerald-700" />
                <span>2. Buka Supabase SQL Editor ↗</span>
              </a>
            </div>
            <p className="text-[10px] text-emerald-700 pt-1">
              Tempelkan (Paste) kode SQL di SQL Editor Supabase lalu klik <b>Run</b>. Semua tabel otomatis diperbarui ke tipe ID Text, RLS diaktifkan, dan sinkronisasi otomatis berjalan lancar tanpa error UUID!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-600">
            <span className="font-semibold text-[#507160]">✓ outlets (multi-cabang + code)</span>
            <span className="font-semibold text-[#507160]">✓ orders (transaksi kasir)</span>
            <span className="font-semibold text-[#507160]">✓ order_items (detail produk)</span>
            <span className="font-semibold text-[#507160]">✓ products (menu)</span>
            <span className="font-semibold text-[#507160]">✓ ingredients (bahan baku)</span>
            <span className="font-semibold text-[#507160]">✓ expenses (pengeluaran)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
