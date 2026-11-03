import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  Receipt,
  Sparkles,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  Scale,
  Edit3,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Comanda, Product, Category, ComandaItem, Sale } from '../types';
import {
  formatCurrency,
  padComanda,
  calculateItemSubtotal,
  formatQuantityOrWeight,
  formatUnitRateLabel,
} from '../utils/formatters';
import { storage } from '../services/storage';
import { FechamentoModal } from './FechamentoModal';
import { WeightInputModal } from '../components/WeightInputModal';

const getCategoryShortName = (name: string): string => {
  if (!name) return '';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('todo')) return 'Todos';
  const firstWord = trimmed.split(/[\s&/,-]+/)[0];
  return firstWord || trimmed;
};

interface AtendimentoViewProps {
  comandaNumber: number;
  cashierName: string;
  onBack: () => void;
  onSaleComplete: (sale: Sale) => void;
}

export const AtendimentoView: React.FC<AtendimentoViewProps> = ({
  comandaNumber,
  cashierName,
  onBack,
  onSaleComplete,
}) => {
  const [comanda, setComanda] = useState<Comanda | null>(() => {
    return storage.getComandaByNumber(comandaNumber) || null;
  });

  // Keep comanda and products synchronized with storage changes
  React.useEffect(() => {
    const syncWithStorage = () => {
      const fresh = storage.getComandaByNumber(comandaNumber);
      if (fresh) {
        setComanda(fresh);
      }
      setProducts(storage.getProducts().filter((p) => p.active));
    };
    return storage.subscribe(syncWithStorage);
  }, [comandaNumber]);

  const [products, setProducts] = useState<Product[]>(() => {
    return storage.getProducts().filter((p) => p.active);
  });

  const categories: Category[] = useMemo(() => {
    return [{ id: 'todas', name: 'Todos os Produtos' }, ...storage.getCategories()];
  }, []);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const [isWeightModalOpen, setIsWeightModalOpen] = useState<boolean>(false);
  const [weightProduct, setWeightProduct] = useState<Product | null>(null);
  const [editingWeightItem, setEditingWeightItem] = useState<ComandaItem | null>(null);

  // Dedicated ref for comanda items scroll container
  const itemsContainerRef = React.useRef<HTMLDivElement>(null);
  const prevItemsLengthRef = React.useRef<number>(comanda?.items.length || 0);

  // Smoothly scroll the items container inside the comanda card when new items are added
  React.useEffect(() => {
    const currentLen = comanda?.items.length || 0;
    if (currentLen > prevItemsLengthRef.current) {
      setTimeout(() => {
        if (itemsContainerRef.current) {
          itemsContainerRef.current.scrollTo({
            top: itemsContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 50);
    }
    prevItemsLengthRef.current = currentLen;
  }, [comanda?.items.length]);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  const handleScroll = (direction: 'up' | 'down') => {
    if (!itemsContainerRef.current) return;
    const scrollAmount = 140;
    itemsContainerRef.current.scrollBy({
      top: direction === 'down' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    });
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategoryId === 'todas' || p.categoryId === selectedCategoryId;
      const matchSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategoryId, searchQuery]);

  // Totals of comanda (correctly computing weighted products)
  const totalAmount = useMemo(() => {
    if (!comanda) return 0;
    return comanda.items.reduce(
      (acc, it) => acc + calculateItemSubtotal(it.unitPrice, it.quantity, it.unit, it.weightInGrams),
      0
    );
  }, [comanda?.items]);

  const totalItemsCount = useMemo(() => {
    if (!comanda) return 0;
    return comanda.items.reduce((acc, it) => {
      return acc + (it.unit === 'kg' ? 1 : it.quantity);
    }, 0);
  }, [comanda?.items]);

  // Add product to comanda (triggers weight modal for kg products)
  const handleAddProduct = (product: Product) => {
    if (!comanda) return;

    // RULE 2: When unit is QUILO (kg), DO NOT automatically add. Open weight prompt modal.
    if (product.unit === 'kg') {
      setWeightProduct(product);
      setEditingWeightItem(null);
      setIsWeightModalOpen(true);
      return;
    }

    // Standard unit product logic
    const existingIdx = comanda.items.findIndex(
      (it) => it.productId === product.id && it.unit !== 'kg'
    );
    let updatedItems = [...comanda.items];

    if (existingIdx >= 0) {
      updatedItems[existingIdx] = {
        ...updatedItems[existingIdx],
        quantity: updatedItems[existingIdx].quantity + 1,
      };
    } else {
      const newItem: ComandaItem = {
        id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        productId: product.id,
        name: product.name,
        unitPrice: product.salePrice,
        costPrice: product.costPrice,
        quantity: 1,
        unit: product.unit || 'un',
      };
      updatedItems.push(newItem);
    }

    const updatedComanda = { ...comanda, items: updatedItems };
    storage.updateComanda(updatedComanda);
    setComanda(updatedComanda);
    showToast(`+1 ${product.name}`);
  };

  // Confirm weight from modal
  const handleConfirmWeight = (grams: number, calculatedSubtotal: number) => {
    if (!comanda || !weightProduct) return;

    if (editingWeightItem) {
      // Editing existing weight
      const updatedItems = comanda.items.map((it) => {
        if (it.id === editingWeightItem.id) {
          return {
            ...it,
            weightInGrams: grams,
            weightInKg: grams / 1000,
          };
        }
        return it;
      });

      const updatedComanda = { ...comanda, items: updatedItems };
      storage.updateComanda(updatedComanda);
      setComanda(updatedComanda);
      showToast(`Pesagem atualizada: ${grams} g (${formatCurrency(calculatedSubtotal)})`);
    } else {
      // Adding new weighted entry as an identifiable line
      const newItem: ComandaItem = {
        id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        productId: weightProduct.id,
        name: weightProduct.name,
        unitPrice: weightProduct.salePrice,
        costPrice: weightProduct.costPrice,
        quantity: 1,
        unit: 'kg',
        weightInGrams: grams,
        weightInKg: grams / 1000,
      };

      const updatedComanda = { ...comanda, items: [...comanda.items, newItem] };
      storage.updateComanda(updatedComanda);
      setComanda(updatedComanda);
      showToast(`+ ${grams}g ${weightProduct.name} (${formatCurrency(calculatedSubtotal)})`);
    }

    setIsWeightModalOpen(false);
    setWeightProduct(null);
    setEditingWeightItem(null);
  };

  // Open weight edit for an existing item in the comanda
  const handleOpenEditWeight = (item: ComandaItem) => {
    const originalProd = products.find((p) => p.id === item.productId) || {
      id: item.productId,
      name: item.name,
      categoryId: '',
      salePrice: item.unitPrice,
      costPrice: item.costPrice,
      unit: 'kg',
      active: true,
      createdAt: '',
    };

    setWeightProduct(originalProd);
    setEditingWeightItem(item);
    setIsWeightModalOpen(true);
  };

  // Update quantity of a standard item
  const handleUpdateQuantity = (itemId: string, delta: number) => {
    if (!comanda) return;

    const updatedItems = comanda.items
      .map((it) => {
        if (it.id === itemId) {
          const newQty = it.quantity + delta;
          return newQty > 0 ? { ...it, quantity: newQty } : null;
        }
        return it;
      })
      .filter(Boolean) as ComandaItem[];

    const updatedComanda = { ...comanda, items: updatedItems };
    storage.updateComanda(updatedComanda);
    setComanda(updatedComanda);
  };

  // Remove item completely
  const handleRemoveItem = (itemId: string) => {
    if (!comanda) return;
    const updatedItems = comanda.items.filter((it) => it.id !== itemId);
    const updatedComanda = { ...comanda, items: updatedItems };
    storage.updateComanda(updatedComanda);
    setComanda(updatedComanda);
  };

  // Smart back: if no items were added, release comanda back to available so empty comandas don't linger
  const handleSmartBack = () => {
    if (comanda && comanda.items.length === 0) {
      storage.releaseComanda(comandaNumber);
    }
    onBack();
  };

  // Cancel comanda
  const handleCancelComanda = () => {
    if (confirm(`Tem certeza que deseja cancelar e liberar a ${padComanda(comandaNumber)}? Todos os lançamentos serão descartados.`)) {
      storage.cancelComanda(comandaNumber);
      onBack();
    }
  };

  if (!comanda) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Comanda não encontrada</h2>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          Voltar para Comandas
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full max-h-full min-h-0 bg-slate-100 overflow-hidden relative">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Main Split Screen Area (Starts directly at top of view) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* ÁREA ESQUERDA — PRODUTOS (7 or 8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full min-h-0 border-r border-slate-200 bg-slate-50/60 overflow-hidden">
          {/* Search & Categories Bar (Single unified row with back button) */}
          <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center gap-2.5 shrink-0 min-w-0">
            {/* Botão Voltar ao Painel */}
            <button
              type="button"
              onClick={handleSmartBack}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs active:scale-97"
              title="Voltar ao Painel de Comandas"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>Voltar</span>
            </button>

            {/* Search Input (compact width for SKU / name) */}
            <div className="relative w-44 sm:w-52 md:w-60 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar SKU ou nome..."
                title="Pesquisar produto pelo SKU ou nome"
                className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Limpar busca"
                  aria-label="Limpar busca"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills (Inline Horizontal Scroll with first word) */}
            <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
              {categories.map((cat) => {
                const isActive = selectedCategoryId === cat.id;
                const shortName = getCategoryShortName(cat.name);

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    title={cat.name}
                    className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer shrink-0 font-semibold ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {shortName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 min-h-0 p-4 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <ShoppingBag className="w-10 h-10 mb-2 stroke-1" />
                <p className="text-sm font-semibold">Nenhum produto encontrado</p>
                <p className="text-xs">Tente buscar por outro termo ou categoria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((prod) => {
                  const isKg = prod.unit === 'kg';

                  return (
                    <button
                      key={prod.id}
                      onClick={() => handleAddProduct(prod)}
                      className="group p-3.5 bg-white rounded-xl border border-slate-200/90 hover:border-blue-500 hover:shadow-md transition-all text-left flex flex-col justify-between active:scale-97 cursor-pointer"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              isKg
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isKg ? 'Por Peso (kg)' : prod.unit}
                          </span>
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                              isKg
                                ? 'bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white'
                                : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                            }`}
                          >
                            {isKg ? <Scale className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-800 leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
                          {prod.name}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600">
                          {formatCurrency(prod.salePrice)}
                          {isKg ? '/kg' : ''}
                        </span>
                        <span className="text-[10px] font-medium text-slate-600 group-hover:text-blue-500">
                          {isKg ? 'Pesar...' : '+ Adicionar'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ÁREA DIREITA — COMANDA (5 or 4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white flex flex-col h-full max-h-full min-h-0 overflow-hidden shadow-lg border-l border-slate-200">
          {/* Comanda Header */}
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>Consumo da Comanda</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  Em Atendimento
                </span>
              </div>
              <div className="text-lg font-extrabold text-blue-700 leading-tight">
                {padComanda(comanda.number)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right mr-1">
                <span className="text-[10px] text-slate-500 block">Total de itens</span>
                <div className="text-sm font-bold text-slate-800 leading-none">{totalItemsCount}</div>
              </div>

              {/* Scroll Navigation Buttons for easy scrolling on any device */}
              {comanda.items.length > 2 && (
                <div className="flex items-center gap-0.5 bg-white border border-slate-200 p-0.5 rounded-lg shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleScroll('up')}
                    className="p-1 hover:bg-slate-100 text-slate-600 rounded transition-colors cursor-pointer"
                    title="Rolar lista para cima"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScroll('down')}
                    className="p-1 hover:bg-slate-100 text-slate-600 rounded transition-colors cursor-pointer"
                    title="Rolar lista para baixo"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Optional scroll indicator helper when there are multiple items */}
          {comanda.items.length > 3 && (
            <div className="px-3 py-1 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-[10px] text-blue-700 font-medium shrink-0">
              <span>{comanda.items.length} itens lançados</span>
              <span className="flex items-center gap-1 text-[9px] text-blue-600">
                Use a barra lateral ou ▲ ▼ para rolar
              </span>
            </div>
          )}

          {/* Items List - Dedicated Visible Scrollable Container */}
          <div
            ref={itemsContainerRef}
            className="flex-1 min-h-0 px-3 py-1 overflow-y-scroll custom-scrollbar divide-y divide-slate-100 scroll-smooth bg-white"
          >
            {comanda.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <Receipt className="w-10 h-10 stroke-1 mb-2 text-slate-300" />
                <h4 className="text-xs font-bold text-slate-600">Comanda vazia</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Selecione os produtos ao lado para lançá-los na comanda.
                </p>
              </div>
            ) : (
              comanda.items.map((item) => {
                const isKg = item.unit === 'kg';
                const subtotal = calculateItemSubtotal(
                  item.unitPrice,
                  item.quantity,
                  item.unit,
                  item.weightInGrams
                );

                return (
                  <div key={item.id} className="py-2 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <h5 className="font-bold text-xs text-slate-900 truncate">{item.name}</h5>
                        {isKg && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold shrink-0">
                            PESO
                          </span>
                        )}
                      </div>

                      {/* Weight vs Unit Display per Section 4 */}
                      {isKg ? (
                        <div className="text-[11px] text-slate-600 mt-0.5 space-y-0.5">
                          <div className="font-extrabold text-blue-700 font-mono text-[11px]">
                            {item.weightInGrams} g
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {formatCurrency(item.unitPrice)}/kg
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {formatCurrency(item.unitPrice)} cada ({item.unit})
                        </div>
                      )}
                    </div>

                    {/* Quantity or Weight controls */}
                    {isKg ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenEditWeight(item)}
                          className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 border border-blue-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                          title="Alterar peso em gramas"
                        >
                          <Scale className="w-3.5 h-3.5 text-blue-600" />
                          <span>Pesar</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 shrink-0">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          className="w-6 h-6 rounded-md bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                          title="Diminuir"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold text-xs text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          className="w-6 h-6 rounded-md bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                          title="Aumentar"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Item Subtotal */}
                    <div className="text-right w-20 shrink-0">
                      <div className="font-bold text-xs text-slate-900 font-mono">
                        {formatCurrency(subtotal)}
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-[10px] text-rose-500 hover:text-rose-700 transition-colors cursor-pointer mt-0.5 block ml-auto font-medium"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

            {/* Bottom Summary & Actions - Compact and Anchored */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50 space-y-2.5 shrink-0">
              {/* Total Highlight with 'Manter Aberta & Sair' button */}
              <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs gap-3">
                <button
                  type="button"
                  onClick={handleSmartBack}
                  className="py-2 px-3.5 bg-slate-50 hover:bg-slate-100 active:scale-97 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
                  title="Salvar alterações, manter comanda aberta e retornar ao painel"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                  <span>Manter Aberta & Sair</span>
                </button>

                <div className="text-right min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                    {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'} • Parcial
                  </span>
                  <span className="text-xl font-black text-blue-700 tracking-tight font-mono block leading-tight">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  disabled={comanda.items.length === 0}
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>FINALIZAR VENDA (PAGAMENTO)</span>
                </button>

                <button
                  onClick={handleCancelComanda}
                  className="w-full py-2 px-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center"
                >
                  Cancelar Comanda
                </button>
              </div>
            </div>
        </div>
      </div>

      {/* Weight Input Modal for kg Products */}
      {isWeightModalOpen && weightProduct && (
        <WeightInputModal
          product={weightProduct}
          initialWeightInGrams={editingWeightItem?.weightInGrams}
          isOpen={isWeightModalOpen}
          isEditing={Boolean(editingWeightItem)}
          onClose={() => {
            setIsWeightModalOpen(false);
            setWeightProduct(null);
            setEditingWeightItem(null);
          }}
          onConfirm={handleConfirmWeight}
        />
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <FechamentoModal
          comanda={comanda}
          cashierName={cashierName}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={(sale) => {
            setIsCheckoutOpen(false);
            setComanda(null);
            onSaleComplete(sale);
          }}
        />
      )}
    </div>
  );
};
