'use client';

import React, { useState, useMemo } from 'react';
import { InventoryItem, Outlet } from '@/types';
import { formatDate, formatDateTime } from '@/lib/utils/formatters';
import { FiPrinter, FiX, FiStore, FiPackage } from '@/components/ui/Flaticon';

interface StockPDFReportProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  outlets: Outlet[];
  defaultOutletId?: string;
  userName: string;
  userRole: string;
}

export const StockPDFReport: React.FC<StockPDFReportProps> = ({
  isOpen,
  onClose,
  inventory,
  outlets,
  defaultOutletId = 'outlet-1',
  userName,
  userRole,
}) => {
  const [selectedOutletId, setSelectedOutletId] = useState<string>(
    defaultOutletId === 'all' ? (outlets[0]?.id || 'outlet-1') : defaultOutletId
  );

  const activeOutlet = useMemo(() => {
    return outlets.find((o) => o.id === selectedOutletId) || outlets[0];
  }, [outlets, selectedOutletId]);

  // Filter stock strictly for this outlet
  const outletStock = useMemo(() => {
    if (!activeOutlet) return [];
    return inventory.filter((item) => item.outletId === activeOutlet.id);
  }, [inventory, activeOutlet]);

  const summary = useMemo(() => {
    const totalItems = outletStock.length;
    const lowStock = outletStock.filter((i) => i.currentStock <= i.minThreshold).length;
    const safeStock = totalItems - lowStock;
    return { totalItems, lowStock, safeStock };
  }, [outletStock]);

  const handlePrint = () => {
    const printContent = document.getElementById('printable-stock-report');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (!printWindow) {
      alert('Mohon izinkan popup window untuk mencetak / download PDF laporan stok.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan_Stok_${activeOutlet ? activeOutlet.name.replace(/\\s+/g, '_') : 'Outlet'}_${new Date().toISOString().slice(0, 10)}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 14mm 12mm 14mm 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.4;
          }
          .report-container {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .brand-title {
            font-size: 18px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #0f172a;
            margin: 0 0 2px 0;
            text-transform: uppercase;
          }
          .brand-sub {
            font-size: 10px;
            color: #475569;
            margin: 0;
            font-weight: 500;
          }
          .report-title-badge {
            text-align: right;
          }
          .report-title {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 3px 0;
          }
          .outlet-name-badge {
            display: inline-block;
            background: #eef4f0;
            color: #274836;
            font-weight: 700;
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid #cce0d4;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 14px;
          }
          .meta-item {
            display: flex;
            flex-direction: column;
          }
          .meta-label {
            font-size: 8.5px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            color: #64748b;
            font-weight: 700;
          }
          .meta-val {
            font-size: 11px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 1px;
          }
          .kpi-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 14px;
          }
          .kpi-card {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
            background: #ffffff;
          }
          .kpi-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
          }
          .kpi-val {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
          }
          .kpi-val.warning {
            color: #b91c1c;
          }
          .kpi-val.safe {
            color: #15803d;
          }
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-top: 6px;
          }
          table.data-table th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 700;
            text-align: left;
            padding: 6px 8px;
            border-top: 1px solid #cbd5e1;
            border-bottom: 1.5px solid #94a3b8;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.4px;
          }
          table.data-table td {
            padding: 6px 8px;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
          }
          table.data-table tr:nth-child(even) td {
            background: #fafbfd;
          }
          .status-badge {
            display: inline-block;
            font-size: 8.5px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
          }
          .status-safe {
            background: #dcfce7;
            color: #166534;
          }
          .status-low {
            background: #fee2e2;
            color: #991b1b;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .sign-box {
            display: flex;
            justify-content: space-between;
            margin-top: 28px;
            padding-top: 10px;
            page-break-inside: avoid;
          }
          .sign-col {
            width: 40%;
            text-align: center;
          }
          .sign-role {
            font-size: 9.5px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
          }
          .sign-space {
            height: 48px;
          }
          .sign-name {
            font-size: 10.5px;
            font-weight: 700;
            color: #0f172a;
            border-top: 1px solid #94a3b8;
            padding-top: 4px;
            display: inline-block;
            min-width: 140px;
          }
          .footer-note {
            margin-top: 20px;
            font-size: 8.5px;
            color: #94a3b8;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          ${printContent.innerHTML}
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#618873] text-white">
              <FiPackage className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Unduh Laporan Stok (PDF)</h3>
              <p className="text-[11px] text-slate-400">
                Laporan inventaris bahan baku resmi per outlet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-[#618873] hover:bg-[#507160] px-4 py-1.5 text-xs font-bold text-white shadow-2xs transition-all"
            >
              <FiPrinter className="h-3.5 w-3.5" />
              <span>Cetak / Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Controls / Filter Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <FiStore className="h-3.5 w-3.5 text-[#618873]" />
              <span>Cabang Outlet:</span>
            </label>
            {userRole === 'cashier' ? (
              <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800">
                {activeOutlet?.name} ({activeOutlet?.code}) <span className="text-[10px] text-emerald-700 font-semibold">(Terkunci)</span>
              </span>
            ) : (
              <select
                value={selectedOutletId}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-[#618873] focus:outline-hidden"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.code})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Setiap outlet memiliki stok mandiri. Menampilkan {outletStock.length} jenis bahan baku.
          </div>
        </div>

        {/* Printable Content Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60">
          <div
            id="printable-stock-report"
            className="bg-white rounded-xl shadow-xs border border-slate-200 p-8 max-w-3xl mx-auto"
          >
            {/* Header Document */}
            <div className="header-box flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
              <div>
                <h1 className="brand-title text-lg font-black text-slate-900 uppercase tracking-tight">
                  BRANDES COFFEE & ROASTERY
                </h1>
                <p className="brand-sub text-[10px] text-slate-500 font-medium">
                  Multi-Outlet Inventory Management & BOM Control System
                </p>
                <p className="text-[9.5px] text-slate-400 mt-0.5">
                  {activeOutlet?.address || 'Denpasar, Bali'} • Telp: {activeOutlet?.phone || '-'}
                </p>
              </div>

              <div className="report-title-badge text-right">
                <h2 className="report-title text-xs font-extrabold uppercase text-slate-900">
                  LAPORAN STOK BAHAN BAKU
                </h2>
                <span className="outlet-name-badge text-[10px] font-bold bg-[#eef4f0] text-[#274836] border border-[#cce0d4] px-2 py-0.5 rounded">
                  OUTLET: {activeOutlet?.name?.toUpperCase()} ({activeOutlet?.code})
                </span>
              </div>
            </div>

            {/* Metadata Summary */}
            <div className="meta-grid grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-4 text-xs">
              <div className="meta-item">
                <span className="meta-label text-[8.5px] text-slate-500 font-bold uppercase">Tanggal Cetak</span>
                <span className="meta-val font-bold text-slate-900">{formatDate(new Date().toISOString())}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label text-[8.5px] text-slate-500 font-bold uppercase">Waktu</span>
                <span className="meta-val font-bold text-slate-900">
                  {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label text-[8.5px] text-slate-500 font-bold uppercase">Dicetak Oleh</span>
                <span className="meta-val font-bold text-slate-900">{userName}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label text-[8.5px] text-slate-500 font-bold uppercase">Role Akses</span>
                <span className="meta-val font-bold text-[#618873] uppercase">{userRole}</span>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-row grid grid-cols-3 gap-3 mb-4">
              <div className="kpi-card border border-slate-200 rounded-lg p-2.5 bg-white">
                <span className="kpi-label text-[9px] font-bold text-slate-500 uppercase">Total Bahan Baku</span>
                <p className="kpi-val text-lg font-black text-slate-900">{summary.totalItems} Jenis</p>
              </div>
              <div className="kpi-card border border-slate-200 rounded-lg p-2.5 bg-white">
                <span className="kpi-label text-[9px] font-bold text-slate-500 uppercase">Stok Aman</span>
                <p className="kpi-val safe text-lg font-black text-emerald-700">{summary.safeStock} Bahan</p>
              </div>
              <div className="kpi-card border border-slate-200 rounded-lg p-2.5 bg-white">
                <span className="kpi-label text-[9px] font-bold text-slate-500 uppercase">Stok Rendah / Kritis</span>
                <p className="kpi-val warning text-lg font-black text-rose-700">{summary.lowStock} Bahan</p>
              </div>
            </div>

            {/* Inventory Stock Table */}
            <table className="data-table w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold text-[9px] uppercase border-y border-slate-300">
                  <th className="p-2 w-10 text-center">No</th>
                  <th className="p-2">Nama Bahan Baku</th>
                  <th className="p-2">Kategori</th>
                  <th className="p-2 text-right">Stok Fisik</th>
                  <th className="p-2 text-center">Satuan</th>
                  <th className="p-2 text-right">Batas Min.</th>
                  <th className="p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {outletStock.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-slate-400">
                      Tidak ada data bahan baku untuk outlet ini.
                    </td>
                  </tr>
                ) : (
                  outletStock.map((item, idx) => {
                    const isLow = item.currentStock <= item.minThreshold;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="p-2 text-center text-slate-500 font-mono text-[10px]">{idx + 1}</td>
                        <td className="p-2 font-bold text-slate-800">{item.name}</td>
                        <td className="p-2 text-slate-500 text-[10px]">{item.category}</td>
                        <td className="p-2 text-right font-black text-slate-900">{item.currentStock}</td>
                        <td className="p-2 text-center text-slate-600 font-medium text-[10px]">{item.unit}</td>
                        <td className="p-2 text-right text-slate-500 font-medium text-[10px]">
                          {item.minThreshold} {item.unit}
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`status-badge text-[9px] font-bold px-2 py-0.5 rounded ${
                              isLow
                                ? 'status-low bg-rose-100 text-rose-800'
                                : 'status-safe bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isLow ? 'Perlu Restock' : 'Aman'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Signature Block */}
            <div className="sign-box flex justify-between mt-8 pt-3 border-t border-slate-200">
              <div className="sign-col text-center w-40">
                <span className="sign-role text-[9.5px] font-bold uppercase text-slate-500 block">
                  Petugas Kasir / Barista
                </span>
                <div className="sign-space h-12"></div>
                <span className="sign-name text-xs font-bold text-slate-900 border-t border-slate-400 pt-1 block">
                  ( {userName} )
                </span>
              </div>

              <div className="sign-col text-center w-40">
                <span className="sign-role text-[9.5px] font-bold uppercase text-slate-500 block">
                  Manajer Operasional
                </span>
                <div className="sign-space h-12"></div>
                <span className="sign-name text-xs font-bold text-slate-900 border-t border-slate-400 pt-1 block">
                  ( ..................................... )
                </span>
              </div>
            </div>

            {/* Footer Note */}
            <div className="footer-note mt-6 text-[8.5px] text-slate-400 text-center border-t border-slate-200 pt-2">
              Dokumen resmi sistem Brandes Coffee. Data stok diperbarui secara real-time. Waktu: {formatDateTime(new Date().toISOString())}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
