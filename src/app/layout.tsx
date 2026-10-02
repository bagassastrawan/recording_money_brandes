import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store/AppContext";

export const viewport: Viewport = {
  themeColor: "#618873",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Brandes ERP | Sistem Manajemen Operasional & Penjualan Multi-Outlet F&B",
  description:
    "Solusi Enterprise Resource Planning (ERP) F&B terpadu: Point of Sale (POS) multi-outlet, manajemen resep BOM, pengawasan stok bahan baku & kadaluwarsa real-time, pencatatan pengeluaran operasional dengan bukti nota, audit trail pergerakan stok, dan laporan finansial komprehensif.",
  keywords: [
    "ERP F&B",
    "Point of Sale",
    "Sistem Kasir Multi Outlet",
    "Bill of Materials BOM",
    "Manajemen Inventaris Kopi",
    "Expiry Tracking",
    "Laporan Keuangan Kafe",
    "Stock Opname",
    "Catat Biaya Operasional",
  ],
  authors: [{ name: "Brandes ERP Systems" }],
  creator: "Brandes ERP",
  publisher: "Brandes Coffee & Eatery",
  openGraph: {
    title: "Brandes ERP | Solusi Terintegrasi Penjualan & Inventaris Multi-Outlet",
    description:
      "Kelola alur penjualan POS, resep & peralatan, stok bahan baku dengan tanggal kadaluwarsa, bukti nota pengeluaran, serta audit perubahan stok antar cabang dalam satu sistem ERP modern.",
    type: "website",
    locale: "id_ID",
    siteName: "Brandes ERP",
  },
  twitter: {
    card: "summary_large_image",
    title: "Brandes ERP | Sistem Kasir & ERP Retail Terpadu",
    description:
      "Pantau penjualan harian, stok aman, kadaluwarsa bahan baku, dan pengeluaran operasional dengan bukti nota secara akurat.",
  },
  icons: {
    icon: "/logo_brandes.svg",
    shortcut: "/logo_brandes.svg",
    apple: "/logo_brandes.svg",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Brandes ERP & POS System",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web Browser",
  "description":
    "Enterprise Resource Planning (ERP) platform for multi-branch F&B businesses featuring POS sales, BOM recipe tracking, raw material inventory with expiry dates, expense ledger with receipt uploads, and multi-outlet stock movement logs.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "IDR",
  },
  "featureList": [
    "Multi-Outlet POS Cashier with Sugar Level Customization",
    "Menu & Recipe Management with Equipment and Action Dropdown",
    "Raw Material Inventory with Batch Expiry Countdown",
    "Operational Expense Ledger with Receipt Photo/PDF Uploads",
    "Consolidated Daily Record Sales Report",
    "Multi-Outlet Stock Movement History and Audit Trail",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn-uicons.flaticon.com/2.6.0/uicons-regular-rounded/css/uicons-regular-rounded.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#faf9f6] text-slate-800" suppressHydrationWarning>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
