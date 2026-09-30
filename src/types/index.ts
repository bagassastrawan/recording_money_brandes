export type UserRole = 'manager' | 'cashier';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  outletId?: string; // If cashier is bound to an outlet
}

export interface Outlet {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  isPrimary?: boolean;
}

export type UnitType = 'btl' | 'pack' | 'kg' | 'dus' | 'cup' | 'pcs' | 'pump' | 'g' | 'ml';

export interface InventoryItem {
  id: string;
  outletId: string;
  name: string;
  category: 'Coffee Beans' | 'Dairy & Milk' | 'Syrup & Powder' | 'Packaging' | 'Bakery Raw' | 'Other';
  currentStock: number;
  unit: UnitType;
  minThreshold: number;
  costPerUnit: number; // Cost in IDR / USD
  lastUpdated: string;
}

export interface BOMItem {
  rawMaterialId: string;
  rawMaterialName: string;
  quantity: number;
  unit: UnitType;
}

export type ProductCategory = 'Coffee' | 'Non-Coffee' | 'Food' | 'Snack';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  description: string;
  bom: BOMItem[]; // Bill of Materials mapping
  isActive: boolean;
}

export type SugarLevel = 'Normal (100%)' | 'Less Sugar (50%)' | 'Low Sugar (25%)' | 'No Sugar (0%)';

export interface CartItem {
  product: Product;
  quantity: number;
  sugarLevel?: SugarLevel;
  notes?: string;
}

export type PaymentMethod = 'cash' | 'qris' | 'debit' | 'credit';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  sugarLevel?: SugarLevel;
  notes?: string;
  costEstimate?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  outletId: string;
  outletName: string;
  cashierId: string;
  cashierName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountTendered?: number;
  change?: number;
  orderNotes?: string; // Global note at bottom of order (table #, takeaway, etc.)
  createdAt: string;
}

export interface StockDepletionLog {
  id: string;
  orderId: string;
  orderNumber: string;
  outletId: string;
  outletName: string;
  rawMaterialId: string;
  rawMaterialName: string;
  quantityDeducted: number;
  unit: UnitType;
  createdAt: string;
}

export interface StockOpnameItem {
  rawMaterialId: string;
  rawMaterialName: string;
  unit: UnitType;
  systemStock: number;
  physicalStock: number;
  variance: number; // physicalStock - systemStock
  costPerUnit: number;
  varianceCost: number; // variance * costPerUnit
  reason?: string;
}

export interface StockOpnameRecord {
  id: string;
  outletId: string;
  outletName: string;
  performedBy: string;
  date: string;
  items: StockOpnameItem[];
  totalVarianceCost: number;
  notes?: string;
  status: 'approved' | 'pending';
}

export type ExpenseCategory = 
  | 'salaries'
  | 'utilities'
  | 'raw_materials'
  | 'rent'
  | 'maintenance'
  | 'marketing'
  | 'other';

export interface Expense {
  id: string;
  outletId: string;
  outletName: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  date: string;
  paymentMethod: string;
  recordedBy: string;
  notes?: string;
  receiptUrl?: string;
}
