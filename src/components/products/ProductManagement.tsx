'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store/AppContext';
import { Product, ProductCategory, BOMItem } from '@/types';
import { formatCurrency, calculateBOMCost } from '@/lib/utils/formatters';
import {
  FiPlus as Plus,
  FiEdit as Edit2,
  FiTrash as Trash2,
  FiLayers as Layers,
  FiSearch as Search,
  FiX as X,
  FiCoffee as Coffee,
  FiUtensils as UtensilsCrossed,
  FiSparkles as Sparkles,
  FiCookie as Cookie,
} from '@/components/ui/Flaticon';

export const ProductManagement: React.FC = () => {
  const { products, inventory, addProduct, updateProduct, deleteProduct } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('Coffee');
  const [formPrice, setFormPrice] = useState<number>(30000);
  const [formDescription, setFormDescription] = useState('');
  const [formBOM, setFormBOM] = useState<BOMItem[]>([]);

  // Unique raw material list for dropdown
  const uniqueRawMaterials = Array.from(
    new Map(inventory.map((item) => [item.id, item])).values()
  );

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
        rawMaterialName: uniqueRawMaterials[0]?.name || 'Coffee Beans',
        quantity: 18,
        unit: uniqueRawMaterials[0]?.unit || 'g',
      },
    ]);
    setModalMode('create');
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPrice(product.price);
    setFormDescription(product.description);
    setFormBOM(product.bom || []);
    setModalMode('edit');
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
        name: formName,
        category: formCategory,
        price: Number(formPrice),
        description: formDescription,
        bom: formBOM,
        isActive: true,
      });
    } else if (modalMode === 'edit' && editingProduct) {
      updateProduct({
        ...editingProduct,
        name: formName,
        category: formCategory,
        price: Number(formPrice),
        description: formDescription,
        bom: formBOM,
      });
    }

    setModalMode(null);
  };

  // Preview COGS for modal form
  const modalCOGS = calculateBOMCost(formBOM, inventory);
  const modalMargin = formPrice > 0 ? (((formPrice - modalCOGS) / formPrice) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
        <div>
          <h3 className="text-base font-bold text-slate-800">Menu Catalog & Recipe Mapping (BOM)</h3>
          <p className="text-xs text-slate-500">
            Define menu items and specify raw material ingredients for automated POS stock depletion
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 rounded-xl bg-[#618873] px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#507160] transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by title or description..."
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
              className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
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

      {/* Product List Table */}
      <div className="rounded-2xl border border-[#e5ece7] bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e5ece7] bg-[#fafbf9] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Menu Item</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Selling Price</th>
                <th className="py-3.5 px-4">Bill of Materials (BOM Ingredients)</th>
                <th className="py-3.5 px-4">Est. COGS</th>
                <th className="py-3.5 px-4">Margin %</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f4f2]">
              {filteredProducts.map((prod) => {
                const cogs = calculateBOMCost(prod.bom, inventory);
                const margin =
                  prod.price > 0 ? (((prod.price - cogs) / prod.price) * 100).toFixed(1) : '0';

                return (
                  <tr key={prod.id} className="hover:bg-[#fafbf9] transition-colors">
                    {/* Item */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                          {prod.category === 'Coffee' && (
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-amber-50 text-amber-900 border border-amber-200/70 shadow-2xs">
                              <Coffee className="h-4 w-4" />
                            </div>
                          )}
                          {prod.category === 'Non-Coffee' && (
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-teal-50 text-teal-800 border border-teal-200/70 shadow-2xs">
                              <Sparkles className="h-4 w-4" />
                            </div>
                          )}
                          {prod.category === 'Food' && (
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-orange-50 text-orange-900 border border-orange-200/70 shadow-2xs">
                              <UtensilsCrossed className="h-4 w-4" />
                            </div>
                          )}
                          {prod.category === 'Snack' && (
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-rose-50 text-rose-900 border border-rose-200/70 shadow-2xs">
                              <Cookie className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{prod.name}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">
                            {prod.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block rounded-lg bg-[#eef4f0] px-2.5 py-1 text-[11px] font-semibold text-[#507160]">
                        {prod.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {formatCurrency(prod.price)}
                    </td>

                    {/* BOM Badges */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {prod.bom && prod.bom.length > 0 ? (
                          prod.bom.map((b, idx) => (
                            <span
                              key={idx}
                              className="rounded-md bg-[#fafbf9] border border-[#e5ece7] px-2 py-0.5 text-[10px] font-medium text-slate-600"
                            >
                              {b.rawMaterialName}: {b.quantity} {b.unit}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-amber-600 italic">No recipe mapped</span>
                        )}
                      </div>
                    </td>

                    {/* COGS */}
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {formatCurrency(cogs)}
                    </td>

                    {/* Margin */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          Number(margin) >= 60
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {margin}%
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(prod)}
                          className="rounded-lg border border-[#e5ece7] bg-white p-1.5 text-slate-500 hover:text-[#618873] hover:border-[#618873] transition-all shadow-2xs"
                          title="Edit recipe & price"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete product "${prod.name}"?`)) {
                              deleteProduct(prod.id);
                            }
                          }}
                          className="rounded-lg border border-[#e5ece7] bg-white p-1.5 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all shadow-2xs"
                          title="Delete product"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* ========================================================
          CREATE / EDIT PRODUCT & BOM MODAL
      ======================================================== */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-[#e5ece7] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#fafbf9] p-5 border-b border-[#e5ece7] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {modalMode === 'create' ? 'Add New Menu Item' : 'Edit Menu Item & BOM Recipe'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure selling pricing and link the exact bill of materials
                </p>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Product Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Iced Vanilla Latte"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs focus:border-[#618873] focus:outline-hidden focus:ring-2 focus:ring-[#618873]/15"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as ProductCategory)}
                      className="mt-1 w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs focus:border-[#618873] focus:outline-hidden"
                    >
                      <option value="Coffee">Coffee</option>
                      <option value="Non-Coffee">Non-Coffee</option>
                      <option value="Food">Food / Meals</option>
                      <option value="Snack">Snack & Pastry</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Type Preview</label>
                    <div className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-[#e5ece7] bg-[#fafbf9] py-1.5 px-3">
                      {formCategory === 'Coffee' && <Coffee className="h-4 w-4 text-amber-800" />}
                      {formCategory === 'Non-Coffee' && <Sparkles className="h-4 w-4 text-teal-700" />}
                      {formCategory === 'Food' && <UtensilsCrossed className="h-4 w-4 text-orange-800" />}
                      {formCategory === 'Snack' && <Cookie className="h-4 w-4 text-rose-800" />}
                      <span className="text-xs font-semibold text-slate-700">{formCategory}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Selling Price (IDR)</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-xs focus:border-[#618873] focus:outline-hidden focus:ring-2 focus:ring-[#618873]/15 font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Description</label>
                  <input
                    type="text"
                    placeholder="Short flavor notes or description..."
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
                      Bill of Materials (BOM) Recipe Ingredients
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBOMRow}
                    className="flex items-center gap-1 rounded-lg border border-[#e5ece7] bg-white px-2.5 py-1 text-xs font-semibold text-[#618873] hover:bg-[#eef4f0]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add Ingredient</span>
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
                          className="p-1 text-slate-400 hover:text-rose-500"
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
                    <span className="font-semibold">Calculated COGS: </span>
                    <span className="font-bold text-slate-800">{formatCurrency(modalCOGS)}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Gross Profit Margin: </span>
                    <span className="font-bold text-slate-800">{modalMargin}%</span>
                  </div>
                </div>
              </div>

              {/* Form Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-[#e5ece7]">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="rounded-xl border border-[#e5ece7] px-4 py-2 text-xs font-medium text-slate-600 hover:bg-[#f4f7f5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#618873] px-5 py-2 text-xs font-semibold text-white hover:bg-[#507160] shadow-2xs"
                >
                  Save Product & Recipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
