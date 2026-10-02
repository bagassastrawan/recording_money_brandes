import fs from 'fs';

// Read schema.sql content representation directly for display and copy
export const SCHEMA_SQL = `-- ====================================================================
-- BRANDES MONEY - SUPABASE POSTGRESQL COMPLETE SCHEMA & DATA ENTRY
-- Multi-Outlet POS, BOM Inventory, Operational Expenses, Sales & Cashflow
-- ====================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- --------------------------------------------------------------------
-- 2. SAFE CLEANUP / MIGRATION OF OLD OR CONFLICTING TABLES
-- Drops existing tables in correct order if they have incompatible schemas
-- --------------------------------------------------------------------
drop table if exists public.stock_depletion_logs cascade;
drop table if exists public.stock_opnames cascade;
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.sale_items cascade;
drop table if exists public.sales cascade;
drop table if exists public.product_ingredients cascade;
drop table if exists public.ingredients cascade;
drop table if exists public.expenses cascade;
drop table if exists public.products cascade;
drop table if exists public.outlets cascade;

-- --------------------------------------------------------------------
-- 3. OUTLETS (Store Branches / Cabang)
-- --------------------------------------------------------------------
create table public.outlets (
  id text primary key,
  name text not null,
  code text not null unique,
  address text,
  phone text,
  is_primary boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- --------------------------------------------------------------------
-- 4. PRODUCTS (Menu Items / Katalog Produk)
-- --------------------------------------------------------------------
create table public.products (
  id text primary key,
  name text not null,
  category text not null default 'Coffee' check (category in ('Coffee', 'Non-Coffee', 'Food', 'Snack')),
  price numeric(12, 2) not null,
  description text,
  image text,
  is_active boolean default true,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- --------------------------------------------------------------------
-- 5. INGREDIENTS (Bahan Baku / Raw Materials per Outlet)
-- Standard Operational Units: btl, pack, kg, dus, cup, pcs, pump
-- --------------------------------------------------------------------
create table public.ingredients (
  id text primary key,
  outlet_id text references public.outlets(id) on delete cascade not null,
  name text not null,
  category text not null default 'Other',
  current_stock numeric(12, 2) not null default 0,
  unit text not null,
  min_threshold numeric(12, 2) not null default 0,
  cost_per_unit numeric(12, 2) not null default 0,
  expiry_date date,
  last_updated timestamptz default timezone('utc'::text, now()) not null,
  unique (outlet_id, name)
);

-- --------------------------------------------------------------------
-- 6. PRODUCT_INGREDIENTS (Bill of Materials / Resep BOM)
-- --------------------------------------------------------------------
create table public.product_ingredients (
  id text primary key,
  product_id text references public.products(id) on delete cascade not null,
  ingredient_name text not null,
  quantity numeric(12, 2) not null,
  unit text not null,
  unique (product_id, ingredient_name)
);

-- --------------------------------------------------------------------
-- 7. ORDERS (Penjualan Kasir per Outlet / Multi-Branch Sales)
-- --------------------------------------------------------------------
create table public.orders (
  id text primary key,
  order_number text not null unique,
  outlet_id text references public.outlets(id) on delete cascade not null,
  outlet_name text,
  cashier_id text,
  cashier_name text not null default 'Kasir',
  subtotal numeric(12, 2) not null default 0,
  tax numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  payment_method text not null check (payment_method in ('cash', 'qris', 'debit', 'credit')),
  amount_tendered numeric(12, 2),
  change numeric(12, 2),
  payment_status text check (payment_status in ('paid', 'pending', 'cancelled')) default 'paid',
  order_notes text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- --------------------------------------------------------------------
-- 8. ORDER_ITEMS (Detail Produk Terjual per Transaksi Penjualan)
-- --------------------------------------------------------------------
create table public.order_items (
  id text primary key,
  order_id text references public.orders(id) on delete cascade not null,
  product_id text references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null,
  subtotal numeric(12, 2) not null,
  sugar_level text,
  notes text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- --------------------------------------------------------------------
-- 9. EXPENSES (Pengeluaran Operasional & Pembelian Bahan per Cabang)
-- --------------------------------------------------------------------
create table public.expenses (
  id text primary key,
  outlet_id text references public.outlets(id) on delete cascade not null,
  outlet_name text,
  category text not null check (category in ('salaries', 'utilities', 'raw_materials', 'rent', 'maintenance', 'marketing', 'other')),
  title text not null,
  amount numeric(12, 2) not null check (amount > 0),
  date date not null default current_date,
  payment_method text not null,
  recorded_by text not null,
  notes text,
  receipt_url text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- --------------------------------------------------------------------
-- 10. STOCK_OPNAMES (Audit Stok Fisik Mingguan)
-- --------------------------------------------------------------------
create table public.stock_opnames (
  id text primary key,
  outlet_id text references public.outlets(id) on delete cascade not null,
  outlet_name text,
  performed_by text not null default 'Auditor',
  audit_date date not null default current_date,
  items jsonb default '[]'::jsonb,
  total_variance_cost numeric(12, 2) default 0,
  notes text,
  status text default 'approved',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- --------------------------------------------------------------------
-- 11. STOCK_DEPLETION_LOGS (Riwayat Pengurangan BOM per Transaksi POS)
-- --------------------------------------------------------------------
create table public.stock_depletion_logs (
  id text primary key,
  order_id text references public.orders(id) on delete cascade,
  order_number text,
  outlet_id text references public.outlets(id) on delete cascade,
  outlet_name text,
  raw_material_id text,
  raw_material_name text,
  quantity_deducted numeric(12, 2) not null,
  unit text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- --------------------------------------------------------------------
-- 12. INDEXES FOR HIGH-SPEED REPORTING & QUERIES
-- --------------------------------------------------------------------
create index idx_orders_outlet_created on public.orders(outlet_id, created_at desc);
create index idx_orders_created on public.orders(created_at desc);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_expenses_outlet_date on public.expenses(outlet_id, date desc);
create index idx_ingredients_outlet on public.ingredients(outlet_id);
create index idx_depletion_logs_order on public.stock_depletion_logs(order_id);
create index idx_opnames_outlet_date on public.stock_opnames(outlet_id, audit_date desc);

-- --------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- Full permissions for anon role (Publishable API Key) & authenticated
-- --------------------------------------------------------------------
alter table public.outlets enable row level security;
alter table public.products enable row level security;
alter table public.ingredients enable row level security;
alter table public.product_ingredients enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.expenses enable row level security;
alter table public.stock_opnames enable row level security;
alter table public.stock_depletion_logs enable row level security;

drop policy if exists "outlets_policy_all" on public.outlets;
drop policy if exists "products_policy_all" on public.products;
drop policy if exists "ingredients_policy_all" on public.ingredients;
drop policy if exists "product_ingredients_policy_all" on public.product_ingredients;
drop policy if exists "orders_policy_all" on public.orders;
drop policy if exists "order_items_policy_all" on public.order_items;
drop policy if exists "expenses_policy_all" on public.expenses;
drop policy if exists "stock_opnames_policy_all" on public.stock_opnames;
drop policy if exists "stock_depletion_logs_policy_all" on public.stock_depletion_logs;

create policy "outlets_policy_all" on public.outlets for all to anon, authenticated using (true) with check (true);
create policy "products_policy_all" on public.products for all to anon, authenticated using (true) with check (true);
create policy "ingredients_policy_all" on public.ingredients for all to anon, authenticated using (true) with check (true);
create policy "product_ingredients_policy_all" on public.product_ingredients for all to anon, authenticated using (true) with check (true);
create policy "orders_policy_all" on public.orders for all to anon, authenticated using (true) with check (true);
create policy "order_items_policy_all" on public.order_items for all to anon, authenticated using (true) with check (true);
create policy "expenses_policy_all" on public.expenses for all to anon, authenticated using (true) with check (true);
create policy "stock_opnames_policy_all" on public.stock_opnames for all to anon, authenticated using (true) with check (true);
create policy "stock_depletion_logs_policy_all" on public.stock_depletion_logs for all to anon, authenticated using (true) with check (true);

-- --------------------------------------------------------------------
-- 14. SEED DATA ENTRY: CABANG OUTLET (Store Branches)
-- --------------------------------------------------------------------
insert into public.outlets (id, name, code, address, phone, is_primary) values
  ('outlet-1', 'Batanta', 'BTN-01', 'Jl. Pulau Batanta No. 88, Denpasar Barat', '0361-224891', true),
  ('outlet-2', 'Taman Pancing', 'TPC-01', 'Jl. Taman Pancing Barat No. 12, Pemogan, Denpasar Selatan', '0361-889342', false),
  ('outlet-3', 'Dewi Sri', 'DWS-01', 'Jl. Dewi Sri No. 45, Kuta, Badung', '0361-754120', false)
on conflict (id) do update set
  name = excluded.name,
  code = excluded.code,
  address = excluded.address,
  phone = excluded.phone;

-- --------------------------------------------------------------------
-- 15. SEED DATA ENTRY: MENU PRODUCTS
-- --------------------------------------------------------------------
insert into public.products (id, name, category, price, description, is_active) values
  ('prod-1', 'Espresso Single Origin', 'Coffee', 18000, 'Ekstraksi kopi murni 30ml dari biji kopi house blend pilihan.', true),
  ('prod-2', 'Iced Americano', 'Coffee', 25000, 'Double shot espresso dengan air dingin dan es batu segar.', true),
  ('prod-3', 'Kopi Susu Gula Aren', 'Coffee', 28000, 'Signature Brandes Coffee: espresso, susu creamy, dan gula aren asli.', true),
  ('prod-4', 'Caramel Macchiato', 'Coffee', 34000, 'Espresso dengan sirup vanilla, steamed milk, dan drizzle saus karamel.', true),
  ('prod-5', 'Matcha Latte Kyoto', 'Non-Coffee', 32000, 'Bubuk matcha murni asal Jepang dipadukan dengan fresh milk manis lembut.', true),
  ('prod-6', 'Signature Dark Chocolate', 'Non-Coffee', 30000, 'Cokelat hitam pekat premium khas Brandes dengan susu segar.', true),
  ('prod-7', 'Earl Grey Milk Tea', 'Non-Coffee', 26000, 'Seduhan teh Earl Grey beraroma bergamot dengan susu segar.', true),
  ('prod-8', 'Nasi Goreng Spesial Barista', 'Food', 38000, 'Nasi goreng gurih dengan bumbu rahasia dapur, telur mata sapi & ayam suwir.', true),
  ('prod-9', 'Spaghetti Aglio Olio Smoked Beef', 'Food', 42000, 'Pasta spaghetti al dente dengan minyak zaitun, bawang putih, cabai & smoked beef.', true),
  ('prod-10', 'Crispy French Fries Shoestring', 'Snack', 24000, 'Kentang goreng renyah disajikan dengan saus sambal & mayones.', true),
  ('prod-11', 'Butter Croissant', 'Snack', 26000, 'Pastry Perancis berlapis renyah dipanggang fresh setiap hari.', true),
  ('prod-12', 'Artisan Earl Grey Milk Tea', 'Non-Coffee', 28000, 'Seduhan teh hitam Earl Grey beraroma citrus bergamot dengan susu segar creamy.', true),
  ('prod-13', 'Iced Jasmine Green Tea', 'Non-Coffee', 22000, 'Seduhan daun teh hijau melati harum disajikan dingin menyegarkan.', true)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  price = excluded.price,
  description = excluded.description,
  is_active = excluded.is_active;

-- --------------------------------------------------------------------
-- 16. SEED DATA ENTRY: STOK BAHAN BAKU (Ingredients per Outlet)
-- --------------------------------------------------------------------
-- Batanta (outlet-1) - Dilengkapi beberapa barang tidak tersedia / stok 0
insert into public.ingredients (id, outlet_id, name, category, current_stock, unit, min_threshold, cost_per_unit) values
  ('raw-1', 'outlet-1', 'House Blend Coffee Beans (Arabica/Robusta)', 'Coffee Beans', 15, 'pack', 4, 250000),
  ('raw-2', 'outlet-1', 'Fresh Whole Milk (Pasteurized)', 'Dairy & Milk', 16, 'dus', 4, 288000),
  ('raw-3', 'outlet-1', 'Liquid Palm Sugar (Gula Aren Asli)', 'Syrup & Powder', 8, 'btl', 2, 45000),
  ('raw-4', 'outlet-1', 'Paper Hot Cups 12oz', 'Packaging', 480, 'cup', 150, 850),
  ('raw-5', 'outlet-1', 'Plastic Cold Cups 16oz', 'Packaging', 80, 'cup', 120, 950),
  ('raw-6', 'outlet-1', 'Cold Cup Sip Lids', 'Packaging', 250, 'pcs', 100, 400),
  ('raw-7', 'outlet-1', 'Salted Caramel Sauce', 'Syrup & Powder', 0, 'btl', 2, 140000),
  ('raw-8', 'outlet-1', 'Uji Matcha Powder', 'Syrup & Powder', 0, 'pack', 2, 275000),
  ('raw-9', 'outlet-1', 'Dark Chocolate Sauce', 'Syrup & Powder', 6, 'btl', 2, 130000),
  ('raw-10', 'outlet-1', 'Beras Basmati / Jasmine Pilihan', 'Bakery Raw', 25, 'kg', 8, 18000),
  ('raw-11', 'outlet-1', 'Kentang Shoestring Beku (Fries)', 'Bakery Raw', 0, 'pack', 3, 65000),
  ('raw-12', 'outlet-1', 'Roti Toast Brioche', 'Bakery Raw', 12, 'pcs', 15, 8000),
  ('raw-13', 'outlet-1', 'Croissant Butter Dough', 'Bakery Raw', 30, 'pcs', 15, 12000),
  ('raw-14', 'outlet-1', 'Vanilla Flavoring Concentrate', 'Syrup & Powder', 150, 'pump', 40, 1500),
  ('raw-15', 'outlet-1', 'Earl Grey & Artisan Tea', 'Syrup & Powder', 0, 'pack', 3, 75000),
  ('raw-16', 'outlet-1', 'Jasmine Green Tea Leaves', 'Syrup & Powder', 10, 'pack', 3, 68000),
  ('raw-btn-17', 'outlet-1', 'Taro Powder Grade A (Premium)', 'Syrup & Powder', 0, 'pack', 3, 115000),
  ('raw-btn-18', 'outlet-1', 'Red Velvet Gourmet Powder', 'Syrup & Powder', 0, 'pack', 2, 120000),
  ('raw-btn-19', 'outlet-1', 'Almond Milk Barista Edition', 'Dairy & Milk', 0, 'dus', 3, 340000),
  ('raw-btn-20', 'outlet-1', 'Hazelnut Gourmet Syrup', 'Syrup & Powder', 0, 'btl', 2, 135000)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  current_stock = excluded.current_stock,
  unit = excluded.unit,
  min_threshold = excluded.min_threshold,
  cost_per_unit = excluded.cost_per_unit;

-- Taman Pancing (outlet-2)
insert into public.ingredients (id, outlet_id, name, category, current_stock, unit, min_threshold, cost_per_unit) values
  ('raw-tpc-1', 'outlet-2', 'House Blend Coffee Beans (Arabica/Robusta)', 'Coffee Beans', 12, 'pack', 3, 250000),
  ('raw-tpc-2', 'outlet-2', 'Fresh Whole Milk (Pasteurized)', 'Dairy & Milk', 14, 'dus', 3, 288000),
  ('raw-tpc-3', 'outlet-2', 'Liquid Palm Sugar (Gula Aren Asli)', 'Syrup & Powder', 8, 'btl', 2, 45000),
  ('raw-tpc-4', 'outlet-2', 'Paper Hot Cups 12oz', 'Packaging', 350, 'cup', 100, 850),
  ('raw-tpc-5', 'outlet-2', 'Plastic Cold Cups 16oz', 'Packaging', 220, 'cup', 100, 950),
  ('raw-tpc-6', 'outlet-2', 'Cold Cup Sip Lids', 'Packaging', 250, 'pcs', 80, 400),
  ('raw-tpc-7', 'outlet-2', 'Salted Caramel Sauce', 'Syrup & Powder', 4, 'btl', 2, 140000),
  ('raw-tpc-8', 'outlet-2', 'Uji Matcha Powder', 'Syrup & Powder', 0, 'pack', 2, 275000),
  ('raw-tpc-9', 'outlet-2', 'Dark Chocolate Sauce', 'Syrup & Powder', 5, 'btl', 2, 130000),
  ('raw-tpc-10', 'outlet-2', 'Beras Basmati / Jasmine Pilihan', 'Bakery Raw', 20, 'kg', 5, 18000),
  ('raw-tpc-11', 'outlet-2', 'Kentang Shoestring Beku (Fries)', 'Bakery Raw', 6, 'pack', 2, 65000),
  ('raw-tpc-12', 'outlet-2', 'Roti Toast Brioche', 'Bakery Raw', 15, 'pcs', 10, 8000),
  ('raw-tpc-13', 'outlet-2', 'Croissant Butter Dough', 'Bakery Raw', 0, 'pcs', 10, 12000),
  ('raw-tpc-14', 'outlet-2', 'Vanilla Flavoring Concentrate', 'Syrup & Powder', 120, 'pump', 30, 1500),
  ('raw-tpc-15', 'outlet-2', 'Earl Grey & Artisan Tea', 'Syrup & Powder', 10, 'pack', 3, 75000),
  ('raw-tpc-16', 'outlet-2', 'Jasmine Green Tea Leaves', 'Syrup & Powder', 8, 'pack', 2, 68000)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  current_stock = excluded.current_stock,
  unit = excluded.unit,
  min_threshold = excluded.min_threshold,
  cost_per_unit = excluded.cost_per_unit;

-- Dewi Sri (outlet-3)
insert into public.ingredients (id, outlet_id, name, category, current_stock, unit, min_threshold, cost_per_unit) values
  ('raw-dws-1', 'outlet-3', 'House Blend Coffee Beans (Arabica/Robusta)', 'Coffee Beans', 18, 'pack', 4, 250000),
  ('raw-dws-2', 'outlet-3', 'Fresh Whole Milk (Pasteurized)', 'Dairy & Milk', 20, 'dus', 5, 288000),
  ('raw-dws-3', 'outlet-3', 'Liquid Palm Sugar (Gula Aren Asli)', 'Syrup & Powder', 10, 'btl', 3, 45000),
  ('raw-dws-4', 'outlet-3', 'Paper Hot Cups 12oz', 'Packaging', 550, 'cup', 150, 850),
  ('raw-dws-5', 'outlet-3', 'Plastic Cold Cups 16oz', 'Packaging', 310, 'cup', 120, 950),
  ('raw-dws-6', 'outlet-3', 'Cold Cup Sip Lids', 'Packaging', 300, 'pcs', 100, 400),
  ('raw-dws-7', 'outlet-3', 'Salted Caramel Sauce', 'Syrup & Powder', 6, 'btl', 2, 140000),
  ('raw-dws-8', 'outlet-3', 'Uji Matcha Powder', 'Syrup & Powder', 6, 'pack', 2, 275000),
  ('raw-dws-9', 'outlet-3', 'Dark Chocolate Sauce', 'Syrup & Powder', 0, 'btl', 2, 130000),
  ('raw-dws-10', 'outlet-3', 'Beras Basmati / Jasmine Pilihan', 'Bakery Raw', 25, 'kg', 5, 18000),
  ('raw-dws-11', 'outlet-3', 'Kentang Shoestring Beku (Fries)', 'Bakery Raw', 0, 'pack', 3, 65000),
  ('raw-dws-12', 'outlet-3', 'Roti Toast Brioche', 'Bakery Raw', 20, 'pcs', 10, 8000),
  ('raw-dws-13', 'outlet-3', 'Croissant Butter Dough', 'Bakery Raw', 30, 'pcs', 10, 12000),
  ('raw-dws-14', 'outlet-3', 'Vanilla Flavoring Concentrate', 'Syrup & Powder', 160, 'pump', 40, 1500),
  ('raw-dws-15', 'outlet-3', 'Earl Grey & Artisan Tea', 'Syrup & Powder', 8, 'pack', 2, 75000),
  ('raw-dws-16', 'outlet-3', 'Jasmine Green Tea Leaves', 'Syrup & Powder', 6, 'pack', 2, 68000)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  current_stock = excluded.current_stock,
  unit = excluded.unit,
  min_threshold = excluded.min_threshold,
  cost_per_unit = excluded.cost_per_unit;

-- --------------------------------------------------------------------
-- 17. SEED DATA ENTRY: EXPENSES (Pengeluaran Operasional)
-- --------------------------------------------------------------------
insert into public.expenses (id, outlet_id, outlet_name, category, title, amount, date, payment_method, recorded_by, notes) values
  ('exp-1', 'outlet-1', 'Batanta', 'utilities', 'Listrik & Token Bar Espresso (PLN Batanta)', 1250000, current_date, 'Bank Transfer', 'Alex (Manajer)', 'Tagihan siklus operasional'),
  ('exp-2', 'outlet-1', 'Batanta', 'raw_materials', 'Restock Fresh Milk Greenfields (10 Dus)', 2880000, current_date, 'Cash On Delivery', 'Alex (Manajer)', 'Pengiriman 10 dus fresh milk pasteurisasi'),
  ('exp-6', 'outlet-2', 'Taman Pancing', 'utilities', 'Token Listrik Mesin Kopi & Chiller (PLN Taman Pancing)', 850000, current_date, 'QRIS', 'Alex (Manajer)', 'Isi ulang token 2x 450rb'),
  ('exp-10', 'outlet-3', 'Dewi Sri', 'utilities', 'Tagihan Listrik PLN & PDAM Air Bersih (Dewi Sri)', 1100000, current_date, 'Bank Transfer', 'Alex (Manajer)', 'Operasional outlet Kuta')
on conflict (id) do update set
  title = excluded.title,
  amount = excluded.amount,
  category = excluded.category,
  date = excluded.date,
  payment_method = excluded.payment_method,
  notes = excluded.notes;

-- --------------------------------------------------------------------
-- 18. SEED DATA ENTRY: INITIAL ORDERS & ORDER ITEMS (Penjualan Hari Ini)
-- PENTING: Tabel orders (parent) HARUS terisi dahulu sebelum order_items (child)
-- --------------------------------------------------------------------
-- Bersihkan seed lama jika ada agar tidak terjadi konflik unique order_number atau id
delete from public.order_items where order_id in ('ord-seed-1', 'ord-seed-2', 'ord-seed-3', 'ord-seed-4');
delete from public.orders where id in ('ord-seed-1', 'ord-seed-2', 'ord-seed-3', 'ord-seed-4') or order_number in ('#ORD-TODAY-001', '#ORD-TODAY-002', '#ORD-TODAY-003', '#ORD-TODAY-004');

insert into public.orders (
  id, order_number, outlet_id, outlet_name, cashier_id, cashier_name,
  subtotal, tax, total, payment_method, amount_tendered, change, payment_status, order_notes, created_at
) values
  ('ord-seed-1', '#ORD-TODAY-001', 'outlet-1', 'Batanta', 'usr-cashier', 'Rina (Kasir)', 82000, 8200, 90200, 'qris', null, 0, 'paid', 'Dine-In Meja 4', now()),
  ('ord-seed-2', '#ORD-TODAY-002', 'outlet-1', 'Batanta', 'usr-cashier', 'Rina (Kasir)', 63000, 6300, 69300, 'cash', 100000, 30700, 'paid', 'Takeaway', now()),
  ('ord-seed-3', '#ORD-TODAY-003', 'outlet-2', 'Taman Pancing', 'usr-cashier', 'Budi (Kasir)', 56000, 5600, 61600, 'qris', null, 0, 'paid', 'Dine-In Meja 2', now()),
  ('ord-seed-4', '#ORD-TODAY-004', 'outlet-3', 'Dewi Sri', 'usr-cashier', 'Siti (Kasir)', 104000, 10400, 114400, 'debit', null, 0, 'paid', 'Dine-In Meja 8', now())
on conflict (id) do update set
  order_number = excluded.order_number,
  outlet_id = excluded.outlet_id,
  outlet_name = excluded.outlet_name,
  subtotal = excluded.subtotal,
  tax = excluded.tax,
  total = excluded.total,
  payment_method = excluded.payment_method,
  amount_tendered = excluded.amount_tendered,
  change = excluded.change,
  payment_status = excluded.payment_status,
  order_notes = excluded.order_notes;

insert into public.order_items (id, order_id, product_id, product_name, quantity, unit_price, subtotal, sugar_level, notes, created_at) values
  ('item-seed-1', 'ord-seed-1', 'prod-3', 'Kopi Susu Gula Aren', 2, 28000, 56000, 'Less Sugar (50%)', null, now()),
  ('item-seed-2', 'ord-seed-1', 'prod-11', 'Butter Croissant', 1, 26000, 26000, null, 'Dihangatkan', now()),
  ('item-seed-3', 'ord-seed-2', 'prod-8', 'Nasi Goreng Spesial Barista', 1, 38000, 38000, null, 'Sedang', now()),
  ('item-seed-4', 'ord-seed-2', 'prod-2', 'Iced Americano', 1, 25000, 25000, 'No Sugar (0%)', null, now()),
  ('item-seed-5', 'ord-seed-3', 'prod-3', 'Kopi Susu Gula Aren', 2, 28000, 56000, 'Normal (100%)', null, now()),
  ('item-seed-6', 'ord-seed-4', 'prod-4', 'Caramel Macchiato', 2, 34000, 68000, 'Normal (100%)', null, now()),
  ('item-seed-7', 'ord-seed-4', 'prod-10', 'Crispy French Fries Shoestring', 1, 24000, 24000, null, 'Extra Saus', now()),
  ('item-seed-8', 'ord-seed-4', 'prod-11', 'Butter Croissant', 1, 26000, 26000, null, null, now())
on conflict (id) do update set
  order_id = excluded.order_id,
  product_id = excluded.product_id,
  product_name = excluded.product_name,
  quantity = excluded.quantity,
  unit_price = excluded.unit_price,
  subtotal = excluded.subtotal,
  sugar_level = excluded.sugar_level,
  notes = excluded.notes;
`;
