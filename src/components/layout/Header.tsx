'use client';

import React from 'react';
import { useApp } from '@/lib/store/AppContext';
import {
  FiMenu,
  FiAlertTriangle,
  FiStore,
  FiCalendar,
} from '@/components/ui/Flaticon';
import { FlagIndonesia, FlagEnglish } from '@/components/ui/FlagIcons';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const {
    currentOutlet,
    selectedOutletId,
    activeTab,
    setActiveTab,
    lowStockItems,
    language,
    setLanguage,
    t,
  } = useApp();

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return t.navDashboard;
      case 'pos':
        return t.navPos;
      case 'products':
        return t.navProducts;
      case 'inventory':
        return t.navInventory;
      case 'expenses':
        return t.navExpenses;
      case 'reports':
        return t.navReports;
      default:
        return t.brandName;
    }
  };

  const todayStr = new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#e5ece7] bg-white/85 px-4 md:px-6 backdrop-blur-md">
      {/* Left: Mobile Toggle, Brand Logo & Page Title */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={onToggleSidebar}
          className="rounded-xl p-2 text-slate-600 hover:bg-[#f4f7f5] lg:hidden transition-all"
          aria-label="Toggle navigation"
        >
          <FiMenu className="h-5 w-5 text-slate-700" />
        </button>

        {/* Brand Logo in Header */}
        <div className="flex items-center gap-3">
          {/* <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-[#e5ece7] p-1.5 shadow-2xs">
            <img
              src="/logo_brandes.svg"
              alt="Brandes Logo"
              className="h-full w-full object-contain"
            />
          </div> */}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-slate-800">
                {getTitle()}
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#f4f7f5] border border-[#e5ece7] px-2.5 py-0.5 text-xs font-semibold text-[#507160]">
                <FiStore className="h-3.5 w-3.5 text-[#618873]" />
                {selectedOutletId === 'all' ? t.allOutlets : currentOutlet?.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              {language === 'id'
                ? 'Arus kas multi-cabang, resep BOM, dan kontrol finansial terpadu'
                : 'Multi-branch cashflow, inventory BOM, and financial control'}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Actions, Badges & Quick Links */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language Switcher (Indonesian & English Flags) */}
        <div className="flex items-center rounded-xl border border-[#e5ece7] bg-[#fafbf9] p-1 shadow-2xs">
          <button
            onClick={() => setLanguage('id')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              language === 'id'
                ? 'bg-[#618873] text-white shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
            title="Bahasa Indonesia"
            aria-label="Ganti ke Bahasa Indonesia"
          >
            <FlagIndonesia className="h-3.5 w-5" />
            <span className="font-semibold">ID</span>
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              language === 'en'
                ? 'bg-[#618873] text-white shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
            title="English"
            aria-label="Switch to English"
          >
            <FlagEnglish className="h-3.5 w-5" />
            <span className="font-semibold">EN</span>
          </button>
        </div>

        {/* Low Stock Warning Pill */}
        {lowStockItems.length > 0 && (
          <button
            onClick={() => setActiveTab('inventory')}
            className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-rose-50 border border-rose-200/80 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-all shadow-2xs"
            title="Items need restocking"
          >
            <FiAlertTriangle className="h-3.5 w-3.5 text-rose-600 animate-pulse" />
            <span className="hidden sm:inline">
              {lowStockItems.length} {t.lowStockAlertPill}
            </span>
            <span className="sm:hidden font-bold">
              {lowStockItems.length}
            </span>
          </button>
        )}

        {/* Date Display */}
        <div className="hidden lg:flex items-center gap-2 rounded-xl bg-[#fafbf9] border border-[#e5ece7] px-3 py-1.5 text-xs font-medium text-slate-600">
          <FiCalendar className="h-3.5 w-3.5 text-slate-400" />
          <span>{todayStr}</span>
        </div>

        {/* Quick Action */}
        {/* {activeTab !== 'pos' && (
          <button
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-1.5 rounded-xl bg-[#618873] px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#507160] transition-all"
          >
            <FiPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.openPosBtn}</span>
            <span className="sm:hidden">POS</span>
          </button>
        )} */}

        {/* Reset Demo Data */}
        {/* <button
          onClick={() => {
            if (confirm(t.resetConfirm)) {
              resetToDemoData();
            }
          }}
          className="rounded-xl border border-[#e5ece7] bg-white p-2 text-slate-400 hover:text-slate-600 hover:bg-[#f4f7f5] transition-all"
          title={t.resetDemo}
          aria-label={t.resetDemo}
        >
          <FiRotateCcw className="h-4 w-4" />
        </button> */}
      </div>
    </header>
  );
};
