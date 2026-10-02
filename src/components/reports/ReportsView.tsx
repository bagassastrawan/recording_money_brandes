'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/store/AppContext';
import { Order, InventoryItem, StockMovementLog } from '@/types';
import { formatCurrency, formatDate, formatDateTime, exportToCSV } from '@/lib/utils/formatters';
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
  FiChevronDown,
  FiChevronUp,
  FiList,
  FiCheckCircle,
  FiStore,
  FiPlus,
  FiAlertTriangle,
  FiX,
  FiCalendar,
  FiRotateCcw,
} from '@/components/ui/Flaticon';
import { CashflowPDFReport } from '@/components/reports/CashflowPDFReport';
import { StockPDFReport } from '@/components/reports/StockPDFReport';
import { DEFAULT_ORDER_ITEMS_MAP } from '@/lib/data/mockData';

export const ReportsView: React.FC = () => {
  const {
    orders,
    expenses,
    products,
    inventory,
    stockMovements,
    restockItem,
    recordStockWaste,
    outlets,
    selectedOutletId,
    setSelectedOutletId,
    currentOutlet,
    user,
    fetchTodaySales,
  } = useApp();

  const isManager = user.role === 'manager';
  const isCashier = user.role === 'cashier';

  // Sub-tabs: sales (Daily Record), cashflow (Manager), stock (Cashier)
  const [activeTab, setActiveTab] = useState<'sales' | 'cashflow' | 'stock'>('sales');
  // Manager only sees 'sales' and 'cashflow'; Cashier sees 'sales' and 'stock'
  const effectiveTab = useMemo(() => {
    if (isManager) {
      if (activeTab === 'stock') return 'sales';
      return activeTab;
    } else {
      if (activeTab === 'cashflow') return 'sales';
      return activeTab;
    }
  }, [isManager, activeTab]);

  // Local report outlet filter: defaults to selectedOutletId or user's outlet
  const [reportOutletFilter, setReportOutletFilter] = useState<string>(
    isCashier ? (user.outletId || currentOutlet?.id || 'outlet-1') : selectedOutletId
  );

  // Keep in sync when global selectedOutletId changes (if manager)
  useEffect(() => {
    if (!isCashier) {
      setReportOutletFilter(selectedOutletId);
    }
  }, [selectedOutletId, isCashier]);

  // Sales Sub-views: 'transactions' vs 'items'
  const [salesSubView, setSalesSubView] = useState<'transactions' | 'items'>('transactions');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const [searchOrderItems, setSearchOrderItems] = useState('');
  const [searchOrderNumber, setSearchOrderNumber] = useState('');

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // Stock & History filters
  const [searchStock, setSearchStock] = useState('');
  const [searchHistory, setSearchHistory] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('all');
  const [historyOutletFilter, setHistoryOutletFilter] = useState<string>('all');

  // Modals state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isStockPdfModalOpen, setIsStockPdfModalOpen] = useState(false);

  // Quick Action Modal for Inventory in Laporan Stok
  const [actionModalItem, setActionModalItem] = useState<{
    item: InventoryItem;
    mode: 'restock' | 'waste';
  } | null>(null);
  const [actionQuantity, setActionQuantity] = useState<number>(5);
  const [actionUnitCost, setActionUnitCost] = useState<number>(0);
  const [actionExpiryDate, setActionExpiryDate] = useState<string>('');
  const [actionReason, setActionReason] = useState<string>('Bahan baku rusak / melewati kadaluwarsa');
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  // Persistent Cloud Orders State (retrieved transparently without showing Supabase UI)
  const [cloudOrders, setCloudOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchTodaySales(reportOutletFilter)
      .then((res) => {
        if (!ignore && res.success && res.data && res.data.length > 0) {
          setCloudOrders(res.data);
        }
      })
      .catch(() => {
        // Fallback silently
      });

    return () => {
      ignore = true;
    };
  }, [fetchTodaySales, reportOutletFilter]);

  // Filter orders by outlet filter
  const filteredOrders = useMemo(() => {
    return orders.filter((o) =>
      reportOutletFilter === 'all' ? true : o.outletId === reportOutletFilter
    );
  }, [orders, reportOutletFilter]);

  // Effective Active Orders: Merges persistent cloud orders with local session orders
  const activeOrders = useMemo(() => {
    const ordersById = new Map<string, Order>();
    const orderNumberLookup = new Map<string, Order>();

    filteredOrders.forEach((o) => {
      const resolvedItems =
        o.items && o.items.length > 0
          ? o.items
          : DEFAULT_ORDER_ITEMS_MAP[o.orderNumber] || DEFAULT_ORDER_ITEMS_MAP[o.id] || [];

      const fullOrder = { ...o, items: resolvedItems };
      ordersById.set(o.id, fullOrder);
      if (o.orderNumber) {
        orderNumberLookup.set(o.orderNumber, fullOrder);
      }
    });

    if (cloudOrders && cloudOrders.length > 0) {
      cloudOrders.forEach((so) => {
        const local =
          ordersById.get(so.id) ||
          (so.orderNumber ? orderNumberLookup.get(so.orderNumber) : undefined);

        const resolvedItems =
          so.items && so.items.length > 0
            ? so.items
            : local?.items && local.items.length > 0
            ? local.items
            : DEFAULT_ORDER_ITEMS_MAP[so.orderNumber] || DEFAULT_ORDER_ITEMS_MAP[so.id] || [];

        if (local && local.id !== so.id) {
          ordersById.delete(local.id);
        }

        ordersById.set(so.id, {
          ...(local || {}),
          ...so,
          items: resolvedItems,
        });
      });
    }

    const list = Array.from(ordersById.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (!searchOrderNumber.trim()) return list;
    const q = searchOrderNumber.toLowerCase();
    return list.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.cashierName.toLowerCase().includes(q) ||
        o.outletName.toLowerCase().includes(q) ||
        (o.items && o.items.some((i) => i.productName.toLowerCase().includes(q)))
    );
  }, [cloudOrders, filteredOrders, searchOrderNumber]);

  const filteredExpenses = expenses.filter((e) =>
    reportOutletFilter === 'all' ? true : e.outletId === reportOutletFilter
  );

  // Stock Filtered by Outlet & Search
  const filteredStock = useMemo(() => {
    return inventory.filter((item) => {
      const matchOutlet = isCashier
        ? item.outletId === (user.outletId || currentOutlet?.id || 'outlet-1')
        : (reportOutletFilter === 'all' ? true : item.outletId === reportOutletFilter);
      const matchSearch =
        item.name.toLowerCase().includes(searchStock.toLowerCase()) ||
        item.category.toLowerCase().includes(searchStock.toLowerCase());
      return matchOutlet && matchSearch;
    });
  }, [inventory, isCashier, user.outletId, currentOutlet?.id, reportOutletFilter, searchStock]);

  const stockSummary = useMemo(() => {
    const total = filteredStock.length;
    const low = filteredStock.filter((i) => i.currentStock <= i.minThreshold).length;
    const safe = total - low;
    return { total, low, safe };
  }, [filteredStock]);

  // Multi-Outlet Stock Movements (Refactored from Log Pengurangan)
  const filteredMovements = useMemo(() => {
    return stockMovements.filter((mov) => {
      const matchOutlet =
        historyOutletFilter === 'all' ? true : mov.outletId === historyOutletFilter;
      const matchType =
        historyTypeFilter === 'all' ? true : mov.type === historyTypeFilter;
      const q = searchHistory.toLowerCase();
      const matchSearch =
        !searchHistory.trim() ||
        mov.rawMaterialName.toLowerCase().includes(q) ||
        (mov.referenceId && mov.referenceId.toLowerCase().includes(q)) ||
        mov.outletName.toLowerCase().includes(q) ||
        mov.recordedBy.toLowerCase().includes(q) ||
        (mov.reason && mov.reason.toLowerCase().includes(q));

      return matchOutlet && matchType && matchSearch;
    });
  }, [stockMovements, historyOutletFilter, historyTypeFilter, searchHistory]);

  // Financial aggregates
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

  // Flattened Order Items
  const flatOrderItems = useMemo(() => {
    const list: Array<{
      id: string;
      orderId: string;
      orderNumber: string;
      outletName: string;
      cashierName: string;
      createdAt: string;
      paymentMethod: string;
      productName: string;
      sugarLevel?: string;
      notes?: string;
      quantity: number;
      price: number;
      subtotal: number;
    }> = [];
    activeOrders.forEach((o) => {
      if (o.items && o.items.length > 0) {
        o.items.forEach((item, idx) => {
          list.push({
            id: `${o.id}-item-${idx}`,
            orderId: o.id,
            orderNumber: o.orderNumber,
            outletName: o.outletName,
            cashierName: o.cashierName,
            createdAt: o.createdAt,
            paymentMethod: o.paymentMethod,
            productName: item.productName,
            sugarLevel: item.sugarLevel,
            notes: item.notes,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.quantity * item.price,
          });
        });
      }
    });
    return list;
  }, [activeOrders]);

  const filteredOrderItems = useMemo(() => {
    if (!searchOrderItems.trim()) return flatOrderItems;
    const q = searchOrderItems.toLowerCase();
    return flatOrderItems.filter(
      (i) =>
        i.productName.toLowerCase().includes(q) ||
        i.orderNumber.toLowerCase().includes(q) ||
        (i.notes && i.notes.toLowerCase().includes(q)) ||
        (i.sugarLevel && i.sugarLevel.toLowerCase().includes(q)) ||
        i.outletName.toLowerCase().includes(q)
    );
  }, [flatOrderItems, searchOrderItems]);

  const totalItemsSold = useMemo(
    () => flatOrderItems.reduce((sum, item) => sum + item.quantity, 0),
    [flatOrderItems]
  );

  // Expiry date calculation helper
  const getExpiryMeta = (expiryDate?: string) => {
    if (!expiryDate) {
      return {
        displayDate: 'Tanpa Tanggal',
        badge: 'Tanpa Kadaluwarsa',
        style: 'bg-slate-100 text-slate-500 border-slate-200',
        diffDays: null,
      };
    }
    const today = new Date('2026-10-02');
    const exp = new Date(expiryDate);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        displayDate: formatDate(expiryDate),
        badge: `Kadaluwarsa (${Math.abs(diffDays)}h lalu)`,
        style: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
        diffDays,
      };
    }
    if (diffDays <= 7) {
      return {
        displayDate: formatDate(expiryDate),
        badge: `Segera Habiskan (${diffDays}h lagi)`,
        style: 'bg-amber-100 text-amber-800 border-amber-300 font-bold animate-pulse',
        diffDays,
      };
    }
    return {
      displayDate: formatDate(expiryDate),
      badge: `Aman (${diffDays}h lagi)`,
      style: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
      diffDays,
    };
  };

  // CSV Exporters
  const exportDailySalesCSV = () => {
    const rows = activeOrders.map((o) => ({
      'ID Order': o.orderNumber,
      'Time': formatDateTime(o.createdAt),
      'Outlet': o.outletName,
      'Nama Kasir': o.cashierName,
      'Items yang Dibeli': (o.items || []).map((i) => `${i.productName} (${i.quantity}x)`).join('; ') || 'Tidak ada item',
      'Method': o.paymentMethod.toUpperCase(),
      'Total': o.total,
    }));
    exportToCSV(`Daily_Record_Sales_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const exportStockReportCSV = () => {
    const rows = filteredStock.map((item) => {
      const exp = getExpiryMeta(item.expiryDate);
      return {
        'Bahan Baku': item.name,
        'Kategori': item.category,
        'Stok Fisik': item.currentStock,
        'Satuan': item.unit,
        'Biaya Satuan': item.costPerUnit,
        'Batas Minimum': item.minThreshold,
        'Tanggal Kadaluwarsa': exp.displayDate,
        'Status Kadaluwarsa': exp.badge,
        'Status Stok': item.currentStock <= item.minThreshold ? 'Perlu Restock' : 'Aman',
      };
    });
    exportToCSV(`Laporan_Stok_Outlet_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const exportStockMovementsCSV = () => {
    const rows = filteredMovements.map((m) => ({
      'Waktu': formatDateTime(m.createdAt),
      'Outlet': m.outletName,
      'Bahan Baku': m.rawMaterialName,
      'Tipe Perubahan': m.type,
      'Perubahan Qty': m.changeQuantity,
      'Unit': m.unit,
      'Sisa Stok': m.stockAfter,
      'No Referensi': m.referenceId || '-',
      'Operator / PIC': m.recordedBy,
      'Keterangan': m.reason || '-',
    }));
    exportToCSV(`History_Perubahan_Stok_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  // Handler for Quick Restock & Waste Actions
  const handleOpenActionModal = (item: InventoryItem, mode: 'restock' | 'waste') => {
    setActionModalItem({ item, mode });
    setActionQuantity(mode === 'restock' ? 10 : 1);
    setActionUnitCost(item.costPerUnit || 0);
    setActionExpiryDate(item.expiryDate || '2026-12-31');
    setActionReason(mode === 'waste' ? 'Bahan baku kadaluwarsa / rusak' : '');
    setActionAlert(null);
  };

  const handleExecuteAction = () => {
    if (!actionModalItem) return;
    const { item, mode } = actionModalItem;

    if (actionQuantity <= 0) {
      alert('Jumlah quantity harus lebih besar dari 0');
      return;
    }

    if (mode === 'restock') {
      restockItem(item.id, item.outletId, actionQuantity, actionUnitCost);
      setActionAlert(`Berhasil menambahkan stok ${item.name} sebanyak ${actionQuantity} ${item.unit}. Riwayat tercatat di History Perubahan Stok.`);
      setTimeout(() => {
        setActionModalItem(null);
        setActionAlert(null);
      }, 1200);
    } else {
      recordStockWaste({
        outletId: item.outletId,
        rawMaterialId: item.id,
        quantity: actionQuantity,
        reason: actionReason || 'Bahan rusak / kadaluwarsa',
      });
      setActionAlert(`Berhasil mencatat pengurangan waste untuk ${item.name} sebanyak ${actionQuantity} ${item.unit}. Riwayat tercatat di History Perubahan Stok.`);
      setTimeout(() => {
        setActionModalItem(null);
        setActionAlert(null);
      }, 1200);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5ece7] pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Daily Sales Report (Daily Record) */}
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
              effectiveTab === 'sales'
                ? 'bg-[#618873] text-white shadow-2xs font-bold'
                : 'bg-white border border-[#e5ece7] text-slate-600 hover:bg-[#f4f7f5]'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            <span>Daily Record (Penjualan)</span>
          </button>

          {/* 2. Cashflow Statement (Manager only) */}
          {isManager && (
            <button
              onClick={() => setActiveTab('cashflow')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                effectiveTab === 'cashflow'
                  ? 'bg-[#618873] text-white shadow-2xs font-bold'
                  : 'bg-white border border-[#e5ece7] text-slate-600 hover:bg-[#f4f7f5]'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Cashflow Operasional (Arus Kas)</span>
            </button>
          )}

          {/* 3. Laporan Stok Outlet (Hanya untuk Kasir; pada Manager dihapus) */}
          {!isManager && (
            <button
              onClick={() => setActiveTab('stock')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                effectiveTab === 'stock'
                  ? 'bg-[#618873] text-white shadow-2xs font-bold'
                  : 'bg-white border border-[#e5ece7] text-slate-600 hover:bg-[#f4f7f5]'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Laporan Stok Outlet</span>
            </button>
          )}
        </div>

        {/* Global Export & PDF Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {effectiveTab === 'sales' && (
            <>
              {isManager && (
                <button
                  onClick={() => setIsPdfModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#618873] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#507160] transition-all cursor-pointer"
                  title="Download / Cetak Laporan Penjualan (PDF)"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Cetak PDF</span>
                </button>
              )}
              <button
                onClick={exportDailySalesCSV}
                className="flex items-center gap-1.5 rounded-xl border border-[#e5ece7] bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#f4f7f5] shadow-2xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-[#618873]" />
                <span>Export Daily CSV</span>
              </button>
            </>
          )}

          {effectiveTab === 'cashflow' && isManager && (
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#618873] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#507160] transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak Ringkasan PDF</span>
            </button>
          )}

          {effectiveTab === 'stock' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsStockPdfModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#618873] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#507160] transition-all cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Unduh PDF Stok</span>
              </button>
              <button
                onClick={exportStockReportCSV}
                className="flex items-center gap-1.5 rounded-xl border border-[#e5ece7] bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#f4f7f5] shadow-2xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-[#618873]" />
                <span>Export Stok CSV</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          SUB-TAB 1: DAILY RECORD (SALES REPORT)
      ======================================================== */}
      {effectiveTab === 'sales' && (
        <div className="space-y-6">
          {/* Key Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Pendapatan
              </span>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-xs text-slate-500 mt-1">{activeOrders.length} Transaksi Tercatat</p>
            </div>

            <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Rata-rata Order (AOV)
              </span>
              <p className="mt-2 text-2xl font-bold tracking-tight text-[#618873]">
                {formatCurrency(aov)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Nilai belanja per transaksi</p>
            </div>

            <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Metode Pembayaran
              </span>
              <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>QRIS: {formatCurrency(qrisTotal)}</span>
                <span>Tunai: {formatCurrency(cashTotal)}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Kartu/Debit: {formatCurrency(cardTotal)}</p>
            </div>

            <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Item Terjual
              </span>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800">
                {totalItemsSold} Pcs
              </p>
              <p className="text-xs text-slate-500 mt-1">Dari semua transaksi aktif</p>
            </div>
          </div>

          {/* Filter Bar: Multi-Outlet Switcher & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#fafbf9] border border-[#e5ece7] p-3 rounded-2xl shadow-2xs">
            {/* Multi-Outlet Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                <FiStore className="h-4 w-4 text-[#618873]" />
                <span>Pilih Outlet:</span>
              </span>
              {isManager ? (
                <div className="relative">
                  <select
                    value={reportOutletFilter}
                    onChange={(e) => {
                      setReportOutletFilter(e.target.value);
                      setSelectedOutletId(e.target.value);
                    }}
                    className="appearance-none rounded-xl border border-[#e5ece7] bg-white py-1.5 pl-3 pr-8 text-xs font-bold text-slate-800 shadow-2xs hover:border-[#618873] focus:border-[#618873] focus:outline-hidden"
                  >
                    <option value="all">Semua Outlet (Konsolidasi)</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.code})
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              ) : (
                <span className="rounded-xl border border-[#e5ece7] bg-white px-3 py-1.5 text-xs font-bold text-slate-800">
                  {currentOutlet?.name || 'Outlet Aktif'}
                </span>
              )}
            </div>

            {/* Sub-view toggle & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-xl bg-white border border-[#e5ece7] p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSalesSubView('transactions')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    salesSubView === 'transactions'
                      ? 'bg-[#618873] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Daily Record ({activeOrders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSalesSubView('items')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    salesSubView === 'items'
                      ? 'bg-[#618873] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FiList className="h-3.5 w-3.5" />
                  <span>Rincian Item ({totalItemsSold})</span>
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={salesSubView === 'transactions' ? searchOrderNumber : searchOrderItems}
                  onChange={(e) => {
                    if (salesSubView === 'transactions') {
                      setSearchOrderNumber(e.target.value);
                    } else {
                      setSearchOrderItems(e.target.value);
                    }
                  }}
                  placeholder="Cari order, kasir, item..."
                  className="w-48 sm:w-56 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#e5ece7] bg-white text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#618873]"
                />
              </div>
            </div>
          </div>

          {/* VIEW 1: DAILY RECORD TABLE (id order, time, outlet, nama kasir, items yang dibeli, method, total) */}
          {salesSubView === 'transactions' && (
            <div className="rounded-2xl border border-[#e5ece7] bg-white shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-[#e5ece7] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Daily Record Penjualan Multi-Outlet
                  </h4>
                  <p className="text-xs text-slate-500">
                    Klik baris pesanan untuk melihat detail kustomisasi level gula dan catatan
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-[#fafbf9] px-2.5 py-1 rounded-lg border border-[#e5ece7]">
                  {activeOrders.length} Transaksi Tercatat
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e5ece7] bg-[#fafbf9] text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3 w-10 text-center"></th>
                      <th className="py-3 px-4">ID Order</th>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Outlet</th>
                      <th className="py-3 px-4">Nama Kasir</th>
                      <th className="py-3 px-4">Items yang Dibeli</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f4f2]">
                    {activeOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-600">Belum ada data penjualan tercatat</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Transaksi dari kasir POS akan langsung masuk ke Daily Record ini secara real-time.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      activeOrders.map((o, idx) => {
                        const isExpanded = expandedOrderIds.has(o.id);
                        return (
                          <React.Fragment key={`${o.id}-${idx}`}>
                            <tr
                              onClick={() => toggleExpandOrder(o.id)}
                              className={`cursor-pointer transition-colors ${
                                isExpanded ? 'bg-[#f4f8f5]' : 'hover:bg-[#fafbf9]'
                              }`}
                            >
                              {/* Accordion Toggle */}
                              <td className="py-3 px-3 text-center text-slate-400">
                                {isExpanded ? (
                                  <FiChevronUp className="h-4 w-4 text-[#618873] mx-auto" />
                                ) : (
                                  <FiChevronDown className="h-4 w-4 mx-auto" />
                                )}
                              </td>

                              {/* 1. ID Order */}
                              <td className="py-3 px-4 font-bold text-slate-800 font-mono">
                                {o.orderNumber}
                              </td>

                              {/* 2. Time */}
                              <td className="py-3 px-4 text-slate-500 whitespace-nowrap" suppressHydrationWarning>
                                {formatDateTime(o.createdAt)}
                              </td>

                              {/* 3. Outlet */}
                              <td className="py-3 px-4 font-semibold text-slate-700">
                                <span className="inline-flex items-center gap-1 rounded-md bg-[#fafbf9] border border-[#e5ece7] px-2 py-0.5 text-[11px]">
                                  <FiStore className="h-3 w-3 text-[#618873]" />
                                  {o.outletName}
                                </span>
                              </td>

                              {/* 4. Nama Kasir */}
                              <td className="py-3 px-4 text-slate-700 font-medium">
                                {o.cashierName}
                              </td>

                              {/* 5. Items yang Dibeli */}
                              <td className="py-3 px-4">
                                {o.items && o.items.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 max-w-md">
                                    {o.items.map((i, iIdx) => (
                                      <span
                                        key={iIdx}
                                        className="inline-flex items-center rounded-md bg-[#f4f7f5] px-2 py-0.5 text-[11px] text-slate-800 border border-[#e5ece7]"
                                      >
                                        <span className="font-semibold">{i.productName}</span>
                                        <span className="ml-1 text-[#507160] font-bold">({i.quantity}x)</span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">
                                    Tidak ada rincian item
                                  </span>
                                )}
                              </td>

                              {/* 6. Method */}
                              <td className="py-3 px-4">
                                <span className="inline-block rounded-md bg-[#eef4f0] px-2 py-0.5 text-[10px] font-bold uppercase text-[#507160] border border-[#d6e3da]">
                                  {o.paymentMethod}
                                </span>
                              </td>

                              {/* 7. Total */}
                              <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                                {formatCurrency(o.total)}
                              </td>
                            </tr>

                            {/* Collapsible Order Item Breakdown */}
                            {isExpanded && (
                              <tr className="bg-[#f7faf8]">
                                <td colSpan={8} className="p-4 pl-12 border-t border-b border-[#e5ece7]">
                                  <div className="rounded-xl border border-[#d6e3da] bg-white p-3.5 shadow-2xs space-y-3">
                                    <div className="flex items-center justify-between text-xs border-b border-[#e5ece7] pb-2">
                                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                        <Package className="h-4 w-4 text-[#618873]" />
                                        <span>Rincian Item Pesanan ({o.items ? `${o.items.length} macam produk` : '0 item'})</span>
                                      </span>
                                      {o.orderNotes && (
                                        <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                          Catatan Pesanan: {o.orderNotes}
                                        </span>
                                      )}
                                    </div>

                                    {o.items && o.items.length > 0 ? (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                          <thead>
                                            <tr className="border-b border-[#f1f4f2] text-slate-500 font-semibold text-[11px]">
                                              <th className="py-1.5 px-3">#</th>
                                              <th className="py-1.5 px-3">Nama Menu / Produk</th>
                                              <th className="py-1.5 px-3">Kustomisasi (Level Gula)</th>
                                              <th className="py-1.5 px-3">Catatan Khusus</th>
                                              <th className="py-1.5 px-3 text-center">Qty</th>
                                              <th className="py-1.5 px-3 text-right">Harga Satuan</th>
                                              <th className="py-1.5 px-3 text-right">Subtotal</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-[#f8faf9]">
                                            {o.items.map((item, itIdx) => (
                                              <tr key={itIdx} className="hover:bg-[#fafbf9]">
                                                <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                                                  {itIdx + 1}
                                                </td>
                                                <td className="py-2 px-3 font-bold text-slate-800">
                                                  {item.productName}
                                                </td>
                                                <td className="py-2 px-3">
                                                  {item.sugarLevel ? (
                                                    <span className="rounded bg-sky-50 text-sky-700 px-2 py-0.5 text-[10px] font-semibold border border-sky-200">
                                                      {item.sugarLevel}
                                                    </span>
                                                  ) : (
                                                    <span className="text-slate-400 text-[11px]">-</span>
                                                  )}
                                                </td>
                                                <td className="py-2 px-3 text-slate-600 text-[11px] italic">
                                                  {item.notes || '-'}
                                                </td>
                                                <td className="py-2 px-3 text-center font-bold text-slate-800">
                                                  {item.quantity}x
                                                </td>
                                                <td className="py-2 px-3 text-right text-slate-600">
                                                  {formatCurrency(item.price)}
                                                </td>
                                                <td className="py-2 px-3 text-right font-bold text-[#507160]">
                                                  {formatCurrency(item.quantity * item.price)}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-500 italic p-2">
                                        Rincian item untuk pesanan ini belum tercatat.
                                      </p>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: ITEMIZED TABLE */}
          {salesSubView === 'items' && (
            <div className="rounded-2xl border border-[#e5ece7] bg-white shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-[#e5ece7] flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Tabel Rincian Item Terjual</h4>
                  <p className="text-xs text-slate-500">
                    Menampilkan setiap item satuan yang diorder lengkap dengan opsi level gula dan catatan
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e5ece7] bg-[#fafbf9] text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Outlet</th>
                      <th className="py-3 px-4">Nama Produk</th>
                      <th className="py-3 px-4">Level Gula</th>
                      <th className="py-3 px-4">Catatan</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Harga</th>
                      <th className="py-3 px-4 text-right">Subtotal</th>
                      <th className="py-3 px-4">Kasir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f4f2]">
                    {filteredOrderItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400">
                          Tidak ada rincian item ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filteredOrderItems.map((item) => (
                        <tr key={item.id} className="hover:bg-[#fafbf9] transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800">{item.orderNumber}</td>
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap" suppressHydrationWarning>
                            {formatDateTime(item.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">{item.outletName}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{item.productName}</td>
                          <td className="py-3 px-4">
                            {item.sugarLevel ? (
                              <span className="rounded bg-sky-50 text-sky-700 px-2 py-0.5 text-[10px] font-semibold border border-sky-200">
                                {item.sugarLevel}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-[11px] italic max-w-xs truncate">
                            {item.notes || '-'}
                          </td>
                          <td className="py-3 px-4 text-center font-extrabold text-slate-800">
                            {item.quantity}x
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#507160]">
                            {formatCurrency(item.subtotal)}
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{item.cashierName}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          SUB-TAB 2: CASHFLOW STATEMENT (MANAGER ONLY)
      ======================================================== */}
      {effectiveTab === 'cashflow' && (
        <div className="space-y-6">
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
                className="flex items-center gap-2 rounded-xl bg-[#618873] px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-[#507160] transition-all shrink-0 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak Laporan PDF Ringkas</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-5">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                  <span>Gross POS Revenue (+)</span>
                  <TrendingUp className="h-4 w-4" />
                </div>
                <p className="mt-2 text-2xl font-black text-emerald-800">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-[11px] text-emerald-700/80 mt-1">Pendapatan kotor penjualan</p>
              </div>

              <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-5">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
                  <span>Operating Expenses (-)</span>
                  <TrendingDown className="h-4 w-4" />
                </div>
                <p className="mt-2 text-2xl font-black text-amber-800">
                  {formatCurrency(totalExpenses)}
                </p>
                <p className="text-[11px] text-amber-700/80 mt-1">Pengeluaran & nota operasional</p>
              </div>

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
                  Margin Laba: {totalRevenue > 0 ? ((netCashflow / totalRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>

          {/* Breakdown by Outlet */}
          <div className="rounded-2xl border border-[#e5ece7] bg-white shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#e5ece7]">
              <h4 className="text-sm font-bold text-slate-800">Performa Arus Kas Tiap Outlet</h4>
              <p className="text-xs text-slate-500">Komparasi pendapatan vs beban pengeluaran per cabang</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5ece7] bg-[#fafbf9] text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Outlet / Cabang</th>
                    <th className="py-3 px-4">Transaksi</th>
                    <th className="py-3 px-4 text-right">Pendapatan</th>
                    <th className="py-3 px-4 text-right">Pengeluaran</th>
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
                          {outOrders.length} transaksi
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
          SUB-TAB 3: LAPORAN STOK OUTLET (WITH ACTION & KADALUWARSA)
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
                Stok Kritis / Perlu Restock
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
                  Laporan Stok Bahan Baku Outlet
                </h4>
                <p className="text-xs text-slate-500">
                  Dilengkapi tanggal kadaluwarsa, status stok kritis, dan tombol aksi restock / sesuaikan stok
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Outlet selector for stock */}
                {isManager && (
                  <div className="relative">
                    <select
                      value={reportOutletFilter}
                      onChange={(e) => {
                        setReportOutletFilter(e.target.value);
                        setSelectedOutletId(e.target.value);
                      }}
                      className="appearance-none rounded-xl border border-[#e5ece7] bg-[#fafbf9] py-1.5 pl-3 pr-8 text-xs font-bold text-slate-800 shadow-2xs hover:border-[#618873] focus:border-[#618873] focus:outline-hidden"
                    >
                      <option value="all">Semua Outlet</option>
                      {outlets.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                )}

                <div className="relative w-48 sm:w-56">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari bahan baku..."
                    value={searchStock}
                    onChange={(e) => setSearchStock(e.target.value)}
                    className="w-full rounded-xl border border-[#e5ece7] bg-[#fafbf9] py-1.5 pl-8 pr-3 text-xs text-slate-700 focus:outline-hidden focus:border-[#618873]"
                  />
                </div>
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
                    <tr className="border-b border-[#e5ece7] bg-[#fafbf9] text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3 w-10 text-center">No</th>
                      <th className="py-3 px-4">Nama Bahan Baku</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4 text-right">Stok Fisik</th>
                      <th className="py-3 px-4 text-center">Batas Min</th>
                      <th className="py-3 px-4">Tanggal Kadaluwarsa</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f4f2]">
                    {filteredStock.map((item, idx) => {
                      const isLow = item.currentStock <= item.minThreshold;
                      const exp = getExpiryMeta(item.expiryDate);

                      return (
                        <tr
                          key={`${item.id}-${item.outletId}`}
                          className={`transition-colors ${
                            isLow
                              ? 'bg-rose-50/70 hover:bg-rose-100/60 border-l-4 border-l-rose-500'
                              : 'hover:bg-[#fafbf9]'
                          }`}
                        >
                          <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`font-bold text-sm block ${isLow ? 'text-rose-900 font-black' : 'text-slate-800'}`}>
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {outlets.find((o) => o.id === item.outletId)?.name || item.outletId}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <span className="inline-block rounded-md bg-[#f4f7f5] border border-[#e5ece7] px-2 py-0.5 text-[11px]">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-sm">
                            <div className="flex items-center justify-end gap-1.5">
                              {isLow && <FiAlertTriangle className="h-3.5 w-3.5 text-rose-600 animate-pulse" />}
                              <span className={isLow ? 'text-rose-600 font-black' : 'text-slate-900'}>
                                {item.currentStock.toLocaleString()} {item.unit}
                              </span>
                            </div>
                            {isLow && (
                              <span className="inline-block text-[10px] font-bold text-rose-600 uppercase tracking-wider mt-0.5">
                                Low Stock
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-500 font-medium">
                            {item.minThreshold} {item.unit}
                          </td>
                          {/* Kadaluwarsa Column */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-slate-800 font-medium text-xs">
                                {exp.displayDate}
                              </span>
                              <span
                                className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border w-fit ${exp.style}`}
                              >
                                {exp.badge}
                              </span>
                            </div>
                          </td>
                          {/* Action Column: Hanya Restock */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleOpenActionModal(item, 'restock')}
                                className="flex items-center gap-1 rounded-lg bg-[#618873] hover:bg-[#507160] text-white px-3 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                                title="Tambah Stok / Restock Bahan"
                              >
                                <FiPlus className="h-3.5 w-3.5" />
                                <span>Restock</span>
                              </button>
                            </div>
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
          MODAL: QUICK RESTOCK / WASTE FOR INVENTORY
      ======================================================== */}
      {actionModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#e5ece7] pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {actionModalItem.mode === 'restock' ? 'Restock Bahan Baku' : 'Catat Pengurangan / Waste'}
                </h3>
                <p className="text-xs text-slate-500">
                  {actionModalItem.item.name} ({outlets.find((o) => o.id === actionModalItem.item.outletId)?.name || 'Outlet'})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActionModalItem(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            {actionAlert ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-2">
                <FiCheckCircle className="h-8 w-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-800">{actionAlert}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah {actionModalItem.mode === 'restock' ? 'Restock' : 'Waste'} ({actionModalItem.item.unit})
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={actionQuantity}
                    onChange={(e) => setActionQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-[#e5ece7] bg-[#fafbf9] px-3.5 py-2 text-sm text-slate-800 focus:outline-hidden focus:border-[#618873]"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Stok saat ini: {actionModalItem.item.currentStock} {actionModalItem.item.unit}
                  </p>
                </div>

                {actionModalItem.mode === 'restock' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Biaya Satuan Beli (Rp per {actionModalItem.item.unit})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={actionUnitCost}
                        onChange={(e) => setActionUnitCost(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-xl border border-[#e5ece7] bg-[#fafbf9] px-3.5 py-2 text-sm text-slate-800 focus:outline-hidden focus:border-[#618873]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tanggal Kadaluwarsa Batch Baru
                      </label>
                      <input
                        type="date"
                        value={actionExpiryDate}
                        onChange={(e) => setActionExpiryDate(e.target.value)}
                        className="w-full rounded-xl border border-[#e5ece7] bg-[#fafbf9] px-3.5 py-2 text-sm text-slate-800 focus:outline-hidden focus:border-[#618873]"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Alasan Waste / Kadaluwarsa
                    </label>
                    <textarea
                      rows={2}
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Contoh: Susu basi, kopi tumpah, kemasan bocor..."
                      className="w-full rounded-xl border border-[#e5ece7] bg-[#fafbf9] p-3 text-xs text-slate-800 focus:outline-hidden focus:border-[#618873]"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5ece7]">
                  <button
                    type="button"
                    onClick={() => setActionModalItem(null)}
                    className="rounded-xl border border-[#e5ece7] px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteAction}
                    className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-2xs transition-all cursor-pointer ${
                      actionModalItem.mode === 'restock'
                        ? 'bg-[#618873] hover:bg-[#507160]'
                        : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    Simpan & Catat History
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF Report Modals */}
      <CashflowPDFReport
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        orders={activeOrders}
        products={products}
        outlets={outlets}
        defaultOutletId={reportOutletFilter}
        userName={user.name}
      />

      <StockPDFReport
        isOpen={isStockPdfModalOpen}
        onClose={() => setIsStockPdfModalOpen(false)}
        inventory={inventory}
        outlets={outlets}
        defaultOutletId={isCashier ? (currentOutlet?.id || user.outletId || 'outlet-1') : reportOutletFilter}
        userName={user.name}
        userRole={user.role}
      />
    </div>
  );
};
