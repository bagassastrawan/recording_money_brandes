'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/store/AppContext';
import { InventoryItem, StockOpnameItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import {
  FiPackage,
  FiAlertTriangle,
  FiReceipt,
  FiHistory,
  FiCheckCircle,
  FiSearch,
  FiPlus,
  FiX,
  FiStore,
  FiEdit2,
} from '@/components/ui/Flaticon';

export const InventoryManagement: React.FC = () => {
  const {
    inventory,
    outlets,
    selectedOutletId,
    currentOutlet,
    restockItem,
    addInventoryItem,
    updateInventoryItem,
    updateInventoryStock,
    stockOpnames,
    submitStockOpname,
    user,
    refreshFromSupabase,
  } = useApp();

  const isManager = user.role === 'manager';

  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'opname' | 'history'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Restock modal
  const [restockModalItem, setRestockModalItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(1000);
  const [restockCost, setRestockCost] = useState<number>(0);

  // Active viewing outlet: Strictly 1 outlet at a time so stocks are never mixed!
  // If not manager (cashier), ALWAYS lock to currentOutlet.id and forbid viewing other outlets.
  const [selectedLocalOutletId, setSelectedLocalOutletId] = useState<string | null>(null);
  const activeOutletId = isManager
    ? (selectedLocalOutletId || (selectedOutletId === 'all' ? (outlets[0]?.id || 'outlet-1') : selectedOutletId))
    : (currentOutlet?.id || user.outletId || 'outlet-1');

  // Add Item Modal (Manager Only)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemOutletId, setNewItemOutletId] = useState(
    selectedOutletId === 'all' ? (outlets[0]?.id || 'outlet-1') : selectedOutletId
  );
  const [newItemCategory, setNewItemCategory] = useState<InventoryItem['category']>('Coffee Beans');
  const [newItemStock, setNewItemStock] = useState<number>(10);
  const [newItemUnit, setNewItemUnit] = useState<InventoryItem['unit']>('pack');
  const [newItemMinThreshold, setNewItemMinThreshold] = useState<number>(3);
  const [newItemCostPerUnit, setNewItemCostPerUnit] = useState<number>(150000);
  const [newItemExpiryDate, setNewItemExpiryDate] = useState<string>('2026-12-31');
  const [syncAlert, setSyncAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit Item Modal (Manager Only)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<InventoryItem['category']>('Coffee Beans');
  const [editUnit, setEditUnit] = useState<InventoryItem['unit']>('pack');
  const [editMinThreshold, setEditMinThreshold] = useState<number>(3);
  const [editCostPerUnit, setEditCostPerUnit] = useState<number>(150000);
  const [editExpiryDate, setEditExpiryDate] = useState<string>('');

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditUnit(item.unit);
    setEditMinThreshold(item.minThreshold);
    setEditCostPerUnit(item.costPerUnit);
    setEditExpiryDate(item.expiryDate || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editName.trim()) return;

    const targetOutlet = outlets.find((o) => o.id === editingItem.outletId);
    const confirmMsg = `Konfirmasi Pembaruan Data Bahan Baku:\n\nNama Lama: ${editingItem.name}\nNama Baru: ${editName.trim()}\nCabang: ${targetOutlet?.name || editingItem.outletId}\nKategori: ${editCategory}\nSatuan: ${editUnit}\nBatas Minimum: ${editMinThreshold} ${editUnit}\nHarga Beli: Rp ${Number(editCostPerUnit).toLocaleString('id-ID')}\nKadaluwarsa: ${editExpiryDate || 'Tidak diset'}\n\nApakah Anda yakin ingin menyimpan perubahan data barang ini?`;
    if (!window.confirm(confirmMsg)) return;

    const updatedItemData: InventoryItem = {
      ...editingItem,
      name: editName.trim(),
      category: editCategory,
      unit: editUnit,
      minThreshold: Number(editMinThreshold),
      costPerUnit: Number(editCostPerUnit),
      expiryDate: editExpiryDate || undefined,
      lastUpdated: new Date().toISOString(),
    };

    updateInventoryItem(updatedItemData);
    setIsEditModalOpen(false);
    setEditingItem(null);
    setSyncAlert({
      type: 'success',
      message: `Data bahan baku "${editName.trim()}" berhasil diperbarui dan diselaraskan ke Supabase database!`,
    });
    setTimeout(() => setSyncAlert(null), 6000);
  };

  // Auto-refresh inventory data from Supabase in background on mount
  useEffect(() => {
    refreshFromSupabase();
  }, [refreshFromSupabase]);

  const handleCreateNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const targetOutlet = outlets.find((o) => o.id === newItemOutletId);
    const confirmMsg = `Konfirmasi Penambahan Bahan Baku Baru:\n\nNama: ${newItemName.trim()}\nCabang: ${targetOutlet?.name || newItemOutletId}\nStok Awal: ${newItemStock} ${newItemUnit}\nBatas Minimum: ${newItemMinThreshold} ${newItemUnit}\nHarga Beli: Rp ${Number(newItemCostPerUnit).toLocaleString('id-ID')}\nKadaluwarsa: ${newItemExpiryDate || 'Tidak diset'}\n\nApakah Anda yakin ingin menambahkan bahan baku ini?`;
    if (!window.confirm(confirmMsg)) return;

    addInventoryItem({
      name: newItemName.trim(),
      outletId: newItemOutletId,
      category: newItemCategory,
      currentStock: Number(newItemStock),
      unit: newItemUnit,
      minThreshold: Number(newItemMinThreshold),
      costPerUnit: Number(newItemCostPerUnit),
      expiryDate: newItemExpiryDate || undefined,
    });

    setIsAddModalOpen(false);
    setNewItemName('');
    setNewItemStock(10);
    setNewItemMinThreshold(3);
    setNewItemCostPerUnit(150000);
    setNewItemExpiryDate('2026-12-31');
    setSyncAlert({
      type: 'success',
      message: `Bahan baku "${newItemName.trim()}" (${newItemStock} ${newItemUnit}) berhasil ditambahkan ke cabang ${targetOutlet?.name || newItemOutletId}!`,
    });
    setTimeout(() => setSyncAlert(null), 6000);
  };

  // Opname Form State
  const [opnameOutletId, setOpnameOutletId] = useState<string>(
    selectedOutletId === 'all' ? (outlets[0]?.id || 'outlet-1') : selectedOutletId
  );
  const [opnameEmployee, setOpnameEmployee] = useState<string>(user.name);
  const [opnameNotes, setOpnameNotes] = useState<string>('Weekly Friday stock audit');
  const [opnameCounts, setOpnameCounts] = useState<Record<string, { count: number; reason: string }>>({});

  // Filtered inventory list: Strictly isolated per active outlet! Never combined or merged.
  const currentOutletItems = inventory.filter((item) => item.outletId === activeOutletId);

  const filteredItems = currentOutletItems.filter((item) => {
    const matchCat = categoryFilter === 'All' || item.category === categoryFilter;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const categories = [
    'All',
    'Coffee Beans',
    'Dairy & Milk',
    'Syrup & Powder',
    'Packaging',
    'Bakery Raw',
  ];

  // Opname items for the selected opname outlet
  const opnameOutletItems = inventory.filter((item) => item.outletId === opnameOutletId);

  const handleOpnameCountChange = (id: string, count: number) => {
    setOpnameCounts((prev) => ({
      ...prev,
      [id]: {
        count,
        reason: prev[id]?.reason || '',
      },
    }));
  };

  const handleOpnameReasonChange = (id: string, reason: string) => {
    setOpnameCounts((prev) => ({
      ...prev,
      [id]: {
        count: prev[id]?.count !== undefined ? prev[id].count : 0,
        reason,
      },
    }));
  };

  // Single row Perubahan Stok action
  const handleApplySingleStockChange = (inv: InventoryItem) => {
    const physical =
      opnameCounts[inv.id]?.count !== undefined
        ? opnameCounts[inv.id].count
        : inv.currentStock;
    const reason = opnameCounts[inv.id]?.reason || 'Pembaruan stok di menu weekly stock';

    if (physical === inv.currentStock) {
      alert(`Stok fisik (${physical} ${inv.unit}) sama dengan stok sistem saat ini. Ubah angka stok fisik jika ingin menerapkan perubahan stok.`);
      return;
    }

    const diff = physical - inv.currentStock;
    const confirmMsg = `Konfirmasi Perubahan Stok:\n\nBahan: ${inv.name}\nCabang: ${outlets.find((o) => o.id === inv.outletId)?.name || inv.outletId}\nStok Sistem Semula: ${inv.currentStock} ${inv.unit}\nStok Fisik Baru: ${physical} ${inv.unit} (${diff > 0 ? `+${diff}` : diff} ${inv.unit})\nAlasan: ${reason}\n\nApakah Anda yakin ingin menerapkan perubahan stok ini?`;
    if (!window.confirm(confirmMsg)) return;

    // 1. Update actual inventory stock in state & Supabase
    updateInventoryStock(inv.id, inv.outletId, physical);

    // 2. Submit into stockOpnames for Opname History tracking
    submitStockOpname({
      outletId: inv.outletId,
      outletName: outlets.find((o) => o.id === inv.outletId)?.name || 'Cabang',
      performedBy: opnameEmployee || `${user.name} (${isManager ? 'Manager' : 'Kasir'})`,
      date: new Date().toISOString().split('T')[0],
      items: [
        {
          rawMaterialId: inv.id,
          rawMaterialName: inv.name,
          unit: inv.unit,
          systemStock: inv.currentStock,
          physicalStock: physical,
          variance: diff,
          costPerUnit: inv.costPerUnit,
          varianceCost: 0,
          reason,
        },
      ],
      totalVarianceCost: 0,
      notes: reason,
      status: 'approved',
    });

    setSyncAlert({
      type: 'success',
      message: `Perubahan Stok Berhasil: Stok "${inv.name}" kini ${physical} ${inv.unit} (${diff > 0 ? `+${diff}` : diff}). Perubahan tercatat di Opname History.`,
    });
    setTimeout(() => setSyncAlert(null), 5000);
  };

  // Submit Opname Audit (Batch for all modified items)
  const handleSubmitOpname = (e: React.FormEvent) => {
    e.preventDefault();
    const targetOutlet = outlets.find((o) => o.id === opnameOutletId);

    const changedItems: StockOpnameItem[] = opnameOutletItems
      .map((inv) => {
        const physical =
          opnameCounts[inv.id]?.count !== undefined
            ? opnameCounts[inv.id].count
            : inv.currentStock;
        const diff = physical - inv.currentStock;

        return {
          rawMaterialId: inv.id,
          rawMaterialName: inv.name,
          unit: inv.unit,
          systemStock: inv.currentStock,
          physicalStock: physical,
          variance: diff,
          costPerUnit: inv.costPerUnit,
          varianceCost: 0,
          reason: opnameCounts[inv.id]?.reason || (diff !== 0 ? 'Pembaruan fisik di weekly stock' : ''),
        };
      })
      .filter((it) => it.variance !== 0);

    if (changedItems.length === 0) {
      alert('Tidak ada perubahan stok fisik yang dimasukkan. Silakan sesuaikan jumlah stok fisik pada bahan yang ingin diubah.');
      return;
    }

    const confirmMsg = `Konfirmasi Perubahan Stok Weekly Opname:\n\nCabang: ${targetOutlet?.name}\nTotal Bahan Berubah: ${changedItems.length} item\nPetugas: ${opnameEmployee}\n\nLanjutkan pembaruan stok ke sistem dan pencatatan riwayat?`;
    if (!window.confirm(confirmMsg)) return;

    submitStockOpname({
      outletId: opnameOutletId,
      outletName: targetOutlet?.name || 'Cabang',
      performedBy: opnameEmployee || `${user.name} (${isManager ? 'Manager' : 'Kasir'})`,
      date: new Date().toISOString().split('T')[0],
      items: changedItems,
      totalVarianceCost: 0,
      notes: opnameNotes || 'Pembaruan stok berkala dari menu weekly stock',
      status: 'approved',
    });

    setSyncAlert({
      type: 'success',
      message: `Perubahan Stok Berhasil: ${changedItems.length} bahan baku telah disesuaikan dan dicatat di Opname History!`,
    });
    setActiveSubTab('history');
    setTimeout(() => setSyncAlert(null), 6000);
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockModalItem) return;
    const targetOutlet = outlets.find((o) => o.id === restockModalItem.outletId);
    const addedQty = Number(restockQty);
    const newTotalStock = restockModalItem.currentStock + addedQty;

    const confirmMsg = `Konfirmasi Penambahan Stok:\n\nBahan Baku: ${restockModalItem.name}\nCabang Outlet: ${targetOutlet?.name || restockModalItem.outletId}\nJumlah Penambahan: +${addedQty} ${restockModalItem.unit}\nTotal Stok Baru: ${newTotalStock} ${restockModalItem.unit}\n\nApakah Anda yakin ingin memperbarui dan menyimpan stok ini?`;
    if (!window.confirm(confirmMsg)) return;

    restockItem(
      restockModalItem.id,
      restockModalItem.outletId,
      addedQty,
      restockCost > 0 ? restockCost : undefined
    );
    setRestockModalItem(null);
    setSyncAlert({
      type: 'success',
      message: `Penambahan Stok Berhasil: +${addedQty} ${restockModalItem.unit} "${restockModalItem.name}" berhasil ditambahkan ke cabang ${targetOutlet?.name || restockModalItem.outletId}. Total stok kini ${newTotalStock} ${restockModalItem.unit}.`,
    });
    setTimeout(() => setSyncAlert(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5ece7] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeSubTab === 'inventory'
                ? 'bg-[#618873] text-white shadow-2xs'
                : 'bg-white border border-[#e5ece7] text-slate-600 hover:bg-[#f4f7f5]'
            }`}
          >
            <FiPackage className="h-4 w-4" />
            <span>Raw Material Stock Levels</span>
          </button>

          <button
            onClick={() => setActiveSubTab('opname')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeSubTab === 'opname'
                ? 'bg-[#618873] text-white shadow-2xs'
                : 'bg-white border border-[#e5ece7] text-slate-600 hover:bg-[#f4f7f5]'
            }`}
          >
            <FiReceipt className="h-4 w-4" />
            <span>Weekly Stock Opname (Audit Form)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeSubTab === 'history'
                ? 'bg-[#618873] text-white shadow-2xs'
                : 'bg-white border border-[#e5ece7] text-slate-600 hover:bg-[#f4f7f5]'
            }`}
          >
            <FiHistory className="h-4 w-4" />
            <span>Opname History ({stockOpnames.length})</span>
          </button>
        </div>

        {/* Action Button: Add Item (Manager Only) */}
        {isManager && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNewItemOutletId(activeOutletId);
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-[#618873] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#507160] shadow-2xs transition-all cursor-pointer"
            >
              <FiPlus className="h-4 w-4" />
              <span>Tambah Bahan Baku</span>
            </button>
          </div>
        )}
      </div>

      {/* Sync / Alert Banner */}
      {syncAlert && (
        <div
          className={`flex items-center justify-between rounded-2xl p-4 text-xs font-medium border shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
            syncAlert.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shrink-0 shadow-2xs ${
                syncAlert.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {syncAlert.type === 'success' ? (
                <FiCheckCircle className="h-5 w-5" />
              ) : (
                <FiAlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-bold text-xs uppercase tracking-wide">
                {syncAlert.type === 'success' ? 'Pemberitahuan Stok Berhasil' : 'Peringatan Stok'}
              </p>
              <p className="text-xs text-slate-700 mt-0.5">{syncAlert.message}</p>
            </div>
          </div>
          <button
            onClick={() => setSyncAlert(null)}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors"
            title="Tutup Notifikasi"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 1: RAW MATERIAL INVENTORY TABLE
      ======================================================== */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-4">
          {/* Branch Outlet Selector Bar: Strictly isolate stock per outlet */}
          {isManager ? (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#fafbf9] border border-[#e5ece7] rounded-2xl shadow-2xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
                  <FiStore className="h-4 w-4 text-[#618873]" />
                  <span>Pilih Outlet (Stok Mandiri):</span>
                </span>
                {outlets.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setSelectedLocalOutletId(o.id);
                      setNewItemOutletId(o.id);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      activeOutletId === o.id
                        ? 'bg-[#618873] text-white shadow-2xs'
                        : 'bg-white border border-[#e5ece7] text-slate-700 hover:bg-[#f4f7f5]'
                    }`}
                  >
                    {o.name} ({o.code})
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Stok setiap cabang outlet berdiri sendiri dan tidak dicampur.
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#fafbf9] border border-[#e5ece7] rounded-2xl shadow-2xs">
              <div className="flex items-center gap-2">
                <FiStore className="h-4 w-4 text-[#618873]" />
                <span className="text-xs font-bold text-slate-800">
                  Cabang: {currentOutlet?.name || 'Cabang Ini'} ({currentOutlet?.code})
                </span>
                <span className="rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-700 px-2 py-0.5 border border-emerald-200">
                  Akses Kasir Terkunci
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                1 outlet tidak dapat melihat atau mengubah stok cabang lain.
              </div>
            </div>
          )}

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search raw materials (beans, milk, cups, syrup)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#e5ece7] bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-700 placeholder-slate-400 focus:border-[#618873] focus:outline-hidden focus:ring-2 focus:ring-[#618873]/15"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                    categoryFilter === cat
                      ? 'bg-[#618873] text-white shadow-2xs'
                      : 'bg-white border border-[#e5ece7] text-slate-600 hover:bg-[#f4f7f5]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-[#e5ece7] bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5ece7] bg-[#fafbf9] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Material / Bahan</th>
                    <th className="py-3.5 px-4">Categori</th>
                    <th className="py-3.5 px-4">Stock</th>
                    <th className="py-3.5 px-4">Unit Cost</th>
                    <th className="py-3.5 px-4">Tanggal Kadaluwarsa</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f4f2]">
                  {filteredItems.map((item) => {
                    const isLowStock = item.currentStock <= item.minThreshold;

                    // Calculate expiry countdown
                    const getExpiryMeta = (expiryDate?: string) => {
                      if (!expiryDate) {
                        return {
                          displayDate: 'Tidak ditentukan',
                          badge: 'Tanpa Tgl',
                          style: 'bg-slate-100 text-slate-500 border-slate-200',
                        };
                      }
                      const today = new Date('2026-10-02');
                      const exp = new Date(expiryDate);
                      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                      if (diffDays < 0) {
                        return {
                          displayDate: formatDate(expiryDate),
                          badge: `Expired (${Math.abs(diffDays)}h lalu)`,
                          style: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
                        };
                      }
                      if (diffDays <= 7) {
                        return {
                          displayDate: formatDate(expiryDate),
                          badge: `Mendekati (${diffDays}h lagi)`,
                          style: 'bg-amber-100 text-amber-800 border-amber-300 font-bold animate-pulse',
                        };
                      }
                      return {
                        displayDate: formatDate(expiryDate),
                        badge: `Aman (${diffDays}h lagi)`,
                        style: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
                      };
                    };

                    const expMeta = getExpiryMeta(item.expiryDate);

                    return (
                      <tr
                        key={`${item.id}-${item.outletId}`}
                        className={`transition-colors ${
                          isLowStock ? 'bg-rose-50/50 hover:bg-rose-50/80' : 'hover:bg-[#fafbf9]'
                        }`}
                      >
                        {/* 1. Material / Bahan */}
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                          </div>
                        </td>

                        {/* 2. Categori */}
                        <td className="py-3.5 px-4">
                          <span className="inline-block rounded-md bg-[#fafbf9] border border-[#e5ece7] px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {item.category}
                          </span>
                        </td>

                        {/* 3. Stock */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-extrabold text-sm ${
                                isLowStock ? 'text-rose-600' : 'text-slate-800'
                              }`}
                            >
                              {item.currentStock.toLocaleString()} {item.unit}
                            </span>
                            {isLowStock ? (
                              <span className="rounded bg-rose-100 border border-rose-300 text-[10px] font-bold text-rose-700 px-1.5 py-0.5 animate-pulse">
                                Min: {item.minThreshold}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                (Min: {item.minThreshold} {item.unit})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Unit Cost */}
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {formatCurrency(item.costPerUnit)} <span className="text-[10px] text-slate-400 font-normal">/ {item.unit}</span>
                        </td>

                        {/* 5. Tanggal Kadaluwarsa */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-800 text-xs">
                              {expMeta.displayDate}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] border w-fit ${expMeta.style}`}
                            >
                              {expMeta.badge}
                            </span>
                          </div>
                        </td>

                        {/* 6. Action */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isManager && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item)}
                                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                                title="Edit nama, kategori, unit & tanggal kadaluwarsa"
                              >
                                <FiEdit2 className="h-3.5 w-3.5 text-slate-500" />
                                <span>Edit</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setRestockModalItem(item);
                                setRestockQty(
                                  item.unit === 'g' ? 1000 : item.unit === 'ml' ? 2000 : 100
                                );
                                setRestockCost(item.costPerUnit);
                              }}
                              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                                isLowStock
                                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                                  : 'bg-[#618873] text-white hover:bg-[#507160]'
                              }`}
                            >
                              + Restock
                            </button>
                          </div>
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
          SUB-TAB 2: WEEKLY STOCK OPNAME AUDIT FORM
      ======================================================== */}
      {activeSubTab === 'opname' && (
        <form onSubmit={handleSubmitOpname} className="space-y-5">
          <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5ece7] pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Weekly Stock Opname Physical Audit
                </h3>
                <p className="text-xs text-slate-500">
                  Enter physical count from the bar & storage. The system will calculate variances, spillage, and automatically adjust inventory balances.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Audited Outlet
                  </label>
                  {isManager ? (
                    <select
                      value={opnameOutletId}
                      onChange={(e) => setOpnameOutletId(e.target.value)}
                      className="rounded-xl border border-[#e5ece7] bg-[#fafbf9] px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden"
                    >
                      {outlets.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-xl border border-[#e5ece7] bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                      {currentOutlet?.name || 'Cabang Ini'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Audited By
                  </label>
                  <input
                    type="text"
                    value={opnameEmployee}
                    onChange={(e) => setOpnameEmployee(e.target.value)}
                    className="rounded-xl border border-[#e5ece7] bg-[#fafbf9] px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Opname Table (Variance and Variance Cost Deleted, Action Perubahan Stok Added) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5ece7] text-slate-500 font-bold uppercase tracking-wider text-[11px] bg-[#fafbf9]">
                    <th className="py-3 px-3">Bahan Baku (Raw Material)</th>
                    <th className="py-3 px-3">Stok Sistem Saat Ini</th>
                    <th className="py-3 px-3">Stok Fisik Baru (Hasil Hitung)</th>
                    <th className="py-3 px-3">Alasan / Catatan Perubahan</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f4f2]">
                  {opnameOutletItems.map((inv) => {
                    const physical =
                      opnameCounts[inv.id]?.count !== undefined
                        ? opnameCounts[inv.id].count
                        : inv.currentStock;
                    const isChanged = physical !== inv.currentStock;

                    return (
                      <tr key={inv.id} className={`transition-colors ${isChanged ? 'bg-amber-50/40' : 'hover:bg-[#fafbf9]'}`}>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {inv.name}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {inv.category}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-semibold text-slate-700">
                          <span className="inline-block rounded-md bg-[#f4f7f5] px-2 py-0.5 border border-[#e5ece7]">
                            {inv.currentStock.toLocaleString()} {inv.unit}
                          </span>
                        </td>

                        {/* Physical Count Input */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={physical}
                              onChange={(e) =>
                                handleOpnameCountChange(inv.id, Number(e.target.value))
                              }
                              className={`w-28 rounded-lg border px-2.5 py-1 text-right text-xs font-bold focus:outline-hidden ${
                                isChanged
                                  ? 'border-[#618873] bg-emerald-50/50 text-[#507160]'
                                  : 'border-[#e5ece7] bg-white text-slate-800 focus:border-[#618873]'
                              }`}
                            />
                            <span className="text-slate-400 text-[11px]">{inv.unit}</span>
                          </div>
                        </td>

                        {/* Reason / Notes */}
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            placeholder="Alasan perubahan stok (misal: kalibrasi grinder, tumpah, selisih hitung)..."
                            value={opnameCounts[inv.id]?.reason || ''}
                            onChange={(e) => handleOpnameReasonChange(inv.id, e.target.value)}
                            className="w-full rounded-lg border border-[#e5ece7] bg-white px-2.5 py-1 text-[11px] text-slate-700 placeholder-slate-400 focus:border-[#618873] focus:outline-hidden"
                          />
                        </td>

                        {/* Action Column: Perubahan Stok */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleApplySingleStockChange(inv)}
                            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer whitespace-nowrap mx-auto ${
                              isChanged
                                ? 'bg-[#618873] hover:bg-[#507160] text-white animate-pulse'
                                : 'bg-[#f4f7f5] hover:bg-[#e5ece7] text-slate-600 border border-[#e5ece7]'
                            }`}
                            title="Terapkan perubahan stok untuk bahan ini"
                          >
                            <FiCheckCircle className="h-3.5 w-3.5" />
                            <span>Perubahan Stok</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#e5ece7]">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Overall Audit Notes
                </label>
                <input
                  type="text"
                  value={opnameNotes}
                  onChange={(e) => setOpnameNotes(e.target.value)}
                  className="w-full sm:w-96 rounded-xl border border-[#e5ece7] px-3 py-1.5 text-xs text-slate-700 focus:border-[#618873] focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-[#618873] px-6 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-[#507160] transition-all"
              >
                <FiCheckCircle className="h-4 w-4" />
                <span>Submit & Apply Stock Opname</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================
          SUB-TAB 3: OPNAME HISTORY (PERUBAHAN DARI WEEKLY STOCK)
      ======================================================== */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Opname History (Riwayat Perubahan Stok)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Mencatat seluruh perubahan stok yang terjadi saat melakukan edit stok pada menu Weekly Stock Opname oleh Kasir maupun Manager
            </p>

            {stockOpnames.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#e5ece7] p-8 text-center text-slate-400 text-xs">
                <FiHistory className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">Belum ada riwayat perubahan stok</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Lakukan perubahan stok pada tab Weekly Stock Opname untuk mencatat riwayat perubahan fisik di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {stockOpnames.map((record) => (
                  <div
                    key={record.id}
                    className="rounded-xl border border-[#e5ece7] bg-[#fafbf9] p-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5ece7] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{record.outletName}</span>
                          <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            TERAPKAN STOK
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Dilakukan oleh: <strong className="text-slate-700">{record.performedBy}</strong> • Tanggal: {formatDate(record.date)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-500 bg-white border border-[#e5ece7] px-2.5 py-1 rounded-lg">
                          {record.items.length} Bahan Disesuaikan
                        </span>
                      </div>
                    </div>

                    {record.notes && (
                      <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-lg border border-[#e5ece7]">
                        &ldquo;{record.notes}&rdquo;
                      </p>
                    )}

                    {/* Summary of items modified in this edit action */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {record.items.map((item, idx) => {
                        const isIncrease = item.variance > 0;
                        return (
                          <div
                            key={idx}
                            className="rounded-lg bg-white p-3 text-xs border border-[#e5ece7] space-y-1 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 truncate">
                                {item.rawMaterialName}
                              </span>
                              <span
                                className={`text-[11px] font-extrabold px-1.5 py-0.2 rounded ${
                                  isIncrease
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {isIncrease ? `+${item.variance}` : item.variance} {item.unit}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>Stok Semula: <strong className="text-slate-700">{item.systemStock}</strong></span>
                              <span>➔</span>
                              <span>Stok Baru: <strong className="text-[#507160] font-bold">{item.physicalStock}</strong> {item.unit}</span>
                            </div>

                            {item.reason && (
                              <p className="text-[10px] text-slate-400 italic pt-1 border-t border-[#f4f7f5] truncate">
                                Alasan: {item.reason}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          RESTOCK MODAL
      ======================================================== */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#e5ece7]">
            <h3 className="text-base font-bold text-slate-800">Restock Material</h3>
            <p className="text-xs text-slate-500 mt-1">
              Add stock to <strong className="text-slate-800">{restockModalItem.name}</strong>
            </p>

            <form onSubmit={handleRestockSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Quantity Received ({restockModalItem.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-sm focus:border-[#618873] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Unit Cost (Rp / {restockModalItem.unit})
                </label>
                <input
                  type="number"
                  min="0"
                  value={restockCost}
                  onChange={(e) => setRestockCost(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-sm focus:border-[#618873] focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 This will automatically log a Raw Material Purchase in Expenses.
                </p>
              </div>

              <div className="rounded-xl bg-[#fafbf9] p-3 text-xs text-slate-600 border border-[#e5ece7] space-y-1">
                <div className="flex justify-between">
                  <span>Current Stock:</span>
                  <span className="font-bold text-slate-800">
                    {restockModalItem.currentStock} {restockModalItem.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Resulting Stock:</span>
                  <span className="font-bold text-emerald-600">
                    {restockModalItem.currentStock + Number(restockQty)} {restockModalItem.unit}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#f1f4f2]">
                  <span>Total Purchase Value:</span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(Number(restockQty) * restockCost)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModalItem(null)}
                  className="rounded-xl border border-[#e5ece7] px-4 py-2 text-xs font-medium text-slate-600 hover:bg-[#f4f7f5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#618873] px-4 py-2 text-xs font-semibold text-white hover:bg-[#507160] shadow-2xs"
                >
                  Confirm & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Bahan Baku Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#e5ece7] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5ece7]">
              <div>
                <h3 className="text-base font-bold text-slate-800">Tambah Bahan Baku Baru</h3>
                <p className="text-xs text-slate-500">Daftarkan bahan baku ke outlet cabang yang dipilih</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewItem} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Pilih Outlet Cabang</label>
                <select
                  value={newItemOutletId}
                  onChange={(e) => setNewItemOutletId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e5ece7] bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#618873] focus:outline-hidden"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      Brandes {o.name} ({o.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Nama Bahan Baku</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Biji Kopi Gayo, Fresh Milk Greenfields..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#618873] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Kategori</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as InventoryItem['category'])}
                    className="mt-1 w-full rounded-xl border border-[#e5ece7] bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#618873] focus:outline-hidden"
                  >
                    <option value="Coffee Beans">Coffee Beans</option>
                    <option value="Dairy & Milk">Dairy & Milk</option>
                    <option value="Syrup & Powder">Syrup & Powder</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Bakery Raw">Bakery Raw</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Satuan (Unit)</label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value as InventoryItem['unit'])}
                    className="mt-1 w-full rounded-xl border border-[#e5ece7] bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#618873] focus:outline-hidden"
                  >
                    <option value="pack">Pack</option>
                    <option value="btl">Botol (btl)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="dus">Dus / Karton (dus)</option>
                    <option value="cup">Cup</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="pump">Pump</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Stok Awal</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#e5ece7] px-2.5 py-2 text-xs focus:border-[#618873] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Batas Min</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newItemMinThreshold}
                    onChange={(e) => setNewItemMinThreshold(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#e5ece7] px-2.5 py-2 text-xs focus:border-[#618873] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">HPP / Unit (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newItemCostPerUnit}
                    onChange={(e) => setNewItemCostPerUnit(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#e5ece7] px-2.5 py-2 text-xs focus:border-[#618873] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Tanggal Kadaluwarsa</label>
                <input
                  type="date"
                  value={newItemExpiryDate}
                  onChange={(e) => setNewItemExpiryDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs focus:border-[#618873] focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e5ece7]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-[#e5ece7] px-4 py-2 text-xs font-medium text-slate-600 hover:bg-[#f4f7f5]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#618873] px-4 py-2 text-xs font-semibold text-white hover:bg-[#507160] shadow-2xs"
                >
                  Simpan Bahan Baku
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          EDIT ITEM MODAL (MANAGER ONLY)
      ======================================================== */}
      {isEditModalOpen && editingItem && isManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#e5ece7] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#e5ece7] pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ubah Data / Nama Bahan Baku</h3>
                <p className="text-[11px] text-slate-500">
                  Perbarui informasi master bahan baku untuk cabang {outlets.find(o => o.id === editingItem.outletId)?.name || editingItem.outletId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingItem(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateItemSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Nama Bahan Baku</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Espresso Blend House Roast..."
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#618873] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Kategori</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as InventoryItem['category'])}
                    className="mt-1 w-full rounded-xl border border-[#e5ece7] bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#618873] focus:outline-hidden"
                  >
                    <option value="Coffee Beans">Coffee Beans</option>
                    <option value="Dairy & Milk">Dairy & Milk</option>
                    <option value="Syrup & Powder">Syrup & Powder</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Bakery Raw">Bakery Raw</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Satuan (Unit)</label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value as InventoryItem['unit'])}
                    className="mt-1 w-full rounded-xl border border-[#e5ece7] bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#618873] focus:outline-hidden"
                  >
                    <option value="pack">Pack</option>
                    <option value="btl">Botol (btl)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="dus">Dus / Karton (dus)</option>
                    <option value="cup">Cup</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="pump">Pump</option>
                    <option value="g">Gram (g)</option>
                    <option value="ml">Mililiter (ml)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Batas Min Threshold</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editMinThreshold}
                    onChange={(e) => setEditMinThreshold(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs focus:border-[#618873] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">HPP / Unit Cost (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editCostPerUnit}
                    onChange={(e) => setEditCostPerUnit(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs focus:border-[#618873] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Tanggal Kadaluwarsa</label>
                <input
                  type="date"
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#618873] focus:outline-hidden"
                />
              </div>

              <div className="p-3 bg-[#fafbf9] border border-[#e5ece7] rounded-xl text-[11px] text-slate-600">
                <span className="font-semibold text-slate-800">Stok Saat Ini:</span> {editingItem.currentStock} {editingItem.unit}. Untuk menambah stok fisik, gunakan tombol <span className="font-semibold text-[#618873]">+ Restock</span>.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e5ece7]">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="rounded-xl border border-[#e5ece7] px-4 py-2 text-xs font-medium text-slate-600 hover:bg-[#f4f7f5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#618873] px-4 py-2 text-xs font-semibold text-white hover:bg-[#507160] shadow-2xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
