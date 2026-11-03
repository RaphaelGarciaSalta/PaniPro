import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Clock,
  AlertCircle,
  Lock,
  Unlock,
  RotateCcw,
  Receipt,
  CheckCircle2,
  Landmark,
  X,
} from 'lucide-react';
import { Comanda, ComandaStatus } from '../types';
import { formatCurrency, formatTime, padComanda, calculateItemSubtotal } from '../utils/formatters';
import { storage } from '../services/storage';

interface ComandasViewProps {
  onSelectComanda: (num: number) => void;
  cashierName: string;
  onNavigate: (view: any) => void;
  isCashRegisterOpen: boolean;
}

export const ComandasView: React.FC<ComandasViewProps> = ({
  onSelectComanda,
  cashierName,
  onNavigate,
  isCashRegisterOpen,
}) => {
  const [comandas, setComandas] = useState<Comanda[]>(() => storage.getComandas());
  const [statusFilter, setStatusFilter] = useState<'all' | 'disponivel' | 'em_atendimento'>('all');
  const [searchNumber, setSearchNumber] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states: Caixa fechado enforcement and quick open
  const [isCaixaFechadoModalOpen, setIsCaixaFechadoModalOpen] = useState(false);
  const [selectedComandaAttempt, setSelectedComandaAttempt] = useState<number | null>(null);
  const [quickInitialFloat, setQuickInitialFloat] = useState('100.00');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Storage listener to keep live
  useEffect(() => {
    return storage.subscribe(() => {
      setComandas(storage.getComandas());
    });
  }, []);

  // Filtered list
  const filteredComandas = useMemo(() => {
    return comandas.filter((c) => {
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'disponivel' && c.status === 'disponivel') ||
        (statusFilter === 'em_atendimento' && c.status === 'em_atendimento');

      const matchSearch =
        searchNumber.trim() === '' ||
        c.number.toString().includes(searchNumber.trim()) ||
        padComanda(c.number).toLowerCase().includes(searchNumber.toLowerCase());

      return matchStatus && matchSearch;
    });
  }, [comandas, statusFilter, searchNumber]);

  // Counts for filter badges
  const counts = useMemo(() => {
    const total = comandas.length;
    const disponiveis = comandas.filter((c) => c.status === 'disponivel').length;
    const emAtendimento = comandas.filter((c) => c.status === 'em_atendimento').length;
    return { total, disponiveis, emAtendimento };
  }, [comandas]);

  // Count empty comandas in service that can be safely freed
  const emptyInServiceCount = useMemo(() => {
    return comandas.filter(
      (c) => c.status === 'em_atendimento' && (!c.items || c.items.length === 0)
    ).length;
  }, [comandas]);

  // Handle comanda card click - direct 1-click open if cash register is open
  const handleCardClick = (comanda: Comanda) => {
    setActionError(null);

    if (comanda.status === 'bloqueada') {
      setActionError(`A ${padComanda(comanda.number)} está temporariamente bloqueada.`);
      return;
    }

    if (comanda.status === 'disponivel') {
      // RULE: Only allow opening if the cash register is OPEN
      const activeRegister = storage.getActiveCashRegister();
      if (!activeRegister || activeRegister.status !== 'aberto') {
        setSelectedComandaAttempt(comanda.number);
        setIsCaixaFechadoModalOpen(true);
        return;
      }

      // Caixa is open: click directly opens comanda without confirmation popup
      try {
        storage.openComanda(comanda.number, cashierName);
        onSelectComanda(comanda.number);
      } catch (err: any) {
        setActionError(err.message || 'Erro ao abrir a comanda.');
      }
      return;
    }

    if (comanda.status === 'em_atendimento') {
      // Comanda is already in service, enter directly to view/edit items
      onSelectComanda(comanda.number);
    }
  };

  // Quick Open Caixa directly from Comandas view
  const handleQuickOpenCaixa = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    const floatVal = parseFloat(quickInitialFloat.replace(',', '.'));
    if (isNaN(floatVal) || floatVal < 0) {
      setActionError('Informe um valor de fundo inicial válido (R$ 0,00 ou mais).');
      return;
    }

    try {
      storage.openCashRegister(floatVal, cashierName);
      setIsCaixaFechadoModalOpen(false);
      showToast('Caixa aberto com sucesso! Agora você pode abrir comandas.');

      // If user had clicked on a specific comanda, open it immediately
      if (selectedComandaAttempt) {
        try {
          storage.openComanda(selectedComandaAttempt, cashierName);
          onSelectComanda(selectedComandaAttempt);
        } catch (err: any) {
          setActionError(err.message || 'Erro ao abrir comanda.');
        }
        setSelectedComandaAttempt(null);
      }
    } catch (err: any) {
      setActionError(err.message || 'Erro ao abrir caixa.');
    }
  };

  // Release empty comandas that were opened by accident
  const handleReleaseEmptyComandas = () => {
    const freed = storage.releaseEmptyComandas();
    showToast(`${freed} comanda(s) vazia(s) liberada(s) com sucesso!`);
  };

  // Toggle lock comanda
  const handleToggleLock = (e: React.MouseEvent, comanda: Comanda) => {
    e.stopPropagation();
    if (comanda.status === 'em_atendimento') {
      setActionError('Não é possível bloquear uma comanda com atendimento em andamento!');
      return;
    }
    const updatedStatus: ComandaStatus =
      comanda.status === 'bloqueada' ? 'disponivel' : 'bloqueada';
    storage.updateComanda({ ...comanda, status: updatedStatus });
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-5">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error alert if any */}
      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-600 hover:text-rose-900 font-bold cursor-pointer"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* Cash Register Closed Warning Banner */}
      {!isCashRegisterOpen && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-950">Caixa Fechado</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-200 text-amber-900 border border-amber-300">
                  Abertura Obrigatória
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Para iniciar o atendimento em qualquer comanda, é necessário abrir o caixa da padaria primeiro.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsCaixaFechadoModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Caixa Agora</span>
            </button>
            <button
              onClick={() => onNavigate('caixa')}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
            >
              Ir ao Painel do Caixa
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({counts.total})
          </button>
          <button
            onClick={() => setStatusFilter('disponivel')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'disponivel'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Disponíveis ({counts.disponiveis})
          </button>
          <button
            onClick={() => setStatusFilter('em_atendimento')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'em_atendimento'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Em Atendimento ({counts.emAtendimento})
          </button>

          {/* Quick action to release unused open comandas */}
          {emptyInServiceCount > 0 && (
            <button
              onClick={handleReleaseEmptyComandas}
              className="px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ml-auto md:ml-2"
              title="Liberar comandas em atendimento que não possuem nenhum item lançado"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Liberar {emptyInServiceCount} Vazia(s)</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchNumber}
            onChange={(e) => setSearchNumber(e.target.value)}
            placeholder="Pesquisar número (ex: 01, 15)..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
          />
          {searchNumber && (
            <button
              onClick={() => setSearchNumber('')}
              className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Grid of Comandas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
        {filteredComandas.map((comanda) => {
          const isAvailable = comanda.status === 'disponivel';
          const isInService = comanda.status === 'em_atendimento';
          const isBlocked = comanda.status === 'bloqueada';

          const partialTotal = comanda.items.reduce(
            (acc, it) =>
              acc + calculateItemSubtotal(it.unitPrice, it.quantity, it.unit, it.weightInGrams),
            0
          );
          const itemsCount = comanda.items.reduce(
            (acc, it) => acc + (it.unit === 'kg' ? 1 : it.quantity),
            0
          );

          return (
            <div
              key={comanda.number}
              onClick={() => handleCardClick(comanda)}
              className={`relative p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between group active:scale-97 ${
                isAvailable
                  ? isCashRegisterOpen
                    ? 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-md'
                    : 'bg-white border-dashed border-amber-300 hover:border-amber-500 hover:shadow-sm'
                  : isInService
                  ? 'bg-amber-50/70 border-amber-300 hover:border-amber-500 shadow-xs'
                  : 'bg-slate-100 border-slate-200 opacity-60'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                    isAvailable
                      ? isCashRegisterOpen
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                      : isInService
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  #{comanda.number.toString().padStart(2, '0')}
                </span>

                <div className="flex items-center gap-1">
                  {isInService && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Deseja liberar e zerar a ${padComanda(comanda.number)}?`)) {
                          storage.releaseComanda(comanda.number);
                          showToast(`${padComanda(comanda.number)} liberada com sucesso!`);
                        }
                      }}
                      title="Liberar comanda agora"
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors rounded-md hover:bg-rose-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleToggleLock(e, comanda)}
                    title={isBlocked ? 'Desbloquear comanda' : 'Bloquear comanda'}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition-opacity rounded-md hover:bg-slate-200/60"
                  >
                    {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Card Center Info */}
              <div className="my-3 text-center">
                <div
                  className={`text-xl font-black tracking-tight ${
                    isAvailable
                      ? 'text-slate-800'
                      : isInService
                      ? 'text-amber-900'
                      : 'text-slate-500'
                  }`}
                >
                  {padComanda(comanda.number)}
                </div>

                <div className="mt-1 flex items-center justify-center gap-1.5">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      isAvailable
                        ? isCashRegisterOpen
                          ? 'bg-emerald-500 animate-pulse'
                          : 'bg-amber-400'
                        : isInService
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      isAvailable
                        ? isCashRegisterOpen
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                        : isInService
                        ? 'text-amber-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {isAvailable ? 'Disponível' : isInService ? 'Em Atendimento' : 'Bloqueada'}
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-2 border-t border-slate-200/70 text-xs">
                {isInService ? (
                  <div>
                    <div className="flex justify-between items-center text-slate-600 text-[11px]">
                      <span>{itemsCount} {itemsCount === 1 ? 'item' : 'itens'}</span>
                      <span className="font-mono text-slate-500 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {formatTime(comanda.openedAt)}
                      </span>
                    </div>
                    <div className="font-extrabold text-amber-900 text-sm mt-0.5 text-right">
                      {formatCurrency(partialTotal)}
                    </div>
                  </div>
                ) : isAvailable ? (
                  <div className="text-center text-[11px] font-semibold text-slate-500 group-hover:text-emerald-700 group-hover:underline">
                    {isCashRegisterOpen ? '+ Iniciar Atendimento' : 'Requer Caixa Aberto'}
                  </div>
                ) : (
                  <div className="text-center text-[10px] text-slate-400">Temporariamente Bloqueada</div>
                )}
              </div>
            </div>
          );
        })}
      </div>



      {/* Modal Caixa Fechado - shown when trying to open comanda with closed register */}
      {isCaixaFechadoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-amber-500 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Landmark className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Caixa Fechado</h3>
                  <p className="text-xs text-amber-100">
                    {selectedComandaAttempt
                      ? `Necessário abrir caixa para usar a ${padComanda(selectedComandaAttempt)}`
                      : 'Abertura de caixa necessária'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCaixaFechadoModalOpen(false);
                  setSelectedComandaAttempt(null);
                }}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickOpenCaixa} className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                Por regras operacionais e fiscais, nenhuma comanda pode ser aberta enquanto o caixa estiver fechado. Informe o valor do fundo inicial para abrir o caixa:
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fundo Inicial de Troco (R$)
                </label>
                <input
                  type="text"
                  required
                  value={quickInitialFloat}
                  onChange={(e) => setQuickInitialFloat(e.target.value)}
                  placeholder="100,00"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Responsável: <strong>{cashierName}</strong>
                </span>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCaixaFechadoModalOpen(false);
                    setSelectedComandaAttempt(null);
                    onNavigate('caixa');
                  }}
                  className="w-full sm:w-auto px-2 py-1 text-blue-600 hover:text-blue-800 text-xs font-bold cursor-pointer text-center"
                >
                  Ir ao Painel Completo do Caixa →
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCaixaFechadoModalOpen(false);
                      setSelectedComandaAttempt(null);
                    }}
                    className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Abrir Caixa</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
