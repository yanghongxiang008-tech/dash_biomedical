/**
 * Shared utility helper functions
 * Pure functions with no side effects for common operations
 */

/**
 * Get initials from a name string
 * @param name - Full name or project name
 * @param maxLength - Maximum number of characters to return (default: 2)
 */
export const getInitials = (name: string, maxLength = 2): string => {
  if (!name?.trim()) return '';
  
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return name.substring(0, maxLength).toUpperCase();
  }
  
  return words
    .map(word => word[0])
    .join('')
    .substring(0, maxLength)
    .toUpperCase();
};

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text || '';
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Safely parse a date string
 * @param dateString - ISO date string or null
 * @returns Date object or null if invalid
 */
export const safeParseDate = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Format a number with proper locale formatting
 * @param value - Number to format
 * @param options - Intl.NumberFormat options
 */
export const formatNumber = (
  value: number,
  options?: Intl.NumberFormatOptions
): string => {
  return new Intl.NumberFormat('en-US', options).format(value);
};

/**
 * Calculate growth between two values
 * @param current - Current value
 * @param previous - Previous value
 * @returns Growth amount (positive or negative)
 */
export const calculateGrowth = (current: number, previous: number): number => {
  return current - previous;
};

/**
 * Filter unique items from array by key
 * @param array - Array to filter
 * @param keyFn - Function to extract unique key
 */
export const uniqueBy = <T>(array: T[], keyFn: (item: T) => unknown): T[] => {
  const seen = new Set();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Debounce a function call
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 */
export const debounce = <T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Check if a value is empty (null, undefined, empty string, or empty array)
 */
export const isEmpty = (value: unknown): boolean => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

/**
 * Safe JSON parse with fallback
 */
export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
};
