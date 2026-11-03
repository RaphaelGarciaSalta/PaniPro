import {
  Category,
  Product,
  Comanda,
  Sale,
  CashRegister,
  BakerySettings,
  CashMovement,
  PaymentEntry,
  SaleItemSnapshot,
} from '../types';
import { calculateItemSubtotal, calculateItemCost } from '../utils/formatters';
import {
  db,
  doc,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  writeBatch,
  isFirestoreQuotaExceeded,
  markFirestoreQuotaExceeded,
} from './firebase';

const STORAGE_KEYS = {
  CATEGORIES: 'panis_categories_v1',
  PRODUCTS: 'panis_products_v1',
  COMANDAS: 'panis_comandas_v1',
  SALES: 'panis_sales_v1',
  CASH_REGISTERS: 'panis_cash_registers_v1',
  SETTINGS: 'panis_settings_v1',
  ACTIVE_USER_ROLE: 'panis_user_role_v1',
};

// Initial Categories
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-padaria', name: 'Padaria & Pães', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'cat-salgados', name: 'Salgados & Lanches', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { id: 'cat-cafeteria', name: 'Cafeteria & Bebidas Quentes', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { id: 'cat-doces', name: 'Doces & Confeitaria', color: 'bg-pink-100 text-pink-800 border-pink-300' },
  { id: 'cat-bebidas', name: 'Bebidas Geladas & Sucos', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'cat-frios', name: 'Frios & Laticínios', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
];

// Initial Realistic Bakery Products (includes exact items from tests and kg sales)
export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-pao-frances',
    name: 'Pão Francês',
    categoryId: 'cat-padaria',
    sku: 'PAO001',
    costPrice: 11.00, // Custo R$ 11,00/kg
    salePrice: 16.90, // Venda R$ 16,90/kg
    unit: 'kg', // Venda por peso (kg)
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-cafe-expresso',
    name: 'Café Expresso',
    categoryId: 'cat-cafeteria',
    sku: 'CAF001',
    costPrice: 1.50,
    salePrice: 5.00,
    unit: 'un',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-pao-queijo',
    name: 'Pão de Queijo Mineiro',
    categoryId: 'cat-salgados',
    sku: 'PDQ001',
    costPrice: 1.20,
    salePrice: 4.00,
    unit: 'un',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-pingado',
    name: 'Pingado / Café com Leite',
    categoryId: 'cat-cafeteria',
    sku: 'CAF002',
    costPrice: 1.80,
    salePrice: 6.00,
    unit: 'un',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-pao-chapa',
    name: 'Pão na Chapa com Manteiga',
    categoryId: 'cat-padaria',
    sku: 'PAO002',
    costPrice: 1.60,
    salePrice: 5.50,
    unit: 'un',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-coxinha',
    name: 'Coxinha com Catupiry',
    categoryId: 'cat-salgados',
    sku: 'SAL001',
    costPrice: 3.20,
    salePrice: 8.50,
    unit: 'un',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-misto-quente',
    name: 'Misto Quente Especial',
    categoryId: 'cat-salgados',
    sku: 'LAN001',
    costPrice: 4.50,
    salePrice: 12.00,
    unit: 'un',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-sonho',
    name: 'Sonho de Creme',
    categoryId: 'cat-doces',
    sku: 'DOC001',
    costPrice: 2.10,
    salePrice: 6.50,
    unit: 'un',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-bolo-chocolate',
    name: 'Bolo de Chocolate (Fatia)',
    categoryId: 'cat-doces',
    sku: 'DOC002',
    costPrice: 3.00,
    salePrice: 8.50,
    unit: 'fatia',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-refrigerante-lata',
    name: 'Refrigerante Lata 350ml',
    categoryId: 'cat-bebidas',
    sku: 'BEB001',
    costPrice: 2.80,
    salePrice: 6.50,
    unit: 'un',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-agua-mineral',
    name: 'Água Mineral 500ml',
    categoryId: 'cat-bebidas',
    sku: 'BEB002',
    costPrice: 1.10,
    salePrice: 4.00,
    unit: 'un',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-suco-laranja',
    name: 'Suco de Laranja Natural 400ml',
    categoryId: 'cat-bebidas',
    sku: 'BEB003',
    costPrice: 3.20,
    salePrice: 9.00,
    unit: 'un',
    active: true,
    createdAt: new Date().toISOString(),
  },
].map((p, idx) => ({ ...p, order: idx }));

export const DEFAULT_SETTINGS: BakerySettings = {
  name: 'Padaria & Confeitaria Bela Vista',
  tradeName: 'Bela Vista Pães e Doces',
  cnpj: '28.914.852/0001-44',
  phone: '(11) 3289-4100',
  address: 'Av. Paulista, 1200 - Bela Vista',
  city: 'São Paulo - SP',
  comandasCount: 30, // 30 fixed reusable comandas
  receiptFooterMessage: 'Obrigado pela preferência! Volte sempre.',
  autoPrintReceipt: false,
};

