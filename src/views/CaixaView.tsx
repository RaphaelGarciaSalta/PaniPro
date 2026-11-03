import React, { useState, useMemo } from 'react';
import {
  Landmark,
  PlusCircle,
  MinusCircle,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  History,
  FileSpreadsheet,
  Banknote,
  CreditCard,
  QrCode,
  Calculator,
  User,
} from 'lucide-react';
import { CashRegister, CashMovement, Sale, UserRole } from '../types';
import { formatCurrency, formatDateTime, formatTime } from '../utils/formatters';
import { storage } from '../services/storage';

interface CaixaViewProps {
  userRole: UserRole;
  userName: string;
}

export const CaixaView: React.FC<CaixaViewProps> = ({ userRole, userName }) => {
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(() =>
    storage.getActiveCashRegister()
  );
  const [allRegisters, setAllRegisters] = useState<CashRegister[]>(() =>
    storage.getCashRegisters()
  );
  const [allSales, setAllSales] = useState<Sale[]>(() => storage.getSales());

  // Modals state
  const [isOpenModalActive, setIsOpenModalActive] = useState(false);
  const [isCloseModalActive, setIsCloseModalActive] = useState(false);
  const [isMovementModalActive, setIsMovementModalActive] = useState(false);
  const [movementType, setMovementType] = useState<'suprimento' | 'sangria'>('suprimento');

  // Input states
  const [initialFloatInput, setInitialFloatInput] = useState('100.00');
  const [movementAmountInput, setMovementAmountInput] = useState('');
  const [movementDescInput, setMovementDescInput] = useState('');
  const [countedCashInput, setCountedCashInput] = useState('');
  const [closureNotesInput, setClosureNotesInput] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const refreshData = () => {
    setActiveRegister(storage.getActiveCashRegister());
    setAllRegisters(storage.getCashRegisters());
    setAllSales(storage.getSales());
  };

  React.useEffect(() => {
    return storage.subscribe(refreshData);
  }, []);

  // Compute stats for current active register
  const currentStats = useMemo(() => {
    if (!activeRegister) return null;

    const registerSales = allSales.filter(
      (s) => s.cashRegisterId === activeRegister.id && s.status === 'finalizada'
    );

    let dinheiro = 0;
    let debito = 0;
    let credito = 0;
    let pix = 0;

    registerSales.forEach((s) => {
      s.payments.forEach((p) => {
        if (p.method === 'dinheiro') dinheiro += p.amount;
        if (p.method === 'debito') debito += p.amount;
        if (p.method === 'credito') credito += p.amount;
        if (p.method === 'pix') pix += p.amount;
      });
    });

    const suprimentos = activeRegister.movements
      .filter((m) => m.type === 'suprimento')
      .reduce((acc, m) => acc + m.amount, 0);

    const sangrias = activeRegister.movements
      .filter((m) => m.type === 'sangria')
      .reduce((acc, m) => acc + m.amount, 0);

    // Physical cash expected in drawer
    const expectedCashInDrawer = activeRegister.initialFloat + dinheiro + suprimentos - sangrias;
    const totalVendasGeral = dinheiro + debito + credito + pix;

    return {
      salesCount: registerSales.length,
      dinheiro,
      debito,
      credito,
      pix,
      suprimentos,
      sangrias,
      expectedCashInDrawer,
      totalVendasGeral,
    };
  }, [activeRegister, allSales]);

  // Open Cash Register
  const handleOpenRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const floatVal = parseFloat(initialFloatInput.replace(',', '.'));
    if (isNaN(floatVal) || floatVal < 0) {
      setErrorMessage('Informe um fundo de caixa inicial válido (R$ 0,00 ou mais).');
      return;
    }

    try {
      storage.openCashRegister(floatVal, userName);
      setIsOpenModalActive(false);
      showToast('Caixa aberto com sucesso! Pronto para realizar vendas.');
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Add Manual Movement (Suprimento / Sangria)
  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const amount = parseFloat(movementAmountInput.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Informe um valor válido maior que zero.');
      return;
    }
    if (!movementDescInput.trim()) {
      setErrorMessage('Informe uma descrição / justificativa para a movimentação.');
      return;
    }

    try {
      storage.addCashMovement(movementType, amount, movementDescInput, userName);
      setIsMovementModalActive(false);
      setMovementAmountInput('');
      setMovementDescInput('');
      showToast(
        `${movementType === 'suprimento' ? 'Suprimento (entrada)' : 'Sangria (retirada)'} de ${formatCurrency(amount)} registrado com sucesso!`
      );
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Close Cash Register
  const handleConfirmClose = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const counted = parseFloat(countedCashInput.replace(',', '.'));
    if (isNaN(counted) || counted < 0) {
      setErrorMessage('Informe o valor físico total de dinheiro contado na gaveta.');
      return;
    }

    try {
      storage.closeCashRegister(counted, closureNotesInput, userName);
      setIsCloseModalActive(false);
      setCountedCashInput('');
      setClosureNotesInput('');
      showToast('Caixa fechado com sucesso! Os relatórios foram consolidados.');
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Preview difference in close modal
  const previewCounted = parseFloat(countedCashInput.replace(',', '.')) || 0;
  const previewExpected = currentStats?.expectedCashInDrawer || 0;
  const previewDiff = previewCounted - previewExpected;

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Controle de Caixa e Gaveta
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhe as movimentações por modalidade, sangrias, suprimentos e conferência física.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeRegister ? (
            <>
              <button
                onClick={() => {
                  setMovementType('suprimento');
                  setMovementAmountInput('');
                  setMovementDescInput('');
                  setIsMovementModalActive(true);
                }}
                className="px-3.5 py-2 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Suprimento</span>
              </button>

              <button
                onClick={() => {
                  setMovementType('sangria');
                  setMovementAmountInput('');
                  setMovementDescInput('');
                  setIsMovementModalActive(true);
                }}
                className="px-3.5 py-2 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <MinusCircle className="w-3.5 h-3.5" />
                <span>- Sangria</span>
              </button>

              <button
                onClick={() => {
                  setCountedCashInput(currentStats ? currentStats.expectedCashInDrawer.toFixed(2) : '');
                  setClosureNotesInput('');
                  setIsCloseModalActive(true);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Fechar Caixa</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsOpenModalActive(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-blue-600/30 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Novo Caixa</span>
            </button>
          )}
        </div>
      </div>

      {/* If No Active Cash Register is Open */}
      {!activeRegister ? (
        <div className="p-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Nenhum Caixa Aberto no Momento</h3>
            <p className="text-xs text-slate-500 mt-1">
              Para registrar novas vendas com controle de gaveta e conferência física, abra o caixa
              informando o fundo de caixa inicial.
            </p>
          </div>
          <button
            onClick={() => setIsOpenModalActive(true)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            Abrir Caixa Agora
          </button>
        </div>
      ) : (
        /* Active Cash Register Dashboard */
        <div className="space-y-6">
          {/* Active Box Info Bar */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                  <span>Caixa #{activeRegister.code} em Operação</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200/60 text-[10px] uppercase font-bold text-emerald-950">
                    Aberto
                  </span>
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5 flex items-center gap-3">
                  <span>Operador: {activeRegister.openedBy}</span>
                  <span>•</span>
                  <span>Abertura: {formatDateTime(activeRegister.openedAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-800 font-semibold">Fundo Inicial:</span>
              <span className="font-extrabold text-emerald-950 font-mono text-sm">
                {formatCurrency(activeRegister.initialFloat)}
              </span>
            </div>
          </div>

          {/* Large Highlight: Expected Cash in Drawer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Dinheiro Esperado na Gaveta */}
            <div className="p-5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-sm md:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Banknote className="w-4 h-4" />
                    Dinheiro Físico Esperado na Gaveta
                  </span>
                  <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-md font-semibold">
                    Gaveta Física
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-black tracking-tight mt-2 font-mono">
                  {formatCurrency(currentStats?.expectedCashInDrawer)}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/20 text-xs text-emerald-100 flex flex-wrap items-center justify-between gap-2">
                <span>Fundo ({formatCurrency(activeRegister.initialFloat)})</span>
                <span>+ Vendas ({formatCurrency(currentStats?.dinheiro)})</span>
                <span>+ Entradas ({formatCurrency(currentStats?.suprimentos)})</span>
                <span>- Retiradas ({formatCurrency(currentStats?.sangrias)})</span>
              </div>
            </div>

            {/* Total Vendas Geral (Todas modalidades) */}
            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total de Vendas do Turno
                </span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {formatCurrency(currentStats?.totalVendasGeral)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {currentStats?.salesCount} {currentStats?.salesCount === 1 ? 'venda realizada' : 'vendas realizadas'}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                Soma de todas as modalidades (Dinheiro, Débito, Crédito e PIX)
              </div>
            </div>
          </div>

          {/* Breakdown by modalities */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dinheiro (Vendas)</span>
              </div>
              <div className="text-base font-black text-slate-900 mt-1">
                {formatCurrency(currentStats?.dinheiro)}
              </div>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <span>Cartão Débito</span>
              </div>
              <div className="text-base font-black text-slate-900 mt-1">
                {formatCurrency(currentStats?.debito)}
              </div>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cartão Crédito</span>
              </div>
              <div className="text-base font-black text-slate-900 mt-1">
                {formatCurrency(currentStats?.credito)}
              </div>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <QrCode className="w-3.5 h-3.5 text-teal-600" />
                <span>PIX</span>
              </div>
              <div className="text-base font-black text-slate-900 mt-1">
                {formatCurrency(currentStats?.pix)}
              </div>
            </div>
          </div>

          {/* Manual Movements List (Suprimentos & Sangrias) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Movimentações Manuais da Gaveta ({activeRegister.movements.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setMovementType('suprimento');
                    setIsMovementModalActive(true);
                  }}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
                >
                  + Suprimento
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => {
                    setMovementType('sangria');
                    setIsMovementModalActive(true);
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800"
                >
                  - Sangria
                </button>
              </div>
            </div>

            {activeRegister.movements.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-600">
                Nenhum suprimento ou sangria manual registrado neste turno.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeRegister.movements.map((mov) => (
                  <div key={mov.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                          mov.type === 'suprimento'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {mov.type === 'suprimento' ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <span className="capitalize">{mov.type}</span>
                          <span className="text-slate-400 font-normal">—</span>
                          <span className="font-normal text-slate-600">{mov.description}</span>
                        </div>
                        <div className="text-[10px] text-slate-600">
                          {formatTime(mov.timestamp)} • Por: {mov.userName}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`font-black font-mono text-sm ${
                        mov.type === 'suprimento' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {mov.type === 'suprimento' ? '+' : '-'} {formatCurrency(mov.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historic Closed Registers Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Histórico de Fechamentos Anteriores</h3>
          </div>
          <span className="text-xs text-slate-500">Conferência diária e auditoria</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Caixa #</th>
                <th className="py-2.5 px-3">Abertura</th>
                <th className="py-2.5 px-3">Fechamento</th>
                <th className="py-2.5 px-3">Operador</th>
                <th className="py-2.5 px-3 text-right">Fundo Inicial</th>
                <th className="py-2.5 px-3 text-right">Esperado</th>
                <th className="py-2.5 px-3 text-right">Contado</th>
                <th className="py-2.5 px-3 text-right">Diferença</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {allRegisters.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-400">
                    Nenhum registro de caixa encontrado
                  </td>
                </tr>
              ) : (
                allRegisters.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900">#{reg.code}</td>
                    <td className="py-2.5 px-3 text-slate-600">{formatDateTime(reg.openedAt)}</td>
                    <td className="py-2.5 px-3 text-slate-600">{formatDateTime(reg.closedAt)}</td>
                    <td className="py-2.5 px-3 text-slate-700">{reg.closedBy || reg.openedBy}</td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {formatCurrency(reg.initialFloat)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {reg.expectedCash !== undefined ? formatCurrency(reg.expectedCash) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {reg.countedCash !== undefined ? formatCurrency(reg.countedCash) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {reg.cashDifference !== undefined ? (
                        <span
                          className={
                            reg.cashDifference === 0
                              ? 'text-emerald-600'
                              : reg.cashDifference > 0
                              ? 'text-blue-600'
                              : 'text-rose-600'
                          }
                        >
                          {reg.cashDifference > 0 ? '+' : ''}
                          {formatCurrency(reg.cashDifference)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          reg.status === 'aberto'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {reg.status === 'aberto' ? 'Aberto' : 'Fechado'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Abertura de Caixa */}
      {isOpenModalActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Unlock className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Abertura de Caixa (Novo Turno)</h3>
              </div>
              <button
                onClick={() => setIsOpenModalActive(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOpenRegister} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor Inicial em Dinheiro (Fundo de Caixa / Troco) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={initialFloatInput}
                    onChange={(e) => setInitialFloatInput(e.target.value)}
                    placeholder="100.00"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Dinheiro físico inicial colocado na gaveta para troco.
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                <span className="font-bold">Operador Responsável:</span> {userName}
                <br />
                <span className="font-bold">Data/Hora:</span> {new Date().toLocaleString('pt-BR')}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModalActive(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-600/30"
                >
                  ABRIR CAIXA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Suprimento / Sangria Manual */}
      {isMovementModalActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {movementType === 'suprimento' ? (
                  <PlusCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <MinusCircle className="w-5 h-5 text-rose-400" />
                )}
                <h3 className="font-bold text-base">
                  {movementType === 'suprimento'
                    ? 'Novo Suprimento (Entrada de Dinheiro)'
                    : 'Nova Sangria (Retirada de Dinheiro)'}
                </h3>
              </div>
              <button
                onClick={() => setIsMovementModalActive(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMovement} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor da Movimentação (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={movementAmountInput}
                    onChange={(e) => setMovementAmountInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Justificativa / Descrição *
                </label>
                <input
                  type="text"
                  required
                  value={movementDescInput}
                  onChange={(e) => setMovementDescInput(e.target.value)}
                  placeholder={
                    movementType === 'suprimento'
                      ? 'Ex: Troco extra trazido do cofre...'
                      : 'Ex: Pagamento do fornecedor de pães, sangria de segurança...'
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMovementModalActive(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-sm ${
                    movementType === 'suprimento'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Registrar {movementType === 'suprimento' ? 'Suprimento' : 'Sangria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Fechamento de Caixa */}
      {isCloseModalActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col my-8 animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-base">Conferência e Fechamento de Caixa</h3>
              </div>
              <button
                onClick={() => setIsCloseModalActive(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmClose} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Financial summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-800 uppercase tracking-wide pb-1 border-b border-slate-200">
                  Resumo Financeiro da Gaveta
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Fundo Inicial:</span>
                  <span className="font-mono">{formatCurrency(activeRegister?.initialFloat)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Vendas em Dinheiro:</span>
                  <span className="font-mono">{formatCurrency(currentStats?.dinheiro)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Entradas Manuais (Suprimentos):</span>
                  <span className="font-mono">+{formatCurrency(currentStats?.suprimentos)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Retiradas Manuais (Sangrias):</span>
                  <span className="font-mono">-{formatCurrency(currentStats?.sangrias)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-slate-900 text-sm">
                  <span>Dinheiro Físico Esperado:</span>
                  <span className="font-mono text-emerald-800">
                    {formatCurrency(currentStats?.expectedCashInDrawer)}
                  </span>
                </div>
              </div>

              {/* Informar Dinheiro Contado */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Valor Contado Fisicamente na Gaveta (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={countedCashInput}
                    onChange={(e) => setCountedCashInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Calculated Difference Indicator */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  Math.abs(previewDiff) < 0.01
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : previewDiff > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <span className="font-bold">
                  {Math.abs(previewDiff) < 0.01
                    ? '✓ Caixa sem diferença (Conferência exata)'
                    : previewDiff > 0
                    ? 'Sobra de Caixa:'
                    : 'Falta no Caixa (Quebra):'}
                </span>
                <span className="font-mono font-black text-sm">
                  {formatCurrency(previewDiff)}
                </span>
              </div>

              {/* Observations */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observações / Justificativa (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={closureNotesInput}
                  onChange={(e) => setClosureNotesInput(e.target.value)}
                  placeholder="Justifique qualquer divergência ou deixe um recado para a gerência..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCloseModalActive(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  CONFIRMAR FECHAMENTO DE CAIXA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
