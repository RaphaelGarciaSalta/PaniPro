export type UserRole = 'admin' | 'gerente' | 'caixa' | 'atendente';

export interface AllowedUser {
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  sku?: string;
  costPrice: number;
  salePrice: number;
  unit: string; // 'un', 'kg', 'cento', 'fatia', etc.
  active: boolean;
  order?: number; // Custom display order
  createdAt: string;
}

export interface ComandaItem {
  id: string;
  productId: string;
  name: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  unit: string;
  weightInGrams?: number; // Peso em gramas quando vendido por peso (kg)
  weightInKg?: number; // Peso em kg (weightInGrams / 1000)
  notes?: string;
}

export type ComandaStatus = 'disponivel' | 'em_atendimento' | 'bloqueada';

export interface Comanda {
  number: number;
  status: ComandaStatus;
  openedAt: string | null;
  openedBy?: string;
  items: ComandaItem[];
  customerNote?: string;
}

export type PaymentMethod = 'dinheiro' | 'debito' | 'credito' | 'pix';

export interface PaymentEntry {
  id: string;
  method: PaymentMethod;
  amount: number; // valor utilizado para quitar a venda
  cashTendered?: number; // valor entregue pelo cliente (se dinheiro)
  change?: number; // troco devolvido
}

export interface SaleItemSnapshot {
  productId: string;
  name: string;
  quantity: number;
  unit: string;
  weightInGrams?: number;
  weightInKg?: number;
  unitPrice: number; // Histórico imutável
  costPrice: number; // Histórico imutável
  total: number;
}

export interface Sale {
  id: string;
  code: number; // Número sequencial da venda (ex: 1, 2, 3...)
  comandaNumber: number;
  createdAt: string;
  items: SaleItemSnapshot[];
  subtotal: number;
  discount: number;
  total: number;
  totalCost: number;
  profit: number;
  payments: PaymentEntry[];
  cashRegisterId?: string;
  cashierName: string;
  status: 'finalizada' | 'cancelada';
}

export type CashMovementType = 'suprimento' | 'sangria'; // suprimento = entrada manual, sangria = retirada

export interface CashMovement {
  id: string;
  type: CashMovementType;
  amount: number;
  description: string;
  timestamp: string;
  userName: string;
}

export interface CashRegister {
  id: string;
  code: number;
  openedAt: string;
  closedAt: string | null;
  openedBy: string;
  closedBy?: string;
  initialFloat: number; // Fundo de caixa
  status: 'aberto' | 'fechado';
  movements: CashMovement[];
  salesIds: string[];
  expectedCash?: number;
  countedCash?: number;
  cashDifference?: number;
  notes?: string;
}

export interface BakerySettings {
  name: string;
  tradeName: string;
  cnpj: string;
  phone: string;
  address: string;
  city: string;
  comandasCount: number;
  receiptFooterMessage: string;
  autoPrintReceipt: boolean;
}