// Generate fixed reusable comandas (1 .. N)
export function generateEmptyComandas(count: number): Comanda[] {
  return Array.from({ length: count }, (_, idx) => ({
    number: idx + 1,
    status: 'disponivel',
    openedAt: null,
    items: [],
  }));
}
// Utility to strip undefined properties recursively so Firestore set/transaction never throws
export function sanitizeForFirestore<T>(input: T): T {
  if (input === null || input === undefined) {
    return null as any;
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof input === 'object' && !(input instanceof Date)) {
    const output: Record<string, any> = {};
    for (const [key, val] of Object.entries(input)) {
      if (val !== undefined) {
        output[key] = sanitizeForFirestore(val);
      }
    }
    return output as any;
  }
  return input;
}

class StorageService {
  private listeners: Set<() => void> = new Set();
  private isFirebaseConnected = false;
  private hasInitializedCloudSync = false;
  private isQuotaExceeded = false;
  private quotaErrorMessage: string | null = null;
  private hasMigratedPaoKg = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Check if Firestore write quota was already flagged as exceeded today
      try {
        const storedQuotaTime = localStorage.getItem('panipro_quota_exceeded_v1');
        if (storedQuotaTime) {
          const hoursPassed = (Date.now() - parseInt(storedQuotaTime, 10)) / (1000 * 60 * 60);
          if (hoursPassed < 24) {
            this.isQuotaExceeded = true;
            this.quotaErrorMessage =
              'A cota diária gratuita de gravações do Firebase Firestore foi atingida hoje (20.000 gravações/dia no plano gratuito Spark). O PaniPro ativou o Modo de Contingência Local automático: todos os seus produtos, comandas, vendas e caixa continuam funcionando e são salvos com segurança neste navegador.';
          } else {
            localStorage.removeItem('panipro_quota_exceeded_v1');
          }
        }
      } catch {
        // ignore localStorage access issues
      }

