'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store/AppContext';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';
import { InventoryItem } from '@/types';
import {
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiAlertTriangle,
  FiArrowUpRight,
  FiShoppingCart,
  FiStore,
  FiCheckCircle,
} from '@/components/ui/Flaticon';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const ManagerDashboard: React.FC = () => {
  const {
    orders,
    expenses,
    lowStockItems,
    selectedOutletId,
    currentOutlet,
    setActiveTab,
    restockItem,
    t,
  } = useApp();

  const [restockModalItem, setRestockModalItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(500);

  // Filter orders by outlet if not 'all'
  const filteredOrders = orders.filter((o) =>
    selectedOutletId === 'all' ? true : o.outletId === selectedOutletId
  );

  const filteredExpenses = expenses.filter((e) =>
    selectedOutletId === 'all' ? true : e.outletId === selectedOutletId
  );

  // Today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Calculations
  const todayOrders = filteredOrders.filter((o) => o.createdAt.startsWith(todayStr));
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  // Chart Data: simulated last 7 days + today
  const chartData = [
    { name: 'Mon', revenue: 640000, expense: 420000 },
    { name: 'Tue', revenue: 780000, expense: 310000 },
    { name: 'Wed', revenue: 890000, expense: 520000 },
    { name: 'Thu', revenue: 1050000, expense: 780000 },
    { name: 'Fri', revenue: 1420000, expense: 620000 },
    { name: 'Sat', revenue: 1890000, expense: 910000 },
    { name: 'Today', revenue: todayRevenue > 0 ? todayRevenue : 950000, expense: 350000 },
  ];

  const handleQuickRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockModalItem) return;
    restockItem(restockModalItem.id, restockModalItem.outletId, Number(restockQty));
    setRestockModalItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Outlet Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#eef4f0] via-[#f7faf8] to-[#edf4f8] p-5 border border-[#e5ece7] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#618873] text-white shadow-xs">
            <FiStore className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800">
                {selectedOutletId === 'all'
                  ? t.allOutlets
                  : currentOutlet?.name}
              </h3>
              <span className="rounded-md bg-[#618873]/10 px-2 py-0.5 text-[11px] font-semibold text-[#507160]">
                {selectedOutletId === 'all' ? 'Multi-Branch' : currentOutlet?.code}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.dashboardSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-2 rounded-xl bg-[#618873] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#507160] transition-all"
          >
            <FiShoppingCart className="h-4 w-4" />
            {t.launchPosBtn}
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Revenue */}
        <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.todayRevenue}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef4f0] text-[#618873]">
              <FiDollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight text-slate-800">
              {formatCurrency(todayRevenue)}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-medium">
              <FiArrowUpRight className="h-3.5 w-3.5" />
              <span>{todayOrders.length} {t.todayOrdersCount}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Expenses */}
        <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.operatingExpenses}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <FiTrendingDown className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight text-slate-800">
              {formatCurrency(totalExpenses)}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium">
              <span>{filteredExpenses.length} {t.expenseEntriesCount}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Net Profit */}
        <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.netProfit}
            </span>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                netProfit >= 0 ? 'bg-[#e3ecf2] text-[#54748c]' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <FiTrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <p
              className={`text-2xl font-bold tracking-tight ${
                netProfit >= 0 ? 'text-slate-800' : 'text-rose-600'
              }`}
            >
              {formatCurrency(netProfit)}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-medium text-slate-500">
              <span className={netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {profitMargin}% {t.profitMargin}
              </span>
              <span>{t.revenueMinusExpenses}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Low Stock Alert Widget */}
        <div
          onClick={() => setActiveTab('inventory')}
          className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-2xs hover:shadow-xs ${
            lowStockItems.length > 0
              ? 'border-rose-200 bg-rose-50/40 hover:bg-rose-50/70'
              : 'border-[#e5ece7] bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.stockHealth}
            </span>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                lowStockItems.length > 0
                  ? 'bg-rose-100 text-rose-600 animate-pulse'
                  : 'bg-[#eef4f0] text-[#618873]'
              }`}
            >
              <FiAlertTriangle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <p
              className={`text-2xl font-bold tracking-tight ${
                lowStockItems.length > 0 ? 'text-rose-600' : 'text-[#507160]'
              }`}
            >
              {lowStockItems.length} {t.itemsLow}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-medium text-slate-500">
              {lowStockItems.length > 0 ? (
                <span className="text-rose-600">{t.requiresRestock}</span>
              ) : (
                <span className="text-emerald-600">{t.optimalStock}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Low Stock Alert List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Revenue vs Expenses Trend */}
        <div className="lg:col-span-2 rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h4 className="text-base font-bold text-slate-800">{t.cashflowTrendTitle}</h4>
              <p className="text-xs text-slate-500">{t.cashflowTrendSubtitle}</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#618873]" />
                <span className="text-slate-600">{t.revenueLegend}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#698da7]" />
                <span className="text-slate-600">{t.expenseLegend}</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#618873" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#618873" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#698da7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#698da7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f0" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `Rp ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: unknown) => [
                    formatCurrency(typeof val === 'number' ? val : Number(val || 0)),
                    '',
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    borderColor: '#e5ece7',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#618873"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke="#698da7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorExp)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Urgent Low Stock Alert Widget */}
        <div className="rounded-2xl border border-rose-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                  <FiAlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Critical Stock Alerts</h4>
                  <p className="text-[11px] text-slate-400">Depleted raw materials</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('inventory')}
                className="text-xs font-semibold text-[#618873] hover:underline"
              >
                View All
              </button>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <FiCheckCircle className="h-10 w-10 text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-slate-700">Stock Levels Healthy</p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  All coffee beans, milk, and packaging are above safety thresholds.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {lowStockItems.map((item) => {
                  const stockPercent = Math.min(
                    100,
                    Math.round((item.currentStock / item.minThreshold) * 100)
                  );
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-rose-100 bg-rose-50/40 p-3 hover:bg-rose-50/70 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{item.name}</p>
                          <p className="text-[11px] text-slate-500">{item.category}</p>
                        </div>
                        <button
                          onClick={() => {
                            setRestockModalItem(item);
                            setRestockQty(
                              item.unit === 'g' ? 1000 : item.unit === 'ml' ? 2000 : 100
                            );
                          }}
                          className="rounded-lg bg-white border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-600 hover:text-white transition-all shadow-2xs"
                        >
                          + Restock
                        </button>
                      </div>

                      {/* Stock Level Bar */}
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-1">
                          <span className="text-rose-600 font-bold">
                            Current: {item.currentStock.toLocaleString()} {item.unit}
                          </span>
                          <span className="text-slate-400">
                            Min: {item.minThreshold.toLocaleString()} {item.unit}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-rose-200/60 overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{ width: `${Math.max(5, stockPercent)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => setActiveTab('inventory')}
              className="w-full rounded-xl bg-[#f4f7f5] py-2 text-xs font-semibold text-[#507160] hover:bg-[#e5ece7] transition-all"
            >
              Open Weekly Stock Opname
            </button>
          </div>
        </div>
      </div>

      {/* Recent Orders Ledger Preview */}
      <div className="rounded-2xl border border-[#e5ece7] bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-bold text-slate-800">Recent POS Orders</h4>
            <p className="text-xs text-slate-500">Live transaction stream with cashier attribution</p>
          </div>
          <button
            onClick={() => setActiveTab('reports')}
            className="text-xs font-semibold text-[#618873] hover:underline"
          >
            View All Reports →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e5ece7] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Order #</th>
                <th className="py-3 px-3">Outlet</th>
                <th className="py-3 px-3">Cashier</th>
                <th className="py-3 px-3">Items</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3 text-right">Total</th>
                <th className="py-3 px-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f4f2]">
              {filteredOrders.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-[#fafbf9] transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-800">{order.orderNumber}</td>
                  <td className="py-3 px-3 text-slate-600">{order.outletName}</td>
                  <td className="py-3 px-3 text-slate-600">{order.cashierName}</td>
                  <td className="py-3 px-3 text-slate-700">
                    {order.items.map((i) => `${i.productName} (${i.quantity}x)`).join(', ')}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-block rounded-md bg-[#eef4f0] px-2 py-0.5 font-semibold uppercase text-[10px] text-[#507160]">
                      {order.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-800">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400">
                    {formatDateTime(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Restock Dialog */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#e5ece7]">
            <h3 className="text-base font-bold text-slate-800">Restock Material</h3>
            <p className="text-xs text-slate-500 mt-1">
              Add inventory to {restockModalItem.name} at {currentOutlet?.name}
            </p>

            <form onSubmit={handleQuickRestockSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Additional Quantity ({restockModalItem.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-[#e5ece7] px-3 py-2 text-sm focus:border-[#618873] focus:outline-hidden focus:ring-2 focus:ring-[#618873]/15"
                />
              </div>

              <div className="rounded-xl bg-[#fafbf9] p-3 text-xs text-slate-600 border border-[#e5ece7]">
                <div className="flex justify-between py-0.5">
                  <span>Current Stock:</span>
                  <span className="font-semibold text-rose-600">
                    {restockModalItem.currentStock} {restockModalItem.unit}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>New Stock after Restock:</span>
                  <span className="font-semibold text-emerald-600">
                    {restockModalItem.currentStock + Number(restockQty)} {restockModalItem.unit}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModalItem(null)}
                  className="rounded-xl border border-[#e5ece7] px-4 py-2 text-xs font-medium text-slate-600 hover:bg-[#f4f7f5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#618873] px-4 py-2 text-xs font-semibold text-white hover:bg-[#507160] shadow-2xs"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
