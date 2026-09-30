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
} from '@/components/ui/Flaticon';

export const InventoryManagement: React.FC = () => {
  const {
    inventory,
    outlets,
    selectedOutletId,
    restockItem,
    addInventoryItem,
    stockOpnames,
    submitStockOpname,
    user,
    refreshFromSupabase,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'opname' | 'history'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Restock modal
  const [restockModalItem, setRestockModalItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(1000);
  const [restockCost, setRestockCost] = useState<number>(0);

  // Add Item Modal
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
  const [syncAlert, setSyncAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-refresh inventory data from Supabase in background on mount
  useEffect(() => {
    refreshFromSupabase();
  }, [refreshFromSupabase]);

  const handleCreateNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    addInventoryItem({
      name: newItemName.trim(),
      outletId: newItemOutletId,
      category: newItemCategory,
      currentStock: Number(newItemStock),
      unit: newItemUnit,
      minThreshold: Number(newItemMinThreshold),
      costPerUnit: Number(newItemCostPerUnit),
    });

    setIsAddModalOpen(false);
    setNewItemName('');
    setNewItemStock(1000);
    setNewItemMinThreshold(200);
    setNewItemCostPerUnit(150);
    setSyncAlert({
      type: 'success',
      message: `Bahan baku "${newItemName.trim()}" berhasil ditambahkan ke outlet dan disinkronkan ke Cloud!`,
    });
    setTimeout(() => setSyncAlert(null), 4000);
  };

  // Opname Form State
  const [opnameOutletId, setOpnameOutletId] = useState<string>(
    selectedOutletId === 'all' ? 'outlet-1' : selectedOutletId
  );
  const [opnameEmployee, setOpnameEmployee] = useState<string>(user.name);
  const [opnameNotes, setOpnameNotes] = useState<string>('Weekly Friday stock audit');
  const [opnameCounts, setOpnameCounts] = useState<Record<string, { count: number; reason: string }>>({});

  // Filtered inventory list
  const currentOutletItems = inventory.filter((item) =>
    selectedOutletId === 'all' ? true : item.outletId === selectedOutletId
  );

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

  // Submit Opname Audit
  const handleSubmitOpname = (e: React.FormEvent) => {
    e.preventDefault();
    const targetOutlet = outlets.find((o) => o.id === opnameOutletId);

    const items: StockOpnameItem[] = opnameOutletItems.map((inv) => {
      const physical =
        opnameCounts[inv.id]?.count !== undefined
          ? opnameCounts[inv.id].count
          : inv.currentStock;
      const variance = physical - inv.currentStock;
      const varianceCost = variance * inv.costPerUnit;

      return {
        rawMaterialId: inv.id,
        rawMaterialName: inv.name,
        unit: inv.unit,
        systemStock: inv.currentStock,
        physicalStock: physical,
        variance,
        costPerUnit: inv.costPerUnit,
        varianceCost,
        reason: opnameCounts[inv.id]?.reason || (variance < 0 ? 'Normal consumption / spillage' : ''),
      };
    });

    const totalVarianceCost = items.reduce((sum, item) => sum + item.varianceCost, 0);

    submitStockOpname({
      outletId: opnameOutletId,
      outletName: targetOutlet?.name || 'Outlet',
      performedBy: opnameEmployee,
      date: new Date().toISOString().split('T')[0],
      items,
      totalVarianceCost,
      notes: opnameNotes,
      status: 'approved',
    });

    alert('Weekly Stock Opname audit submitted! System stock has been updated to match physical counts.');
    setActiveSubTab('history');
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockModalItem) return;
    restockItem(
      restockModalItem.id,
      restockModalItem.outletId,
      Number(restockQty),
      restockCost > 0 ? restockCost : undefined
    );
    setRestockModalItem(null);
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

        {/* Action Button: Add Item */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setNewItemOutletId(selectedOutletId === 'all' ? (outlets[0]?.id || 'outlet-1') : selectedOutletId);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-[#618873] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#507160] shadow-2xs transition-all cursor-pointer"
          >
            <FiPlus className="h-4 w-4" />
            <span>Tambah Bahan Baku</span>
          </button>
        </div>
      </div>

      {/* Sync / Alert Banner */}
      {syncAlert && (
        <div
          className={`flex items-center justify-between rounded-xl p-3.5 text-xs font-medium border ${
            syncAlert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{syncAlert.message}</span>
          <button onClick={() => setSyncAlert(null)} className="text-slate-400 hover:text-slate-600">
            <FiX className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 1: RAW MATERIAL INVENTORY TABLE
      ======================================================== */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-4">
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
                    <th className="py-3.5 px-4">Raw Material / Bahan</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Current Stock</th>
                    <th className="py-3.5 px-4">Min. Threshold</th>
                    <th className="py-3.5 px-4">Unit Cost</th>
                    <th className="py-3.5 px-4">Stock Health Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f4f2]">
                  {filteredItems.map((item) => {
                    const isLowStock = item.currentStock <= item.minThreshold;

                    return (
                      <tr
                        key={`${item.id}-${item.outletId}`}
                        className={`transition-colors ${
                          isLowStock ? 'bg-rose-50/50 hover:bg-rose-50/80' : 'hover:bg-[#fafbf9]'
                        }`}
                      >
                        {/* Name */}
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {item.name}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className="inline-block rounded-md bg-[#fafbf9] border border-[#e5ece7] px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {item.category}
                          </span>
                        </td>

                        {/* Current Stock */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-extrabold text-sm ${
                              isLowStock ? 'text-rose-600' : 'text-slate-800'
                            }`}
                          >
                            {item.currentStock.toLocaleString()} {item.unit}
                          </span>
                        </td>

                        {/* Min Threshold */}
                        <td className="py-3.5 px-4 text-slate-500 font-medium">
                          {item.minThreshold.toLocaleString()} {item.unit}
                        </td>

                        {/* Cost */}
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {formatCurrency(item.costPerUnit)} / {item.unit}
                        </td>

                        {/* Status (Highlighted in RED if low) */}
                        <td className="py-3.5 px-4">
                          {isLowStock ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 border border-rose-300 px-3 py-1 text-xs font-bold text-rose-700 animate-pulse">
                              <FiAlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                              LOW STOCK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef4f0] border border-[#d6e3da] px-3 py-1 text-xs font-semibold text-[#507160]">
                              <FiCheckCircle className="h-3.5 w-3.5 text-[#618873]" />
                              Optimal Level
                            </span>
                          )}
                        </td>

                        {/* Restock Action */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setRestockModalItem(item);
                              setRestockQty(
                                item.unit === 'g' ? 1000 : item.unit === 'ml' ? 2000 : 100
                              );
                              setRestockCost(item.costPerUnit);
                            }}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all shadow-2xs ${
                              isLowStock
                                ? 'bg-rose-600 text-white hover:bg-rose-700'
                                : 'bg-[#618873] text-white hover:bg-[#507160]'
                            }`}
                          >
                            + Restock
                          </button>
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

            {/* Opname Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5ece7] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Raw Material</th>
                    <th className="py-3 px-3">System Stock (Recorded)</th>
                    <th className="py-3 px-3">Physical Count (Actual)</th>
                    <th className="py-3 px-3">Variance</th>
                    <th className="py-3 px-3">Variance Cost</th>
                    <th className="py-3 px-3">Audit Reason / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f4f2]">
                  {opnameOutletItems.map((inv) => {
                    const physical =
                      opnameCounts[inv.id]?.count !== undefined
                        ? opnameCounts[inv.id].count
                        : inv.currentStock;
                    const variance = physical - inv.currentStock;
                    const varianceCost = variance * inv.costPerUnit;

                    return (
                      <tr key={inv.id} className="hover:bg-[#fafbf9]">
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {inv.name}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {inv.category}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-semibold text-slate-600">
                          {inv.currentStock.toLocaleString()} {inv.unit}
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
                              className="w-28 rounded-lg border border-[#e5ece7] bg-white px-2.5 py-1 text-right text-xs font-bold text-slate-800 focus:border-[#618873] focus:outline-hidden"
                            />
                            <span className="text-slate-400 text-[11px]">{inv.unit}</span>
                          </div>
                        </td>

                        {/* Variance */}
                        <td className="py-3 px-3">
                          <span
                            className={`font-extrabold ${
                              variance < 0
                                ? 'text-rose-600'
                                : variance > 0
                                ? 'text-emerald-600'
                                : 'text-slate-500'
                            }`}
                          >
                            {variance > 0 ? `+${variance}` : variance} {inv.unit}
                          </span>
                        </td>

                        {/* Variance Cost */}
                        <td className="py-3 px-3 font-semibold">
                          <span
                            className={
                              varianceCost < 0
                                ? 'text-rose-600'
                                : varianceCost > 0
                                ? 'text-emerald-600'
                                : 'text-slate-500'
                            }
                          >
                            {formatCurrency(varianceCost)}
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            placeholder="e.g. Grinder calibration, cup drop..."
                            value={opnameCounts[inv.id]?.reason || ''}
                            onChange={(e) => handleOpnameReasonChange(inv.id, e.target.value)}
                            className="w-full rounded-lg border border-[#e5ece7] bg-white px-2 py-1 text-[11px] text-slate-600 placeholder-slate-400 focus:border-[#618873] focus:outline-hidden"
                          />
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
          SUB-TAB 3: OPNAME AUDIT HISTORY
      ======================================================== */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
            <h3 className="text-base font-bold text-slate-800 mb-1">Opname Audit Log</h3>
            <p className="text-xs text-slate-500 mb-4">
              Historical record of physical counts and inventory variance reconciliations
            </p>

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
                          {record.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Performed by: <strong className="text-slate-700">{record.performedBy}</strong> on {formatDate(record.date)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Total Discrepancy Cost:</span>
                      <span
                        className={`text-sm font-bold ${
                          record.totalVarianceCost < 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatCurrency(record.totalVarianceCost)}
                      </span>
                    </div>
                  </div>

                  {record.notes && (
                    <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-lg border border-[#e5ece7]">
                      &ldquo;{record.notes}&rdquo;
                    </p>
                  )}

                  {/* Summary of items in audit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {record.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg bg-white p-2 text-[11px] border border-[#f1f4f2] flex justify-between items-center"
                      >
                        <span className="font-medium text-slate-700 truncate max-w-[150px]">
                          {item.rawMaterialName}
                        </span>
                        <span
                          className={`font-bold ${
                            item.variance < 0 ? 'text-rose-600' : 'text-slate-600'
                          }`}
                        >
                          {item.variance > 0 ? `+${item.variance}` : item.variance} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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

              <div className="grid grid-cols-3 gap-2.5">
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
    </div>
  );
};
