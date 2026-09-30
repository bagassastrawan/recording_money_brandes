'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Order, Product, ProductCategory, Outlet } from '@/types';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils/formatters';
import { FiPrinter, FiX, FiStore } from '@/components/ui/Flaticon';
import { fetchTodaySalesFromSupabase } from '@/lib/supabase/syncService';
import { isSupabaseConfigured } from '@/lib/supabase/client';

interface CashflowPDFReportProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  products: Product[];
  outlets: Outlet[];
  defaultOutletId?: string;
  userName: string;
}

interface ProductSalesSummary {
  productId: string;
  productName: string;
  category: ProductCategory;
  quantitySold: number;
  unitPrice: number;
  totalSales: number;
}

export const CashflowPDFReport: React.FC<CashflowPDFReportProps> = ({
  isOpen,
  onClose,
  orders,
  products,
  outlets,
  defaultOutletId = 'outlet-1',
  userName,
}) => {
  // Outlet selector
  const [selectedOutletId, setSelectedOutletId] = useState<string>(
    defaultOutletId === 'all' ? (outlets[0]?.id || 'outlet-1') : defaultOutletId
  );

  // Period filter: 'today' (Hari Ini) or 'all' (Semua Tanggal)
  const [periodFilter, setPeriodFilter] = useState<'today' | 'all'>('today');

  // Top limit for most purchased products (Default 5 items to keep it concise and clean)
  const [topLimit, setTopLimit] = useState<number>(5);

  // Direct Live Supabase Cloud State
  const [supabaseOrders, setSupabaseOrders] = useState<Order[] | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Fetch today's sales directly from Supabase for the selected outlet or consolidated
  useEffect(() => {
    let ignore = false;
    if (isOpen && isSupabaseConfigured) {
      fetchTodaySalesFromSupabase(selectedOutletId)
        .then((res) => {
          if (!ignore && res.success && res.data) {
            setSupabaseOrders(res.data);
          }
        })
        .catch(() => {});
    }
    return () => {
      ignore = true;
    };
  }, [isOpen, selectedOutletId]);

  // Active Outlet Info
  const activeOutlet = useMemo(() => {
    if (selectedOutletId === 'all') {
      return {
        id: 'all',
        name: 'Semua Cabang (Konsolidasi)',
        code: 'ALL-BRANCH',
        address: 'Konsolidasi Seluruh Outlet Brandes',
        phone: '-',
      };
    }
    return outlets.find((o) => o.id === selectedOutletId) || outlets[0];
  }, [outlets, selectedOutletId]);

  // Orders filtered by Outlet
  const outletOrders = useMemo(() => {
    return orders.filter((o) => {
      if (selectedOutletId === 'all') return true;
      return o.outletId === selectedOutletId;
    });
  }, [orders, selectedOutletId]);

  // Effective orders based on period filter & Supabase live data
  const displayedOrders = useMemo(() => {
    if (periodFilter === 'today' && supabaseOrders !== null && supabaseOrders.length > 0) {
      return supabaseOrders;
    }
    if (periodFilter === 'today') {
      const todayOnly = outletOrders.filter((o) => o.createdAt.startsWith(todayStr));
      return todayOnly.length > 0 ? todayOnly : outletOrders;
    }
    return outletOrders;
  }, [periodFilter, supabaseOrders, outletOrders, todayStr]);

  // Key Financial Metrics for Today's Sales
  const totalRevenue = useMemo(() => displayedOrders.reduce((sum, o) => sum + o.total, 0), [displayedOrders]);
  const totalSubtotal = useMemo(() => displayedOrders.reduce((sum, o) => sum + o.subtotal, 0), [displayedOrders]);
  const totalTax = useMemo(() => displayedOrders.reduce((sum, o) => sum + o.tax, 0), [displayedOrders]);
  const totalTransactions = displayedOrders.length;
  const aov = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  // Payment Breakdown (Clean reconciliation)
  const cashTotal = useMemo(
    () => displayedOrders.filter((o) => o.paymentMethod === 'cash').reduce((sum, o) => sum + o.total, 0),
    [displayedOrders]
  );
  const qrisTotal = useMemo(
    () => displayedOrders.filter((o) => o.paymentMethod === 'qris').reduce((sum, o) => sum + o.total, 0),
    [displayedOrders]
  );
  const cardTotal = useMemo(
    () =>
      displayedOrders
        .filter((o) => o.paymentMethod === 'debit' || o.paymentMethod === 'credit')
        .reduce((sum, o) => sum + o.total, 0),
    [displayedOrders]
  );

  // Top Most Purchased Products (Strictly aggregated and sorted, NOT showing all transactions)
  const topSellingProducts = useMemo(() => {
    const salesMap: Record<string, ProductSalesSummary> = {};

    displayedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId || p.name === item.productName);
        const cat: ProductCategory = prod ? prod.category : 'Coffee';
        const key = item.productId || item.productName;

        if (!salesMap[key]) {
          salesMap[key] = {
            productId: item.productId,
            productName: item.productName,
            category: cat,
            quantitySold: 0,
            unitPrice: item.price,
            totalSales: 0,
          };
        }

        salesMap[key].quantitySold += item.quantity;
        salesMap[key].totalSales += item.quantity * item.price;
      });
    });

    const allList = Object.values(salesMap);
    // Sort descending by quantitySold (most bought first), then totalSales
    allList.sort((a, b) => b.quantitySold - a.quantitySold || b.totalSales - a.totalSales);

    const topItems = allList.slice(0, topLimit);
    const topTotalQty = topItems.reduce((sum, item) => sum + item.quantitySold, 0);
    const topTotalSales = topItems.reduce((sum, item) => sum + item.totalSales, 0);

    const allTotalQty = allList.reduce((sum, item) => sum + item.quantitySold, 0);
    const allTotalSales = allList.reduce((sum, item) => sum + item.totalSales, 0);

    return {
      items: topItems,
      totalCount: allList.length,
      topTotalQty,
      topTotalSales,
      allTotalQty,
      allTotalSales,
    };
  }, [displayedOrders, products, topLimit]);

  const reportDate = new Date();
  const reportDateStr = formatDate(reportDate.toISOString());
  const reportTimeStr = formatDateTime(reportDate.toISOString());
  const reportRefNumber = `RPT-${activeOutlet?.code || 'SLS'}-${reportDate.getFullYear()}${String(
    reportDate.getMonth() + 1
  ).padStart(2, '0')}${String(reportDate.getDate()).padStart(2, '0')}`;

  // Minimalist, ink-friendly vector print generator
  const handlePrintPDF = () => {
    const printContent = document.getElementById('printable-sales-report');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Mohon izinkan pop-up browser untuk mencetak atau mendownload laporan PDF');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="utf-8">
        <title>Laporan_Penjualan_${(activeOutlet?.name || 'Outlet').replace(/\s+/g, '_')}_${reportRefNumber}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.45;
          }
          .report-container {
            width: 100%;
            max-width: 720px;
            margin: 0 auto;
          }
          /* Formal minimalist header */
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 16px;
          }
          .brand-title {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.3px;
          }
          .report-title {
            font-size: 13px;
            font-weight: 700;
            color: #334155;
            margin-top: 3px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .meta-box {
            text-align: right;
            font-size: 10.5px;
            color: #475569;
            line-height: 1.5;
          }
          .meta-box strong {
            color: #0f172a;
          }
          /* Clean monochrome section titles */
          .section-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
            margin: 14px 0 10px 0;
          }
          /* Summary Box */
          .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
            border: 1px solid #e2e8f0;
          }
          .summary-table td {
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
            vertical-align: top;
          }
          .summary-label {
            font-size: 9.5px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 600;
            letter-spacing: 0.3px;
          }
          .summary-value {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
          }
          .summary-sub {
            font-size: 9.5px;
            color: #64748b;
            margin-top: 1px;
          }
          /* Payment Breakdown Strip */
          .payment-strip {
            display: flex;
            justify-content: space-between;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 8px 14px;
            font-size: 10.5px;
            margin-bottom: 14px;
            border-radius: 4px;
          }
          .payment-item {
            color: #475569;
          }
          .payment-item strong {
            color: #0f172a;
          }
          /* Clean Data Table */
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
            margin-bottom: 14px;
          }
          table.data-table th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 700;
            text-align: left;
            padding: 6px 8px;
            border-top: 1px solid #cbd5e1;
            border-bottom: 1.5px solid #94a3b8;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.4px;
          }
          table.data-table td {
            padding: 6px 8px;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
          }
          table.data-table tr:nth-child(even) td {
            background: #fafbfd;
          }
          table.data-table tr.total-row td {
            background: #f8fafc;
            font-weight: 800;
            border-top: 1.5px solid #0f172a;
            border-bottom: 1.5px solid #0f172a;
            color: #0f172a;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          /* Minimalist Signatures */
          .sign-box {
            display: flex;
            justify-content: space-between;
            margin-top: 24px;
            padding-top: 8px;
            page-break-inside: avoid;
          }
          .sign-col {
            width: 42%;
            text-align: center;
          }
          .sign-role {
            font-size: 9.5px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
          }
          .sign-space {
            height: 48px;
          }
          .sign-name {
            font-size: 10.5px;
            font-weight: 700;
            color: #0f172a;
            border-top: 1px solid #94a3b8;
            padding-top: 4px;
            display: inline-block;
            min-width: 140px;
          }
          .footer-note {
            margin-top: 20px;
            font-size: 8.5px;
            color: #94a3b8;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          ${printContent.innerHTML}
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 my-6 flex flex-col max-h-[92vh]">
        {/* Modal Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 bg-slate-50/80 rounded-t-2xl shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Laporan Penjualan Hari Ini & Produk Terlaris
            </h3>
            <p className="text-xs text-slate-500">
              Format sederhana & hemat tinta untuk evaluasi manajerial
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Outlet Switcher */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs">
              <FiStore className="h-3.5 w-3.5 text-slate-500" />
              <select
                value={selectedOutletId}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Semua Cabang (Konsolidasi)</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Filter: Today vs All */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs text-xs font-medium">
              <button
                type="button"
                onClick={() => setPeriodFilter('today')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  periodFilter === 'today'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  periodFilter === 'all'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
            </div>

            {/* Top Products Count: Top 5 / Top 10 */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-2xs text-xs">
              <span className="text-slate-400 mr-1.5 text-[11px]">Top:</span>
              <select
                value={topLimit}
                onChange={(e) => setTopLimit(Number(e.target.value))}
                className="bg-transparent font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
              </select>
            </div>

            {/* Action Buttons */}
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-700 transition-all"
            >
              <FiPrinter className="h-3.5 w-3.5" />
              <span>Cetak PDF</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all"
              aria-label="Tutup"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
          <div
            id="printable-sales-report"
            className="mx-auto max-w-[680px] rounded-lg bg-white p-7 shadow-sm border border-slate-200 text-slate-900 font-sans"
          >
            {/* 1. Header Box */}
            <div className="header-box flex justify-between items-start border-b-2 border-slate-900 pb-2.5 mb-4">
              <div>
                <div className="brand-title text-lg font-bold text-slate-900 tracking-tight">
                  BRANDES MONEY
                </div>
                <div className="report-title text-xs font-bold text-slate-600 uppercase tracking-wide mt-0.5">
                  Ringkasan Penjualan & Produk Terlaris
                </div>
              </div>

              <div className="meta-box text-right text-xs text-slate-600 leading-snug">
                <div>
                  No. Laporan: <strong className="text-slate-900 font-mono">{reportRefNumber}</strong>
                </div>
                <div>
                  Cabang: <strong className="text-slate-900">{activeOutlet?.name}</strong>
                </div>
                <div>
                  Tanggal: <strong className="text-slate-900">{reportDateStr}</strong>
                </div>
                <div>
                  Kasir / Penanggung Jawab: <strong className="text-slate-900">{userName}</strong>
                </div>
              </div>
            </div>

            {/* 2. Executive Sales Summary for Today */}
            <div className="section-title text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2.5">
              1. Ringkasan Penjualan Hari Ini
            </div>

            <table className="summary-table w-full border-collapse border border-slate-200 mb-3 text-left">
              <tbody>
                <tr>
                  <td className="w-1/3 p-2.5 border border-slate-200 bg-slate-50/60">
                    <span className="summary-label text-[10px] uppercase font-bold text-slate-500 block">
                      Total Penjualan Kotor (Gross)
                    </span>
                    <p className="summary-value text-base font-extrabold text-slate-900 mt-1">
                      {formatCurrency(totalRevenue)}
                    </p>
                    <span className="summary-sub text-[10px] text-slate-500 block mt-0.5">
                      {totalTransactions} transaksi berhasil
                    </span>
                  </td>
                  <td className="w-1/3 p-2.5 border border-slate-200 bg-slate-50/60">
                    <span className="summary-label text-[10px] uppercase font-bold text-slate-500 block">
                      Penjualan Bersih (Net)
                    </span>
                    <p className="summary-value text-base font-extrabold text-slate-900 mt-1">
                      {formatCurrency(totalSubtotal)}
                    </p>
                    <span className="summary-sub text-[10px] text-slate-500 block mt-0.5">
                      Sebelum pajak PB1
                    </span>
                  </td>
                  <td className="w-1/3 p-2.5 border border-slate-200 bg-slate-50/60">
                    <span className="summary-label text-[10px] uppercase font-bold text-slate-500 block">
                      Pajak Restoran PB1 (10%)
                    </span>
                    <p className="summary-value text-base font-extrabold text-slate-700 mt-1">
                      {formatCurrency(totalTax)}
                    </p>
                    <span className="summary-sub text-[10px] text-slate-500 block mt-0.5">
                      Rata-rata/Tiket (AOV): {formatCurrency(aov)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Payment Method Reconciliation */}
            <div className="payment-strip flex justify-between items-center bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-xs mb-4">
              <div className="payment-item text-slate-600">
                Uang Tunai: <strong className="text-slate-900">{formatCurrency(cashTotal)}</strong>
              </div>
              <div className="payment-item text-slate-600">
                Non-Tunai QRIS: <strong className="text-slate-900">{formatCurrency(qrisTotal)}</strong>
              </div>
              <div className="payment-item text-slate-600">
                Kartu EDC: <strong className="text-slate-900">{formatCurrency(cardTotal)}</strong>
              </div>
              <div className="payment-item text-slate-700 font-bold border-l border-slate-300 pl-3">
                Total Masuk: <strong className="text-slate-900">{formatCurrency(totalRevenue)}</strong>
              </div>
            </div>

            {/* 3. Top Most Purchased Products (Clean & Focused, Not Full Transaction List) */}
            <div className="section-title text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2.5 flex justify-between items-center">
              <span>2. Produk Paling Banyak Dibeli (Top {topSellingProducts.items.length})</span>
              <span className="text-[10px] text-slate-500 font-normal lowercase">
                diurutkan dari kuantitas terbanyak
              </span>
            </div>

            <table className="data-table w-full text-xs border border-slate-200 mb-3">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                  <th className="py-1.5 px-2.5 text-center w-10">No</th>
                  <th className="py-1.5 px-2.5">Nama Produk</th>
                  <th className="py-1.5 px-2.5 w-24">Kategori</th>
                  <th className="py-1.5 px-2.5 text-center w-20">Qty Terjual</th>
                  <th className="py-1.5 px-2.5 text-right w-24">Harga</th>
                  <th className="py-1.5 px-2.5 text-right w-28">Total Penjualan</th>
                  <th className="py-1.5 px-2.5 text-right w-20">Kontribusi</th>
                </tr>
              </thead>
              <tbody>
                {topSellingProducts.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-slate-500 italic">
                      Belum ada produk terjual pada periode ini.
                    </td>
                  </tr>
                ) : (
                  topSellingProducts.items.map((prod, index) => {
                    const contribution =
                      topSellingProducts.allTotalSales > 0
                        ? ((prod.totalSales / topSellingProducts.allTotalSales) * 100).toFixed(1)
                        : '0';

                    return (
                      <tr key={prod.productId || index} className="border-b border-slate-100">
                        <td className="py-1.5 px-2.5 text-center text-slate-500 font-semibold">
                          #{index + 1}
                        </td>
                        <td className="py-1.5 px-2.5 font-bold text-slate-900">
                          {prod.productName}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-600 text-[10.5px]">
                          {prod.category}
                        </td>
                        <td className="py-1.5 px-2.5 text-center font-bold text-slate-900">
                          {prod.quantitySold}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-slate-600">
                          {formatCurrency(prod.unitPrice)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-bold text-slate-900">
                          {formatCurrency(prod.totalSales)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-slate-600 font-medium">
                          {contribution}%
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Subtotal Top Products */}
                {topSellingProducts.items.length > 0 && (
                  <tr className="total-row bg-slate-50 font-bold border-t-2 border-slate-900 text-slate-900">
                    <td colSpan={3} className="py-2 px-2.5 text-right uppercase text-[10px]">
                      Total Penjualan Top {topSellingProducts.items.length} Produk:
                    </td>
                    <td className="py-2 px-2.5 text-center font-black">
                      {topSellingProducts.topTotalQty} Pcs
                    </td>
                    <td className="py-2 px-2.5 text-right text-slate-400">-</td>
                    <td className="py-2 px-2.5 text-right font-black">
                      {formatCurrency(topSellingProducts.topTotalSales)}
                    </td>
                    <td className="py-2 px-2.5 text-right">
                      {topSellingProducts.allTotalSales > 0
                        ? ((topSellingProducts.topTotalSales / topSellingProducts.allTotalSales) * 100).toFixed(0)
                        : 0}
                      %
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* 4. Formal Signatures */}
            <div className="sign-box flex justify-between items-center mt-6 pt-2">
              <div className="sign-col w-5/12 text-center">
                <span className="sign-role text-[10px] font-bold uppercase text-slate-500 block">
                  Dibuat Oleh (Kasir)
                </span>
                <div className="sign-space h-10" />
                <span className="sign-name text-xs font-bold text-slate-900 border-t border-slate-400 pt-1 px-4 inline-block">
                  ( {userName} )
                </span>
              </div>

              <div className="sign-col w-5/12 text-center">
                <span className="sign-role text-[10px] font-bold uppercase text-slate-500 block">
                  Disetujui (Store Manager)
                </span>
                <div className="sign-space h-10" />
                <span className="sign-name text-xs font-bold text-slate-900 border-t border-slate-400 pt-1 px-4 inline-block">
                  ( {activeOutlet?.name ? `Manager ${activeOutlet.name}` : 'Store Manager'} )
                </span>
              </div>
            </div>

            {/* Document Footer Note */}
            <div className="footer-note text-center text-[9px] text-slate-400 mt-5 pt-2 border-t border-slate-200">
              Laporan dicetak otomatis dari POS Brandes Money untuk {activeOutlet?.name} pada {reportTimeStr}.
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 bg-slate-50 rounded-b-2xl shrink-0">
          <p className="text-xs text-slate-500">
            Laporan didesain ringkas, elegan, dan hemat tinta untuk cetak / PDF 1 halaman A4.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"
            >
              Tutup
            </button>
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-700 transition-all"
            >
              <FiPrinter className="h-3.5 w-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
