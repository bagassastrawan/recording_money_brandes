'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store/AppContext';
import { Product, ProductCategory, BOMItem } from '@/types';
import { formatCurrency, calculateBOMCost } from '@/lib/utils/formatters';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Coffee,
  UtensilsCrossed,
  Sparkles,
  Cookie,
  ChevronDown,
  ChevronUp,
  Wrench,
  Layers,
  Copy,
  CheckCircle2,
  Power,
  Info,
} from 'lucide-react';

export const ProductManagement: React.FC = () => {
  const { products, inventory, addProduct, updateProduct, deleteProduct, showConfirm } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Expanded row tracking: which menu item's dropdown is currently open
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('Coffee');
  const [formPrice, setFormPrice] = useState<number>(30000);
  const [formDescription, setFormDescription] = useState('');
  const [formBOM, setFormBOM] = useState<BOMItem[]>([]);

  // Unique raw material list for dropdown
  const uniqueRawMaterials = Array.from(
    new Map(inventory.map((item) => [item.name.toLowerCase(), item])).values()
  );

  const toggleDropdown = (productId: string) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const filteredProducts = products.filter((p) => {
    const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const openCreateModal = () => {
    setFormName('');
    setFormCategory('Coffee');
    setFormPrice(30000);
    setFormDescription('');
    setFormBOM([
      {
        rawMaterialId: uniqueRawMaterials[0]?.id || 'raw-1',
        rawMaterialName: uniqueRawMaterials[0]?.name || 'House Blend Coffee Beans',
        quantity: 18,
        unit: uniqueRawMaterials[0]?.unit || 'g',
      },
    ]);
    setModalMode('create');
  };

  const openEditModal = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPrice(product.price);
    setFormDescription(product.description);
    setFormBOM(product.bom || []);
    setModalMode('edit');
  };

  const handleToggleActive = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    updateProduct({
      ...product,
      isActive: !product.isActive,
    });
  };

  const handleDeleteProduct = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    showConfirm({
      title: `Hapus Menu "${product.name}"?`,
      message: 'Menu ini beserta seluruh resep takaran BOM akan dihapus dari katalog ERP & database Supabase secara permanen.',
      confirmText: 'Ya, Hapus Menu',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: () => {
        deleteProduct(product.id);
      },
    });
  };

  const handleAddBOMRow = () => {
    if (uniqueRawMaterials.length === 0) return;
    const first = uniqueRawMaterials[0];
    setFormBOM((prev) => [
      ...prev,
      {
        rawMaterialId: first.id,
        rawMaterialName: first.name,
        quantity: 1,
        unit: first.unit,
      },
    ]);
  };

  const handleRemoveBOMRow = (index: number) => {
    setFormBOM((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBOMChange = (
    index: number,
    field: 'rawMaterialId' | 'quantity',
    value: string | number
  ) => {
    setFormBOM((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          if (field === 'rawMaterialId') {
            const raw = uniqueRawMaterials.find((r) => r.id === value);
            return {
              ...item,
              rawMaterialId: value as string,
              rawMaterialName: raw ? raw.name : item.rawMaterialName,
              unit: raw ? raw.unit : item.unit,
            };
          } else {
            return {
              ...item,
              quantity: Number(value),
            };
          }
        }
        return item;
      })
    );
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (modalMode === 'create') {
      addProduct({
        name: formName.trim(),
        category: formCategory,
        price: Number(formPrice),
        description: formDescription.trim(),
        bom: formBOM,
        isActive: true,
      });
    } else if (modalMode === 'edit' && editingProduct) {
      updateProduct({
        ...editingProduct,
        name: formName.trim(),
        category: formCategory,
        price: Number(formPrice),
        description: formDescription.trim(),
        bom: formBOM,
      });
    }

    setModalMode(null);
  };

  const modalCOGS = calculateBOMCost(formBOM, inventory);
  const modalMargin = formPrice > 0 ? (((formPrice - modalCOGS) / formPrice) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800">Master Data Menu & Resep (BOM)</h3>
            <span className="rounded-full bg-[#eef4f0] px-2.5 py-0.5 text-[11px] font-semibold text-[#507160] border border-[#d6e3da]">
              ERP Catalog
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar menu item, kategori, dan harga jual. Klik baris menu untuk membuka dropdown peralatan (equipment) dan aksi.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-[#618873] px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-[#507160] transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Menu Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari menu item berdasarkan nama atau deskripsi rasa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#e5ece7] bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-700 placeholder-slate-400 focus:border-[#618873] focus:outline-hidden focus:ring-2 focus:ring-[#618873]/15"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {['All', 'Coffee', 'Non-Coffee', 'Food', 'Snack'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#618873] text-white shadow-2xs'
                  : 'bg-white border border-[#e5ece7] text-slate-600 hover:bg-[#f4f7f5]'
              }`}
            >
              {cat === 'All' ? 'Semua Menu' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product List Table (Strictly: Menu Item, Categori, Selling + Click to Dropdown Equipment & Action) */}
      <div className="rounded-2xl border border-[#e5ece7] bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e5ece7] bg-[#fafbf9] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-12 text-center">BOM</th>
                <th className="py-3.5 px-4">Menu Item</th>
                <th className="py-3.5 px-4">Categori</th>
                <th className="py-3.5 px-4 text-right">Selling (Harga Jual)</th>
                <th className="py-3.5 px-4 text-center w-52">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f4f2]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                    Tidak ada menu item ditemukan yang cocok dengan pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const isExpanded = expandedProductIds.has(prod.id);
                  const cogs = calculateBOMCost(prod.bom, inventory);
                  const margin =
                    prod.price > 0 ? (((prod.price - cogs) / prod.price) * 100).toFixed(1) : '0';

                  return (
                    <React.Fragment key={prod.id}>
                      {/* Main Clickable Row */}
                      <tr
                        onClick={() => toggleDropdown(prod.id)}
                        className={`cursor-pointer transition-all ${
                          isExpanded
                            ? 'bg-[#f4f8f5] hover:bg-[#edf4f0]'
                            : 'hover:bg-[#fafbf9]'
                        }`}
                        title="Klik untuk membuka/menutup Detail Resep BOM & Peralatan"
                      >
                        {/* Expand Chevron Icon with BOM indicator */}
                        <td className="py-3.5 px-4 text-center text-slate-400">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDropdown(prod.id);
                            }}
                            className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isExpanded
                                ? 'bg-[#618873] text-white shadow-2xs'
                                : 'bg-[#eef4f0] text-[#507160] hover:bg-[#d6e3da]'
                            }`}
                            aria-label={isExpanded ? 'Tutup Resep BOM' : 'Buka Resep BOM'}
                            title={isExpanded ? 'Tutup Resep BOM' : 'Buka Resep BOM & Peralatan'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </td>

                        {/* 1. Menu Item */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-2xs">
                              {prod.category === 'Coffee' && (
                                <div className="flex h-full w-full items-center justify-center rounded-xl bg-amber-50 text-amber-900 border border-amber-200/70">
                                  <Coffee className="h-5 w-5" />
                                </div>
                              )}
                              {prod.category === 'Non-Coffee' && (
                                <div className="flex h-full w-full items-center justify-center rounded-xl bg-teal-50 text-teal-800 border border-teal-200/70">
                                  <Sparkles className="h-5 w-5" />
                                </div>
                              )}
                              {prod.category === 'Food' && (
                                <div className="flex h-full w-full items-center justify-center rounded-xl bg-orange-50 text-orange-900 border border-orange-200/70">
                                  <UtensilsCrossed className="h-5 w-5" />
                                </div>
                              )}
                              {prod.category === 'Snack' && (
                                <div className="flex h-full w-full items-center justify-center rounded-xl bg-rose-50 text-rose-900 border border-rose-200/70">
                                  <Cookie className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <span className={!prod.isActive ? 'line-through text-slate-400' : ''}>
                                  {prod.name}
                                </span>
                                {!prod.isActive && (
                                  <span className="rounded bg-rose-50 text-[10px] font-bold text-rose-600 px-2 py-0.5 border border-rose-200">
                                    Nonaktif
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-400 line-clamp-1 max-w-md mt-0.5">
                                {prod.description || 'Tidak ada deskripsi tambahan.'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Categori */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-[#eef4f0] px-2.5 py-1 text-[11px] font-semibold text-[#507160] border border-[#d6e3da]">
                            {prod.category}
                          </span>
                        </td>

                        {/* 3. Selling (Harga Jual) */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-extrabold text-sm text-slate-900">
                            {formatCurrency(prod.price)}
                          </span>
                        </td>

                        {/* 4. Action Column: Edit & Non Aktif */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => openEditModal(prod, e)}
                              className="flex items-center gap-1.5 rounded-xl bg-[#618873] hover:bg-[#507160] text-white px-3 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                              title="Edit menu, harga, peralatan, dan resep BOM"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleToggleActive(prod, e)}
                              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                                prod.isActive
                                  ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                              }`}
                              title={
                                prod.isActive
                                  ? 'Nonaktifkan menu dari kasir'
                                  : 'Aktifkan kembali menu di kasir'
                              }
                            >
                              <Power className={`h-3.5 w-3.5 ${prod.isActive ? 'text-slate-500' : 'text-emerald-600'}`} />
                              <span>{prod.isActive ? 'Non Aktif' : 'Aktifkan'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Dropdown Panel displaying: Resep BOM, Peralatan Pembuatan & Detail Finansial */}
                      {isExpanded && (
                        <tr className="bg-[#f8faf8] border-b border-[#e5ece7]">
                          <td colSpan={5} className="p-4 sm:p-5 pl-12">
                            <div className="rounded-2xl border border-[#d6e3da] bg-white p-5 shadow-xs space-y-4">
                              {/* Header Dropdown */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#f1f4f2] gap-2">
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                    <span>Detail Resep & Peralatan Pembuatan:</span>
                                    <span className="text-[#507160] font-extrabold text-sm">
                                      {prod.name}
                                    </span>
                                  </h4>
                                </div>

                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                  <span>Estimasi COGS / HPP:</span>
                                  <span className="font-bold text-slate-800">
                                    {formatCurrency(cogs)}
                                  </span>
                                  <span className="mx-1">•</span>
                                  <span>Margin:</span>
                                  <span
                                    className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                                      Number(margin) >= 50
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}
                                  >
                                    {margin}%
                                  </span>
                                </div>
                              </div>

                              {/* FULL-WIDTH RESEP BOM & ESTIMASI HPP */}
                              <div className="rounded-xl border border-[#e5ece7] bg-[#fafbf9] p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                                    <Layers className="h-4 w-4 text-[#618873]" />
                                    <span>Resep Takaran Bahan Baku (BOM per Porsi):</span>
                                  </div>
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    Total {prod.bom ? prod.bom.length : 0} Komponen Bahan
                                  </span>
                                </div>

                                {prod.bom && prod.bom.length > 0 ? (
                                  <div className="overflow-x-auto rounded-lg border border-[#e5ece7] bg-white">
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="border-b border-[#e5ece7] bg-[#fafbf9] text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                          <th className="py-2.5 px-3 w-8 text-center">No</th>
                                          <th className="py-2.5 px-3">Bahan Baku</th>
                                          <th className="py-2.5 px-3 text-center">Takaran per Porsi</th>
                                          <th className="py-2.5 px-3 text-right">Biaya per Satuan</th>
                                          <th className="py-2.5 px-3 text-right">Estimasi Biaya BOM</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#f1f4f2]">
                                        {prod.bom.map((b, idx) => {
                                          const raw = inventory.find(
                                            (r) =>
                                              r.id === b.rawMaterialId ||
                                              r.name.toLowerCase() === b.rawMaterialName.toLowerCase()
                                          );
                                          const unitCost = raw ? raw.costPerUnit : 0;
                                          const subtotalCost = unitCost * b.quantity;

                                          return (
                                            <tr key={idx} className="hover:bg-[#fafbf9] transition-colors">
                                              <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">
                                                {idx + 1}
                                              </td>
                                              <td className="py-2 px-3 font-semibold text-slate-800">
                                                {b.rawMaterialName}
                                                {raw && (
                                                  <span className="block text-[10px] text-slate-400 font-normal">
                                                    Kategori: {raw.category}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2 px-3 text-center">
                                                <span className="inline-block rounded-md bg-[#eef4f0] border border-[#d6e3da] px-2 py-0.5 text-xs font-bold text-[#507160]">
                                                  {b.quantity} {b.unit}
                                                </span>
                                              </td>
                                              <td className="py-2 px-3 text-right text-slate-500 font-mono text-[11px]">
                                                {formatCurrency(unitCost)} / {b.unit}
                                              </td>
                                              <td className="py-2 px-3 text-right font-bold text-slate-800 font-mono">
                                                {formatCurrency(subtotalCost)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-xs text-amber-600 italic p-3 bg-amber-50 rounded-lg border border-amber-200">
                                    Resep BOM belum dipetakan. Klik tombol Edit untuk menambahkan takaran bahan baku.
                                  </p>
                                )}
                              </div>

                              {/* SECTION 3: FOOTER ACTION */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#f1f4f2]">
                                <div className="text-[11px] text-slate-400">
                                  Status Menu: <strong className={prod.isActive ? 'text-emerald-700 font-bold' : 'text-slate-500'}>{prod.isActive ? 'Aktif di Kasir' : 'Dinonaktifkan'}</strong>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteProduct(prod, e)}
                                    className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
                                    title="Hapus menu permanen dari katalog ERP"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                                    <span>Hapus Menu</span>
                                  </button>
                                </div>
                              </div>
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

      {/* ========================================================
          CREATE / EDIT PRODUCT, EQUIPMENT & BOM MODAL
      ======================================================== */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-[#e5ece7] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#fafbf9] p-5 border-b border-[#e5ece7] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {modalMode === 'create' ? 'Tambah Menu Item Baru' : 'Edit Menu, Resep & Peralatan'}
                </h3>
                <p className="text-xs text-slate-500">
                  Kelola harga jual, peralatan operasional, dan takaran bahan baku (BOM)
                </p>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Product Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Nama Menu Item *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Iced Salted Caramel Latte"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs focus:border-[#618873] focus:outline-hidden focus:ring-2 focus:ring-[#618873]/15 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Kategori Menu *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ProductCategory)}
                    className="mt-1 w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs focus:border-[#618873] focus:outline-hidden font-medium"
                  >
                    <option value="Coffee">Coffee (Kopi)</option>
                    <option value="Non-Coffee">Non-Coffee (Teh & Cokelat)</option>
                    <option value="Food">Food (Makanan Berat)</option>
                    <option value="Snack">Snack & Pastry (Camilan)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Selling Price (Harga Jual IDR) *</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs focus:border-[#618873] focus:outline-hidden focus:ring-2 focus:ring-[#618873]/15 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Deskripsi Singkat</label>
                  <input
                    type="text"
                    placeholder="Contoh: Espresso ganda dengan sirup karamel gurih..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs focus:border-[#618873] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* BOM RECIPE BUILDER */}
              <div className="space-y-3 pt-4 border-t border-[#e5ece7]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#618873]" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Resep Bahan Baku (BOM Ingredients)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBOMRow}
                    className="flex items-center gap-1 rounded-lg border border-[#e5ece7] bg-white px-2.5 py-1 text-xs font-semibold text-[#618873] hover:bg-[#eef4f0] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Tambah Bahan</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formBOM.map((item, index) => {
                    const raw = uniqueRawMaterials.find((r) => r.id === item.rawMaterialId);
                    const lineCost = raw ? raw.costPerUnit * item.quantity : 0;

                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-xl border border-[#e5ece7] bg-[#fafbf9] p-2.5 text-xs"
                      >
                        <select
                          value={item.rawMaterialId}
                          onChange={(e) => handleBOMChange(index, 'rawMaterialId', e.target.value)}
                          className="flex-1 rounded-lg border border-[#e5ece7] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-hidden"
                        >
                          {uniqueRawMaterials.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({formatCurrency(r.costPerUnit)} / {r.unit})
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleBOMChange(index, 'quantity', e.target.value)}
                            className="w-20 rounded-lg border border-[#e5ece7] bg-white px-2 py-1.5 text-right text-xs font-semibold focus:outline-hidden"
                          />
                          <span className="text-slate-400 font-medium w-8 text-left">
                            {item.unit}
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-500 w-24 text-right">
                          {formatCurrency(lineCost)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveBOMRow(index)}
                          className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Live COGS Summary Box */}
                <div className="flex items-center justify-between rounded-xl bg-[#eef4f0] p-3 text-xs text-[#507160] border border-[#d6e3da]">
                  <div>
                    <span className="font-semibold">Perkiraan COGS (HPP): </span>
                    <span className="font-bold text-slate-800">{formatCurrency(modalCOGS)}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Estimasi Gross Margin: </span>
                    <span className="font-bold text-slate-800">{modalMargin}%</span>
                  </div>
                </div>
              </div>

              {/* Form Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-[#e5ece7]">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="rounded-xl border border-[#e5ece7] px-4 py-2 text-xs font-medium text-slate-600 hover:bg-[#f4f7f5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#618873] px-5 py-2 text-xs font-semibold text-white hover:bg-[#507160] shadow-2xs cursor-pointer"
                >
                  Simpan Menu & Resep
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
