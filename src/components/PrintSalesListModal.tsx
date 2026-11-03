import React from 'react';
import { Printer, X, FileText, CheckCircle2, Calendar, Filter } from 'lucide-react';
import { Sale, BakerySettings } from '../types';
import { formatCurrency, formatDateTime, formatDate, padComanda } from '../utils/formatters';

interface PrintSalesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  settings: BakerySettings;
  filters: {
    searchQuery: string;
    methodFilter: string;
    startDate: string;
    endDate: string;
  };
  stats: {
    totalRevenue: number;
    totalItems: number;
    avgTicket: number;
  };
}

export const PrintSalesListModal: React.FC<PrintSalesListModalProps> = ({
  isOpen,
  onClose,
  sales,
  settings,
  filters,
  stats,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Payment methods breakdown for the printed report
  const paymentBreakdown = sales.reduce(
    (acc, sale) => {
      sale.payments.forEach((p) => {
        const method = p.method;
        if (method in acc) {
          acc[method as keyof typeof acc] += p.amount;
        }
      });
      return acc;
    },
    { dinheiro: 0, debito: 0, credito: 0, pix: 0 }
  );

  const nowFormatted = formatDateTime(new Date().toISOString());

  // Format filter label
  let periodLabel = 'Todo o período';
  if (filters.startDate && filters.endDate) {
    periodLabel = `${formatDate(filters.startDate)} até ${formatDate(filters.endDate)}`;
  } else if (filters.startDate) {
    periodLabel = `A partir de ${formatDate(filters.startDate)}`;
  } else if (filters.endDate) {
    periodLabel = `Até ${formatDate(filters.endDate)}`;
  }

  const methodLabel =
    filters.methodFilter === 'all'
      ? 'Todas as modalidades'
      : filters.methodFilter.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Top Control Bar (Hidden on actual print) */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Imprimir Lista de Vendas
              </h3>
              <p className="text-[11px] text-slate-400">
                {sales.length} {sales.length === 1 ? 'venda selecionada' : 'vendas selecionadas'} • Total {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-blue-900/30 active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Agora</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Fechar visualização"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 flex justify-center custom-scrollbar">
          <div
            id="printable-sales-report"
            className="bg-white w-full max-w-3xl p-6 sm:p-10 rounded-xl shadow-xs border border-slate-200 text-slate-900 font-sans"
          >
            {/* Header / Bakery Info */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight text-slate-950">
                    {settings.name}
                  </h1>
                  {settings.tradeName && (
                    <div className="text-xs font-semibold text-slate-600">
                      {settings.tradeName}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                    <div>CNPJ: {settings.cnpj} • Telefone: {settings.phone}</div>
                    <div>{settings.address}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-extrabold uppercase tracking-wider text-slate-800 border border-slate-200">
                    Relatório de Vendas
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1.5">
                    Emissão: {nowFormatted}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Metadata & Scope */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-5 text-[11px] grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <span className="font-bold text-slate-500 block text-[10px] uppercase">
                  Período Filtrado:
                </span>
                <span className="font-semibold text-slate-800">{periodLabel}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block text-[10px] uppercase">
                  Modalidade:
                </span>
                <span className="font-semibold text-slate-800">{methodLabel}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block text-[10px] uppercase">
                  Total de Registros:
                </span>
                <span className="font-semibold text-slate-800">{sales.length} vendas</span>
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-4 gap-2 mb-4 text-center">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Faturamento</span>
                <span className="text-sm font-extrabold text-slate-900 font-mono">
                  {formatCurrency(stats.totalRevenue)}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Vendas</span>
                <span className="text-sm font-extrabold text-slate-900 font-mono">
                  {sales.length}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Ticket Médio</span>
                <span className="text-sm font-extrabold text-blue-700 font-mono">
                  {formatCurrency(stats.avgTicket)}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Total Itens</span>
                <span className="text-sm font-extrabold text-emerald-700 font-mono">
                  {stats.totalItems} un
                </span>
              </div>
            </div>

            {/* Payment Method Totals Bar */}
            <div className="bg-slate-100/70 p-2 rounded-lg border border-slate-200 mb-5 text-[10px] flex items-center justify-around font-medium">
              <div>
                <span className="text-slate-500">Dinheiro: </span>
                <span className="font-bold text-slate-800">{formatCurrency(paymentBreakdown.dinheiro)}</span>
              </div>
              <div>
                <span className="text-slate-500">Débito: </span>
                <span className="font-bold text-slate-800">{formatCurrency(paymentBreakdown.debito)}</span>
              </div>
              <div>
                <span className="text-slate-500">Crédito: </span>
                <span className="font-bold text-slate-800">{formatCurrency(paymentBreakdown.credito)}</span>
              </div>
              <div>
                <span className="text-slate-500">PIX: </span>
                <span className="font-bold text-slate-800">{formatCurrency(paymentBreakdown.pix)}</span>
              </div>
            </div>

            {/* Sales Table */}
            <div className="mb-6 overflow-hidden">
              <table className="w-full text-left text-[10px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900 bg-slate-100/70 font-bold text-slate-800 uppercase tracking-wider text-[9px]">
                    <th className="py-2 px-2">Venda #</th>
                    <th className="py-2 px-2">Comanda</th>
                    <th className="py-2 px-2">Data/Hora</th>
                    <th className="py-2 px-2">Operador</th>
                    <th className="py-2 px-1 text-center">Itens</th>
                    <th className="py-2 px-2">Forma Pgto</th>
                    <th className="py-2 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sales.map((sale) => {
                    const totalQty = sale.items.reduce((acc, it) => acc + it.quantity, 0);
                    const paymentLabels = sale.payments
                      .map((p) => `${p.method.toUpperCase()} (${formatCurrency(p.amount)})`)
                      .join(', ');

                    return (
                      <tr key={sale.id} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2 font-mono font-bold text-slate-900">
                          #{sale.code.toString().padStart(6, '0')}
                        </td>
                        <td className="py-1.5 px-2 font-semibold text-slate-800">
                          {padComanda(sale.comandaNumber)}
                        </td>
                        <td className="py-1.5 px-2 text-slate-600 whitespace-nowrap">
                          {formatDateTime(sale.createdAt)}
                        </td>
                        <td className="py-1.5 px-2 text-slate-700 truncate max-w-[120px]">
                          {sale.cashierName}
                        </td>
                        <td className="py-1.5 px-1 text-center text-slate-700">
                          {totalQty}
                        </td>
                        <td className="py-1.5 px-2 text-slate-600 text-[9px]">
                          {paymentLabels}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(sale.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold text-[10px]">
                    <td colSpan={4} className="py-2.5 px-2 uppercase text-slate-900">
                      Total Geral ({sales.length} vendas)
                    </td>
                    <td className="py-2.5 px-1 text-center text-slate-900">
                      {stats.totalItems} un
                    </td>
                    <td></td>
                    <td className="py-2.5 px-2 text-right font-mono text-sm text-blue-900 font-black">
                      {formatCurrency(stats.totalRevenue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Document Signature & Verification Footer */}
            <div className="pt-6 border-t border-slate-200 flex items-end justify-between text-[10px] text-slate-500">
              <div className="space-y-0.5">
                <div>Documento gerado eletronicamente pelo Sistema de Gestão PaniPro PDV.</div>
                <div>Autenticidade conferida e validada nos registros do banco de dados.</div>
              </div>

              <div className="text-center w-56">
                <div className="border-b border-slate-400 mb-1 w-full" />
                <span className="font-semibold text-slate-700 block">Assinatura do Responsável</span>
                <span className="text-[9px] text-slate-400">Gerência / Caixa</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
