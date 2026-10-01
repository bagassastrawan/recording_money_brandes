'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store/AppContext';
import { Product, CartItem, PaymentMethod, StockDepletionLog, Order, SugarLevel } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';
import {
  FiSearch as Search,
  FiShoppingCart as ShoppingCart,
  FiPlus as Plus,
  FiMinus as Minus,
  FiTrash as Trash2,
  FiCheckCircle as CheckCircle2,
  FiStore as Store,
  FiCreditCard as CreditCard,
  FiQrCode as QrCode,
  FiBanknote as Banknote,
  FiReceipt as Receipt,
  FiLayers as Layers,
  FiSparkles as Sparkles,
  FiPrinter as Printer,
  FiX as X,
  FiCoffee as Coffee,
  FiUtensils as UtensilsCrossed,
  FiCookie as Cookie,
  FiAlertTriangle as AlertTriangle,
} from '@/components/ui/Flaticon';

export const PosInterface: React.FC = () => {
  const {
    products,
    outlets,
    selectedOutletId,
    setSelectedOutletId,
    currentOutlet,
    createOrder,
    inventory,
    t,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');
  const [amountTendered, setAmountTendered] = useState<number | ''>('');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);
  const [transactionAlert, setTransactionAlert] = useState<{
    orderNumber: string;
    total: number;
    outletName: string;
    itemsCount: number;
  } | null>(null);
  
  // Checkout result modal
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [depletionSummary, setDepletionSummary] = useState<StockDepletionLog[]>([]);

  // ========================================================
  // UNIT-SAFE STOCK CONVERTER
  // ========================================================
  const getAvailableStockInBomUnit = (
    stockQty: number,
    stockUnit: string,
    bomUnit: string
  ): number => {
    if (stockQty <= 0) return 0;
    if (stockUnit === bomUnit) return stockQty;
    if ((stockUnit === 'cup' && bomUnit === 'pcs') || (stockUnit === 'pcs' && bomUnit === 'cup')) return stockQty;
    if ((stockUnit === 'kg' || stockUnit === 'pack') && bomUnit === 'g') return stockQty * 1000;
    if (stockUnit === 'g' && (bomUnit === 'kg' || bomUnit === 'pack')) return stockQty / 1000;
    if (stockUnit === 'dus' && bomUnit === 'ml') return stockQty * 12000;
    if (stockUnit === 'btl' && bomUnit === 'ml') return stockQty * 1000;
    if (stockUnit === 'btl' && bomUnit === 'pump') return stockQty * 66;
    if (stockUnit === 'pump' && bomUnit === 'ml') return stockQty * 15;
    return stockQty;
  };

  // ========================================================
  // REAL-TIME RAW MATERIAL STOCK CHECK PER OUTLET
  // ========================================================
  const getProductStockStatus = (product: Product, additionalQty = 1) => {
    if (!currentOutlet) {
      return { isAvailable: false, reason: 'Pilih outlet cabang terlebih dahulu' };
    }
    if (!product.bom || product.bom.length === 0) {
      return { isAvailable: true };
    }

    const currentCartItem = cart.find((i) => i.product.id === product.id);
    const targetQty = (currentCartItem ? currentCartItem.quantity : 0) + additionalQty;

    for (const bomItem of product.bom) {
      // Find matching ingredient in THIS specific outlet ONLY
      const match = inventory.find(
        (inv) =>
          inv.outletId === currentOutlet.id &&
          (inv.id === bomItem.rawMaterialId ||
            inv.name.toLowerCase() === bomItem.rawMaterialName.toLowerCase() ||
            inv.name.toLowerCase().includes(bomItem.rawMaterialName.toLowerCase()) ||
            bomItem.rawMaterialName.toLowerCase().includes(inv.name.toLowerCase()))
      );

      if (!match || match.currentStock <= 0) {
        return {
          isAvailable: false,
          missingItem: match ? match.name : bomItem.rawMaterialName,
          reason: `Stok bahan "${match ? match.name : bomItem.rawMaterialName}" habis di cabang ${currentOutlet.name}`,
        };
      }

      const availableInBom = getAvailableStockInBomUnit(match.currentStock, match.unit, bomItem.unit);
      const totalNeeded = bomItem.quantity * targetQty;
      if (availableInBom < totalNeeded) {
        return {
          isAvailable: false,
          missingItem: match.name,
          reason: `Sisa stok "${match.name}" di cabang ${currentOutlet.name} hanya ${match.currentStock} ${match.unit} (tidak cukup untuk ${targetQty} porsi)`,
        };
      }
    }

    return { isAvailable: true };
  };

  // Filter products
  const filteredProducts = products.filter((prod) => {
    const matchCategory =
      selectedCategory === 'All' || prod.category === selectedCategory;
    const matchSearch =
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.description.toLowerCase().includes(searchQuery.toLowerCase());
    return prod.isActive && matchCategory && matchSearch;
  });

  // Cart operations with Stock Checking
  const addToCart = (product: Product) => {
    const stockStatus = getProductStockStatus(product, 1);
    if (!stockStatus.isAvailable) {
      alert(`Tidak dapat memesan ${product.name}:\n${stockStatus.reason}`);
      return;
    }

    const isBeverage = product.category === 'Coffee' || product.category === 'Non-Coffee';
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          sugarLevel: isBeverage ? 'Normal (100%)' : undefined,
          notes: '',
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    if (delta > 0) {
      const item = cart.find((i) => i.product.id === productId);
      if (item) {
        const stockStatus = getProductStockStatus(item.product, 1);
        if (!stockStatus.isAvailable) {
          alert(`Tidak dapat menambah jumlah:\n${stockStatus.reason}`);
          return;
        }
      }
    }

    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const updateSugarLevel = (productId: string, sugarLevel: SugarLevel) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, sugarLevel } : item
      )
    );
  };

  const updateNotes = (productId: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, notes } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setAmountTendered('');
  };

  // Totals
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;
  const change =
    typeof amountTendered === 'number' && amountTendered >= total
      ? amountTendered - total
      : 0;

  // Checkout Handler: Validates Stock before ordering & triggers BOM Deduction
  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (!currentOutlet) {
      alert('Silakan pilih outlet cabang terlebih dahulu.');
      return;
    }

    // Verify stock availability across all items in cart before proceeding
    for (const cartItem of cart) {
      const stockStatus = getProductStockStatus(cartItem.product, 0);
      if (!stockStatus.isAvailable) {
        alert(`Pesanan dibatalkan!\n${stockStatus.reason}`);
        return;
      }
    }

    if (paymentMethod === 'cash') {
      const tendered = typeof amountTendered === 'number' ? amountTendered : total;
      if (tendered < total) {
        alert('Uang tunai yang diterima kurang dari total tagihan.');
        return;
      }
    }

    const result = createOrder({
      items: cart,
      paymentMethod,
      amountTendered: typeof amountTendered === 'number' ? amountTendered : total,
    });

    if (result) {
      setCompletedOrder(result.order);
      setDepletionSummary(result.depletedLogs);
      setTransactionAlert({
        orderNumber: result.order.orderNumber,
        total: result.order.total,
        outletName: result.order.outletName,
        itemsCount: result.order.items.reduce((s, i) => s + i.quantity, 0),
      });
      setCart([]);
      setAmountTendered('');
      setIsMobileCartOpen(false);
      setTimeout(() => setTransactionAlert(null), 8000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Transaction Success Alert Notification */}
      {transactionAlert && (
        <div className="lg:col-span-12 rounded-2xl bg-emerald-50 border border-emerald-300 p-4 shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0 shadow-2xs">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-700 text-white px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                  Transaksi Berhasil
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {transactionAlert.orderNumber}
                </span>
              </div>
              <p className="text-xs font-semibold text-emerald-950 mt-1">
                Pesanan <span className="font-bold underline">{transactionAlert.orderNumber}</span> ({transactionAlert.itemsCount} item) senilai <span className="font-bold text-emerald-700">{formatCurrency(transactionAlert.total)}</span> di cabang {transactionAlert.outletName} sukses diproses.
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Stok bahan baku otomatis terpotong dari gudang outlet sesuai resep BOM.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTransactionAlert(null)}
            className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100 transition-colors"
            title="Tutup Notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Outlet Selection Header if not set */}
      {selectedOutletId === 'all' && (
        <div className="lg:col-span-12 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-bold">{t.posOutletNoticeTitle}</p>
              <p className="text-xs text-amber-600">
                {t.posOutletNoticeDesc}
              </p>
            </div>
          </div>
          <select
            value={selectedOutletId}
            onChange={(e) => setSelectedOutletId(e.target.value)}
            className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-2xs"
          >
            <option value="all" disabled>
              Select an outlet branch...
            </option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Left Column: Product Catalog (Cols 1 to 7/8) */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        {/* Search & Categories Bar */}
        <div className="rounded-2xl border border-[#e5ece7] bg-white p-4 shadow-2xs space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchMenuPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#e5ece7] bg-[#fafbf9] py-2.5 pl-10 pr-4 text-xs font-medium text-slate-700 placeholder-slate-400 focus:border-[#618873] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#618873]/15 transition-all"
            />
          </div>

          {/* Category Tabs with Flaticon Icons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'All', label: t.catAll, icon: Layers },
              { id: 'Coffee', label: t.catCoffee, icon: Coffee },
              { id: 'Non-Coffee', label: t.catNonCoffee, icon: Sparkles },
              { id: 'Food', label: t.catFood, icon: UtensilsCrossed },
              { id: 'Snack', label: t.catSnack, icon: Cookie },
            ].map(({ id: cat, label, icon: CatIcon }) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-[#618873] text-white shadow-2xs'
                      : 'bg-[#f4f7f5] text-slate-600 hover:bg-[#e5ece7]'
                  }`}
                >
                  <CatIcon className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid - Responsive on Mobile, Tablet & Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredProducts.map((product) => {
            const cartItem = cart.find((i) => i.product.id === product.id);
            const stockStatus = getProductStockStatus(product, 1);
            const isOutOfStock = !stockStatus.isAvailable;

            return (
              <div
                key={product.id}
                onClick={() => {
                  if (isOutOfStock) {
                    alert(`Tidak dapat memesan ${product.name}:\n${stockStatus.reason}`);
                    return;
                  }
                  addToCart(product);
                }}
                className={`group cursor-pointer rounded-2xl border p-4 bg-white transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between relative ${
                  isOutOfStock
                    ? 'opacity-65 border-slate-200 bg-slate-50/70 hover:border-rose-300'
                    : cartItem
                    ? 'border-[#618873] ring-2 ring-[#618873]/10 bg-[#fafbf9]'
                    : 'border-[#e5ece7] hover:border-[#618873]'
                }`}
              >
                {/* Active in Cart Counter Badge */}
                {cartItem && (
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#618873] text-white text-xs font-bold shadow-2xs">
                    {cartItem.quantity}
                  </span>
                )}

                {/* Out of Stock Badge */}
                {isOutOfStock && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700 shadow-2xs">
                    <AlertTriangle className="h-3 w-3 text-rose-500" />
                    Stok Habis
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl transition-all shadow-2xs">
                      {product.category === 'Coffee' && (
                        <div className="flex h-full w-full items-center justify-center rounded-xl bg-amber-50 text-amber-900 border border-amber-200/60 group-hover:bg-amber-100">
                          <Coffee className="h-5 w-5" />
                        </div>
                      )}
                      {product.category === 'Non-Coffee' && (
                        <div className="flex h-full w-full items-center justify-center rounded-xl bg-teal-50 text-teal-800 border border-teal-200/60 group-hover:bg-teal-100">
                          <Sparkles className="h-5 w-5" />
                        </div>
                      )}
                      {product.category === 'Food' && (
                        <div className="flex h-full w-full items-center justify-center rounded-xl bg-orange-50 text-orange-900 border border-orange-200/60 group-hover:bg-orange-100">
                          <UtensilsCrossed className="h-5 w-5" />
                        </div>
                      )}
                      {product.category === 'Snack' && (
                        <div className="flex h-full w-full items-center justify-center rounded-xl bg-rose-50 text-rose-900 border border-rose-200/60 group-hover:bg-rose-100">
                          <Cookie className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <span className="rounded-lg bg-[#f4f7f5] px-2 py-0.5 text-[10px] font-semibold text-[#507160]">
                      {product.category}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{product.name}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 min-h-[30px]">
                    {product.description}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-[#f1f4f2] flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900">
                    {formatCurrency(product.price)}
                  </span>

                  {isOutOfStock ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-600 bg-rose-50 rounded-lg px-2 py-1">
                      <AlertTriangle className="h-3 w-3" /> Habis
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#618873] group-hover:bg-[#618873] group-hover:text-white rounded-lg px-2 py-1 transition-colors bg-[#eef4f0]">
                      <Plus className="h-3 w-3" /> Add
                    </span>
                  )}
                </div>

                {/* Stock status or BOM info */}
                {isOutOfStock ? (
                  <div className="mt-2 text-[10px] text-rose-500 font-medium flex items-center gap-1 truncate">
                    <AlertTriangle className="h-3 w-3 text-rose-500 shrink-0" />
                    <span className="truncate">{stockStatus.reason}</span>
                  </div>
                ) : (
                  product.bom && product.bom.length > 0 && (
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1 truncate">
                      <Layers className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>{product.bom.length} bahan siap</span>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop Right Column Cart (Visible on lg and larger) */}
      <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
        <div className="sticky top-24 rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs space-y-4">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#e5ece7]">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-[#618873]" />
              <h3 className="text-sm font-bold text-slate-800">{t.currentOrderTitle}</h3>
              <span className="rounded-full bg-[#eef4f0] px-2 py-0.5 text-xs font-bold text-[#507160]">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-medium text-slate-400 hover:text-rose-600 transition-colors"
              >
                {t.clearCartBtn}
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                <ShoppingCart className="h-10 w-10 text-slate-200 mb-2 stroke-1" />
                <p className="text-xs font-medium">{t.cartEmptyTitle}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{t.cartEmptyDesc}</p>
              </div>
            ) : (
              cart.map((item) => {
                const isBeverage = item.product.category === 'Coffee' || item.product.category === 'Non-Coffee';
                const sugarOptions: SugarLevel[] = [
                  'Normal (100%)',
                  'Less Sugar (50%)',
                  'Low Sugar (25%)',
                  'No Sugar (0%)',
                ];

                return (
                  <div
                    key={item.product.id}
                    className="space-y-2 rounded-xl border border-[#f1f4f2] bg-[#fafbf9] p-3 hover:border-[#618873]/30 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.product.name}</p>
                        <p className="text-[11px] font-semibold text-slate-500">
                          {formatCurrency(item.product.price)}
                        </p>
                      </div>

                      {/* Quantity Controls & Delete */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-white border border-[#e5ece7] rounded-lg p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuantity(item.product.id, -1);
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Kurangi"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-bold w-6 text-center text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuantity(item.product.id, 1);
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Tambah"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <p className="text-xs font-bold text-slate-900 w-16 text-right">
                          {formatCurrency(item.product.price * item.quantity)}
                        </p>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromCart(item.product.id);
                          }}
                          className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                          title="Hapus produk"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Sugar Level Selector for Coffee / Non-Coffee */}
                    {isBeverage && (
                      <div className="pt-1.5 border-t border-[#edf2ee]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold text-slate-500">Level Gula:</span>
                          <span className="text-[10px] font-bold text-[#507160]">
                            {item.sugarLevel || 'Normal (100%)'}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {sugarOptions.map((sugar) => {
                            const isSelected = (item.sugarLevel || 'Normal (100%)') === sugar;
                            const shortLabel =
                              sugar === 'Normal (100%)'
                                ? 'Normal'
                                : sugar === 'Less Sugar (50%)'
                                ? 'Less 50%'
                                : sugar === 'Low Sugar (25%)'
                                ? 'Low 25%'
                                : '0% Gula';
                            return (
                              <button
                                key={sugar}
                                type="button"
                                onClick={() => updateSugarLevel(item.product.id, sugar)}
                                className={`rounded-lg py-1 text-[9px] font-semibold transition-all border ${
                                  isSelected
                                    ? 'bg-[#618873] border-[#618873] text-white shadow-2xs'
                                    : 'bg-white border-[#e5ece7] text-slate-600 hover:bg-[#f4f7f5]'
                                }`}
                              >
                                {shortLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Per-item Notes */}
                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="Catatan pesanan (cth: Less ice, panas, tanpa sambal...)"
                        value={item.notes || ''}
                        onChange={(e) => updateNotes(item.product.id, e.target.value)}
                        className="w-full rounded-lg border border-[#e5ece7] bg-white px-2 py-1 text-[11px] text-slate-700 placeholder-slate-400 focus:border-[#618873] focus:outline-hidden focus:ring-1 focus:ring-[#618873]/20"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Payment Method Selector */}
          {cart.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-[#e5ece7]">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  {t.paymentMethodTitle}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qris')}
                    className={`flex flex-col items-center justify-center rounded-xl p-2 text-xs font-semibold transition-all border ${
                      paymentMethod === 'qris'
                        ? 'border-[#618873] bg-[#eef4f0] text-[#507160] shadow-2xs'
                        : 'border-[#e5ece7] bg-white text-slate-600 hover:bg-[#f4f7f5]'
                    }`}
                  >
                    <QrCode className="h-4 w-4 mb-1" />
                    <span>QRIS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex flex-col items-center justify-center rounded-xl p-2 text-xs font-semibold transition-all border ${
                      paymentMethod === 'cash'
                        ? 'border-[#618873] bg-[#eef4f0] text-[#507160] shadow-2xs'
                        : 'border-[#e5ece7] bg-white text-slate-600 hover:bg-[#f4f7f5]'
                    }`}
                  >
                    <Banknote className="h-4 w-4 mb-1" />
                    <span>Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('debit')}
                    className={`flex flex-col items-center justify-center rounded-xl p-2 text-xs font-semibold transition-all border ${
                      paymentMethod === 'debit'
                        ? 'border-[#618873] bg-[#eef4f0] text-[#507160] shadow-2xs'
                        : 'border-[#e5ece7] bg-white text-slate-600 hover:bg-[#f4f7f5]'
                    }`}
                  >
                    <CreditCard className="h-4 w-4 mb-1" />
                    <span>EDC Card</span>
                  </button>
                </div>
              </div>

              {/* Cash Tendered Input & Presets */}
              {paymentMethod === 'cash' && (
                <div className="rounded-xl bg-[#fafbf9] p-3 border border-[#e5ece7] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{t.cashReceived}</span>
                    <input
                      type="number"
                      placeholder={total.toString()}
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value ? Number(e.target.value) : '')}
                      className="w-32 rounded-lg border border-[#e5ece7] bg-white px-2 py-1 text-right text-xs font-bold text-slate-800 focus:border-[#618873] focus:outline-hidden"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {[total, 50000, 100000, 200000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmountTendered(preset)}
                        className="rounded-md border border-[#e5ece7] bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-[#f4f7f5]"
                      >
                        {formatCurrency(preset)}
                      </button>
                    ))}
                  </div>

                  {typeof amountTendered === 'number' && amountTendered >= total && (
                    <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-[#f1f4f2]">
                      <span className="text-slate-600">{t.changeDue}</span>
                      <span className="text-emerald-600 font-extrabold">{formatCurrency(change)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Bill Breakdown */}
              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-[#e5ece7]">
                <div className="flex justify-between">
                  <span>{t.subtotal}</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t.taxPb1}</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-[#f1f4f2]">
                  <span>{t.totalBill}</span>
                  <span className="text-base text-[#507160]">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={selectedOutletId === 'all'}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#618873] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#507160] active:scale-[0.99] transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{t.completeOrderBtn}</span>
              </button>

              <p className="text-[10px] text-center text-slate-400">
                {t.autoDeductHint} {currentOutlet?.name}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          MOBILE & TABLET STICKY BOTTOM CART BAR (< lg)
      ======================================================== */}
      {cart.length > 0 && !isMobileCartOpen && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#507160] to-[#3a5346] p-3.5 text-white shadow-xl border border-white/20 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 font-extrabold text-sm">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </div>
              <div>
                <p className="text-[11px] font-medium text-emerald-100">Total Pesanan</p>
                <p className="text-sm font-extrabold text-white">
                  {formatCurrency(total)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#507160] shadow-sm hover:bg-emerald-50 active:scale-95 transition-all"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Lihat Pesanan</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MOBILE & TABLET CART DRAWER / SLIDE-UP SHEET (< lg)
      ======================================================== */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 lg:hidden animate-in fade-in duration-200">
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-[#e5ece7] max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#e5ece7] flex items-center justify-between bg-[#fafbf9]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[#618873]" />
                <h3 className="text-sm font-bold text-slate-800">
                  Keranjang ({currentOutlet?.name})
                </h3>
                <span className="rounded-full bg-[#eef4f0] px-2 py-0.5 text-xs font-bold text-[#507160]">
                  {cart.reduce((s, i) => s + i.quantity, 0)} item
                </span>
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs font-medium text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    {t.clearCartBtn}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Cart Content inside Drawer */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Cart Items List */}
              <div className="space-y-2.5">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                    <ShoppingCart className="h-10 w-10 text-slate-200 mb-2 stroke-1" />
                    <p className="text-xs font-medium">{t.cartEmptyTitle}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{t.cartEmptyDesc}</p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const isBeverage = item.product.category === 'Coffee' || item.product.category === 'Non-Coffee';
                    const sugarOptions: SugarLevel[] = [
                      'Normal (100%)',
                      'Less Sugar (50%)',
                      'Low Sugar (25%)',
                      'No Sugar (0%)',
                    ];

                    return (
                      <div
                        key={item.product.id}
                        className="space-y-2 rounded-xl border border-[#f1f4f2] bg-[#fafbf9] p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">{item.product.name}</p>
                            <p className="text-[11px] font-semibold text-slate-500">
                              {formatCurrency(item.product.price)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1 bg-white border border-[#e5ece7] rounded-lg p-0.5 shadow-2xs">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(item.product.id, -1);
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-slate-100 text-slate-600"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-xs font-bold w-6 text-center text-slate-800">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(item.product.id, 1);
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-slate-100 text-slate-600"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            <p className="text-xs font-bold text-slate-900 w-16 text-right">
                              {formatCurrency(item.product.price * item.quantity)}
                            </p>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromCart(item.product.id);
                              }}
                              className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {isBeverage && (
                          <div className="pt-1.5 border-t border-[#edf2ee]">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-semibold text-slate-500">Level Gula:</span>
                              <span className="text-[10px] font-bold text-[#507160]">
                                {item.sugarLevel || 'Normal (100%)'}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                              {sugarOptions.map((sugar) => {
                                const isSelected = (item.sugarLevel || 'Normal (100%)') === sugar;
                                const shortLabel =
                                  sugar === 'Normal (100%)'
                                    ? 'Normal'
                                    : sugar === 'Less Sugar (50%)'
                                    ? 'Less 50%'
                                    : sugar === 'Low Sugar (25%)'
                                    ? 'Low 25%'
                                    : '0% Gula';
                                return (
                                  <button
                                    key={sugar}
                                    type="button"
                                    onClick={() => updateSugarLevel(item.product.id, sugar)}
                                    className={`rounded-lg py-1 text-[9px] font-semibold transition-all border ${
                                      isSelected
                                        ? 'bg-[#618873] border-[#618873] text-white'
                                        : 'bg-white border-[#e5ece7] text-slate-600'
                                    }`}
                                  >
                                    {shortLabel}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="pt-1">
                          <input
                            type="text"
                            placeholder="Catatan pesanan (cth: Less ice, panas, tanpa sambal...)"
                            value={item.notes || ''}
                            onChange={(e) => updateNotes(item.product.id, e.target.value)}
                            className="w-full rounded-lg border border-[#e5ece7] bg-white px-2 py-1 text-[11px] text-slate-700 placeholder-slate-400 focus:border-[#618873] focus:outline-hidden"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Payment Method Selector in Drawer */}
              {cart.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-[#e5ece7]">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                      {t.paymentMethodTitle}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('qris')}
                        className={`flex flex-col items-center justify-center rounded-xl p-2 text-xs font-semibold transition-all border ${
                          paymentMethod === 'qris'
                            ? 'border-[#618873] bg-[#eef4f0] text-[#507160]'
                            : 'border-[#e5ece7] bg-white text-slate-600'
                        }`}
                      >
                        <QrCode className="h-4 w-4 mb-1" />
                        <span>QRIS</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`flex flex-col items-center justify-center rounded-xl p-2 text-xs font-semibold transition-all border ${
                          paymentMethod === 'cash'
                            ? 'border-[#618873] bg-[#eef4f0] text-[#507160]'
                            : 'border-[#e5ece7] bg-white text-slate-600'
                        }`}
                      >
                        <Banknote className="h-4 w-4 mb-1" />
                        <span>Cash</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('debit')}
                        className={`flex flex-col items-center justify-center rounded-xl p-2 text-xs font-semibold transition-all border ${
                          paymentMethod === 'debit'
                            ? 'border-[#618873] bg-[#eef4f0] text-[#507160]'
                            : 'border-[#e5ece7] bg-white text-slate-600'
                        }`}
                      >
                        <CreditCard className="h-4 w-4 mb-1" />
                        <span>EDC Card</span>
                      </button>
                    </div>
                  </div>

                  {paymentMethod === 'cash' && (
                    <div className="rounded-xl bg-[#fafbf9] p-3 border border-[#e5ece7] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{t.cashReceived}</span>
                        <input
                          type="number"
                          placeholder={total.toString()}
                          value={amountTendered}
                          onChange={(e) => setAmountTendered(e.target.value ? Number(e.target.value) : '')}
                          className="w-32 rounded-lg border border-[#e5ece7] bg-white px-2 py-1 text-right text-xs font-bold text-slate-800"
                        />
                      </div>

                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {[total, 50000, 100000, 200000].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAmountTendered(preset)}
                            className="rounded-md border border-[#e5ece7] bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                          >
                            {formatCurrency(preset)}
                          </button>
                        ))}
                      </div>

                      {typeof amountTendered === 'number' && amountTendered >= total && (
                        <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-[#f1f4f2]">
                          <span className="text-slate-600">{t.changeDue}</span>
                          <span className="text-emerald-600 font-extrabold">{formatCurrency(change)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bill Breakdown */}
                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-[#e5ece7]">
                    <div className="flex justify-between">
                      <span>{t.subtotal}</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.taxPb1}</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(tax)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-[#f1f4f2]">
                      <span>{t.totalBill}</span>
                      <span className="text-base text-[#507160]">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={selectedOutletId === 'all'}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#618873] py-3.5 text-sm font-bold text-white shadow-xs hover:bg-[#507160] active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{t.completeOrderBtn}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          CHECKOUT SUCCESS & RECEIPT MODAL (WITH BOM DEDUCTIONS)
      ======================================================== */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#e5ece7] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#eef4f0] via-[#f7faf8] to-[#edf4f8] p-5 border-b border-[#e5ece7] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#618873] text-white">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{t.orderSuccessTitle}</h3>
                  <p className="text-xs text-slate-500">{completedOrder.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setCompletedOrder(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Receipt Preview */}
              <div className="rounded-xl border border-dashed border-[#e5ece7] bg-[#fafbf9] p-4 text-xs font-mono space-y-2">
                <div className="text-center pb-2 border-b border-dashed border-slate-300">
                  <p className="font-bold text-sm tracking-widest uppercase">BRANDES COFFEE</p>
                  <p className="text-[11px] text-slate-500">{completedOrder.outletName}</p>
                  <p className="text-[10px] text-slate-400">{formatDateTime(completedOrder.createdAt)}</p>
                </div>

                <div className="space-y-1.5 py-1">
                  {completedOrder.items.map((i, idx) => (
                    <div key={idx} className="space-y-0.5 border-b border-dashed border-slate-100 pb-1 last:border-0 last:pb-0">
                      <div className="flex justify-between">
                        <span>{i.productName} x{i.quantity}</span>
                        <span>{formatCurrency(i.price * i.quantity)}</span>
                      </div>
                      {i.sugarLevel && (
                        <p className="text-[10px] text-slate-500 pl-2">
                          ↳ Gula: {i.sugarLevel}
                        </p>
                      )}
                      {i.notes && (
                        <p className="text-[10px] text-slate-500 pl-2 italic">
                          ↳ Catatan: {i.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-dashed border-slate-300 space-y-0.5">
                  <div className="flex justify-between">
                    <span>{t.subtotal}:</span>
                    <span>{formatCurrency(completedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.taxPb1}:</span>
                    <span>{formatCurrency(completedOrder.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(completedOrder.total)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                    <span>{t.paymentMethodTitle} ({completedOrder.paymentMethod.toUpperCase()}):</span>
                    <span>LUNAS / PAID</span>
                  </div>
                </div>
              </div>

              {/* AUTOMATIC BOM DEDUCTION BREAKDOWN AUDIT */}
              <div className="rounded-xl border border-[#e5ece7] bg-[#f4f7f5] p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#507160]">
                  <Layers className="h-4 w-4" />
                  <span>{t.bomDepletionTitle}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {t.bomDepletionDesc} {completedOrder.outletName}:
                </p>

                <div className="space-y-1.5 pt-1">
                  {depletionSummary.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 text-xs border border-[#e5ece7]"
                    >
                      <span className="font-medium text-slate-700">{log.rawMaterialName}</span>
                      <span className="font-bold text-rose-600">
                        -{log.quantityDeducted} {log.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#fafbf9] border-t border-[#e5ece7] flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl border border-[#e5ece7] bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-[#f4f7f5] shadow-2xs"
              >
                <Printer className="h-3.5 w-3.5" />
                {t.printReceiptBtn}
              </button>
              <button
                onClick={() => setCompletedOrder(null)}
                className="flex items-center gap-1.5 rounded-xl bg-[#618873] px-5 py-2 text-xs font-bold text-white hover:bg-[#507160] shadow-2xs"
              >
                <span>{t.doneNextOrderBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
