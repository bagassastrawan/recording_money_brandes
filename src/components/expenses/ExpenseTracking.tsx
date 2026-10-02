'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/store/AppContext';
import { Expense, ExpenseCategory } from '@/types';
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
  FiEye,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
  FiCalendar,
  FiCreditCard,
  FiStore,
} from '@/components/ui/Flaticon';

export const ExpenseTracking: React.FC = () => {
  const {
    expenses,
    addExpense,
    deleteExpense,
    outlets,
    selectedOutletId,
    setSelectedOutletId,
    currentOutlet,
    user,
    refreshFromSupabase,
    isSupabaseActive,
  } = useApp();

  // Auto-refresh operational expenses from Supabase on mount
  useEffect(() => {
    refreshFromSupabase();
  }, [refreshFromSupabase]);

  // Form states
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('utilities');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formOutletId, setFormOutletId] = useState<string>(
    selectedOutletId === 'all' ? 'outlet-1' : selectedOutletId
  );
  const [formDate, setFormDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [formPaymentMethod, setFormPaymentMethod] = useState('Bank Transfer');
  const [formNotes, setFormNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<{
    url: string;
    name: string;
    type: string;
    size: number;
  } | null>(null);
  const [previewReceiptModal, setPreviewReceiptModal] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Ukuran file maksimal 8 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptFile({
        url: reader.result as string,
        name: file.name,
        type: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        size: file.size,
      });
    };
    reader.readAsDataURL(file);
  };

  // Keep formOutletId aligned if the active outlet changes (unless set to all)
  useEffect(() => {
    if (selectedOutletId !== 'all') {
      setFormOutletId(selectedOutletId);
    }
  }, [selectedOutletId]);

  // Filters & Search
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // View Data Detail Modal State
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);

  // Success / Info Alert Feedback State
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    actionOutletId?: string;
    actionOutletName?: string;
  } | null>(null);

  // Auto-dismiss alert after 7 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Filter expenses by selected outlet
  const currentExpenses = expenses.filter((e) =>
    selectedOutletId === 'all' ? true : e.outletId === selectedOutletId
  );

  const filteredExpenses = currentExpenses.filter((e) => {
    const matchCat = filterCategory === 'All' || e.category === filterCategory;
    const matchSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.outletName && e.outletName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.paymentMethod && e.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  // Category totals for top overview cards
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

    if (!formTitle.trim()) {
      setFeedback({
        type: 'error',
        message: 'Silakan isi judul atau deskripsi pengeluaran.',
      });
      return;
    }

    // Parse amount cleanly removing any dot separators
    const cleanedAmountStr = formAmount.replace(/\./g, '').replace(/,/g, '.');
    const numericAmount = parseFloat(cleanedAmountStr);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setFeedback({
        type: 'error',
        message: 'Nominal pengeluaran harus berupa angka lebih besar dari Rp 0.',
      });
      return;
    }

    const targetOutlet = outlets.find((o) => o.id === formOutletId) || currentOutlet;
    const targetOutletName = targetOutlet?.name || 'Outlet';

    addExpense({
      outletId: formOutletId,
      outletName: targetOutletName,
      category: formCategory,
      title: formTitle.trim(),
      amount: numericAmount,
      date: formDate,
      paymentMethod: formPaymentMethod,
      recordedBy: user.name || 'Manajer',
      notes: formNotes.trim() || undefined,
      receiptUrl: receiptFile?.url,
      receiptName: receiptFile?.name,
      receiptType: receiptFile?.type,
    });

    // Provide immediate visual feedback
    const isHiddenByFilter = selectedOutletId !== 'all' && selectedOutletId !== formOutletId;
    setFeedback({
      type: 'success',
      message: `Pengeluaran "${formTitle.trim()}" sebesar ${formatCurrency(numericAmount)} berhasil disimpan!${
        receiptFile ? ' (Bukti nota terunggah)' : ''
      }`,
      actionOutletId: isHiddenByFilter ? formOutletId : undefined,
      actionOutletName: isHiddenByFilter ? targetOutletName : undefined,
    });

    // Reset input fields
    setFormTitle('');
    setFormAmount('');
    setFormNotes('');
    setReceiptFile(null);
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
    exportToCSV(`pengeluaran_operasional_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const getCategoryBadge = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'salaries':
        return { label: 'Gaji & Staff Payroll', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'utilities':
        return { label: 'Utilitas (PLN / Air / Wi-Fi)', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'raw_materials':
        return { label: 'Belanja Bahan Baku', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'rent':
        return { label: 'Sewa Tempat / Bangunan', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'maintenance':
        return { label: 'Servis Mesin & Perbaikan', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'marketing':
        return { label: 'Marketing & Promosi', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      default:
        return { label: 'Biaya Operasional Lainnya', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
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
              Total Pengeluaran
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef4f0] text-[#618873]">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-800">
            {formatCurrency(totalAllExpenses)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {selectedOutletId === 'all' ? 'Akumulasi semua cabang' : `Cabang ${currentOutlet?.name || 'terpilih'}`}
          </p>
        </div>

        {/* Salaries */}
        <div
          onClick={() => setFilterCategory(filterCategory === 'salaries' ? 'All' : 'salaries')}
          className={`cursor-pointer rounded-2xl border transition-all p-5 shadow-2xs ${
            filterCategory === 'salaries' ? 'border-blue-400 bg-blue-50/40 ring-2 ring-blue-100' : 'border-[#e5ece7] bg-white hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Gaji & Barista
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-800">
            {formatCurrency(totalSalaries)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Upah barista & staf kasir</p>
        </div>

        {/* Utilities */}
        <div
          onClick={() => setFilterCategory(filterCategory === 'utilities' ? 'All' : 'utilities')}
          className={`cursor-pointer rounded-2xl border transition-all p-5 shadow-2xs ${
            filterCategory === 'utilities' ? 'border-amber-400 bg-amber-50/40 ring-2 ring-amber-100' : 'border-[#e5ece7] bg-white hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Utilitas (PLN / Air)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Zap className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-800">
            {formatCurrency(totalUtilities)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Token listrik, air PDAM, Wi-Fi</p>
        </div>

        {/* Raw Materials */}
        <div
          onClick={() => setFilterCategory(filterCategory === 'raw_materials' ? 'All' : 'raw_materials')}
          className={`cursor-pointer rounded-2xl border transition-all p-5 shadow-2xs ${
            filterCategory === 'raw_materials' ? 'border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-100' : 'border-[#e5ece7] bg-white hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Bahan Baku
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-800">
            {formatCurrency(totalRawMaterials)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Restock susu, kopi, cup & sirup</p>
        </div>
      </div>

      {/* Interactive Alert / Toast Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl p-4 text-xs font-semibold shadow-xs animate-in fade-in duration-200 border ${
            feedback.type === 'success'
              ? 'bg-[#eef4f0] border-[#d6e3da] text-[#507160]'
              : feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' && <FiCheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />}
            {feedback.type === 'error' && <FiAlertCircle className="h-5 w-5 shrink-0 text-rose-600" />}
            {feedback.type === 'info' && <Receipt className="h-5 w-5 shrink-0 text-blue-600" />}
            <span>{feedback.message}</span>
            {feedback.actionOutletId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedOutletId(feedback.actionOutletId!);
                  setFeedback(null);
                }}
                className="ml-2 inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-[#507160] border border-[#d6e3da] hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
              >
                Lihat di Cabang {feedback.actionOutletName} →
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Input Form & Expense Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form (Cols 1-4) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#e5ece7] pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#618873]" />
                <h3 className="text-sm font-bold text-slate-800">Catat Pengeluaran Baru</h3>
              </div>
              <span className="rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-[10px] font-bold">
                Multi-Branch
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Bebankan ke Cabang (Outlet) *
              </label>
              <select
                value={formOutletId}
                onChange={(e) => setFormOutletId(e.target.value)}
                className="w-full rounded-xl border border-[#e5ece7] bg-[#fafbf9] px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#618873] focus:outline-hidden"
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
                Kategori Biaya Operasional *
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                className="w-full rounded-xl border border-[#e5ece7] bg-[#fafbf9] px-3 py-2 text-xs font-medium text-slate-700 focus:border-[#618873] focus:outline-hidden"
              >
                <option value="utilities">Utilitas (Listrik PLN, Token, Air PDAM, Wi-Fi)</option>
                <option value="raw_materials">Belanja Bahan Baku (Susu, Kopi, Cup, Sirup)</option>
                <option value="salaries">Gaji & Upah Barista / Kasir</option>
                <option value="maintenance">Perawatan Mesin Kopi & Servis Grinder</option>
                <option value="rent">Sewa Ruko / Lahan Outlet</option>
                <option value="marketing">Marketing, Ads & Promosi Offline</option>
                <option value="other">Biaya Operasional Umum Lainnya</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Judul / Keterangan Pembelian *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Tagihan Listrik PLN Mesin Kopi"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs focus:border-[#618873] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nominal (IDR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="1"
                    step="500"
                    required
                    placeholder="500000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full rounded-xl border border-[#e5ece7] pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:border-[#618873] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal *</label>
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
                Metode Pembayaran *
              </label>
              <select
                value={formPaymentMethod}
                onChange={(e) => setFormPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-[#e5ece7] bg-[#fafbf9] px-3 py-2 text-xs font-medium text-slate-700 focus:border-[#618873] focus:outline-hidden"
              >
                <option value="Bank Transfer">Bank Transfer (BCA / Mandiri)</option>
                <option value="Petty Cash Drawer">Kas Kecil Toko (Petty Cash)</option>
                <option value="QRIS">QRIS Operasional</option>
                <option value="Cash On Delivery">Cash On Delivery (COD)</option>
                <option value="Corporate Card">Kartu Debit / Corporate Card</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                No. Nota / Invoice / Vendor
              </label>
              <input
                type="text"
                placeholder="No. nota, nama supplier, atau keterangan tambahan..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs focus:border-[#618873] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Upload Foto / File Bukti Nota (JPG, PNG, PDF)
              </label>
              <div className="rounded-xl border border-dashed border-[#c6d7cc] bg-[#fafbf9] p-3 text-center transition-all hover:border-[#618873]">
                {receiptFile ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#e5ece7] shadow-2xs">
                    <div className="flex items-center gap-2.5 text-left truncate">
                      {receiptFile.type.includes('pdf') ? (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-200 font-bold text-[10px]">
                          PDF
                        </div>
                      ) : (
                        <img
                          src={receiptFile.url}
                          alt="Thumbnail nota"
                          className="h-9 w-9 object-cover rounded-lg border border-[#e5ece7] shrink-0"
                        />
                      )}
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 truncate max-w-[160px]">
                          {receiptFile.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {(receiptFile.size / 1024).toFixed(1)} KB • Siap disimpan
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReceiptFile(null)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer"
                      title="Batalkan file"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="receipt-file-input"
                      className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-1.5 group"
                    >
                      <Receipt className="h-6 w-6 text-[#618873] group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-[#507160]">
                        + Pilih Foto Nota atau File PDF
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Format: .jpg, .jpeg, .png, .webp, .pdf (Maks. 8 MB)
                      </span>
                    </label>
                    <input
                      id="receipt-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleReceiptFileChange}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#618873] py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-[#507160] transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Simpan Pengeluaran</span>
            </button>
          </form>
        </div>

        {/* Right Column: Expense Ledger (Cols 5-12) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">Buku Kas Pengeluaran Operasional</h3>
                <p className="text-xs text-slate-500">
                  Daftar transaksi biaya operasional per cabang ({filteredExpenses.length} entri terdata)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
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
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari pengeluaran, nomor nota, atau supplier..."
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
                <option value="All">Semua Kategori</option>
                <option value="utilities">Utilitas (PLN/Air)</option>
                <option value="raw_materials">Bahan Baku</option>
                <option value="salaries">Gaji Staff</option>
                <option value="maintenance">Maintenance</option>
                <option value="rent">Sewa</option>
                <option value="marketing">Marketing</option>
                <option value="other">Lainnya</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-[#e5ece7]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5ece7] bg-[#fafbf9] text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-3">Cabang</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3">Deskripsi & Catatan</th>
                    <th className="py-3 px-3">Metode</th>
                    <th className="py-3 px-3 text-center">Bukti Nota</th>
                    <th className="py-3 px-3 text-right">Nominal</th>
                    <th className="py-3 px-3 text-center">Aksi / View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f4f2]">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2.5">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <Receipt className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-bold text-slate-700">Belum Ada Data Pengeluaran</p>
                          <p className="text-xs text-slate-500">
                            {searchQuery || filterCategory !== 'All'
                              ? 'Tidak ada pengeluaran yang cocok dengan filter atau kata kunci pencarian.'
                              : selectedOutletId !== 'all'
                              ? `Belum ada pengeluaran operasional yang dicatat untuk cabang ${currentOutlet?.name || 'ini'}.`
                              : 'Belum ada pengeluaran operasional yang dicatat di sistem.'}
                          </p>
                          {(searchQuery || filterCategory !== 'All' || selectedOutletId !== 'all') && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setFilterCategory('All');
                                setSelectedOutletId('all');
                              }}
                              className="mt-1 text-xs font-semibold text-[#618873] hover:underline cursor-pointer"
                            >
                              Reset Filter & Tampilkan Semua Cabang
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => {
                      const badge = getCategoryBadge(exp.category);
                      return (
                        <tr
                          key={exp.id}
                          onClick={() => setViewingExpense(exp)}
                          className="hover:bg-[#f4f8f5] transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                            {formatDate(exp.date)}
                          </td>
                          <td className="py-3 px-3 text-slate-700 font-medium">
                            <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              {exp.outletName}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${badge.bg}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-800 group-hover:text-[#507160] transition-colors">
                              {exp.title}
                            </p>
                            {exp.notes && (
                              <p className="text-[11px] text-slate-400 italic line-clamp-1">
                                {exp.notes}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                            {exp.paymentMethod}
                          </td>

                          {/* Bukti Nota Attachment Cell */}
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {exp.receiptUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewReceiptModal({
                                    url: exp.receiptUrl!,
                                    name: exp.receiptName || exp.title,
                                    type:
                                      exp.receiptType ||
                                      (exp.receiptUrl!.endsWith('.pdf')
                                        ? 'application/pdf'
                                        : 'image/jpeg'),
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer shadow-2xs"
                                title="Lihat Foto / Dokumen Nota"
                              >
                                <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{exp.receiptType?.includes('pdf') ? 'Nota PDF' : 'Nota JPG'}</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">-</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right font-bold text-rose-600 whitespace-nowrap">
                            {formatCurrency(exp.amount)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* View Data Action Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingExpense(exp);
                                }}
                                className="flex items-center justify-center h-7 w-7 rounded-lg text-slate-500 hover:text-[#618873] hover:bg-[#eef4f0] transition-colors cursor-pointer"
                                title="Lihat Rincian Data Pengeluaran (View Data)"
                              >
                                <FiEye className="h-4 w-4" />
                              </button>

                              {/* Delete Action Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Hapus pengeluaran "${exp.title}" (${formatCurrency(exp.amount)})?`)) {
                                    deleteExpense(exp.id);
                                    setFeedback({
                                      type: 'info',
                                      message: `Pengeluaran "${exp.title}" berhasil dihapus.`,
                                    });
                                  }
                                }}
                                className="flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Hapus Data Pengeluaran"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* View Data Modal: Detail Rincian Pengeluaran Operasional */}
      {viewingExpense && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setViewingExpense(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#e5ece7] bg-white p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#e5ece7] pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4f0] text-[#618873]">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Rincian Data Pengeluaran</h3>
                  <p className="text-xs text-slate-400">ID: {viewingExpense.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingExpense(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            {/* Prominent Amount & Title */}
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-500">
                Nominal Biaya Dikeluarkan
              </span>
              <p className="text-3xl font-extrabold text-rose-700 tracking-tight mt-1">
                {formatCurrency(viewingExpense.amount)}
              </p>
              <p className="text-sm font-bold text-slate-800 mt-2">
                {viewingExpense.title}
              </p>
            </div>

            {/* Detail Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-[#e5ece7] bg-slate-50/60 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                  <FiStore className="h-3.5 w-3.5 text-[#618873]" />
                  <span>Cabang / Outlet</span>
                </div>
                <p className="font-bold text-slate-800">{viewingExpense.outletName}</p>
              </div>

              <div className="rounded-xl border border-[#e5ece7] bg-slate-50/60 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                  <FiCalendar className="h-3.5 w-3.5 text-[#618873]" />
                  <span>Tanggal Pembayaran</span>
                </div>
                <p className="font-bold text-slate-800">{formatDate(viewingExpense.date)}</p>
              </div>

              <div className="rounded-xl border border-[#e5ece7] bg-slate-50/60 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                  <Receipt className="h-3.5 w-3.5 text-[#618873]" />
                  <span>Kategori Biaya</span>
                </div>
                <p className="font-semibold text-slate-800">
                  {getCategoryBadge(viewingExpense.category).label}
                </p>
              </div>

              <div className="rounded-xl border border-[#e5ece7] bg-slate-50/60 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                  <FiCreditCard className="h-3.5 w-3.5 text-[#618873]" />
                  <span>Metode Pembayaran</span>
                </div>
                <p className="font-bold text-slate-800">{viewingExpense.paymentMethod}</p>
              </div>

              <div className="rounded-xl border border-[#e5ece7] bg-slate-50/60 p-3 space-y-1 col-span-2">
                <span className="text-slate-400 font-semibold block">Dicatat Oleh (Staff / Manajer)</span>
                <p className="font-bold text-slate-800">{viewingExpense.recordedBy}</p>
              </div>
            </div>

            {/* Notes / Invoice Ref Box */}
            <div className="rounded-xl border border-[#e5ece7] p-3 text-xs space-y-1">
              <span className="text-slate-400 font-semibold block">Catatan / Referensi Invoice:</span>
              <p className="text-slate-700 font-medium">
                {viewingExpense.notes || 'Tidak ada catatan atau nomor invoice terlampir.'}
              </p>
            </div>

            {/* Bukti Fisik Nota File Attachment */}
            <div className="rounded-xl border border-[#e5ece7] p-3.5 text-xs space-y-2 bg-[#fafbf9]">
              <span className="text-slate-700 font-bold flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-[#618873]" />
                <span>Bukti Fisik Nota / Kwitansi:</span>
              </span>

              {viewingExpense.receiptUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#e5ece7]">
                    <div className="flex items-center gap-2 truncate">
                      {viewingExpense.receiptType?.includes('pdf') ? (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-200 font-bold text-[10px]">
                          PDF
                        </div>
                      ) : (
                        <img
                          src={viewingExpense.receiptUrl}
                          alt="Thumbnail nota"
                          className="h-8 w-8 object-cover rounded-md border border-[#e5ece7]"
                        />
                      )}
                      <span className="font-semibold text-slate-800 truncate">
                        {viewingExpense.receiptName || 'Dokumen Bukti Nota'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPreviewReceiptModal({
                          url: viewingExpense.receiptUrl!,
                          name: viewingExpense.receiptName || viewingExpense.title,
                          type:
                            viewingExpense.receiptType ||
                            (viewingExpense.receiptUrl!.endsWith('.pdf')
                              ? 'application/pdf'
                              : 'image/jpeg'),
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-[#618873] text-white text-xs font-semibold hover:bg-[#507160] transition-all shrink-0 cursor-pointer shadow-2xs"
                    >
                      Buka Dokumen
                    </button>
                  </div>

                  {!viewingExpense.receiptType?.includes('pdf') && (
                    <div className="overflow-hidden rounded-xl border border-[#e5ece7] bg-black/5 max-h-48 flex items-center justify-center">
                      <img
                        src={viewingExpense.receiptUrl}
                        alt="Preview nota"
                        className="max-h-48 w-auto object-contain cursor-pointer"
                        onClick={() =>
                          setPreviewReceiptModal({
                            url: viewingExpense.receiptUrl!,
                            name: viewingExpense.receiptName || viewingExpense.title,
                            type: 'image/jpeg',
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 italic text-[11px]">
                  Tidak ada file bukti nota yang dilampirkan untuk transaksi ini.
                </p>
              )}
            </div>

            {/* Cloud Status */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-[#e5ece7]">
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <FiCheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Tersimpan di Cloud Database</span>
              </span>
              <span className="text-[11px] text-slate-400">PostgreSQL Supabase</span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Hapus pengeluaran "${viewingExpense.title}"?`)) {
                    deleteExpense(viewingExpense.id);
                    setViewingExpense(null);
                    setFeedback({
                      type: 'info',
                      message: `Pengeluaran "${viewingExpense.title}" telah dihapus.`,
                    });
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Hapus Pengeluaran</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingExpense(null)}
                className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-white hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Full Preview Modal for Receipt (Image / PDF) */}
      {previewReceiptModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewReceiptModal(null)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#e5ece7] pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#618873]" />
                <h4 className="text-sm font-bold text-slate-800 truncate max-w-md">
                  Bukti Nota: {previewReceiptModal.name}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewReceiptModal.url}
                  download={previewReceiptModal.name || 'nota-pengeluaran'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e5ece7] text-xs font-semibold text-slate-700 hover:bg-[#f4f7f5] transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Unduh File</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewReceiptModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-50 rounded-xl p-2 min-h-[300px]">
              {previewReceiptModal.type.includes('pdf') ? (
                <iframe
                  src={previewReceiptModal.url}
                  className="w-full h-[550px] rounded-lg border border-[#e5ece7]"
                  title="PDF Nota Preview"
                />
              ) : (
                <img
                  src={previewReceiptModal.url}
                  alt="Preview Bukti Nota"
                  className="max-h-[550px] w-auto object-contain rounded-lg shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
