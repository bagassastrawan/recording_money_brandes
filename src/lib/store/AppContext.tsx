'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  UserRole,
  Outlet,
  Product,
  InventoryItem,
  Order,
  CartItem,
  Expense,
  StockDepletionLog,
  StockOpnameRecord,
  PaymentMethod,
} from '@/types';
import {
  initialOutlets,
  initialProducts,
  initialInventory,
  initialOrders,
  initialExpenses,
  initialOpnames,
  DEFAULT_ORDER_ITEMS_MAP,
} from '@/lib/data/mockData';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  syncIngredientToSupabase,
  syncExpenseToSupabase,
  deleteExpenseFromSupabase,
  syncOrderToSupabase,
  syncProductToSupabase,
  deleteProductFromSupabase,
  syncStockOpnameToSupabase,
  syncDepletionLogToSupabase,
  syncAllToSupabaseService,
  fetchIngredientsFromSupabase,
  fetchExpensesFromSupabase,
  fetchTodaySalesFromSupabase,
  fetchAllOrdersFromSupabase,
  fetchProductsFromSupabase,
  fetchOutletsFromSupabase,
  syncAllExpensesToSupabase,
  syncAllIngredientsToSupabase,
  SyncResult,
} from '@/lib/supabase/syncService';
import { translations, Language } from '@/lib/i18n/translations';

interface AppContextType {
  user: User;
  setUser: (user: User) => void;
  switchRole: (role: UserRole) => void;
  
  outlets: Outlet[];
  selectedOutletId: string;
  setSelectedOutletId: (id: string) => void;
  currentOutlet: Outlet | undefined;
  
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  
  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => void;
  updateInventoryItem: (item: InventoryItem) => void;
  updateInventoryStock: (id: string, outletId: string, currentStock: number, costPerUnit?: number) => void;
  restockItem: (id: string, outletId: string, addQuantity: number, cost?: number) => void;
  lowStockItems: InventoryItem[];
  
  orders: Order[];
  createOrder: (params: {
    items: CartItem[];
    paymentMethod: PaymentMethod;
    amountTendered?: number;
    orderNotes?: string;
  }) => { order: Order; depletedLogs: StockDepletionLog[] } | null;
  
  stockDepletionLogs: StockDepletionLog[];
  
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  
  stockOpnames: StockOpnameRecord[];
  submitStockOpname: (record: Omit<StockOpnameRecord, 'id'>) => void;
  
  activeTab: string;
  setActiveTab: (tab: string) => void;

  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations['id'];
  
  isSupabaseActive: boolean;
  isSyncing: boolean;
  isLoadingLiveSupabase: boolean;
  syncAllToSupabase: () => Promise<SyncResult>;
  refreshFromSupabase: () => Promise<void>;
  fetchTodaySales: (outletId?: string) => Promise<{ success: boolean; data: Order[] | null; error?: string; source: 'supabase' | 'fallback' }>;
  fetchOrders: (outletId?: string) => Promise<{ success: boolean; data: Order[] | null; error?: string }>;
  pushExpensesToSupabase: () => Promise<SyncResult>;
  pushIngredientsToSupabase: () => Promise<SyncResult>;
  resetToDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'money_brandes_data_v1';
const LOCAL_STORAGE_LANG_KEY = 'money_brandes_lang';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>({
    id: 'usr-1',
    name: 'Alexandria Pratama',
    email: 'alex@brandescoffee.com',
    role: 'manager',
  });

  const [outlets, setOutlets] = useState<Outlet[]>(initialOutlets);
  const [selectedOutletId, setSelectedOutletId] = useState<string>('outlet-1');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [stockOpnames, setStockOpnames] = useState<StockOpnameRecord[]>(initialOpnames);
  const [stockDepletionLogs, setStockDepletionLogs] = useState<StockDepletionLog[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isLoadingLiveSupabase, setIsLoadingLiveSupabase] = useState<boolean>(false);

