import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store/AppContext";

export const metadata: Metadata = {
  title: "Brandes Money | Multi-Outlet Coffee POS, BOM & Financial Tracker",
  description:
    "Complete business management system for coffee brands and F&B: Role-Based POS, Automated Bill of Materials (BOM) stock depletion, weekly opname audits, operational expenses, and cashflow reports.",
  icons: {
    icon: "/logo_brandes.svg",
    shortcut: "/logo_brandes.svg",
    apple: "/logo_brandes.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn-uicons.flaticon.com/2.6.0/uicons-regular-rounded/css/uicons-regular-rounded.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#faf9f6] text-slate-800" suppressHydrationWarning>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
