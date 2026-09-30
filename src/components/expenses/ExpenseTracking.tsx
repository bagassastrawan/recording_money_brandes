'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/store/AppContext';
import { ExpenseCategory } from '@/types';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/utils/formatters';
import {
  FiReceipt as Receipt,
  FiPlus as Plus,
  FiTrash as Trash2,
  FiDownload as Download,
  FiSearch as Search,
  FiDollarSign as DollarSign,
  FiZap as Zap,
  FiShoppingBag as ShoppingBag,
  FiUsers as Users,
} from '@/components/ui/Flaticon';

export const ExpenseTracking: React.FC = () => {
  const {
    expenses,
    addExpense,
    deleteExpense,
    outlets,
    selectedOutletId,
    currentOutlet,
    user,
    refreshFromSupabase,
  } = useApp();

  // Auto-refresh operational expenses from Supabase in background on mount
  useEffect(() => {
    refreshFromSupabase();
  }, [refreshFromSupabase]);

  const [formCategory, setFormCategory] = useState<ExpenseCategory>('utilities');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formOutletId, setFormOutletId] = useState<string>(
    selectedOutletId === 'all' ? 'outlet-1' : selectedOutletId
  );
  const [formDate, setFormDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [formPaymentMethod, setFormPaymentMethod] = useState('Bank Transfer');
  const [formNotes, setFormNotes] = useState('');

  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const currentExpenses = expenses.filter((e) =>
    selectedOutletId === 'all' ? true : e.outletId === selectedOutletId
  );

  const filteredExpenses = currentExpenses.filter((e) => {
    const matchCat = filterCategory === 'All' || e.category === filterCategory;
    const matchSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  // Category totals
  const totalSalaries = currentExpenses
    .filter((e) => e.category === 'salaries')
    .reduce((s, e) => s + e.amount, 0);

  const totalUtilities = currentExpenses
    .filter((e) => e.category === 'utilities')
    .reduce((s, e) => s + e.amount, 0);

  const totalRawMaterials = currentExpenses
    .filter((e) => e.category === 'raw_materials')
    .reduce((s, e) => s + e.amount, 0);

  const totalAllExpenses = currentExpenses.reduce((s, e) => s + e.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAmount || formAmount <= 0) return;

    const targetOutlet = outlets.find((o) => o.id === formOutletId) || currentOutlet;

    addExpense({
      outletId: formOutletId,
      outletName: targetOutlet?.name || 'Outlet',
      category: formCategory,
      title: formTitle,
      amount: Number(formAmount),
      date: formDate,
      paymentMethod: formPaymentMethod,
      recordedBy: user.name,
      notes: formNotes,
    });

    setFormTitle('');
    setFormAmount('');
    setFormNotes('');
  };

  const handleExportCSV = () => {
    const rows = filteredExpenses.map((e) => ({
      ID: e.id,
      Date: e.date,
      Outlet: e.outletName,
      Category: e.category,
      Title: e.title,
      Amount: e.amount,
      PaymentMethod: e.paymentMethod,
      RecordedBy: e.recordedBy,
      Notes: e.notes || '',
    }));
    exportToCSV(`expenses_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const getCategoryBadge = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'salaries':
        return { label: 'Salaries & Payroll', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'utilities':
        return { label: 'Utilities (PLN/Water)', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'raw_materials':
        return { label: 'Raw Materials Restock', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'rent':
        return { label: 'Rent / Lease', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'maintenance':
        return { label: 'Maintenance & Service', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: 'Operational Cost', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">

      {/* Category Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expenses */}
        <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Overhead
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef4f0] text-[#618873]">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-800">
            {formatCurrency(totalAllExpenses)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Total recorded operating costs</p>
        </div>

        {/* Salaries */}
        <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Salaries & Baristas
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-800">
            {formatCurrency(totalSalaries)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Staff payroll & allowances</p>
        </div>

        {/* Utilities */}
        <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Utilities (PLN / Water)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Zap className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-800">
            {formatCurrency(totalUtilities)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Electricity, water, Wi-Fi</p>
        </div>

        {/* Raw Materials */}
        <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Raw Materials Buy
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-800">
            {formatCurrency(totalRawMaterials)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Milk, beans, packaging</p>
        </div>
      </div>

      {/* Main Grid: Input Form & Expense Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form (Cols 1-4) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-[#e5ece7] pb-3">
              <Receipt className="h-5 w-5 text-[#618873]" />
              <h3 className="text-sm font-bold text-slate-800">Record Operational Cost</h3>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Charge to Outlet
              </label>
              <select
                value={formOutletId}
                onChange={(e) => setFormOutletId(e.target.value)}
                className="w-full rounded-xl border border-[#e5ece7] bg-[#fafbf9] px-3 py-2 text-xs font-medium text-slate-700 focus:border-[#618873] focus:outline-hidden"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Expense Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                className="w-full rounded-xl border border-[#e5ece7] bg-[#fafbf9] px-3 py-2 text-xs font-medium text-slate-700 focus:border-[#618873] focus:outline-hidden"
              >
                <option value="salaries">Salaries & Barista Wages</option>
                <option value="utilities">Utilities (Electricity PLN, Water, Wi-Fi)</option>
                <option value="raw_materials">Raw Material Purchases</option>
                <option value="rent">Store Rent & Lease</option>
                <option value="maintenance">Equipment Repair & Maintenance</option>
                <option value="marketing">Marketing & Promotions</option>
                <option value="other">Other Operational Costs</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Title / Item Description
              </label>
              <input
                type="text"
                required
                placeholder="e.g. PLN Electricity Bill September"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs focus:border-[#618873] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Amount (IDR)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  required
                  placeholder="e.g. 500000"
                  value={formAmount}
                  onChange={(e) =>
                    setFormAmount(e.target.value ? Number(e.target.value) : '')
                  }
                  className="w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs font-bold text-slate-800 focus:border-[#618873] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs focus:border-[#618873] focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Payment Method
              </label>
              <select
                value={formPaymentMethod}
                onChange={(e) => setFormPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-[#e5ece7] bg-[#fafbf9] px-3 py-2 text-xs font-medium text-slate-700 focus:border-[#618873] focus:outline-hidden"
              >
                <option value="Bank Transfer">Bank Transfer (BCA / Mandiri)</option>
                <option value="Petty Cash Drawer">Petty Cash Drawer</option>
                <option value="Credit / Corporate Card">Corporate Card</option>
                <option value="Cash On Delivery">Cash On Delivery (COD)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Notes / Invoice Ref #
              </label>
              <input
                type="text"
                placeholder="Invoice number or vendor name..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs focus:border-[#618873] focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#618873] py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-[#507160] transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Save Expense Entry</span>
            </button>
          </form>
        </div>

        {/* Right Column: Expense Ledger (Cols 5-12) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">Operational Cost Ledger</h3>
                <p className="text-xs text-slate-500">
                  Itemized operational and overhead expenditures across outlets
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 rounded-xl border border-[#e5ece7] bg-[#fafbf9] px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-[#eef4f0] transition-all shadow-2xs cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-[#618873]" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-[#e5ece7] bg-[#fafbf9] py-2 pl-10 pr-4 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-hidden focus:border-[#618873]"
                />
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="rounded-xl border border-[#e5ece7] bg-[#fafbf9] px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="All">All Categories</option>
                <option value="salaries">Salaries</option>
                <option value="utilities">Utilities</option>
                <option value="raw_materials">Raw Materials</option>
                <option value="maintenance">Maintenance</option>
                <option value="rent">Rent</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5ece7] bg-[#fafbf9] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Outlet</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f4f2]">
                  {filteredExpenses.map((exp) => {
                    const badge = getCategoryBadge(exp.category);
                    return (
                      <tr key={exp.id} className="hover:bg-[#fafbf9] transition-colors">
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          {formatDate(exp.date)}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          {exp.outletName}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-800">{exp.title}</p>
                          {exp.notes && (
                            <p className="text-[11px] text-slate-400 italic">{exp.notes}</p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{exp.paymentMethod}</td>
                        <td className="py-3 px-3 text-right font-bold text-rose-600">
                          {formatCurrency(exp.amount)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              if (confirm(`Delete expense "${exp.title}"?`)) {
                                deleteExpense(exp.id);
                              }
                            }}
                            className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
      </div>
    </div>
  );
};
