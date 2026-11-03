import React from 'react';
import { Printer, X, ShoppingBag, Banknote, CreditCard, QrCode } from 'lucide-react';
import { BakerySettings } from '../types';
import { formatCurrency, formatPercent, formatDateTime } from '../utils/formatters';

interface ProductRankingItem {
  productId: string;
  name: string;
  unit: string;
  qty: number;
  totalWeightInGrams: number;
  revenue: number;
  cost: number;
  profit: number;
}

interface PrintManagementReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BakerySettings;
  periodLabel: string;
  kpis: {
    revenue: number;
    count: number;
    ticketMedio: number;
    totalCost: number;
    grossProfit: number;
    marginPercent: number;
    dinheiro: number;
    debito: number;
    credito: number;
    pix: number;
  };
  productRankings: ProductRankingItem[];
}

export const PrintManagementReportModal: React.FC<PrintManagementReportModalProps> = ({
  isOpen,
  onClose,
  settings,
  periodLabel,
  kpis,
  productRankings,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const nowFormatted = formatDateTime(new Date().toISOString());

  // Total items or weights
  const totalUnits = productRankings
    .filter((p) => p.unit !== 'kg')
    .reduce((acc, p) => acc + p.qty, 0);

  const totalKg = productRankings
    .filter((p) => p.unit === 'kg')
    .reduce((acc, p) => acc + p.totalWeightInGrams / 1000, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Top Control Bar (Hidden on actual print) */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Impressão do Relatório Gerencial
              </h3>
              <p className="text-[11px] text-slate-400">
                Período: <span className="text-blue-300 font-semibold">{periodLabel}</span> • Total {formatCurrency(kpis.revenue)}
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
            id="printable-management-report"
            className="bg-white w-full max-w-3xl p-6 sm:p-10 rounded-xl shadow-xs border border-slate-200 text-slate-900 font-sans print:shadow-none print:border-none print:p-0"
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
                    <div>{settings.address} - {settings.city}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-extrabold uppercase tracking-wider text-slate-800 border border-slate-200">
                    Relatório Gerencial
                  </div>
                  <div className="text-[11px] font-bold text-slate-900 mt-2">
                    Período: <span className="text-blue-700">{periodLabel}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Emissão: {nowFormatted}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-center">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Faturamento</span>
                <span className="text-base font-black text-slate-950 font-mono">
                  {formatCurrency(kpis.revenue)}
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">Vendas: {kpis.count}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Custo Estimado</span>
                <span className="text-base font-black text-slate-700 font-mono">
                  {formatCurrency(kpis.totalCost)}
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">Custo mercadoria</span>
              </div>
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                <span className="text-[9px] font-bold text-emerald-800 uppercase block">Lucro Bruto</span>
                <span className="text-base font-black text-emerald-700 font-mono">
                  {formatCurrency(kpis.grossProfit)}
                </span>
                <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">
                  Margem: {formatPercent(kpis.marginPercent)}
                </span>
              </div>
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg">
                <span className="text-[9px] font-bold text-blue-800 uppercase block">Ticket Médio</span>
                <span className="text-base font-black text-blue-700 font-mono">
                  {formatCurrency(kpis.ticketMedio)}
                </span>
                <span className="text-[9px] text-blue-600 block mt-0.5">Por comanda</span>
              </div>
            </div>

            {/* Payment Method Breakdown Bar */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                Faturamento por Modalidade de Pagamento
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 bg-white rounded border border-slate-200 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-[10px]">
                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dinheiro</span>
                  </div>
                  <div className="mt-1 font-mono font-bold text-slate-900">
                    {formatCurrency(kpis.dinheiro)}
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {kpis.revenue > 0 ? ((kpis.dinheiro / kpis.revenue) * 100).toFixed(1) : '0'}% do total
                  </div>
                </div>

                <div className="p-2 bg-white rounded border border-slate-200 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-[10px]">
                    <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                    <span>Débito</span>
                  </div>
                  <div className="mt-1 font-mono font-bold text-slate-900">
                    {formatCurrency(kpis.debito)}
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {kpis.revenue > 0 ? ((kpis.debito / kpis.revenue) * 100).toFixed(1) : '0'}% do total
                  </div>
                </div>

                <div className="p-2 bg-white rounded border border-slate-200 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-[10px]">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Crédito</span>
                  </div>
                  <div className="mt-1 font-mono font-bold text-slate-900">
                    {formatCurrency(kpis.credito)}
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {kpis.revenue > 0 ? ((kpis.credito / kpis.revenue) * 100).toFixed(1) : '0'}% do total
                  </div>
                </div>

                <div className="p-2 bg-white rounded border border-slate-200 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-[10px]">
                    <QrCode className="w-3.5 h-3.5 text-teal-600" />
                    <span>PIX</span>
                  </div>
                  <div className="mt-1 font-mono font-bold text-slate-900">
                    {formatCurrency(kpis.pix)}
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {kpis.revenue > 0 ? ((kpis.pix / kpis.revenue) * 100).toFixed(1) : '0'}% do total
                  </div>
                </div>
              </div>
            </div>

            {/* Ranking of Products Table */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-slate-700" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Desempenho e Lucratividade por Produto ({productRankings.length})
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">
                  {totalKg > 0 && <span>{totalKg.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg • </span>}
                  <span>{totalUnits} unidades vendidas</span>
                </div>
              </div>

              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300">
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-2">Produto</th>
                      <th className="py-2 px-2 text-center">Qtd / Peso Vendido</th>
                      <th className="py-2 px-2 text-right">Faturamento</th>
                      <th className="py-2 px-2 text-right">Custo Est.</th>
                      <th className="py-2 px-2 text-right">Lucro Bruto</th>
                      <th className="py-2 px-2 text-right">Margem %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {productRankings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">
                          Nenhum produto vendido no período selecionado.
                        </td>
                      </tr>
                    ) : (
                      productRankings.map((p, idx) => {
                        const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-1.5 px-2 text-center font-bold text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-1.5 px-2 font-bold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span>{p.name}</span>
                                {p.unit === 'kg' && (
                                  <span className="px-1 py-0.2 rounded text-[8px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                    KG
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-1.5 px-2 text-center font-semibold text-slate-800">
                              {p.unit === 'kg' ? (
                                <span>
                                  {(p.totalWeightInGrams / 1000).toLocaleString('pt-BR', {
                                    minimumFractionDigits: 3,
                                    maximumFractionDigits: 3,
                                  })}{' '}
                                  kg
                                  <span className="text-slate-500 text-[9px] ml-1">
                                    ({Math.round(p.totalWeightInGrams).toLocaleString('pt-BR')}g)
                                  </span>
                                </span>
                              ) : (
                                <span>
                                  {p.qty} {p.unit || 'un'}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(p.revenue)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-600">
                              {formatCurrency(p.cost)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-800">
                              {formatCurrency(p.profit)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-blue-800">
                              {formatPercent(margin)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold text-[10px]">
                      <td colSpan={2} className="py-2.5 px-2 uppercase text-slate-900">
                        Totais Consolidados ({productRankings.length} produtos)
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-900 font-semibold">
                        {totalKg > 0 ? `${totalKg.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg • ` : ''}
                        {totalUnits} un
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-950 font-black">
                        {formatCurrency(kpis.revenue)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-700">
                        {formatCurrency(kpis.totalCost)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs text-emerald-800 font-black">
                        {formatCurrency(kpis.grossProfit)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs text-blue-900 font-black">
                        {formatPercent(kpis.marginPercent)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
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
                <span className="text-[9px] text-slate-400">Gerência / Diretoria</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
