import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Exchange-aware currency formatting utility
 * Displays ₹ for Indian equities (NSE/BSE) and $ for US equities (NASDAQ/NYSE)
 */
export function formatCurrency(amount: number, exchange?: string, symbol?: string): string {
  const isIndianExchange =
    exchange === 'NSE' ||
    exchange === 'BSE' ||
    (symbol && ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'ITC', 'LT', 'AXISBANK', 'TATAMOTORS', 'MARUTI', 'SUNPHARMA', 'BHARTIARTL', 'WIPRO', 'HINDUNILVR'].includes(symbol.toUpperCase()));

  const prefix = isIndianExchange ? '₹' : '$';
  const formattedNumber = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${prefix}${formattedNumber}`;
}
