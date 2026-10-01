'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store/AppContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ManagerDashboard } from '@/components/dashboard/ManagerDashboard';
import { PosInterface } from '@/components/pos/PosInterface';
import { ProductManagement } from '@/components/products/ProductManagement';
import { InventoryManagement } from '@/components/inventory/InventoryManagement';
import { ExpenseTracking } from '@/components/expenses/ExpenseTracking';
import { ReportsView } from '@/components/reports/ReportsView';
import { SupabaseView } from '@/components/settings/SupabaseView';

export default function Home() {
  const { activeTab } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ManagerDashboard />;
      case 'pos':
        return <PosInterface />;
      case 'products':
        return <ProductManagement />;
      case 'inventory':
        return <InventoryManagement />;
      case 'expenses':
        return <ExpenseTracking />;
      case 'reports':
        return <ReportsView />;
      case 'supabase':
        return <SupabaseView />;
      default:
        return <ManagerDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col lg:pl-72 min-h-screen transition-all duration-300">
        {/* Sticky Header */}
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
}
