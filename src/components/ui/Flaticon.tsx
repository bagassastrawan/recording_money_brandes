import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

// Helper for default styling
const defaultStroke = {
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
  stroke: 'currentColor',
};

/**
 * Flaticon Style: Simple, clean, rounded interface icons
 */

export const FiMenu: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <line x1="3" y1="6" x2="21" y2="6" strokeWidth={2.2} />
    <line x1="3" y1="12" x2="21" y2="12" strokeWidth={2.2} />
    <line x1="3" y1="18" x2="21" y2="18" strokeWidth={2.2} />
  </svg>
);

export const FiDashboard: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <rect x="3" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="14" width="7" height="7" rx="2" />
    <rect x="3" y="14" width="7" height="7" rx="2" />
  </svg>
);

export const FiShoppingCart: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <circle cx="9" cy="20" r="1.5" fill="currentColor" />
    <circle cx="18" cy="20" r="1.5" fill="currentColor" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

export const FiCoffee: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
    <line x1="6" y1="1" x2="6" y2="4" />
    <line x1="10" y1="1" x2="10" y2="4" />
    <line x1="14" y1="1" x2="14" y2="4" />
  </svg>
);

export const FiPackage: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

export const FiReceipt: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M4 2v20l3-2 3 2 3-2 3 2 4-2V2l-4 2-3-2-3 2-3-2-3 2z" />
    <line x1="8" y1="8" x2="16" y2="8" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="16" x2="13" y2="16" />
  </svg>
);

export const FiChart: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);

export const FiDatabase: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

export const FiStore: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M3 9l2-5h14l2 5" />
    <path d="M21 9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9" />
    <path d="M3 9h18" />
    <path d="M9 22V12h6v10" />
  </svg>
);

export const FiPlus: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <line x1="12" y1="5" x2="12" y2="19" strokeWidth={2.4} />
    <line x1="5" y1="12" x2="19" y2="12" strokeWidth={2.4} />
  </svg>
);

export const FiMinus: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <line x1="5" y1="12" x2="19" y2="12" strokeWidth={2.4} />
  </svg>
);

export const FiAlertTriangle: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" strokeWidth={2.2} />
    <circle cx="12" cy="17" r="0.75" fill="currentColor" />
  </svg>
);

export const FiCalendar: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const FiRotateCcw: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

export const FiSearch: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth={2.2} />
  </svg>
);

export const FiTrash: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

export const FiEdit: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

export const FiCheck: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <polyline points="20 6 9 17 4 12" strokeWidth={2.4} />
  </svg>
);

export const FiCheckCircle: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" strokeWidth={2.2} />
  </svg>
);

export const FiAlertCircle: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" strokeWidth={2.2} />
    <circle cx="12" cy="16" r="0.75" fill="currentColor" />
  </svg>
);

export const FiX: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <line x1="18" y1="6" x2="6" y2="18" strokeWidth={2.2} />
    <line x1="6" y1="6" x2="18" y2="18" strokeWidth={2.2} />
  </svg>
);

export const FiShieldCheck: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" strokeWidth={2.2} />
  </svg>
);

export const FiUserCheck: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <polyline points="17 11 19 13 23 9" strokeWidth={2.2} />
  </svg>
);

export const FiUsers: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const FiChevronDown: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <polyline points="6 9 12 15 18 9" strokeWidth={2.2} />
  </svg>
);

export const FiArrowRight: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <line x1="5" y1="12" x2="19" y2="12" strokeWidth={2.2} />
    <polyline points="12 5 19 12 12 19" strokeWidth={2.2} />
  </svg>
);

export const FiArrowUpRight: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <line x1="7" y1="17" x2="17" y2="7" strokeWidth={2.2} />
    <polyline points="7 7 17 7 17 17" strokeWidth={2.2} />
  </svg>
);

export const FiArrowDownRight: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <line x1="7" y1="7" x2="17" y2="17" strokeWidth={2.2} />
    <polyline points="17 7 17 17 7 17" strokeWidth={2.2} />
  </svg>
);

