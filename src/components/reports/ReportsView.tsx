'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/store/AppContext';
import { Order } from '@/types';
import { formatCurrency, formatDateTime, exportToCSV } from '@/lib/utils/formatters';
import {
  FiDownload as Download,
  FiLayers as Layers,
  FiDollarSign as DollarSign,
  FiTrendingUp as TrendingUp,
  FiTrendingDown as TrendingDown,
  FiSearch as Search,
  FiPrinter as Printer,
  FiPackage as Package,
  FiShield as Shield,
} from '@/components/ui/Flaticon';
import { CashflowPDFReport } from '@/components/reports/CashflowPDFReport';
import { StockPDFReport } from '@/components/reports/StockPDFReport';

export const ReportsView: React.FC = () => {
  const {
    orders,
    expenses,
    products,
    inventory,
    stockDepletionLogs,
    outlets,
    selectedOutletId,
    currentOutlet,
    user,
    isSupabaseActive,
    fetchTodaySales,
  } = useApp();

  const isManager = user.role === 'manager';
  const isCashier = user.role === 'cashier';

  const [activeTab, setActiveTab] = useState<'sales' | 'cashflow' | 'stock' | 'depletion'>('sales');
  // Cashier cannot access cashflow: derive without cascading render
  const effectiveTab = isCashier && activeTab === 'cashflow' ? 'sales' : activeTab;

  const [searchDepletion, setSearchDepletion] = useState('');
  const [searchStock, setSearchStock] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isStockPdfModalOpen, setIsStockPdfModalOpen] = useState(false);

  // Persistent Cloud Supabase Orders State
  const [supabaseOrders, setSupabaseOrders] = useState<Order[] | null>(null);

  // Automatically fetch persistent transactions from Supabase in background
  useEffect(() => {
    let ignore = false;
    if (!isSupabaseActive) return;

    fetchTodaySales(selectedOutletId)
      .then((res) => {
        if (!ignore && res.success && res.data && res.data.length > 0) {
          setSupabaseOrders(res.data);
        }
      })
      .catch(() => {
        // Graceful fallback to local orders
      });

    return () => {
      ignore = true;
    };
  }, [fetchTodaySales, isSupabaseActive, selectedOutletId]);

  // Filter datasets by selected outlet
  const filteredOrders = useMemo(() => {
    return orders.filter((o) =>
      selectedOutletId === 'all' ? true : o.outletId === selectedOutletId
    );
  }, [orders, selectedOutletId]);

  // Effective Active Orders: Merges persistent cloud orders with local session orders seamlessly
  const activeOrders = useMemo(() => {
    if (!supabaseOrders || supabaseOrders.length === 0) {
      return filteredOrders;
    }
    const map = new Map<string, Order>();
    supabaseOrders.forEach((o) => map.set(o.id, o));
    filteredOrders.forEach((o) => map.set(o.id, o));
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [supabaseOrders, filteredOrders]);

  const filteredExpenses = expenses.filter((e) =>
    selectedOutletId === 'all' ? true : e.outletId === selectedOutletId
  );

  const filteredDepletions = stockDepletionLogs.filter((d) => {
    const matchOutlet = selectedOutletId === 'all' ? true : d.outletId === selectedOutletId;
    const matchSearch =
      d.rawMaterialName.toLowerCase().includes(searchDepletion.toLowerCase()) ||
      d.orderNumber.toLowerCase().includes(searchDepletion.toLowerCase());
    return matchOutlet && matchSearch;
  });

  const filteredStock = useMemo(() => {
    return inventory.filter((item) => {
      const matchOutlet = isCashier
        ? item.outletId === (user.outletId || currentOutlet?.id || 'outlet-1')
        : (selectedOutletId === 'all' ? true : item.outletId === selectedOutletId);
      const matchSearch =
        item.name.toLowerCase().includes(searchStock.toLowerCase()) ||
        item.category.toLowerCase().includes(searchStock.toLowerCase());
      return matchOutlet && matchSearch;
    });
  }, [inventory, isCashier, user.outletId, currentOutlet?.id, selectedOutletId, searchStock]);

  const stockSummary = useMemo(() => {
    const total = filteredStock.length;
    const low = filteredStock.filter((i) => i.currentStock <= i.minThreshold).length;
    const safe = total - low;
    return { total, low, safe };
  }, [filteredStock]);

  // Financial aggregates (using activeOrders: live Supabase data or local filter)
  const totalRevenue = activeOrders.reduce((sum, o) => sum + o.total, 0);
  const totalTax = activeOrders.reduce((sum, o) => sum + o.tax, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netCashflow = totalRevenue - totalExpenses;
  const aov = activeOrders.length > 0 ? Math.round(totalRevenue / activeOrders.length) : 0;

  // Payment breakdown
  const qrisTotal = activeOrders
    .filter((o) => o.paymentMethod === 'qris')
    .reduce((s, o) => s + o.total, 0);
  const cashTotal = activeOrders
    .filter((o) => o.paymentMethod === 'cash')
    .reduce((s, o) => s + o.total, 0);
  const cardTotal = activeOrders
    .filter((o) => o.paymentMethod === 'debit' || o.paymentMethod === 'credit')
    .reduce((s, o) => s + o.total, 0);

  // CSV Exporters
  const exportSalesReport = () => {
    const rows = activeOrders.map((o) => ({
      OrderNumber: o.orderNumber,
      Date: o.createdAt,
      Outlet: o.outletName,
      Cashier: o.cashierName,
      Items: o.items.map((i) => `${i.productName} (${i.quantity}x)`).join('; '),
      Subtotal: o.subtotal,
      Tax: o.tax,
      Total: o.total,
      PaymentMethod: o.paymentMethod,
    }));
    exportToCSV(`daily_sales_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const exportCashflowReport = () => {
    const rows = [
      { Metric: 'Gross POS Revenue', Amount: totalRevenue },
      { Metric: 'Tax Collected (10%)', Amount: totalTax },
      { Metric: 'Total Operational Expenses', Amount: totalExpenses },
      { Metric: 'Net Operating Cashflow', Amount: netCashflow },
    ];
    exportToCSV(`cashflow_summary_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const exportDepletionReport = () => {
    const rows = filteredDepletions.map((d) => ({
      Timestamp: d.createdAt,
      OrderNumber: d.orderNumber,
      Outlet: d.outletName,
      RawMaterial: d.rawMaterialName,
      QuantityDeducted: d.quantityDeducted,
      Unit: d.unit,
    }));
    exportToCSV(`stock_depletion_audit_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5ece7] pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              effectiveTab === 'sales'
                ? 'bg-[#618873] text-white shadow-2xs'
                : 'bg-white border border-[#e5ece7] text-slate-600 hover:bg-[#f4f7f5]'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            <span>Daily Sales Report</span>
          </button>

          {/* Cashflow is EXCLUSIVE to Manager (Hidden for Cashier) */}
          {isManager && (
            <button
              onClick={() => setActiveTab('cashflow')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                effectiveTab === 'cashflow'
                  ? 'bg-[#618873] text-white shadow-2xs'
                  : 'bg-white border border-[#e5ece7] text-slate-600 hover:bg-[#f4f7f5]'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Cashflow (Revenue - Expenses)</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              effectiveTab === 'stock'
                ? 'bg-[#618873] text-white shadow-2xs'
                : 'bg-white border border-[#e5ece7] text-slate-600 hover:bg-[#f4f7f5]'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Laporan Stok Outlet</span>
          </button>

          <button
            onClick={() => setActiveTab('depletion')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              effectiveTab === 'depletion'
                ? 'bg-[#618873] text-white shadow-2xs'
                : 'bg-white border border-[#e5ece7] text-slate-600 hover:bg-[#f4f7f5]'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Log Pengurangan Stok</span>
          </button>
        </div>

        {/* Export Buttons: Strictly enforce permissions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sales Tab Exports */}
          {effectiveTab === 'sales' && (
            <>
              {isManager ? (
                <>
                  <button
                    onClick={() => setIsPdfModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-[#618873] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#507160] transition-all"
                    title="Download / Cetak Laporan Penjualan Hari Ini (PDF)"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Laporan PDF Ringkas</span>
                  </button>

                  <button
                    onClick={exportSalesReport}
                    className="flex items-center gap-1.5 rounded-xl border border-[#e5ece7] bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#f4f7f5] shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5 text-[#618873]" />
                    <span>Sales CSV</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                  <Shield className="h-3.5 w-3.5 text-slate-400" />
                  <span>Mode Kasir: Unduh PDF/CSV dikhususkan untuk Manajer</span>
                </div>
              )}
            </>
          )}

          {/* Cashflow Tab Exports (Manager Only) */}
          {effectiveTab === 'cashflow' && isManager && (
            <button
              onClick={exportCashflowReport}
              className="flex items-center gap-1.5 rounded-xl border border-[#e5ece7] bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#f4f7f5] shadow-2xs"
            >
              <Download className="h-3.5 w-3.5 text-[#618873]" />
              <span>Cashflow CSV</span>
            </button>
          )}

          {/* Stock & Depletion Tab Exports: BOTH Cashier & Manager can download Stock PDF */}
          {(effectiveTab === 'stock' || effectiveTab === 'depletion') && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsStockPdfModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#618873] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#507160] transition-all"
                title="Unduh / Cetak Laporan Stok Bahan Baku Outlet (PDF)"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Unduh PDF Stok</span>
              </button>

              {isManager && effectiveTab === 'depletion' && (
                <button
                  onClick={exportDepletionReport}
                  className="flex items-center gap-1.5 rounded-xl border border-[#e5ece7] bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#f4f7f5] shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5 text-[#618873]" />
                  <span>Depletion CSV</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          SUB-TAB 1: DAILY SALES REPORT
      ======================================================== */}
      {/* ========================================================
          SUB-TAB 1: DAILY SALES REPORT
      ======================================================== */}
      {effectiveTab === 'sales' && (
        <div className="space-y-6">
          {/* Key Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Gross Sales Total
              </span>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-xs text-slate-500 mt-1">{activeOrders.length} completed orders</p>
            </div>

            <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Average Order Value (AOV)
              </span>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800">
                {formatCurrency(aov)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Per transaction ticket</p>
            </div>

            <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                PB1 Restaurant Tax
              </span>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800">
                {formatCurrency(totalTax)}
              </p>
              <p className="text-xs text-slate-500 mt-1">10% local government tax</p>
            </div>

            <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Payment Channel Split
              </span>
              <div className="mt-2 space-y-1 text-[11px] font-semibold">
                <div className="flex justify-between">
                  <span className="text-slate-500">QRIS:</span>
                  <span className="text-slate-800">{formatCurrency(qrisTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cash:</span>
                  <span className="text-slate-800">{formatCurrency(cashTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Card EDC:</span>
                  <span className="text-slate-800">{formatCurrency(cardTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Orders Ledger */}
          <div className="rounded-2xl border border-[#e5ece7] bg-white shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#e5ece7] flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Daily Sales Ledger</h4>
                <p className="text-xs text-slate-500">
                  Riwayat transaksi dan ringkasan pembayaran pesanan POS
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5ece7] bg-[#fafbf9] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Outlet</th>
                    <th className="py-3 px-4">Cashier</th>
                    <th className="py-3 px-4">Items Ordered</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f4f2]">
                  {activeOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Belum ada data penjualan tercatat. Transaksi baru yang dibuat di tab Kasir (POS) akan otomatis tampil dan tersimpan permanen di sini.
                      </td>
                    </tr>
                  ) : (
                    activeOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-[#fafbf9] transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">{o.orderNumber}</td>
                        <td className="py-3 px-4 text-slate-500">{formatDateTime(o.createdAt)}</td>
                        <td className="py-3 px-4 text-slate-700">{o.outletName}</td>
                        <td className="py-3 px-4 text-slate-600">{o.cashierName}</td>
                        <td className="py-3 px-4 text-slate-700">
                          {o.items.map((i) => `${i.productName} (${i.quantity}x)`).join(', ')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block rounded-md bg-[#eef4f0] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#507160]">
                            {o.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          {formatCurrency(o.subtotal)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatCurrency(o.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 2: CASHFLOW (REVENUE - EXPENSES)
      ======================================================== */}
      {effectiveTab === 'cashflow' && (
        <div className="space-y-6">
          {/* Cashflow Equation Card */}
          <div className="rounded-2xl border border-[#e5ece7] bg-white p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h4 className="text-base font-bold text-slate-800 mb-1">
                  Net Cashflow Statement (Revenue - Expenses)
                </h4>
                <p className="text-xs text-slate-500">
                  Perhitungan formal likuiditas operasional, laba bersih, dan arus kas harian
                </p>
              </div>
              <button
                onClick={() => setIsPdfModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-[#618873] px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-[#507160] transition-all shrink-0"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak Laporan PDF Ringkas</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Revenue */}
              <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-5">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                  <span>Gross POS Revenue (+)</span>
                  <TrendingUp className="h-4 w-4" />
                </div>
                <p className="mt-2 text-2xl font-black text-emerald-800">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-[11px] text-emerald-700/80 mt-1">From drinks, food & retail</p>
              </div>

              {/* Overhead Expenses */}
              <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-5">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
                  <span>Operating Expenses (-)</span>
                  <TrendingDown className="h-4 w-4" />
                </div>
                <p className="mt-2 text-2xl font-black text-amber-800">
                  {formatCurrency(totalExpenses)}
                </p>
                <p className="text-[11px] text-amber-700/80 mt-1">Salaries, utilities, restocks</p>
              </div>

              {/* Net Cashflow */}
              <div
                className={`rounded-2xl border p-5 ${
                  netCashflow >= 0
                    ? 'bg-[#eef4f0] border-[#d6e3da]'
                    : 'bg-rose-50 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Net Operating Cashflow (=)</span>
                  <DollarSign className="h-4 w-4" />
                </div>
                <p
                  className={`mt-2 text-2xl font-black ${
                    netCashflow >= 0 ? 'text-[#507160]' : 'text-rose-600'
                  }`}
                >
                  {formatCurrency(netCashflow)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Margin: {totalRevenue > 0 ? ((netCashflow / totalRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>

          {/* Breakdown by Outlet Table */}
          <div className="rounded-2xl border border-[#e5ece7] bg-white shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#e5ece7]">
              <h4 className="text-sm font-bold text-slate-800">Outlet Performance Breakdown</h4>
              <p className="text-xs text-slate-500">Comparative revenue vs cost per branch</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5ece7] bg-[#fafbf9] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Outlet / Branch</th>
                    <th className="py-3 px-4">Transactions</th>
                    <th className="py-3 px-4 text-right">Revenue</th>
                    <th className="py-3 px-4 text-right">Expenses</th>
                    <th className="py-3 px-4 text-right">Net Margin</th>
                    <th className="py-3 px-4 text-right">Profit Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f4f2]">
                  {outlets.map((outlet) => {
                    const outOrders = orders.filter((o) => o.outletId === outlet.id);
                    const outExpenses = expenses.filter((e) => e.outletId === outlet.id);
                    const rev = outOrders.reduce((s, o) => s + o.total, 0);
                    const exp = outExpenses.reduce((s, e) => s + e.amount, 0);
                    const net = rev - exp;
                    const margin = rev > 0 ? ((net / rev) * 100).toFixed(1) : '0';

                    return (
                      <tr key={outlet.id} className="hover:bg-[#fafbf9] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {outlet.name}
                          <span className="block text-[11px] text-slate-400 font-normal">
                            {outlet.address}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {outOrders.length} orders
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                          {formatCurrency(rev)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-amber-600">
                          {formatCurrency(exp)}
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-black ${
                            net >= 0 ? 'text-[#507160]' : 'text-rose-600'
                          }`}
                        >
                          {formatCurrency(net)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                          {margin}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB: OUTLET INVENTORY STOCK REPORT
      ======================================================== */}
      {effectiveTab === 'stock' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Bahan Baku
              </span>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800">
                {stockSummary.total} Jenis
              </p>
              <p className="text-xs text-slate-500 mt-1">Tersedia di outlet terpilih</p>
            </div>

            <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Stok Aman
              </span>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
                {stockSummary.safe} Bahan
              </p>
              <p className="text-xs text-slate-500 mt-1">Di atas batas minimum (Threshold)</p>
            </div>

            <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Stok Rendah / Kritis
              </span>
              <p className="mt-2 text-2xl font-bold tracking-tight text-rose-600">
                {stockSummary.low} Bahan
              </p>
              <p className="text-xs text-slate-500 mt-1">Perlu restock segera</p>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-slate-800">
                  Daftar Stok Bahan Baku Outlet
                </h4>
                <p className="text-xs text-slate-500">
                  Setiap outlet memiliki stok mandiri. Kasir & Manajer dapat mengunduh laporan PDF resmi.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari bahan baku..."
                    value={searchStock}
                    onChange={(e) => setSearchStock(e.target.value)}
                    className="w-full rounded-xl border border-[#e5ece7] bg-[#fafbf9] py-1.5 pl-8 pr-3 text-xs text-slate-700 focus:outline-hidden focus:border-[#618873]"
                  />
                </div>

                <button
                  onClick={() => setIsStockPdfModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#618873] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#507160] transition-all shrink-0"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Unduh PDF Stok</span>
                </button>
              </div>
            </div>

            {filteredStock.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#e5ece7] p-8 text-center text-slate-400 text-xs">
                <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">Tidak ada data bahan baku ditemukan</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Pilih cabang outlet lain atau ubah kata kunci pencarian.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e5ece7] bg-[#fafbf9] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3 w-12 text-center">No</th>
                      <th className="py-3 px-3">Nama Bahan Baku</th>
                      <th className="py-3 px-3">Kategori</th>
                      <th className="py-3 px-3 text-right">Stok Fisik</th>
                      <th className="py-3 px-3 text-center">Satuan</th>
                      <th className="py-3 px-3 text-right">Batas Min.</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f4f2]">
                    {filteredStock.map((item, idx) => {
                      const isLow = item.currentStock <= item.minThreshold;
                      return (
                        <tr key={item.id} className="hover:bg-[#fafbf9] transition-colors">
                          <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800">{item.name}</td>
                          <td className="py-3 px-3 text-slate-500">{item.category}</td>
                          <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                            {item.currentStock}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600 font-medium">
                            {item.unit}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-500 font-medium">
                            {item.minThreshold} {item.unit}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isLow
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isLow ? 'Perlu Restock' : 'Aman'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 3: STOCK DEPLETION LOGS (BOM INGREDIENT AUDIT)
      ======================================================== */}
      {effectiveTab === 'depletion' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-slate-800">
                  Automated BOM Stock Depletion Logs
                </h4>
                <p className="text-xs text-slate-500">
                  Granular audit trail of raw materials depleted on each POS checkout
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter material or order..."
                  value={searchDepletion}
                  onChange={(e) => setSearchDepletion(e.target.value)}
                  className="w-full rounded-xl border border-[#e5ece7] bg-[#fafbf9] py-1.5 pl-8 pr-3 text-xs text-slate-700 focus:outline-hidden focus:border-[#618873]"
                />
              </div>
            </div>

            {filteredDepletions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#e5ece7] p-8 text-center text-slate-400 text-xs">
                <Layers className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">No stock depletion events recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Complete an order in the POS Cashier interface to see automatic BOM ingredient deductions appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e5ece7] bg-[#fafbf9] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3">Timestamp</th>
                      <th className="py-3 px-3">Triggering Order #</th>
                      <th className="py-3 px-3">Outlet</th>
                      <th className="py-3 px-3">Raw Material Depleted</th>
                      <th className="py-3 px-3 text-right">Quantity Deducted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f4f2]">
                    {filteredDepletions.map((log) => (
                      <tr key={log.id} className="hover:bg-[#fafbf9] transition-colors">
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {log.orderNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{log.outletName}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {log.rawMaterialName}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-rose-600">
                          -{log.quantityDeducted} {log.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF Report Modal & Generator (Sales & Top Products) */}
      <CashflowPDFReport
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        orders={activeOrders}
        products={products}
        outlets={outlets}
        defaultOutletId={selectedOutletId}
        userName={user.name}
      />

      {/* Stock PDF Report Modal & Generator (Authorized for both Cashier & Manager) */}
      <StockPDFReport
        isOpen={isStockPdfModalOpen}
        onClose={() => setIsStockPdfModalOpen(false)}
        inventory={inventory}
        outlets={outlets}
        defaultOutletId={isCashier ? (currentOutlet?.id || user.outletId || 'outlet-1') : selectedOutletId}
        userName={user.name}
        userRole={user.role}
      />
    </div>
  );
};
