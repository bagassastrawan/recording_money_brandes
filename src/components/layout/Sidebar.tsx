'use client';

import React from 'react';
import { useApp } from '@/lib/store/AppContext';
import Image from 'next/image';
import {
  FiDashboard,
  FiShoppingCart,
  FiCoffee,
  FiPackage,
  FiReceipt,
  FiChart,
  FiStore,
  FiShieldCheck,
  FiUserCheck,
  FiChevronDown,
  FiAlertTriangle,
  FiX,
} from '@/components/ui/Flaticon';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const {
    user,
    switchRole,
    activeTab,
    setActiveTab,
    outlets,
    selectedOutletId,
    setSelectedOutletId,
    currentOutlet,
    lowStockItems,
    t,
  } = useApp();

  const isManager = user.role === 'manager';

  const navItems = isManager
    ? [
        { id: 'dashboard', label: t.navDashboard, icon: FiDashboard },
        { id: 'pos', label: t.navPos, icon: FiShoppingCart },
        { id: 'products', label: t.navProducts, icon: FiCoffee },
        { id: 'inventory', label: t.navInventory, icon: FiPackage, badge: lowStockItems.length },
        { id: 'expenses', label: t.navExpenses, icon: FiReceipt },
        { id: 'reports', label: t.navReports, icon: FiChart },
      ]
    : [
        { id: 'pos', label: t.navPos, icon: FiShoppingCart },
        { id: 'inventory', label: t.navInventory, icon: FiPackage, badge: lowStockItems.length },
        { id: 'reports', label: t.navReports, icon: FiChart },
      ];

  return (
    <>
      {/* Mobile & Tablet Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-[#e5ece7] bg-[#ffffff] transition-transform duration-300 lg:translate-x-0 shadow-lg lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header with Logo & Mobile Close */}
        <div className="flex h-20 items-center justify-between border-b border-[#e5ece7] px-5 bg-gradient-to-r from-[#f4f7f5] to-[#ffffff]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-[#e5ece7] p-1.5 shadow-2xs">
              <Image
                src="/logo_brandes.svg"
                alt="Brandes Logo"
                width={40}
                height={40}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-slate-800">
                {t.brandName}
              </h1>
              <p className="text-xs font-medium text-slate-500">{t.brandSubtitle}</p>
            </div>
          </div>

          {/* Close button on Mobile & Tablet */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
            title="Tutup Menu"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Outlet Switcher */}
        <div className="p-4 border-b border-[#f1f4f2] bg-[#fafbf9]">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
            <FiStore className="w-3.5 h-3.5 text-[#618873]" />
            {t.activeOutlet}
          </label>
          {isManager ? (
            <div className="relative">
              <select
                value={selectedOutletId}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-[#e5ece7] bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 shadow-2xs hover:border-[#618873] focus:border-[#618873] focus:outline-hidden focus:ring-2 focus:ring-[#618873]/15 transition-all"
              >
                <option value="all">{t.allOutlets}</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name} ({outlet.code})
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-[#e5ece7] bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs">
              <span className="truncate">{currentOutlet?.name || 'Cabang Terpilih'}</span>
              <span className="rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-700 px-1.5 py-0.5 border border-emerald-200 shrink-0">
                Terkunci (Kasir)
              </span>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {t.navDashboard ? 'Menu' : 'Navigasi'}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#618873] text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:bg-[#f4f7f5] hover:text-[#507160]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4.5 w-4.5 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#618873]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isActive
                        ? 'bg-rose-500 text-white'
                        : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}
                  >
                    <FiAlertTriangle className="h-3 w-3" />
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Role Switcher Widget */}
        <div className="border-t border-[#e5ece7] p-4 bg-[#fafbf9] space-y-3">
          {/* Role badge & Switcher */}
          <div className="rounded-xl border border-[#e5ece7] bg-white p-3 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isManager ? (
                  <FiShieldCheck className="h-4 w-4 text-[#618873]" />
                ) : (
                  <FiUserCheck className="h-4 w-4 text-[#698da7]" />
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-800">{user.name}</p>
                  <p className="text-[11px] text-slate-400 capitalize">
                    {user.role === 'manager' ? t.managerAccess : t.cashierAccess}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                onClick={() => switchRole('manager')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all ${
                  isManager
                    ? 'bg-[#618873] text-white shadow-2xs font-semibold'
                    : 'bg-[#f4f7f5] text-slate-600 hover:bg-[#e5ece7]'
                }`}
              >
                <FiShieldCheck className="h-3.5 w-3.5" />
                <span>{t.roleManager}</span>
              </button>
              <button
                onClick={() => switchRole('cashier')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all ${
                  !isManager
                    ? 'bg-[#698da7] text-white shadow-2xs font-semibold'
                    : 'bg-[#f2f6f9] text-slate-600 hover:bg-[#e3ecf2]'
                }`}
              >
                <FiUserCheck className="h-3.5 w-3.5" />
                <span>{t.roleCashier}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