export const FiArrowUpDown: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <polyline points="7 9 10 6 13 9" strokeWidth={2.2} />
    <line x1="10" y1="6" x2="10" y2="18" strokeWidth={2.2} />
    <polyline points="17 15 14 18 11 15" strokeWidth={2.2} />
    <line x1="14" y1="18" x2="14" y2="6" strokeWidth={2.2} />
  </svg>
);

export const FiDollarSign: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <line x1="12" y1="1" x2="12" y2="23" strokeWidth={2.2} />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeWidth={2.2} />
  </svg>
);

export const FiCreditCard: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <line x1="6" y1="15" x2="9" y2="15" strokeWidth={2.5} />
  </svg>
);

export const FiBanknote: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2" />
    <line x1="6" y1="12" x2="6.01" y2="12" strokeWidth={2.5} />
    <line x1="18" y1="12" x2="18.01" y2="12" strokeWidth={2.5} />
  </svg>
);

export const FiShoppingBag: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

export const FiTrendingUp: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" strokeWidth={2.2} />
    <polyline points="17 6 23 6 23 12" strokeWidth={2.2} />
  </svg>
);

export const FiTrendingDown: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" strokeWidth={2.2} />
    <polyline points="17 18 23 18 23 12" strokeWidth={2.2} />
  </svg>
);

export const FiDownload: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" strokeWidth={2.2} />
    <line x1="12" y1="15" x2="12" y2="3" strokeWidth={2.2} />
  </svg>
);

export const FiPrinter: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" rx="1" />
  </svg>
);

export const FiHistory: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" strokeWidth={2.2} />
  </svg>
);

export const FiSparkles: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2z" />
    <path d="M19 17l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
  </svg>
);

export const FiCopy: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const FiExternalLink: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" strokeWidth={2.2} />
    <line x1="10" y1="14" x2="21" y2="3" strokeWidth={2.2} />
  </svg>
);

export const FiQrCode: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="3" height="3" rx="0.5" />
    <line x1="21" y1="14" x2="21" y2="14.01" strokeWidth={3} />
    <line x1="14" y1="21" x2="14" y2="21.01" strokeWidth={3} />
    <line x1="21" y1="21" x2="17" y2="21" />
  </svg>
);

export const FiLayers: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

export const FiUtensils: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M18 2v8a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2V2" />
    <line x1="15" y1="12" x2="15" y2="22" strokeWidth={2.2} />
    <line x1="15" y1="2" x2="15" y2="6" strokeWidth={2.2} />
    <path d="M7 2v20" strokeWidth={2.2} />
    <path d="M4 2v6a3 3 0 0 0 6 0V2" />
  </svg>
);

export const FiCookie: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5z" />
    <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
    <circle cx="11" cy="14" r="1" fill="currentColor" />
    <circle cx="7" cy="15" r="1" fill="currentColor" />
    <circle cx="15" cy="16" r="1" fill="currentColor" />
  </svg>
);

export const FiFileText: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

export const FiZap: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const FiKey: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1 1" />
    <circle cx="7.5" cy="15.5" r="5.5" />
  </svg>
);

export const FiTerminal: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <polyline points="4 17 10 11 4 5" strokeWidth={2.2} />
    <line x1="12" y1="19" x2="20" y2="19" strokeWidth={2.2} />
  </svg>
);

export const FiBrandLogo: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M17 8h1a4 4 0 0 1 0 8h-1" strokeWidth={2} />
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" strokeWidth={2} />
    <path d="M6 2v3" strokeWidth={2} />
    <path d="M10 2v3" strokeWidth={2} />
    <path d="M14 2v3" strokeWidth={2} />
    <circle cx="10" cy="14" r="2" strokeWidth={1.8} />
  </svg>
);

export const FiAward: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <circle cx="12" cy="8" r="6" strokeWidth={2} />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" strokeWidth={2} />
  </svg>
);

export const FiRefreshCw: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export const FiShield: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...defaultStroke} className={className} {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);



