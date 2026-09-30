# Brandes Money - Coffee Brand POS, BOM Inventory & Financial Tracker

A full-stack, enterprise-grade business management and financial recording system for coffee brands and F&B multi-outlet chains.

Built with **Next.js (App Router)**, **Tailwind CSS v4**, **Node.js Server Actions**, and **Supabase (PostgreSQL & Supabase Auth)**.

---

## ☕ Core Features

### 1. Role-Based Access Control (RBAC)
- **Manager Mode**:
  - Full access to executive financial metrics, cashflow, P&L, multi-branch consolidated data.
  - CRUD operations on menu items and recipe Bill of Materials (BOM).
  - Approvals for weekly stock opname audits.
  - Operational overhead expense logging.
- **Cashier Mode**:
  - Streamlined Point of Sales (POS) terminal.
  - Active outlet selector with live stock safety indicator.
  - Fast ring-up, modifiers/notes, cash/QRIS/card tenders, and instant receipt generation.
- **Quick Role Switcher**:
  - Live role toggle in the sidebar to simulate both Manager and Cashier experiences in real-time.

### 2. Executive Manager Dashboard
- **Key Financial Metrics**:
  - Today's Revenue (live sum of current day's POS orders).
  - Operational Expenses (total overhead costs).
  - Net Profit / Operating Cashflow (`Revenue - Expenses`) with profit margin percentage.
  - Critical Low Stock Alert Widget (animated alert showing items below minimum threshold).
- **Interactive Visualizations**:
  - Weekly Cashflow Trend chart (Recharts) comparing Gross Revenue vs Operating Expenses.
  - One-click quick restock modal with instant inventory update.
  - Real-time recent transaction stream with cashier attribution.

### 3. POS (Point of Sales) with Automated BOM Deduction
- **Outlet Verification**: Requires selecting an active branch (e.g. *Downtown Flagship*, *Uptown Roastery*, *Mall Kiosk*) before checkout so inventory deductions are branch-accurate.
- **Product Categorization**: Filter by *Coffee Bar*, *Non-Coffee & Teas*, and *Pastry & Bakery*.
- **Interactive Order Drawer**:
  - Real-time subtotal, 10% PB1 restaurant tax, and total computation.
  - Payment methods: **QRIS**, **Cash** (with cash tendered calculation and change due), and **EDC Card**.
- **⚡ Automated Bill of Materials (BOM) Deduction Engine**:
  - When an order is completed, the system calculates all ingredients in every ordered product (e.g., Cafe Latte = 18g espresso beans + 200ml milk + 1 paper cup).
  - Atomically deducts the exact raw material amounts from the outlet's live stock inventory.
  - Displays a detailed **BOM Ingredient Depletion Audit** on the checkout completion modal.

### 4. Menu & BOM Recipe Management
- Add, edit, and delete menu products.
- Configure prices, descriptions, and icon badges.
- **BOM Ingredients Builder**:
  - Dynamically map any raw materials to a product recipe.
  - Specify portion quantities (e.g. grams, ml, pcs).
  - Automatically calculates estimated Cost of Goods Sold (COGS) and gross margin percentage.

### 5. Inventory & Weekly Stock Opname
- **Raw Material Stock Levels**:
  - Tracks coffee beans, fresh milk, oat milk, cups, syrups, and bakery dough.
  - **Low Stock Highlighting**: Items at or below safety threshold are highlighted in **red** with blinking warning pills.
  - Quick "+ Restock" action that automatically logs a raw material purchase expense entry.
- **Weekly Stock Opname Audit Form**:
  - Dedicated employee audit sheet.
  - Displays System Stock (DB) side-by-side with Physical Count input.
  - Auto-calculates variance (physical - system) and variance cost in IDR.
  - Submitting automatically reconciles inventory and archives the audit record with notes.
- **Opname Audit History**:
  - Historical log of all audits with discrepancy costs and barista signatures.

### 6. Operational Expense Tracking
- Record overhead expenses: *Salaries & Wages*, *Utilities (PLN, Water, Wi-Fi)*, *Raw Material Purchases*, *Store Rent*, *Equipment Maintenance*, and *Marketing*.
- Filterable expense ledger with search and category filters.
- One-click **Export to CSV**.

### 7. Financial Reports & Logs
- **Daily Sales Report**: Detailed order breakdowns, payment channels (QRIS vs Cash vs EDC), and Average Order Value (AOV).
- **Cashflow Statement**: Equation summary (`Gross Revenue - Operating Overhead = Net Cashflow`) and branch-by-branch comparison.
- **Stock Depletion Audit Logs**: Complete audit trail showing which POS order consumed how many grams/ml of raw materials.
- Full CSV export across all three report sections.

---

## 🎨 UI/UX Design System
- **Layout**: Modern Admin Dashboard with responsive collapsible sidebar, sticky frosted header, and spacious content cards.
- **Soft Color Palette**:
  - Soft Sage Green (`#618873`, `#EEF4F0`)
  - Pastel Blue (`#698DA7`, `#E3ECF2`)
  - Warm Off-White (`#FAF9F6`)
  - Light Gray Surfaces (`#FFFFFF`, `#F1F4F2`)
  - Red Low-Stock Alert Accent (`#E11D48`, `#FFE4E6`)

---

## 🔌 Supabase Setup & Cloud Migration

1. Copy `.env.local.example` or create `.env.local` in project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
2. Open the **SQL Editor** in your Supabase dashboard and run the entire SQL migration script located at:
   ```
   src/lib/supabase/schema.sql
   ```
3. The schema provisions:
   - `profiles` with Role-Based Access Control (`manager`, `cashier`).
   - `outlets`, `inventory`, `products`, `orders`, `stock_depletion_logs`, `expenses`, and `stock_opnames`.
   - Complete Row-Level Security (RLS) policies.
   - Initial outlet seed data.

*Note: If Supabase credentials are not provided, the app operates automatically with a persistent local mock engine with zero configuration needed.*

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