  const [language, setLanguageState] = useState<Language>('id');

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LOCAL_STORAGE_LANG_KEY, lang);
    } catch (e) {
      console.error(e);
    }
  };

  // Live Query / Get Connection directly from Supabase
  const refreshFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setIsLoadingLiveSupabase(true);
    try {
      const [ingRes, expRes, ordRes, prodRes, outRes] = await Promise.all([
        fetchIngredientsFromSupabase(),
        fetchExpensesFromSupabase(),
        fetchAllOrdersFromSupabase(),
        fetchProductsFromSupabase(),
        fetchOutletsFromSupabase(),
      ]);

      if (outRes.success && outRes.data && outRes.data.length > 0) {
        setOutlets(outRes.data);
      }
      if (prodRes.success && prodRes.data && prodRes.data.length > 0) {
        setProducts(prodRes.data);
      }
      if (ingRes.success && ingRes.data && ingRes.data.length > 0) {
        setInventory(ingRes.data);
      }
      if (expRes.success && expRes.data && expRes.data.length > 0) {
        setExpenses(expRes.data);
      }
      if (ordRes.success && ordRes.data && ordRes.data.length > 0) {
        setOrders((prevOrders) => {
          const prevMap = new Map<string, Order>();
          prevOrders.forEach((o) => {
            prevMap.set(o.id, o);
            if (o.orderNumber) prevMap.set(o.orderNumber, o);
          });

          const cloudOrderIds = new Set<string>();
          const mergedCloudOrders = ordRes.data!.map((cloudOrder) => {
            cloudOrderIds.add(cloudOrder.id);
            if (cloudOrder.orderNumber) cloudOrderIds.add(cloudOrder.orderNumber);

            const localOrder =
              prevMap.get(cloudOrder.id) ||
              (cloudOrder.orderNumber ? prevMap.get(cloudOrder.orderNumber) : undefined);

            const resolvedItems =
              cloudOrder.items && cloudOrder.items.length > 0
                ? cloudOrder.items
                : localOrder && localOrder.items && localOrder.items.length > 0
                ? localOrder.items
                : DEFAULT_ORDER_ITEMS_MAP[cloudOrder.orderNumber] ||
                  DEFAULT_ORDER_ITEMS_MAP[cloudOrder.id] ||
                  [];

            return {
              ...cloudOrder,
              items: resolvedItems,
            };
          });

          // Also preserve any recent local session orders not yet returned in cloud query
          const localOnlyOrders = prevOrders.filter(
            (o) => !cloudOrderIds.has(o.id) && (!o.orderNumber || !cloudOrderIds.has(o.orderNumber))
          );

          // Strictly deduplicate by ID to guarantee unique React keys
          const dedupedMap = new Map<string, Order>();
          [...mergedCloudOrders, ...localOnlyOrders].forEach((ord) => {
            if (!dedupedMap.has(ord.id)) {
              dedupedMap.set(ord.id, ord);
            }
          });

          return Array.from(dedupedMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      }
    } finally {
      setIsLoadingLiveSupabase(false);
    }
  }, []);

  // Hydrate from LocalStorage on mount
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem(LOCAL_STORAGE_LANG_KEY) as Language;
      if (savedLang === 'id' || savedLang === 'en') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLanguageState(savedLang);
      }

      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.products) {
          const existingIds = new Set(parsed.products.map((p: Product) => p.id));
          const missingInitial = initialProducts.filter((p) => !existingIds.has(p.id));
          setProducts([...parsed.products, ...missingInitial]);
        }
        if (parsed.inventory) {
          const existingIds = new Set(parsed.inventory.map((i: InventoryItem) => i.id));
          const missingInitial = initialInventory.filter((i) => !existingIds.has(i.id));
          setInventory([...parsed.inventory, ...missingInitial]);
        }
        if (parsed.orders && Array.isArray(parsed.orders)) {
          const orderMap = new Map<string, Order>();
          parsed.orders.forEach((o: Order) => {
            if (!o || !o.id) return;
            let items = o.items;
            if (!items || items.length === 0) {
              const def = DEFAULT_ORDER_ITEMS_MAP[o.orderNumber] || DEFAULT_ORDER_ITEMS_MAP[o.id];
              if (def) items = def;
            }
            if (!orderMap.has(o.id)) {
              orderMap.set(o.id, { ...o, items: items || [] });
            }
          });
          setOrders(Array.from(orderMap.values()));
        }
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.stockOpnames) setStockOpnames(parsed.stockOpnames);
        if (parsed.stockDepletionLogs) setStockDepletionLogs(parsed.stockDepletionLogs);
        if (parsed.user) setUser(parsed.user);
      }

      // Live Connection to Supabase: Fetch live data directly from Supabase
      if (isSupabaseConfigured) {
        refreshFromSupabase();
      }
    } catch (e) {
      console.error('Error loading saved state:', e);
    }
  }, [refreshFromSupabase]);

  // Save to LocalStorage on updates
  useEffect(() => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          products,
          inventory,
          orders,
          expenses,
          stockOpnames,
          stockDepletionLogs,
          user,
        })
      );
    } catch (e) {
      console.error('Error saving state:', e);
    }
  }, [products, inventory, orders, expenses, stockOpnames, stockDepletionLogs, user]);

  const switchRole = (role: UserRole) => {
    if (role === 'manager') {
      setUser({
        id: 'usr-manager',
        name: 'Alexandria (Brand Manager)',
        email: 'manager@brandes.com',
        role: 'manager',
      });
    } else {
      const cashierOutlet = selectedOutletId === 'all' ? (outlets[0]?.id || 'outlet-1') : selectedOutletId;
      setUser({
        id: 'usr-cashier',
        name: 'Rina (Barista Cashier)',
        email: 'cashier@brandes.com',
        role: 'cashier',
        outletId: cashierOutlet,
      });
      setSelectedOutletId(cashierOutlet);
      // Cashiers automatically jump to POS interface
      setActiveTab('pos');
    }
  };

  const currentOutlet = outlets.find((o) => o.id === selectedOutletId) || outlets[0];

  // Low stock items computed for current outlet (or all if manager views all)
  const lowStockItems = inventory.filter((item) => {
    const matchOutlet = selectedOutletId === 'all' ? true : item.outletId === selectedOutletId;
    return matchOutlet && item.currentStock <= item.minThreshold;
  });

  // Product CRUD
  const addProduct = (newProd: Omit<Product, 'id'>) => {
    const id = `prod-${Date.now()}`;
    const productWithId: Product = { ...newProd, id };
    setProducts((prev) => [...prev, productWithId]);
    syncProductToSupabase(productWithId);
  };

  const updateProduct = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    syncProductToSupabase(updated);
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    deleteProductFromSupabase(id);
  };

  // Inventory Updates & Additions
  const addInventoryItem = (newItem: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    const id = `raw-${newItem.outletId}-${Date.now()}`;
    const itemWithId: InventoryItem = {
      ...newItem,
      id,
      lastUpdated: new Date().toISOString(),
    };
    setInventory((prev) => [...prev, itemWithId]);
    // Asynchronous cloud sync to Supabase
    syncIngredientToSupabase(itemWithId);
  };

  const updateInventoryItem = (updatedItemData: InventoryItem) => {
    let syncedItem: InventoryItem | undefined;
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === updatedItemData.id && item.outletId === updatedItemData.outletId) {
          syncedItem = {
            ...updatedItemData,
            lastUpdated: new Date().toISOString(),
          };
          return syncedItem;
        }
        return item;
      })
    );
    if (syncedItem) {
      syncIngredientToSupabase(syncedItem);
    }
  };

  const updateInventoryStock = (id: string, outletId: string, currentStock: number, costPerUnit?: number) => {
    let updatedItem: InventoryItem | undefined;
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === id && item.outletId === outletId) {
          updatedItem = {
            ...item,
            currentStock,
            costPerUnit: costPerUnit !== undefined ? costPerUnit : item.costPerUnit,
            lastUpdated: new Date().toISOString(),
          };
          return updatedItem;
        }
        return item;
      })
    );
    if (updatedItem) {
      syncIngredientToSupabase(updatedItem);
    }
  };

  const restockItem = (id: string, outletId: string, addQuantity: number, cost?: number) => {
    let updatedItem: InventoryItem | undefined;
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === id && item.outletId === outletId) {
          updatedItem = {
            ...item,
            currentStock: item.currentStock + addQuantity,
            costPerUnit: cost !== undefined ? cost : item.costPerUnit,
            lastUpdated: new Date().toISOString(),
          };
          return updatedItem;
        }
        return item;
      })
    );
    if (updatedItem) {
      syncIngredientToSupabase(updatedItem);
    }

    // Also auto-record restock as raw material purchase expense if cost is supplied
    if (cost && cost > 0) {
      const item = inventory.find((i) => i.id === id && i.outletId === outletId);
      const targetOutlet = outlets.find((o) => o.id === outletId);
      if (item) {
        addExpense({
          outletId,
          outletName: targetOutlet?.name || currentOutlet?.name || 'Outlet',
          category: 'raw_materials',
          title: `Restock: ${addQuantity} ${item.unit} ${item.name}`,
          amount: addQuantity * cost,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'Cash / Transfer',
          recordedBy: user.name,
          notes: `Pembelian Bahan Baku Outlet ${targetOutlet?.name || outletId}`,
        });
      }
    }
  };

  // ========================================================
  // BOM DEDUCTION ENGINE (TRIGGERED ON POS CHECKOUT)
  // ========================================================
  const createOrder = ({
    items,
    paymentMethod,
    amountTendered,
    orderNotes,
  }: {
    items: CartItem[];
    paymentMethod: PaymentMethod;
    amountTendered?: number;
    orderNotes?: string;
  }) => {
    if (!currentOutlet) return null;

    const subtotal = items.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0);
    const tax = Math.round(subtotal * 0.1); // 10% PB1 Restaurant Tax
    const total = subtotal + tax;
    const orderNumber = `#ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      outletId: currentOutlet.id,
      outletName: currentOutlet.name,
      cashierId: user.id,
      cashierName: user.name,
      items: items.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        quantity: i.quantity,
        price: i.product.price,
        sugarLevel: i.sugarLevel,
        notes: i.notes,
      })),
      subtotal,
      tax,
      total,
      paymentMethod,
      amountTendered,
      change: amountTendered ? Math.max(0, amountTendered - total) : 0,
      orderNotes,
      createdAt: new Date().toISOString(),
    };

    // Calculate BOM ingredients deduction for current outlet
    const newLogs: StockDepletionLog[] = [];
    const deductionMap: Record<string, { deducted: number; unit: string; name: string }> = {};

    items.forEach((cartItem) => {
      const prod = cartItem.product;
      if (prod.bom && prod.bom.length > 0) {
        prod.bom.forEach((bomItem) => {
          const totalDeducted = bomItem.quantity * cartItem.quantity;

          // Match the actual ingredient strictly in current outlet
          const matchedItem = inventory.find(
            (inv) =>
              inv.outletId === currentOutlet.id &&
              (inv.id === bomItem.rawMaterialId ||
                inv.name.toLowerCase() === bomItem.rawMaterialName.toLowerCase() ||
                inv.name.toLowerCase().includes(bomItem.rawMaterialName.toLowerCase()) ||
                bomItem.rawMaterialName.toLowerCase().includes(inv.name.toLowerCase()))
          );

          const targetId = matchedItem ? matchedItem.id : bomItem.rawMaterialId;
          const targetName = matchedItem ? matchedItem.name : bomItem.rawMaterialName;

          let actualDeduct = totalDeducted;
          if (matchedItem) {
            if ((matchedItem.unit === 'kg' || matchedItem.unit === 'pack') && bomItem.unit === 'g') {
              actualDeduct = totalDeducted / 1000;
            } else if (matchedItem.unit === 'dus' && bomItem.unit === 'ml') {
              actualDeduct = totalDeducted / 12000;
            } else if (matchedItem.unit === 'btl' && bomItem.unit === 'ml') {
              actualDeduct = totalDeducted / 1000;
            } else if (matchedItem.unit === 'btl' && bomItem.unit === 'pump') {
              actualDeduct = totalDeducted / 66;
            } else if (matchedItem.unit === 'pump' && bomItem.unit === 'ml') {
              actualDeduct = totalDeducted / 15;
            } else if (matchedItem.unit === 'g' && (bomItem.unit === 'kg' || bomItem.unit === 'pack')) {
              actualDeduct = totalDeducted * 1000;
            }
          }

          if (!deductionMap[targetId]) {
            deductionMap[targetId] = {
              deducted: 0,
              unit: matchedItem ? matchedItem.unit : bomItem.unit,
              name: targetName,
            };
          }
          deductionMap[targetId].deducted += actualDeduct;

          newLogs.push({
            id: `log-${Date.now()}-${Math.random()}`,
            orderId: newOrder.id,
            orderNumber: newOrder.orderNumber,
            outletId: currentOutlet.id,
            outletName: currentOutlet.name,
            rawMaterialId: targetId,
            rawMaterialName: targetName,
            quantityDeducted: Number(actualDeduct.toFixed(2)),
            unit: matchedItem ? matchedItem.unit : bomItem.unit,
            createdAt: new Date().toISOString(),
          });
        });
      }
    });

    // Update inventory atomically and automatically sync to Supabase
    setInventory((prev) =>
      prev.map((item) => {
        if (item.outletId === currentOutlet.id && deductionMap[item.id]) {
          const deduction = deductionMap[item.id].deducted;
          const updated = {
            ...item,
            currentStock: Math.max(0, Math.round((item.currentStock - deduction) * 100) / 100),
            lastUpdated: new Date().toISOString(),
          };
          // Automatically sync updated inventory stock to Supabase in background
          syncIngredientToSupabase(updated);
          return updated;
        }
        return item;
      })
    );

    // Save logs and order
    setStockDepletionLogs((prev) => [...newLogs, ...prev]);
    setOrders((prev) => [newOrder, ...prev]);

    // Asynchronously push order to Supabase permanently
    syncOrderToSupabase(newOrder);
    newLogs.forEach((log) => syncDepletionLogToSupabase(log));

    return { order: newOrder, depletedLogs: newLogs };
  };

  // Expenses
  const addExpense = (exp: Omit<Expense, 'id'>) => {
    const id = `exp-${Date.now()}`;
    const newExp: Expense = { ...exp, id };
    setExpenses((prev) => [newExp, ...prev]);
    // Asynchronous cloud sync to Supabase
    syncExpenseToSupabase(newExp);
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    // Asynchronously delete from Supabase
    deleteExpenseFromSupabase(id);
  };

  // Stock Opname
  const submitStockOpname = (record: Omit<StockOpnameRecord, 'id'>) => {
    const id = `opname-${Date.now()}`;
    const newRecord: StockOpnameRecord = { ...record, id };
    
    // Auto-update inventory stocks to match physical count entered by employee
    setInventory((prev) =>
      prev.map((inv) => {
        if (inv.outletId === record.outletId) {
          const matched = record.items.find((item) => item.rawMaterialId === inv.id);
          if (matched) {
            const updated = {
              ...inv,
              currentStock: matched.physicalStock,
              lastUpdated: new Date().toISOString(),
            };
            syncIngredientToSupabase(updated);
            return updated;
          }
        }
        return inv;
      })
    );

    setStockOpnames((prev) => [newRecord, ...prev]);
    syncStockOpnameToSupabase(newRecord);
  };

  // Sync All Data to Supabase
  const syncAllToSupabase = async (): Promise<SyncResult> => {
    setIsSyncing(true);
    try {
      const res = await syncAllToSupabaseService({
        outlets,
        products,
        inventory,
        expenses,
        orders,
      });
      return res;
    } finally {
      setIsSyncing(false);
    }
  };


  const pushExpensesToSupabase = async (): Promise<SyncResult> => {
    setIsSyncing(true);
    try {
      return await syncAllExpensesToSupabase(expenses);
    } finally {
      setIsSyncing(false);
    }
  };

  const pushIngredientsToSupabase = async (): Promise<SyncResult> => {
    setIsSyncing(true);
    try {
      return await syncAllIngredientsToSupabase(inventory);
    } finally {
      setIsSyncing(false);
    }
  };

  const resetToDemoData = () => {
    setProducts(initialProducts);
    setInventory(initialInventory);
    setOrders(initialOrders);
    setExpenses(initialExpenses);
    setStockOpnames(initialOpnames);
    setStockDepletionLogs([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        switchRole,
        outlets,
        selectedOutletId,
        setSelectedOutletId,
        currentOutlet,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        inventory,
        addInventoryItem,
        updateInventoryItem,
        updateInventoryStock,
        restockItem,
        lowStockItems,
        orders,
        createOrder,
        stockDepletionLogs,
        expenses,
        addExpense,
        deleteExpense,
        stockOpnames,
        submitStockOpname,
        activeTab,
        setActiveTab,
        language,
        setLanguage,
        t: translations[language],
        isSupabaseActive: isSupabaseConfigured,
        isSyncing,
        isLoadingLiveSupabase,
        syncAllToSupabase,
        refreshFromSupabase,
        fetchTodaySales: fetchTodaySalesFromSupabase,
        fetchOrders: fetchAllOrdersFromSupabase,
        pushExpensesToSupabase,
        pushIngredientsToSupabase,
        resetToDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