      this.initDefaults();
      window.addEventListener('storage', () => this.notifyListeners());
      this.initFirestoreSync().catch((err) => console.log('Firestore sync setup:', err));
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in storage listener', err);
      }
    });
  }

  public isConnectedToCloud(): boolean {
    return this.isFirebaseConnected && !this.isQuotaExceeded;
  }

  /**
   * Catches and classifies Firebase errors, activating local contingency mode
   * if the daily free tier read/write quota is exhausted to prevent crashing or continuous backoff spam.
   */
  public handleCloudError(operation: string, err: any): void {
    const msg = err?.message || String(err || '');
    const code = err?.code || '';
    const isQuota =
      code === 'resource-exhausted' ||
      msg.includes('resource-exhausted') ||
      msg.includes('Quota limit exceeded') ||
      msg.includes('quota metric') ||
      msg.includes('Quota exceeded');

    if (isQuota) {
      markFirestoreQuotaExceeded();
      if (!this.isQuotaExceeded) {
        this.isQuotaExceeded = true;
        this.quotaErrorMessage =
          'A cota diária gratuita de gravações do Firebase Firestore foi atingida hoje (20.000 gravações/dia no plano gratuito Spark). O PaniPro ativou o Modo de Contingência Local automático: todos os seus produtos, comandas, vendas e caixa continuam funcionando e são salvos com segurança neste navegador.';
        this.notifyListeners();
      }
      return;
    }
    console.warn(`[PaniPro Cloud Sync - ${operation}]:`, msg);
  }

  public getQuotaStatus(): { isExceeded: boolean; message: string | null; upgradeUrl: string } {
    return {
      isExceeded: this.isQuotaExceeded,
      message: this.quotaErrorMessage,
      upgradeUrl:
        'https://console.firebase.google.com/project/panipro-adriana/firestore/databases/ai-studio-pdvsystemfirebas-da24048c-3076-4249-ba28-f293136d41f4/data?openUpgradeDialog=true',
    };
  }

  /**
   * Initializes real-time listeners on Firestore collections.
   * If Firestore has data, it populates the local state.
   * If Firestore is empty, it seeds the initial defaults to the cloud.
   */
  private async initFirestoreSync() {
    if (this.hasInitializedCloudSync || !db || isFirestoreQuotaExceeded()) return;
    this.hasInitializedCloudSync = true;
    const firestoreDb = db;

    try {
      // 1. Listen to Settings
      onSnapshot(
        doc(firestoreDb, 'settings', 'bakery_config'),
        (snapshot) => {
          this.isFirebaseConnected = true;
          if (snapshot.exists()) {
            const data = snapshot.data() as BakerySettings;
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data));
            this.notifyListeners();
          } else if (!this.isQuotaExceeded) {
            // Seed settings to cloud
            setDoc(doc(firestoreDb, 'settings', 'bakery_config'), DEFAULT_SETTINGS).catch((err) =>
              this.handleCloudError('seed settings', err)
            );
          }
        },
        (err) => {
          this.handleCloudError('settings listener', err);
        }
      );

      // 2. Listen to Categories
      onSnapshot(
        collection(firestoreDb, 'categories'),
        (snapshot) => {
          this.isFirebaseConnected = true;
          if (!snapshot.empty) {
            const cloudCategories: Category[] = [];
            snapshot.forEach((d) => {
              cloudCategories.push(d.data() as Category);
            });
            localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cloudCategories));
            this.notifyListeners();
          } else if (!this.isQuotaExceeded) {
            // Seed categories
            const batch = writeBatch(firestoreDb);
            DEFAULT_CATEGORIES.forEach((cat) => {
              batch.set(doc(firestoreDb, 'categories', cat.id), cat);
            });
            batch.commit().catch((err) => this.handleCloudError('seed categories', err));
          }
        },
        (err) => this.handleCloudError('categories listener', err)
      );

      // 3. Listen to Products
      onSnapshot(
        collection(firestoreDb, 'products'),
        (snapshot) => {
          this.isFirebaseConnected = true;
          if (!snapshot.empty) {
            const cloudProducts: Product[] = [];
            snapshot.forEach((d) => {
              cloudProducts.push(d.data() as Product);
            });
            // Ensure pão francês is in kg once if needed
            if (!this.hasMigratedPaoKg && !this.isQuotaExceeded) {
              const pao = cloudProducts.find(
                (p) => p.id === 'prod-pao-frances' || p.name.toLowerCase().includes('pão francês')
              );
              if (pao && pao.unit !== 'kg') {
                this.hasMigratedPaoKg = true;
                pao.unit = 'kg';
                pao.costPrice = 11.0;
                pao.salePrice = 16.9;
                setDoc(doc(firestoreDb, 'products', pao.id), pao).catch((err) =>
                  this.handleCloudError('migrate pao unit', err)
                );
              }
            }
            // Sort products by custom order
            cloudProducts.sort((a, b) => {
              const orderA = typeof a.order === 'number' ? a.order : 999999;
              const orderB = typeof b.order === 'number' ? b.order : 999999;
              if (orderA !== orderB) return orderA - orderB;
              return (a.name || '').localeCompare(b.name || '');
            });
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(cloudProducts));
            this.notifyListeners();
          } else if (!this.isQuotaExceeded) {
            // Seed products
            const batch = writeBatch(firestoreDb);
            DEFAULT_PRODUCTS.forEach((prod) => {
              batch.set(doc(firestoreDb, 'products', prod.id), prod);
            });
            batch.commit().catch((err) => this.handleCloudError('seed products', err));
          }
        },
        (err) => this.handleCloudError('products listener', err)
      );

      // 4. Listen to Comandas
      onSnapshot(
        collection(firestoreDb, 'comandas'),
        (snapshot) => {
          this.isFirebaseConnected = true;
          if (!snapshot.empty) {
            const list: Comanda[] = [];
            snapshot.forEach((d) => {
              const cmd = d.data() as Comanda;
              // Invariant: Available comanda cannot have items or open date
              if (cmd.status === 'disponivel') {
                cmd.items = [];
                cmd.openedAt = null;
                delete (cmd as any).openedBy;
                cmd.customerNote = '';
              } else if (!Array.isArray(cmd.items)) {
                cmd.items = [];
              }
              list.push(cmd);
            });
            list.sort((a, b) => a.number - b.number);
            localStorage.setItem(STORAGE_KEYS.COMANDAS, JSON.stringify(list));
            this.notifyListeners();
          } else if (!this.isQuotaExceeded) {
            // Seed 30 empty comandas
            const initialComandas = generateEmptyComandas(30);
            const batch = writeBatch(firestoreDb);
            initialComandas.forEach((cmd) => {
              batch.set(doc(firestoreDb, 'comandas', String(cmd.number)), cmd);
            });
            batch.commit().catch((err) => this.handleCloudError('seed comandas', err));
          }
        },
        (err) => this.handleCloudError('comandas listener', err)
      );

      // 5. Listen to Sales
      onSnapshot(
        collection(firestoreDb, 'sales'),
        (snapshot) => {
          this.isFirebaseConnected = true;
          if (!snapshot.empty) {
            const list: Sale[] = [];
            snapshot.forEach((d) => {
              list.push(d.data() as Sale);
            });
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(list));
            this.notifyListeners();
          }
        },
        (err) => this.handleCloudError('sales listener', err)
      );

      // 6. Listen to Cash Registers
      onSnapshot(
        collection(firestoreDb, 'cash_registers'),
        (snapshot) => {
          this.isFirebaseConnected = true;
          if (!snapshot.empty) {
            const list: CashRegister[] = [];
            snapshot.forEach((d) => {
              list.push(d.data() as CashRegister);
            });
            list.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
            localStorage.setItem(STORAGE_KEYS.CASH_REGISTERS, JSON.stringify(list));
            this.notifyListeners();
          } else if (!this.isQuotaExceeded) {
            // Seed opening cash register
            const initialCash: CashRegister = {
              id: 'cr-' + Date.now(),
              code: 1,
              openedAt: new Date().toISOString(),
              closedAt: null,
              openedBy: 'Gerente / Admin',
              initialFloat: 100.0,
              status: 'aberto',
              movements: [],
              salesIds: [],
            };
            setDoc(doc(firestoreDb, 'cash_registers', initialCash.id), initialCash).catch((err) =>
              this.handleCloudError('seed cash register', err)
            );
          }
        },
        (err) => this.handleCloudError('cash registers listener', err)
      );
    } catch (e) {
      console.warn('Cloud sync initialization encountered an issue:', e);
    }
  }

  private initDefaults() {
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    } else {
      try {
        const storedProducts: Product[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
        const pao = storedProducts.find(
          (p) => p.id === 'prod-pao-frances' || p.name.toLowerCase().includes('pão francês')
        );
        if (pao && pao.unit !== 'kg') {
          pao.unit = 'kg';
          pao.costPrice = 11.0;
          pao.salePrice = 16.9;
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(storedProducts));
        }
      } catch (e) {
        console.error('Error migrating products', e);
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.COMANDAS)) {
      const settings = this.getSettings();
      localStorage.setItem(STORAGE_KEYS.COMANDAS, JSON.stringify(generateEmptyComandas(settings.comandasCount)));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SALES)) {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CASH_REGISTERS)) {
      const initialCash: CashRegister = {
        id: 'cr-' + Date.now(),
        code: 1,
        openedAt: new Date().toISOString(),
        closedAt: null,
        openedBy: 'Gerente / Admin',
        initialFloat: 100.0,
        status: 'aberto',
        movements: [],
        salesIds: [],
      };
      localStorage.setItem(STORAGE_KEYS.CASH_REGISTERS, JSON.stringify([initialCash]));
    }
  }

  // --- SETTINGS ---
  public getSettings(): BakerySettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public saveSettings(settings: BakerySettings): void {
    const current = this.getSettings();
    const comandas = this.getComandas();

    // Check if count changed
    if (settings.comandasCount !== current.comandasCount) {
      if (settings.comandasCount < current.comandasCount) {
        const busyBeyondLimit = comandas.some(
          (c) => c.number > settings.comandasCount && c.status === 'em_atendimento'
        );
        if (busyBeyondLimit) {
          throw new Error(
            `Não é possível reduzir para ${settings.comandasCount} comandas pois existem comandas acima deste número em atendimento!`
          );
        }
        const newComandas = comandas.filter((c) => c.number <= settings.comandasCount);
        this.saveComandasDirect(newComandas);
      } else {
        const additional: Comanda[] = [];
        for (let i = current.comandasCount + 1; i <= settings.comandasCount; i++) {
          additional.push({
            number: i,
            status: 'disponivel',
            openedAt: null,
            items: [],
          });
        }
        this.saveComandasDirect([...comandas, ...additional]);
      }
    }

    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.notifyListeners();

    // Sync to Firestore
    if (db && !this.isQuotaExceeded) {
      setDoc(doc(db, 'settings', 'bakery_config'), sanitizeForFirestore(settings)).catch((err) =>
        this.handleCloudError('settings sync', err)
      );
    }
  }

  // --- CATEGORIES ---
  public getCategories(): Category[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }

  public saveCategory(category: Category): void {
    const list = this.getCategories();
    const idx = list.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      list[idx] = category;
    } else {
      list.push(category);
    }
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(list));
    this.notifyListeners();

    // Sync to Firestore
    if (db && !this.isQuotaExceeded) {
      setDoc(doc(db, 'categories', category.id), sanitizeForFirestore(category)).catch((err) =>
        this.handleCloudError('saveCategory sync', err)
      );
    }
  }

  public deleteCategory(id: string): void {
    const products = this.getProducts();
    const inUse = products.some((p) => p.categoryId === id);
    if (inUse) {
      throw new Error('Não é possível excluir esta categoria pois há produtos cadastrados nela.');
    }
    const list = this.getCategories().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(list));
    this.notifyListeners();

    // Delete in Firestore
    if (db && !this.isQuotaExceeded) {
      deleteDoc(doc(db, 'categories', id)).catch((err) =>
        this.handleCloudError('deleteCategory sync', err)
      );
    }
  }

  // --- PRODUCTS ---
  public getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const list: Product[] = data ? JSON.parse(data) : DEFAULT_PRODUCTS;
      return list.sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 999999;
        const orderB = typeof b.order === 'number' ? b.order : 999999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || '').localeCompare(b.name || '');
      });
    } catch {
      return DEFAULT_PRODUCTS;
    }
  }

  public saveProduct(product: Product): void {
    const list = this.getProducts();
    const currentMaxOrder = list.reduce(
      (max, p) => Math.max(max, typeof p.order === 'number' ? p.order : -1),
      -1
    );
    const targetProduct: Product = {
      ...product,
      id: product.id || 'prod-' + Date.now(),
      order: typeof product.order === 'number' ? product.order : currentMaxOrder + 1,
    };

    const idx = list.findIndex((p) => p.id === targetProduct.id);
    if (idx >= 0) {
      list[idx] = { ...targetProduct };
    } else {
      list.push({ ...targetProduct });
    }
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(list));
    this.notifyListeners();

    // Sync to Firestore
    if (db && !this.isQuotaExceeded) {
      setDoc(doc(db, 'products', targetProduct.id), sanitizeForFirestore(targetProduct)).catch((err) =>
        this.handleCloudError('saveProduct sync', err)
      );
    }
  }

  public reorderProducts(reorderedList: Product[]): void {
    const current = this.getProducts();
    const reorderedIds = new Set(reorderedList.map((p) => p.id));

    // Assign consecutive order index
    const updatedReordered = reorderedList.map((prod, index) => ({
      ...prod,
      order: index,
    }));

    // Retain any other products that weren't in reorderedList (e.g. if filtered by category)
    const otherProducts = current
      .filter((p) => !reorderedIds.has(p.id))
      .map((p, idx) => ({
        ...p,
        order: updatedReordered.length + idx,
      }));

    const finalList = [...updatedReordered, ...otherProducts];
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(finalList));
    this.notifyListeners();

    // Sync all updated orders to Firestore via batch
    if (db && !this.isQuotaExceeded) {
      const firestoreDb = db;
      const batch = writeBatch(firestoreDb);
      finalList.forEach((prod) => {
        batch.set(doc(firestoreDb, 'products', prod.id), sanitizeForFirestore(prod));
      });
      batch.commit().catch((err) => this.handleCloudError('reorderProducts sync', err));
    }
  }

  public deleteProduct(id: string): void {
    const list = this.getProducts().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(list));
    this.notifyListeners();

    // Delete in Firestore
    if (db && !this.isQuotaExceeded) {
      deleteDoc(doc(db, 'products', id)).catch((err) =>
        this.handleCloudError('deleteProduct sync', err)
      );
    }
  }

  // --- COMANDAS (Reusable fixed numbers) ---
  public getComandas(): Comanda[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COMANDAS);
      if (!data) {
        const initial = generateEmptyComandas(this.getSettings().comandasCount);
        localStorage.setItem(STORAGE_KEYS.COMANDAS, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(data);
    } catch {
      return generateEmptyComandas(30);
    }
  }

  private saveComandasDirect(comandas: Comanda[]) {
    localStorage.setItem(STORAGE_KEYS.COMANDAS, JSON.stringify(comandas));
    this.notifyListeners();

    // Batch sync to Firestore
    if (db && !this.isQuotaExceeded) {
      const firestoreDb = db;
      const batch = writeBatch(firestoreDb);
      comandas.forEach((cmd) => {
        batch.set(doc(firestoreDb, 'comandas', String(cmd.number)), sanitizeForFirestore(cmd));
      });
      batch.commit().catch((err) => this.handleCloudError('saveComandasDirect sync', err));
    }
  }

  public getComandaByNumber(num: number): Comanda | undefined {
    return this.getComandas().find((c) => c.number === num);
  }

  public openComanda(num: number, openedBy = 'Atendente'): Comanda {
    const activeRegister = this.getActiveCashRegister();
    if (!activeRegister || activeRegister.status !== 'aberto') {
      throw new Error('O caixa precisa estar aberto para iniciar o atendimento de uma comanda.');
    }

    const comandas = this.getComandas();
    const idx = comandas.findIndex((c) => c.number === num);
    if (idx < 0) {
      throw new Error(`Comanda ${num} não encontrada.`);
    }
    const comanda = comandas[idx];
    if (comanda.status === 'em_atendimento') {
      throw new Error(`A Comanda ${num.toString().padStart(2, '0')} já está em atendimento!`);
    }

    const newComanda: Comanda = {
      number: num,
      status: 'em_atendimento',
      openedAt: new Date().toISOString(),
      openedBy,
      items: [],
      customerNote: '',
    };
    comandas[idx] = newComanda;

    localStorage.setItem(STORAGE_KEYS.COMANDAS, JSON.stringify(comandas));
    this.notifyListeners();

    // Cloud update with sanitized doc
    if (db && !this.isQuotaExceeded) {
      setDoc(doc(db, 'comandas', String(num)), sanitizeForFirestore(newComanda)).catch((err) =>
        this.handleCloudError('openComanda sync', err)
      );
    }

    return newComanda;
  }

  public updateComanda(comanda: Comanda): void {
    const comandas = this.getComandas();
    const idx = comandas.findIndex((c) => c.number === comanda.number);
    if (idx >= 0) {
      comandas[idx] = { ...comanda };
      localStorage.setItem(STORAGE_KEYS.COMANDAS, JSON.stringify(comandas));
      this.notifyListeners();

      // Cloud update with sanitized doc
      if (db && !this.isQuotaExceeded) {
        setDoc(doc(db, 'comandas', String(comanda.number)), sanitizeForFirestore(comanda)).catch((err) =>
          this.handleCloudError('updateComanda sync', err)
        );
      }
    }
  }

  public releaseComanda(num: number): void {
    const comandas = this.getComandas();
    const idx = comandas.findIndex((c) => c.number === num);
    if (idx >= 0) {
      const cleanComanda: Comanda = {
        number: num,
        status: 'disponivel',
        openedAt: null,
        items: [],
        customerNote: '',
      };
      comandas[idx] = cleanComanda;
      localStorage.setItem(STORAGE_KEYS.COMANDAS, JSON.stringify(comandas));
      this.notifyListeners();

      // Cloud update with sanitized doc
      if (db && !this.isQuotaExceeded) {
        setDoc(doc(db, 'comandas', String(num)), sanitizeForFirestore(cleanComanda)).catch((err) =>
          this.handleCloudError('releaseComanda sync', err)
        );
      }
    }
  }

  public cancelComanda(num: number): void {
    this.releaseComanda(num);
  }

  public releaseEmptyComandas(): number {
    const comandas = this.getComandas();
    let count = 0;
    const batch = db && !this.isQuotaExceeded ? writeBatch(db) : null;

    comandas.forEach((cmd) => {
      if (cmd.status === 'em_atendimento' && (!cmd.items || cmd.items.length === 0)) {
        cmd.status = 'disponivel';
        cmd.openedAt = null;
        delete (cmd as any).openedBy;
        cmd.items = [];
        cmd.customerNote = '';
        count++;
        if (batch && db) {
          batch.set(doc(db, 'comandas', String(cmd.number)), sanitizeForFirestore(cmd));
        }
      }
    });

    if (count > 0) {
      localStorage.setItem(STORAGE_KEYS.COMANDAS, JSON.stringify(comandas));
      if (batch) {
        batch.commit().catch((err) => this.handleCloudError('releaseEmptyComandas sync', err));
      }
      this.notifyListeners();
    }
    return count;
  }

  // --- SALES & FINALIZATION (Atomic execution) ---
  public getSales(): Sale[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SALES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public finalizeSale(params: {
    comandaNumber: number;
    payments: PaymentEntry[];
    cashierName: string;
    discount?: number;
  }): Sale {
    const comandas = this.getComandas();
    const comandaIdx = comandas.findIndex((c) => c.number === params.comandaNumber);
    const comanda = comandas[comandaIdx];

    if (!comanda) {
      throw new Error(`Comanda ${params.comandaNumber} não encontrada.`);
    }

    if (comanda.items.length === 0) {
      throw new Error('Não é possível finalizar uma comanda sem produtos!');
    }

    // Calculate subtotal
    const subtotal = comanda.items.reduce(
      (acc, item) => acc + calculateItemSubtotal(item.unitPrice, item.quantity, item.unit, item.weightInGrams),
      0
    );
    const discount = params.discount || 0;
    const total = Math.max(0, subtotal - discount);

    // Validate payments
    const totalPaid = params.payments.reduce((acc, p) => acc + p.amount, 0);
    const remaining = total - totalPaid;

    if (Math.abs(remaining) > 0.009) {
      throw new Error(
        `O valor recebido (R$ ${totalPaid.toFixed(2)}) não quita o valor total devido (R$ ${total.toFixed(2)}). Saldo pendente: R$ ${remaining.toFixed(2)}`
      );
    }

    // Historical snapshots of items (freezes prices and costs at time of sale)
    const saleItems: SaleItemSnapshot[] = comanda.items.map((item) => {
      const itemTotal = calculateItemSubtotal(item.unitPrice, item.quantity, item.unit, item.weightInGrams);
      const itemCost = calculateItemCost(item.costPrice, item.quantity, item.unit, item.weightInGrams);
      return {
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        weightInGrams: item.weightInGrams,
        weightInKg: item.weightInGrams ? item.weightInGrams / 1000 : undefined,
        unitPrice: item.unitPrice,
        costPrice: item.costPrice,
        total: itemTotal,
      };
    });

    const totalCost = comanda.items.reduce(
      (acc, item) => acc + calculateItemCost(item.costPrice, item.quantity, item.unit, item.weightInGrams),
      0
    );
    const profit = total - totalCost;

    // Sequential code
    const existingSales = this.getSales();
    const nextCode = existingSales.length > 0 ? Math.max(...existingSales.map((s) => s.code)) + 1 : 1;

    // Check open cash register
    const activeRegister = this.getActiveCashRegister();

    const newSale: Sale = {
      id: 'venda-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      code: nextCode,
      comandaNumber: comanda.number,
      createdAt: new Date().toISOString(),
      items: saleItems,
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number(discount.toFixed(2)),
      total: Number(total.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      payments: params.payments,
      cashRegisterId: activeRegister ? activeRegister.id : undefined,
      cashierName: params.cashierName,
      status: 'finalizada',
    };

    // 1. Record Sale locally
    existingSales.unshift(newSale);
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(existingSales));

    // 2. Free comanda immediately back to pristine available state!
    const cleanFreedComanda: Comanda = {
      number: params.comandaNumber,
      status: 'disponivel',
      openedAt: null,
      items: [],
      customerNote: '',
    };
    if (comandaIdx >= 0) {
      comandas[comandaIdx] = cleanFreedComanda;
    }
    localStorage.setItem(STORAGE_KEYS.COMANDAS, JSON.stringify(comandas));

    // 3. Link to cash register locally
    if (activeRegister) {
      activeRegister.salesIds.push(newSale.id);
      this.saveCashRegister(activeRegister);
    }

    this.notifyListeners();

    // 4. Atomic Transaction execution on Google Cloud Firestore (no duplicate standalone setDoc)
    if (db && !this.isQuotaExceeded) {
      this.executeCloudFinalizeTransaction(newSale, cleanFreedComanda, activeRegister).catch((err) =>
        this.handleCloudError('finalizeSale transaction', err)
      );
    }

    return newSale;
  }

  /**
   * Cloud Transaction guarantees atomic commit of Sale creation, Comanda liberation,
   * and Cash Register sales linkage without partial state updates.
   */
  private async executeCloudFinalizeTransaction(
    sale: Sale,
    freedComanda: Comanda,
    register: CashRegister | null
  ) {
    if (!db || this.isQuotaExceeded) return;
    const firestoreDb = db;
    const sanitizedSale = sanitizeForFirestore(sale);
    const sanitizedComanda = sanitizeForFirestore(freedComanda);
    const sanitizedRegister = register ? sanitizeForFirestore(register) : null;

    try {
      await runTransaction(firestoreDb, async (transaction) => {
        const saleRef = doc(firestoreDb, 'sales', sale.id);
        const comandaRef = doc(firestoreDb, 'comandas', String(freedComanda.number));

        // Create sale doc
        transaction.set(saleRef, sanitizedSale);

        // Update comanda to available
        transaction.set(comandaRef, sanitizedComanda);

        // Update cash register if open
        if (sanitizedRegister && register) {
          const registerRef = doc(firestoreDb, 'cash_registers', register.id);
          transaction.set(registerRef, sanitizedRegister);
        }
      });
    } catch (e) {
      this.handleCloudError('finalize transaction fallback', e);
    }
  }

  // --- CASH REGISTER (CAIXA) ---
  public getCashRegisters(): CashRegister[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CASH_REGISTERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public getActiveCashRegister(): CashRegister | null {
    const list = this.getCashRegisters();
    return list.find((cr) => cr.status === 'aberto') || null;
  }

  public saveCashRegister(register: CashRegister): void {
    const list = this.getCashRegisters();
    const idx = list.findIndex((c) => c.id === register.id);
    if (idx >= 0) {
      list[idx] = register;
    } else {
      list.push(register);
    }
    localStorage.setItem(STORAGE_KEYS.CASH_REGISTERS, JSON.stringify(list));
    this.notifyListeners();

    // Cloud sync
    if (db && !this.isQuotaExceeded) {
      setDoc(doc(db, 'cash_registers', register.id), sanitizeForFirestore(register)).catch((err) =>
        this.handleCloudError('saveCashRegister sync', err)
      );
    }
  }

  public openCashRegister(initialFloat: number, openedBy = 'Operador'): CashRegister {
    const active = this.getActiveCashRegister();
    if (active) {
      throw new Error('Já existe um caixa aberto! Feche o caixa atual antes de abrir um novo.');
    }

    const all = this.getCashRegisters();
    const nextCode = all.length + 1;

    const newRegister: CashRegister = {
      id: 'cr-' + Date.now(),
      code: nextCode,
      openedAt: new Date().toISOString(),
      closedAt: null,
      openedBy,
      initialFloat: Number(initialFloat.toFixed(2)),
      status: 'aberto',
      movements: [],
      salesIds: [],
    };

    all.unshift(newRegister);
    localStorage.setItem(STORAGE_KEYS.CASH_REGISTERS, JSON.stringify(all));
    this.notifyListeners();

    // Cloud sync
    if (db && !this.isQuotaExceeded) {
      setDoc(doc(db, 'cash_registers', newRegister.id), sanitizeForFirestore(newRegister)).catch((err) =>
        this.handleCloudError('openCashRegister sync', err)
      );
    }

    return newRegister;
  }

  public addCashMovement(
    type: 'suprimento' | 'sangria',
    amount: number,
    description: string,
    userName = 'Operador'
  ): CashMovement {
    const active = this.getActiveCashRegister();
    if (!active) {
      throw new Error('Não há caixa aberto no momento para registrar movimentação.');
    }
    if (amount <= 0) {
      throw new Error('O valor da movimentação deve ser maior que zero.');
    }

    const movement: CashMovement = {
      id: 'mov-' + Date.now(),
      type,
      amount: Number(amount.toFixed(2)),
      description: description.trim(),
      timestamp: new Date().toISOString(),
      userName,
    };

    active.movements.push(movement);
    this.saveCashRegister(active);
    return movement;
  }

  public closeCashRegister(countedCash: number, notes?: string, closedBy = 'Operador'): CashRegister {
    const active = this.getActiveCashRegister();
    if (!active) {
      throw new Error('Nenhum caixa aberto para fechar.');
    }

    // Calculate expected cash in drawer:
    // Initial float + sales in cash + manual entries (suprimento) - withdrawals (sangria)
    const sales = this.getSales().filter((s) => s.cashRegisterId === active.id && s.status === 'finalizada');

    let cashSalesTotal = 0;
    sales.forEach((s) => {
      s.payments.forEach((p) => {
        if (p.method === 'dinheiro') {
          cashSalesTotal += p.amount;
        }
      });
    });

    const suprimentosTotal = active.movements
      .filter((m) => m.type === 'suprimento')
      .reduce((acc, m) => acc + m.amount, 0);

    const sangriasTotal = active.movements
      .filter((m) => m.type === 'sangria')
      .reduce((acc, m) => acc + m.amount, 0);

    const expectedCash = Number((active.initialFloat + cashSalesTotal + suprimentosTotal - sangriasTotal).toFixed(2));
    const counted = Number(countedCash.toFixed(2));
    const difference = Number((counted - expectedCash).toFixed(2));

    active.closedAt = new Date().toISOString();
    active.closedBy = closedBy;
    active.status = 'fechado';
    active.expectedCash = expectedCash;
    active.countedCash = counted;
    active.cashDifference = difference;
    active.notes = notes || '';

    this.saveCashRegister(active);
    return active;
  }

  // --- BACKUP, RESTORE & SEED ---
  public exportBackup(): string {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      categories: this.getCategories(),
      products: this.getProducts(),
      comandas: this.getComandas(),
      sales: this.getSales(),
      cashRegisters: this.getCashRegisters(),
    };
    return JSON.stringify(data, null, 2);
  }

  public importBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.settings) this.saveSettings(data.settings);
      if (data.categories) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(data.categories));
        if (db) {
          const firestoreDb = db;
          const batch = writeBatch(firestoreDb);
          data.categories.forEach((cat: Category) => {
            batch.set(doc(firestoreDb, 'categories', cat.id), sanitizeForFirestore(cat));
          });
          batch.commit().catch(console.error);
        }
      }
      if (data.products) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
        if (db) {
          const firestoreDb = db;
          const batch = writeBatch(firestoreDb);
          data.products.forEach((prod: Product) => {
            batch.set(doc(firestoreDb, 'products', prod.id), sanitizeForFirestore(prod));
          });
          batch.commit().catch(console.error);
        }
      }
      if (data.comandas) {
        localStorage.setItem(STORAGE_KEYS.COMANDAS, JSON.stringify(data.comandas));
        if (db) {
          const firestoreDb = db;
          const batch = writeBatch(firestoreDb);
          data.comandas.forEach((cmd: Comanda) => {
            batch.set(doc(firestoreDb, 'comandas', String(cmd.number)), sanitizeForFirestore(cmd));
          });
          batch.commit().catch(console.error);
        }
      }
      if (data.sales) {
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(data.sales));
        if (db) {
          const firestoreDb = db;
          const batch = writeBatch(firestoreDb);
          data.sales.forEach((s: Sale) => {
            batch.set(doc(firestoreDb, 'sales', s.id), sanitizeForFirestore(s));
          });
          batch.commit().catch(console.error);
        }
      }
      if (data.cashRegisters) {
        localStorage.setItem(STORAGE_KEYS.CASH_REGISTERS, JSON.stringify(data.cashRegisters));
        if (db) {
          const firestoreDb = db;
          const batch = writeBatch(firestoreDb);
          data.cashRegisters.forEach((cr: CashRegister) => {
            batch.set(doc(firestoreDb, 'cash_registers', cr.id), sanitizeForFirestore(cr));
          });
          batch.commit().catch(console.error);
        }
      }
      this.notifyListeners();
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }

  public async syncAllLocalToCloud(): Promise<{ synced: boolean; message: string }> {
    if (!db) {
      return {
        synced: false,
        message:
          'Persistência local ativa para o projeto PANIPRO-ADRIANA. Adicione VITE_FIREBASE_API_KEY nas variáveis de ambiente para sincronizar diretamente com o Firestore.',
      };
    }

    if (this.isQuotaExceeded) {
      return {
        synced: false,
        message:
          'A cota diária gratuita de gravações do Firebase Firestore foi excedida hoje. A sincronização em nuvem será retomada automaticamente assim que a cota for renovada.',
      };
    }

    try {
      const firestoreDb = db;
      await setDoc(doc(firestoreDb, 'settings', 'bakery_config'), sanitizeForFirestore(this.getSettings()));

      const batch = writeBatch(firestoreDb);
      this.getCategories().forEach((cat) => {
        batch.set(doc(firestoreDb, 'categories', cat.id), sanitizeForFirestore(cat));
      });
      this.getProducts().forEach((prod) => {
        batch.set(doc(firestoreDb, 'products', prod.id), sanitizeForFirestore(prod));
      });
      this.getComandas().forEach((cmd) => {
        batch.set(doc(firestoreDb, 'comandas', String(cmd.number)), sanitizeForFirestore(cmd));
      });
      this.getSales().forEach((s) => {
        batch.set(doc(firestoreDb, 'sales', s.id), sanitizeForFirestore(s));
      });
      this.getCashRegisters().forEach((cr) => {
        batch.set(doc(firestoreDb, 'cash_registers', cr.id), sanitizeForFirestore(cr));
      });
      await batch.commit();
      this.isFirebaseConnected = true;

      return {
        synced: true,
        message: 'Todos os registros locais foram sincronizados com sucesso no projeto PANIPRO-ADRIANA!',
      };
    } catch (err: any) {
      this.handleCloudError('syncAllLocalToCloud', err);
      return {
        synced: false,
        message:
          'Não foi possível sincronizar todos os dados com o Firestore no momento: ' +
          (err?.message || 'Erro de cota ou conexão'),
      };
    }
  }

  public resetToFactory(): void {
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.COMANDAS);
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.CASH_REGISTERS);
    this.initDefaults();
    this.notifyListeners();
  }
}

export const storage = new StorageService();
