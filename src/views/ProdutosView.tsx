import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldAlert,
  Percent,
  TrendingUp,
  FolderPlus,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react';
import { Product, Category, UserRole } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { storage } from '../services/storage';

interface ProdutosViewProps {
  userRole: UserRole;
}

export const ProdutosView: React.FC<ProdutosViewProps> = ({ userRole }) => {
  const [products, setProducts] = useState<Product[]>(() => storage.getProducts());
  const [categories, setCategories] = useState<Category[]>(() => storage.getCategories());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const canManageCosts = userRole === 'admin' || userRole === 'gerente';

  // Drag and drop state for row reordering
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null);
  const [dragOverProductId, setDragOverProductId] = useState<string | null>(null);
  const [dropIndicatorPosition, setDropIndicatorPosition] = useState<'above' | 'below' | null>(null);
  const [orderToast, setOrderToast] = useState<string | null>(null);

  // Modal State for Product
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Modal State for Categories
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    sku: '',
    costPrice: '0.45',
    salePrice: '0.90',
    unit: 'un',
    active: true,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [generalMessage, setGeneralMessage] = useState<string | null>(null);

  // Refresh lists
  const refreshData = () => {
    setProducts(storage.getProducts());
    setCategories(storage.getCategories());
  };

  React.useEffect(() => {
    return storage.subscribe(refreshData);
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.active) ||
        (statusFilter === 'inactive' && !p.active);
      const matchSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchCategory && matchStatus && matchSearch;
    });
  }, [products, selectedCategory, statusFilter, searchQuery]);

  // Order Toast Feedback
  const showToast = (msg: string) => {
    setOrderToast(msg);
    setTimeout(() => setOrderToast(null), 3000);
  };

  // Drag and Drop row reordering
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, productId: string) => {
    setDraggedProductId(productId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', productId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, targetProductId: string) => {
    e.preventDefault();
    if (!draggedProductId || draggedProductId === targetProductId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midPoint = rect.top + rect.height / 2;
    const position = e.clientY < midPoint ? 'above' : 'below';

    setDragOverProductId(targetProductId);
    setDropIndicatorPosition(position);
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetProductId: string) => {
    e.preventDefault();
    if (!draggedProductId || draggedProductId === targetProductId) {
      setDraggedProductId(null);
      setDragOverProductId(null);
      setDropIndicatorPosition(null);
      return;
    }

    const currentList = [...products];
    const sourceIdx = currentList.findIndex((p) => p.id === draggedProductId);
    const targetIdx = currentList.findIndex((p) => p.id === targetProductId);

    if (sourceIdx < 0 || targetIdx < 0) {
      setDraggedProductId(null);
      setDragOverProductId(null);
      setDropIndicatorPosition(null);
      return;
    }

    const [movedItem] = currentList.splice(sourceIdx, 1);
    let newIdx = currentList.findIndex((p) => p.id === targetProductId);
    if (dropIndicatorPosition === 'below') {
      newIdx += 1;
    }
    currentList.splice(newIdx, 0, movedItem);

    setProducts(currentList);
    storage.reorderProducts(currentList);
    showToast(`Posição de "${movedItem.name}" atualizada!`);

    setDraggedProductId(null);
    setDragOverProductId(null);
    setDropIndicatorPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedProductId(null);
    setDragOverProductId(null);
    setDropIndicatorPosition(null);
  };

  // Accessibility & touch quick move buttons
  const handleMoveProduct = (productId: string, direction: 'up' | 'down') => {
    const currentList = [...products];
    const idx = currentList.findIndex((p) => p.id === productId);
    if (idx < 0) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentList.length) return;

    const temp = currentList[idx];
    currentList[idx] = currentList[targetIdx];
    currentList[targetIdx] = temp;

    setProducts(currentList);
    storage.reorderProducts(currentList);
    showToast(`"${temp.name}" movido para ${direction === 'up' ? 'cima' : 'baixo'}.`);
  };

  // Open modal for new product
  const handleOpenNewModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      categoryId: categories[0]?.id || '',
      sku: '',
      costPrice: '0.45',
      salePrice: '0.90',
      unit: 'un',
      active: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      categoryId: prod.categoryId,
      sku: prod.sku || '',
      costPrice: prod.costPrice.toString(),
      salePrice: prod.salePrice.toString(),
      unit: prod.unit,
      active: prod.active,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Profit calculations in form
  const parsedCost = parseFloat(formData.costPrice.replace(',', '.')) || 0;
  const parsedSale = parseFloat(formData.salePrice.replace(',', '.')) || 0;
  const unitProfit = Math.max(0, parsedSale - parsedCost);
  const marginPercent = parsedSale > 0 ? (unitProfit / parsedSale) * 100 : 0;

  // Save product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('O nome do produto é obrigatório.');
      return;
    }
    if (!formData.categoryId) {
      setFormError('Selecione uma categoria.');
      return;
    }
    if (parsedSale <= 0) {
      setFormError('O valor de venda deve ser maior que zero.');
      return;
    }
    if (parsedCost < 0) {
      setFormError('O valor de custo não pode ser negativo.');
      return;
    }

    const newProd: Product = {
      id: editingProduct ? editingProduct.id : 'prod-' + Date.now(),
      name: formData.name.trim(),
      categoryId: formData.categoryId,
      sku: formData.sku.trim() || undefined,
      costPrice: parsedCost,
      salePrice: parsedSale,
      unit: formData.unit || 'un',
      active: formData.active,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
    };

    storage.saveProduct(newProd);
    setIsModalOpen(false);
    setGeneralMessage(`Produto "${newProd.name}" salvo com sucesso!`);
    setTimeout(() => setGeneralMessage(null), 3000);
  };

  // Toggle active status
  const handleToggleActive = (prod: Product) => {
    const updated = { ...prod, active: !prod.active };
    storage.saveProduct(updated);
  };

  // Delete product
  const handleDeleteProduct = (id: string, name: string) => {
    if (confirm(`Excluir permanentemente o produto "${name}"?`)) {
      storage.deleteProduct(id);
      setGeneralMessage(`Produto "${name}" excluído.`);
      setTimeout(() => setGeneralMessage(null), 3000);
    }
  };

  // Category management
  const handleSaveCategory = () => {
    if (!categoryNameInput.trim()) return;
    if (editingCategory) {
      storage.saveCategory({ ...editingCategory, name: categoryNameInput.trim() });
    } else {
      storage.saveCategory({
        id: 'cat-' + Date.now(),
        name: categoryNameInput.trim(),
      });
    }
    setCategoryNameInput('');
    setEditingCategory(null);
  };

  const handleDeleteCategory = (catId: string) => {
    try {
      storage.deleteCategory(catId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      {/* Toast */}
      {generalMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{generalMessage}</span>
        </div>
      )}

      {/* Header with Title and New Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Catálogo de Produtos</h2>
          <p className="text-xs text-slate-500">
            Cadastre os itens comercializados, preços de custo, venda e margens de lucro.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageCosts && (
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              <span>Gerenciar Categorias</span>
            </button>
          )}

          <button
            onClick={handleOpenNewModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm shadow-blue-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Produto</span>
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por nome ou código..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
          />
        </div>

        {/* Categories and Status filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Somente Ativos</option>
            <option value="inactive">Somente Inativos</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Reordering Banner */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-[11px] font-medium text-slate-600">
              <strong className="font-bold text-slate-800">Organização personalizada:</strong> Clique e arraste qualquer linha pelo ícone <GripVertical className="w-3.5 h-3.5 inline text-slate-500 align-middle" /> para ordenar seus produtos. A ordem definida aqui é aplicada automaticamente no atendimento das comandas.
            </span>
          </div>
          {orderToast && (
            <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold animate-in fade-in flex items-center gap-1 shadow-xs shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {orderToast}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-20">Ordem</th>
                <th className="py-3 px-4">Código / SKU</th>
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Unidade</th>
                {canManageCosts && (
                  <>
                    <th className="py-3 px-4 text-right">Custo Unit.</th>
                    <th className="py-3 px-4 text-right">Lucro Unit.</th>
                    <th className="py-3 px-4 text-right">Margem %</th>
                  </>
                )}
                <th className="py-3 px-4 text-right">Preço de Venda</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManageCosts ? 11 : 8}
                    className="py-12 text-center text-slate-400"
                  >
                    <ShoppingBag className="w-10 h-10 mx-auto stroke-1 mb-2 text-slate-300" />
                    <p className="text-xs font-semibold">Nenhum produto cadastrado com esses filtros</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const cat = categories.find((c) => c.id === p.categoryId);
                  const profit = p.salePrice - p.costPrice;
                  const margin = p.salePrice > 0 ? (profit / p.salePrice) * 100 : 0;
                  const isDragged = draggedProductId === p.id;
                  const isDragOver = dragOverProductId === p.id;
                  const fullIndex = products.findIndex((item) => item.id === p.id);

                  return (
                    <tr
                      key={p.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, p.id)}
                      onDragOver={(e) => handleDragOver(e, p.id)}
                      onDrop={(e) => handleDrop(e, p.id)}
                      onDragEnd={handleDragEnd}
                      className={`group transition-all duration-150 ${
                        !p.active ? 'opacity-50 bg-slate-50/30' : ''
                      } ${
                        isDragged ? 'opacity-30 bg-blue-100/50' : 'hover:bg-slate-50/70'
                      } ${
                        isDragOver && dropIndicatorPosition === 'above'
                          ? 'border-t-2 border-t-blue-600 bg-blue-50/40'
                          : ''
                      } ${
                        isDragOver && dropIndicatorPosition === 'below'
                          ? 'border-b-2 border-b-blue-600 bg-blue-50/40'
                          : ''
                      }`}
                    >
                      {/* Drag Handle & Order Controls */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <span
                            className="p-1 text-slate-400 group-hover:text-blue-600 rounded cursor-grab active:cursor-grabbing hover:bg-blue-50 transition-colors"
                            title="Clique e arraste para reordenar"
                          >
                            <GripVertical className="w-4 h-4" />
                          </span>
                          <span className="font-mono text-[11px] font-bold text-slate-500 w-5 text-center">
                            {fullIndex + 1}
                          </span>
                          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveProduct(p.id, 'up');
                              }}
                              disabled={fullIndex === 0}
                              className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer"
                              title="Subir posição"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveProduct(p.id, 'down');
                              }}
                              disabled={fullIndex === products.length - 1}
                              className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer"
                              title="Descer posição"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{p.sku || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 text-xs">{p.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {cat?.name || 'Sem categoria'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-600 text-[11px]">
                        {p.unit === 'kg' ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-300">
                            QUILO (KG)
                          </span>
                        ) : (
                          <span className="uppercase">{p.unit}</span>
                        )}
                      </td>

                      {/* Admin/Gerente Cost & Margins */}
                      {canManageCosts && (
                        <>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {formatCurrency(p.costPrice)}
                            {p.unit === 'kg' ? '/kg' : ''}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            {formatCurrency(profit)}
                            {p.unit === 'kg' ? '/kg' : ''}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                            {formatPercent(margin)}
                          </td>
                        </>
                      )}

                      <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 text-sm">
                        {formatCurrency(p.salePrice)}
                        {p.unit === 'kg' ? '/kg' : ''}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(p)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                            p.active
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {p.active ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar produto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {canManageCosts && (
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir produto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Cadastrar / Editar Produto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col my-8 animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">
                  {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nome do Produto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Pão Francês, Coxinha com Catupiry, Café Expresso..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Categoria & Unidade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="un">Unidade (un)</option>
                    <option value="kg">Quilo (kg) — Venda por Peso</option>
                    <option value="fatia">Fatia</option>
                    <option value="cento">Cento</option>
                    <option value="copo">Copo</option>
                    <option value="porcao">Porção</option>
                  </select>
                </div>
              </div>

              {/* Informative banner for kg products */}
              {formData.unit === 'kg' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
                  <strong>Venda por Peso:</strong> O preço cadastrado representa sempre o valor de{' '}
                  <strong>1 kg</strong> do produto. No caixa, ao clicar neste item, o sistema
                  solicitará o peso em gramas e calculará o valor proporcional exato.
                </div>
              )}

              {/* Código / SKU */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código Interno ou SKU (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Ex: PAO001, CAF001..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Custos e Vendas */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {formData.unit === 'kg' ? 'Valor de Custo por kg (R$) *' : 'Valor de Custo (R$) *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder={formData.unit === 'kg' ? '11.00' : '0.45'}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-600">Restrito à gerência</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {formData.unit === 'kg' ? 'Preço de Venda por kg (R$) *' : 'Preço de Venda (R$) *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                    placeholder={formData.unit === 'kg' ? '16.90' : '0.90'}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-600">
                    {formData.unit === 'kg' ? 'Preço de 1 kg do produto' : 'Exibido no caixa'}
                  </span>
                </div>

                {/* Auto Calculated Margin Indicator */}
                <div className="col-span-2 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500">Lucro Bruto: </span>
                    <strong className="text-emerald-700 font-mono">
                      {formatCurrency(unitProfit)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Margem: </span>
                    <strong className="text-blue-700 font-mono">
                      {formatPercent(marginPercent)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="activeToggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Produto Ativo (disponível para venda no caixa)
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-600/30"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gerenciar Categorias */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col my-8 animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Gerenciar Categorias de Produtos</h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Add / Edit Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={categoryNameInput}
                  onChange={(e) => setCategoryNameInput(e.target.value)}
                  placeholder="Nome da categoria (ex: Folhados, Picolés)..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <button
                  onClick={handleSaveCategory}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {editingCategory ? 'Salvar' : 'Adicionar'}
                </button>
              </div>

              {/* Categories List */}
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                {categories.map((c) => (
                  <div key={c.id} className="p-3 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{c.name}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingCategory(c);
                          setCategoryNameInput(c.name);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        title="Editar nome"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(c.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Excluir categoria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
