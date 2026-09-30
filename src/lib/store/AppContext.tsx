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
        setOrders(ordRes.data);
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
        if (parsed.products) setProducts(parsed.products);
        if (parsed.inventory) setInventory(parsed.inventory);
        if (parsed.orders) setOrders(parsed.orders);
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
      setUser({
        id: 'usr-cashier',
        name: 'Rina (Barista Cashier)',
        email: 'cashier@brandes.com',
        role: 'cashier',
        outletId: selectedOutletId,
      });
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
          if (!deductionMap[bomItem.rawMaterialId]) {
            deductionMap[bomItem.rawMaterialId] = {
              deducted: 0,
              unit: bomItem.unit,
              name: bomItem.rawMaterialName,
            };
          }
          deductionMap[bomItem.rawMaterialId].deducted += totalDeducted;

          newLogs.push({
            id: `log-${Date.now()}-${Math.random()}`,
            orderId: newOrder.id,
            orderNumber: newOrder.orderNumber,
            outletId: currentOutlet.id,
            outletName: currentOutlet.name,
            rawMaterialId: bomItem.rawMaterialId,
            rawMaterialName: bomItem.rawMaterialName,
            quantityDeducted: totalDeducted,
            unit: bomItem.unit,
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
            currentStock: Math.max(0, item.currentStock - deduction),
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
