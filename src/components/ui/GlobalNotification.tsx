'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  X,
  Trash2,
  HelpCircle,
} from 'lucide-react';

export interface AlertMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message: string;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
  onCancel?: () => void;
}

interface GlobalNotificationProps {
  alerts: AlertMessage[];
  onDismissAlert: (id: string) => void;
  confirmDialog: ConfirmDialogOptions | null;
  onCloseConfirm: () => void;
}

export const GlobalNotification: React.FC<GlobalNotificationProps> = ({
  alerts,
  onDismissAlert,
  confirmDialog,
  onCloseConfirm,
}) => {
  return (
    <>
      {/* ========================================================
          1. FLOATING ANIMATED TOAST STACK (TOP-RIGHT)
      ======================================================== */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {alerts.map((alert) => {
          const isSuccess = alert.type === 'success';
          const isWarning = alert.type === 'warning';
          const isError = alert.type === 'error';

          return (
            <div
              key={alert.id}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl bg-white/95 p-4 shadow-2xl border border-slate-200/80 backdrop-blur-md transition-all animate-in slide-in-from-top-4 fade-in zoom-in-95 duration-250 hover:shadow-xl"
              style={{
                boxShadow: isSuccess
                  ? '0 10px 25px -5px rgba(97, 136, 115, 0.25), 0 8px 10px -6px rgba(97, 136, 115, 0.2)'
                  : isWarning
                  ? '0 10px 25px -5px rgba(245, 158, 11, 0.25)'
                  : isError
                  ? '0 10px 25px -5px rgba(225, 29, 72, 0.25)'
                  : '0 10px 25px -5px rgba(14, 165, 233, 0.25)',
              }}
            >
              {/* Left Icon Badge with Soft Glow */}
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  isSuccess
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : isWarning
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                    : isError
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                    : 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                }`}
              >
                {isSuccess && <CheckCircle2 className="h-5 w-5" />}
                {isWarning && <AlertTriangle className="h-5 w-5" />}
                {isError && <XCircle className="h-5 w-5" />}
                {!isSuccess && !isWarning && !isError && <Info className="h-5 w-5" />}
              </div>

              {/* Message Content */}
              <div className="flex-1 pt-0.5">
                <p className="text-xs font-bold text-slate-800">
                  {alert.title ||
                    (isSuccess
                      ? 'Berhasil Tersimpan'
                      : isWarning
                      ? 'Perhatian'
                      : isError
                      ? 'Terjadi Kesalahan'
                      : 'Informasi')}
                </p>
                <p className="mt-0.5 text-xs text-slate-600 leading-relaxed font-normal">
                  {alert.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => onDismissAlert(alert.id)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                title="Tutup Notifikasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ========================================================
          2. ANIMATED CONFIRMATION DIALOG MODAL (CENTERED)
      ======================================================== */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  confirmDialog.type === 'danger'
                    ? 'bg-rose-100 text-rose-600 shadow-md shadow-rose-200'
                    : confirmDialog.type === 'warning'
                    ? 'bg-amber-100 text-amber-600 shadow-md shadow-amber-200'
                    : 'bg-emerald-100 text-emerald-600 shadow-md shadow-emerald-200'
                }`}
              >
                {confirmDialog.type === 'danger' ? (
                  <Trash2 className="h-6 w-6" />
                ) : confirmDialog.type === 'warning' ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <HelpCircle className="h-6 w-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-800">
                  {confirmDialog.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (confirmDialog.onCancel) confirmDialog.onCancel();
                  onCloseConfirm();
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
              >
                {confirmDialog.cancelText || 'Batal'}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  onCloseConfirm();
                }}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white transition-all shadow-md cursor-pointer ${
                  confirmDialog.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                    : confirmDialog.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                    : 'bg-[#618873] hover:bg-[#507160] shadow-[#618873]/20'
                }`}
              >
                {confirmDialog.confirmText || 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
