import { BOMItem, InventoryItem } from '@/types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculates estimated COGS (Cost of Goods Sold) for a product based on its BOM
 */
export function calculateBOMCost(bom: BOMItem[], inventory: InventoryItem[]): number {
  if (!bom || bom.length === 0) return 0;
  
  return bom.reduce((total, item) => {
    const raw = inventory.find((inv) => inv.id === item.rawMaterialId || inv.name === item.rawMaterialName);
    if (!raw) return total;
    return total + (item.quantity * raw.costPerUnit);
  }, 0);
}

/**
 * Generic CSV exporter for browser downloads
 */
export function exportToCSV(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows || rows.length === 0) {
    alert('No data to export.');
    return;
  }

  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map((row) => {
        return keys
          .map((k) => {
            const raw = row[k];
            let cell = raw === null || raw === undefined ? '' : String(raw);
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
