export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseCurrencyInput(value: string): number {
  if (!value) return 0;
  // Clean characters except numbers, comma and period
  const clean = value.replace(/[^\d.,]/g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return '--:--';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0%';
  }
  return `${value.toFixed(1).replace('.', ',')}%`;
}

export function padComanda(num: number): string {
  return `Comanda ${num.toString().padStart(2, '0')}`;
}

/**
 * Calculates item subtotal based on measurement unit (kg vs un/fatia/cento/copo/porcao)
 */
export function calculateItemSubtotal(
  unitPrice: number,
  quantity: number,
  unit: string,
  weightInGrams?: number
): number {
  if (unit === 'kg') {
    const grams = weightInGrams || 0;
    // Formula: (Peso em gramas / 1000) * Preço por kg, rounded to 2 decimals
    // 0.00001 prevents IEEE-754 precision inaccuracies (e.g. 0.25 * 16.90 evaluating to 4.2249999999999996)
    return Math.round(((grams / 1000) * unitPrice + 0.00001) * 100) / 100;
  }
  return Math.round((quantity * unitPrice + 0.00001) * 100) / 100;
}

/**
 * Calculates item cost based on measurement unit (kg vs others)
 */
export function calculateItemCost(
  costPrice: number,
  quantity: number,
  unit: string,
  weightInGrams?: number
): number {
  if (unit === 'kg') {
    const grams = weightInGrams || 0;
    return Math.round(((grams / 1000) * costPrice + 0.00001) * 100) / 100;
  }
  return Math.round((quantity * costPrice + 0.00001) * 100) / 100;
}

/**
 * Formats quantity/weight display string for receipt, list and comanda
 */
export function formatQuantityOrWeight(
  unit: string,
  quantity: number,
  weightInGrams?: number
): string {
  if (unit === 'kg') {
    const grams = weightInGrams || 0;
    return `${grams} g`;
  }
  if (unit === 'cento') {
    return `${quantity} cento(s)`;
  }
  return `${quantity} ${unit}`;
}

/**
 * Formats unit label with price
 */
export function formatUnitRateLabel(unitPrice: number, unit: string): string {
  if (unit === 'kg') {
    return `${formatCurrency(unitPrice)}/kg`;
  }
  return `${formatCurrency(unitPrice)}/${unit}`;
}
