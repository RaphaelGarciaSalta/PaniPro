import React, { useState, useMemo } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Receipt,
  Calculator,
  ArrowRight,
} from 'lucide-react';
import { Comanda, PaymentEntry, PaymentMethod, Sale } from '../types';
import { formatCurrency, padComanda, calculateItemSubtotal } from '../utils/formatters';
import { storage } from '../services/storage';

interface FechamentoModalProps {
  comanda: Comanda | null;
  cashierName: string;
  onClose: () => void;
  onSuccess: (sale: Sale) => void;
}

export const FechamentoModal: React.FC<FechamentoModalProps> = ({
  comanda,
  cashierName,
  onClose,
  onSuccess,
}) => {
  if (!comanda) return null;

  // Items and total
  const itemsSubtotal = useMemo(() => {
    return comanda.items.reduce(
      (acc, item) => acc + calculateItemSubtotal(item.unitPrice, item.quantity, item.unit, item.weightInGrams),
      0
    );
  }, [comanda.items]);

  const [discount, setDiscount] = useState<number>(0);
  const totalDue = useMemo(() => {
    return Math.max(0, itemsSubtotal - discount);
  }, [itemsSubtotal, discount]);

  // Payment lines
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('dinheiro');
  const [inputAmount, setInputAmount] = useState<string>('');
  const [cashTenderedInput, setCashTenderedInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calculations
  const totalPaid = useMemo(() => {
    return payments.reduce((acc, p) => acc + p.amount, 0);
  }, [payments]);

  const remainingBalance = useMemo(() => {
    const rem = totalDue - totalPaid;
    return Math.abs(rem) < 0.009 ? 0 : Number(rem.toFixed(2));
  }, [totalDue, totalPaid]);

  // Total change from all cash payments
  const totalChange = useMemo(() => {
    return payments.reduce((acc, p) => acc + (p.change || 0), 0);
  }, [payments]);

  // Set default input amount when modal opens or remaining balance changes
  React.useEffect(() => {
    if (remainingBalance > 0 && !inputAmount) {
      setInputAmount(remainingBalance.toFixed(2));
    }
  }, [remainingBalance]);

  // Handle adding payment entry
  const handleAddPayment = () => {
    setErrorMessage(null);
    const amount = parseFloat(inputAmount.replace(',', '.'));

    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Informe um valor de pagamento válido maior que zero.');
      return;
    }

    if (amount > remainingBalance) {
      setErrorMessage(
        `O valor a quitar (${formatCurrency(amount)}) não pode exceder o saldo restante (${formatCurrency(remainingBalance)}). Se o cliente entregou dinheiro a mais, informe no campo "Valor Entregue em Dinheiro" para troco.`
      );
      return;
    }

    let cashTendered: number | undefined = undefined;
    let change: number | undefined = undefined;

    if (selectedMethod === 'dinheiro') {
      const tendered = cashTenderedInput ? parseFloat(cashTenderedInput.replace(',', '.')) : amount;
      if (isNaN(tendered) || tendered < amount) {
        setErrorMessage('O valor entregue pelo cliente em dinheiro não pode ser menor que o valor a quitar.');
        return;
      }
      cashTendered = tendered;
      change = Number((tendered - amount).toFixed(2));
    }

    const newPayment: PaymentEntry = {
      id: 'pay-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      method: selectedMethod,
      amount: Number(amount.toFixed(2)),
      cashTendered,
      change,
    };

    setPayments((prev) => [...prev, newPayment]);

    // Reset input fields
    const nextRemaining = Number((remainingBalance - amount).toFixed(2));
    setInputAmount(nextRemaining > 0 ? nextRemaining.toFixed(2) : '');
    setCashTenderedInput('');
  };

  const handleRemovePayment = (id: string) => {
    const updated = payments.filter((p) => p.id !== id);
    setPayments(updated);
    const newPaid = updated.reduce((acc, p) => acc + p.amount, 0);
    const nextRem = Math.max(0, totalDue - newPaid);
    setInputAmount(nextRem > 0 ? nextRem.toFixed(2) : '');
    setErrorMessage(null);
  };

  const handleFastAddFullRemaining = (method: PaymentMethod) => {
    if (remainingBalance <= 0) return;
    setSelectedMethod(method);
    setInputAmount(remainingBalance.toFixed(2));
    setCashTenderedInput('');
  };

  // Submit sale
  const handleConfirmSale = () => {
    if (isSubmitting) return; // Prevent double clicks
    setErrorMessage(null);

    // If no payment was manually added yet, automatically apply the selected method for the full remaining amount
    let finalPayments = [...payments];
    if (finalPayments.length === 0 && remainingBalance > 0) {
      const amount = remainingBalance;
      const tendered =
        selectedMethod === 'dinheiro' && cashTenderedInput
          ? parseFloat(cashTenderedInput.replace(',', '.'))
          : amount;

      if (selectedMethod === 'dinheiro' && !isNaN(tendered) && tendered < amount) {
        setErrorMessage('O valor entregue em dinheiro não pode ser menor que o total a pagar.');
        return;
      }

      const change =
        selectedMethod === 'dinheiro' && tendered > amount
          ? Number((tendered - amount).toFixed(2))
          : 0;

      finalPayments = [
        {
          id: 'pay-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
          method: selectedMethod,
          amount: Number(amount.toFixed(2)),
          cashTendered: selectedMethod === 'dinheiro' ? tendered : undefined,
          change: selectedMethod === 'dinheiro' ? change : undefined,
        },
      ];
    }

    const currentTotalPaid = finalPayments.reduce((acc, p) => acc + p.amount, 0);
    const currentRemaining = Math.max(0, Number((totalDue - currentTotalPaid).toFixed(2)));

    if (currentRemaining > 0) {
      setErrorMessage(`Ainda resta um saldo pendente de ${formatCurrency(currentRemaining)}. Lance o pagamento restante antes de finalizar.`);
      return;
    }

    if (finalPayments.length === 0) {
      setErrorMessage('Adicione ao menos uma forma de pagamento.');
      return;
    }

    try {
      setIsSubmitting(true);
      const sale = storage.finalizeSale({
        comandaNumber: comanda.number,
        payments: finalPayments,
        cashierName,
        discount,
      });

      onSuccess(sale);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Erro ao finalizar a comanda.');
    }
  };

  // Quick cash calculator helpers
  const handleTenderedQuick = (val: number) => {
    setCashTenderedInput(val.toFixed(2));
  };

  const currentTenderedAmount = cashTenderedInput ? parseFloat(cashTenderedInput.replace(',', '.')) : 0;
  const currentQuittingAmount = inputAmount ? parseFloat(inputAmount.replace(',', '.')) : 0;
  const previewChange =
    selectedMethod === 'dinheiro' && currentTenderedAmount > currentQuittingAmount
      ? Number((currentTenderedAmount - currentQuittingAmount).toFixed(2))
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg flex items-center gap-2">
                Fechamento de Conta — {padComanda(comanda.number)}
              </h2>
              <p className="text-xs text-slate-400">
                Confira os itens, selecione as formas de pagamento e calcule o troco
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 max-h-[75vh] overflow-y-auto">
          {/* Column Left: Items Summary & Big Total (5 cols) */}
          <div className="md:col-span-5 bg-slate-50 p-6 border-r border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Itens Consumidos ({comanda.items.reduce((a, b) => a + b.quantity, 0)})
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {comanda.items.length} {comanda.items.length === 1 ? 'produto' : 'produtos'}
                </span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-200/80 my-3 max-h-60 overflow-y-auto pr-1">
                {comanda.items.map((it, idx) => {
                  const isKg = it.unit === 'kg';
                  const itemTotal = calculateItemSubtotal(
                    it.unitPrice,
                    it.quantity,
                    it.unit,
                    it.weightInGrams
                  );
                  return (
                    <div key={idx} className="py-2.5 text-xs flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-800">{it.name}</div>
                        <div className="text-slate-500 text-[11px]">
                          {isKg
                            ? `${it.weightInGrams} g x ${formatCurrency(it.unitPrice)}/kg`
                            : `${it.quantity} ${it.unit} x ${formatCurrency(it.unitPrice)}`}
                        </div>
                      </div>
                      <div className="font-bold text-slate-900 font-mono">
                        {formatCurrency(itemTotal)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total Display */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>Subtotal:</span>
                <span>{formatCurrency(itemsSubtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Desconto (R$):</span>
                <input
                  type="number"
                  min="0"
                  max={itemsSubtotal}
                  step="0.5"
                  value={discount === 0 ? '' : discount}
                  placeholder="0,00"
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-24 px-2 py-1 text-right bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Huge Total Card */}
              <div className="mt-3 p-4 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
                <div className="text-[11px] font-bold text-blue-100 uppercase tracking-wider">
                  Valor Total a Pagar
                </div>
                <div className="text-3xl font-black tracking-tight mt-1">
                  {formatCurrency(totalDue)}
                </div>
              </div>
            </div>
          </div>

          {/* Column Right: Payment Methods, Split Payment & Cash/Change (7 cols) */}
          <div className="md:col-span-7 p-6 flex flex-col justify-between space-y-5">
            {/* Top Balance Indicators */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Total Devido</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {formatCurrency(totalDue)}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Recebido</div>
                <div className="text-base font-bold text-emerald-800 mt-0.5">
                  {formatCurrency(totalPaid)}
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border ${
                  remainingBalance === 0
                    ? 'bg-emerald-500 text-white border-emerald-600'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div
                  className={`text-[10px] font-bold uppercase ${
                    remainingBalance === 0 ? 'text-white/80' : 'text-rose-600'
                  }`}
                >
                  {remainingBalance === 0 ? 'Status' : 'Saldo Restante'}
                </div>
                <div
                  className={`text-base font-black mt-0.5 ${
                    remainingBalance === 0 ? 'text-white' : 'text-rose-700'
                  }`}
                >
                  {remainingBalance === 0 ? '✓ QUITADO' : formatCurrency(remainingBalance)}
                </div>
              </div>
            </div>

            {/* Error banner if any */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Payment Add Section (if remaining > 0) */}
            {remainingBalance > 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Adicionar Pagamento
                  </span>
                  <span className="text-xs text-slate-500">
                    Restante:{' '}
                    <strong className="text-slate-900">{formatCurrency(remainingBalance)}</strong>
                  </span>
                </div>

                {/* 4 Methods Selector */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMethod('dinheiro');
                      setInputAmount(remainingBalance.toFixed(2));
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      selectedMethod === 'dinheiro'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Dinheiro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMethod('debito');
                      setInputAmount(remainingBalance.toFixed(2));
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      selectedMethod === 'debito'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Débito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMethod('credito');
                      setInputAmount(remainingBalance.toFixed(2));
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      selectedMethod === 'credito'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Crédito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMethod('pix');
                      setInputAmount(remainingBalance.toFixed(2));
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      selectedMethod === 'pix'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>PIX</span>
                  </button>
                </div>

                {/* Input Fields Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Valor a Quitar nesta Modalidade (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-600">
                        R$
                      </span>
                      <input
                        type="text"
                        value={inputAmount}
                        onChange={(e) => setInputAmount(e.target.value)}
                        placeholder="0,00"
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Cash Change Section (if Dinheiro is selected) */}
                  {selectedMethod === 'dinheiro' ? (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Valor Entregue pelo Cliente (R$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-600">
                          R$
                        </span>
                        <input
                          type="text"
                          value={cashTenderedInput}
                          onChange={(e) => setCashTenderedInput(e.target.value)}
                          placeholder="Valor entregue..."
                          className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>
                      {/* Fast notes buttons */}
                      <div className="flex gap-1.5 mt-1.5">
                        {[10, 20, 50, 100].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleTenderedQuick(val)}
                            className="px-1.5 py-0.5 text-[10px] bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold rounded-md"
                          >
                            +R${val}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => setInputAmount(remainingBalance.toFixed(2))}
                        className="w-full py-2 px-3 border border-slate-300 bg-white hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
                      >
                        Pagar Saldo Restante ({formatCurrency(remainingBalance)})
                      </button>
                    </div>
                  )}
                </div>

                {/* Troco Preview */}
                {selectedMethod === 'dinheiro' && previewChange > 0 && (
                  <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-emerald-700" />
                      Troco Automático:
                    </span>
                    <span className="font-extrabold text-emerald-800 text-sm">
                      {formatCurrency(previewChange)}
                    </span>
                  </div>
                )}

                {/* Add Payment Button */}
                <button
                  type="button"
                  onClick={handleAddPayment}
                  className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Confirmar Esta Parcela</span>
                </button>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                <CheckCircle className="w-7 h-7 text-emerald-600 mx-auto" />
                <div className="font-bold text-emerald-900 text-sm">Total Quitado!</div>
                <p className="text-xs text-emerald-700">
                  Todas as parcelas foram lançadas. Clique no botão abaixo para concluir a venda e
                  liberar a comanda.
                </p>
              </div>
            )}

            {/* List of Registered Payments */}
            <div>
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Pagamentos Registrados ({payments.length})</span>
                {totalChange > 0 && (
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Troco Total a Devolver: {formatCurrency(totalChange)}
                  </span>
                )}
              </div>

              {payments.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-600">
                  Nenhum pagamento inserido ainda. Selecione uma modalidade acima.
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          {p.method === 'dinheiro' ? (
                            <Banknote className="w-4 h-4" />
                          ) : p.method === 'pix' ? (
                            <QrCode className="w-4 h-4" />
                          ) : (
                            <CreditCard className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 capitalize">
                            {p.method === 'pix'
                              ? 'PIX'
                              : p.method === 'debito'
                              ? 'Cartão de Débito'
                              : p.method === 'credito'
                              ? 'Cartão de Crédito'
                              : 'Dinheiro'}
                          </div>
                          {p.method === 'dinheiro' && p.cashTendered && p.cashTendered > p.amount && (
                            <div className="text-[11px] text-slate-500">
                              Recebido: {formatCurrency(p.cashTendered)} | Troco:{' '}
                              <strong className="text-emerald-600">
                                {formatCurrency(p.change || 0)}
                              </strong>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-black text-sm text-slate-900">
                          {formatCurrency(p.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePayment(p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remover pagamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Action Button */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Voltar aos Itens
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSale}
                className="flex-1 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-extrabold shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Gravando Venda & Liberando Comanda...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>CONFIRMAR PAGAMENTO E FECHAR COMANDA</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
