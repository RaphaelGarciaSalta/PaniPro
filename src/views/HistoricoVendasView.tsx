import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Receipt,
  Eye,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  Printer,
  X,
} from 'lucide-react';
import { Sale, PaymentMethod, BakerySettings } from '../types';
import { formatCurrency, formatDateTime, formatTime, padComanda } from '../utils/formatters';
import { storage } from '../services/storage';
import { ComprovanteModal } from '../components/ComprovanteModal';
import { PrintSalesListModal } from '../components/PrintSalesListModal';

export const HistoricoVendasView: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>(() => storage.getSales());
  const settings: BakerySettings = storage.getSettings();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Sale for Detail Modal or Receipt
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPrintListModalOpen, setIsPrintListModalOpen] = useState(false);

  React.useEffect(() => {
    return storage.subscribe(() => {
      setSales(storage.getSales());
    });
  }, []);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      // Search by sale code or comanda number
      const matchSearch =
        searchQuery.trim() === '' ||
        s.code.toString().includes(searchQuery.trim()) ||
        s.comandaNumber.toString().includes(searchQuery.trim()) ||
        padComanda(s.comandaNumber).toLowerCase().includes(searchQuery.toLowerCase());

      // Method filter
      const matchMethod =
        methodFilter === 'all' || s.payments.some((p) => p.method === methodFilter);

      // Date range filter
      let matchDate = true;
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const saleDate = new Date(s.createdAt);
        if (saleDate < start) matchDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const saleDate = new Date(s.createdAt);
        if (saleDate > end) matchDate = false;
      }

      return matchSearch && matchMethod && matchDate;
    });
  }, [sales, searchQuery, methodFilter, startDate, endDate]);

  // Aggregate stats of filtered sales
  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const totalItems = filteredSales.reduce(
      (acc, s) => acc + s.items.reduce((sum, it) => sum + it.quantity, 0),
      0
    );
    const avgTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
    return { totalRevenue, totalItems, avgTicket };
  }, [filteredSales]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredSales.length === 0) return;

    const headers = [
      'Venda #',
      'Comanda',
      'Data/Hora',
      'Itens Qtd',
      'Subtotal (R$)',
      'Desconto (R$)',
      'Total (R$)',
      'Formas de Pagamento',
      'Operador',
      'Status',
    ];

    const rows = filteredSales.map((s) => {
      const paymentSummary = s.payments.map((p) => `${p.method}: ${p.amount}`).join('; ');
      const totalItemsCount = s.items.reduce((sum, it) => sum + it.quantity, 0);
      return [
        s.code,
        s.comandaNumber,
        `"${formatDateTime(s.createdAt)}"`,
        totalItemsCount,
        s.subtotal.toFixed(2),
        s.discount.toFixed(2),
        s.total.toFixed(2),
        `"${paymentSummary}"`,
        `"${s.cashierName}"`,
        s.status,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico_vendas_padaria_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Histórico de Vendas</h2>
          <p className="text-xs text-slate-500">
            Registro imutável de todas as vendas e comprovantes finalizados no sistema.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsPrintListModalOpen(true)}
            disabled={filteredSales.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-98"
            title="Visualizar e imprimir a listagem de vendas filtradas"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Imprimir Lista de Vendas</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredSales.length === 0}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards for Filtered Results */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Faturamento Filtrado</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5">{filteredSales.length} vendas</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Ticket Médio</div>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {formatCurrency(stats.avgTicket)}
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5">Por venda finalizada</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Produtos Comercializados</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {stats.totalItems} un
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5">Unidades totais vendidas</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar Venda # ou Comanda..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        {/* Payment Method Filter */}
        <div className="flex items-center gap-2">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">Todas as Modalidades</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="debito">Cartão de Débito</option>
            <option value="credito">Cartão de Crédito</option>
            <option value="pix">PIX</option>
          </select>
        </div>

        {/* Date Pickers */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-600 text-[11px] font-semibold">De:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden"
          />
          <span className="text-slate-600 text-[11px] font-semibold">Até:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden"
          />
          {(startDate || endDate || searchQuery || methodFilter !== 'all') && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearchQuery('');
                setMethodFilter('all');
              }}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-bold ml-1"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Venda #</th>
                <th className="py-3 px-4">Comanda</th>
                <th className="py-3 px-4">Data e Horário</th>
                <th className="py-3 px-4 text-center">Itens</th>
                <th className="py-3 px-4 text-right">Valor Total</th>
                <th className="py-3 px-4">Formas de Pagamento</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto stroke-1 mb-2 text-slate-300" />
                    <p className="text-xs font-semibold">Nenhuma venda encontrada com estes filtros</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const itemsCount = sale.items.reduce((acc, it) => acc + it.quantity, 0);

                  return (
                    <tr
                      key={sale.id}
                      onClick={() => setSelectedSale(sale)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        #{sale.code.toString().padStart(6, '0')}
                      </td>
                      <td className="py-3 px-4 font-bold text-blue-700">
                        {padComanda(sale.comandaNumber)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{formatDateTime(sale.createdAt)}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {itemsCount} un
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {sale.payments.map((p, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 capitalize border border-slate-200"
                            >
                              {p.method}: {formatCurrency(p.amount)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Finalizada
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedSale(sale)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver Detalhes da Venda"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSale(sale);
                              setIsReceiptModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Imprimir Cupom"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
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

      {/* Sale Detail Modal */}
      {selectedSale && !isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col my-8 animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">
                  Detalhes da Venda #{selectedSale.code.toString().padStart(6, '0')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Comanda:</span>
                  <strong className="text-slate-900">{padComanda(selectedSale.comandaNumber)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Data e Horário:</span>
                  <strong className="text-slate-900">{formatDateTime(selectedSale.createdAt)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Operador(a):</span>
                  <strong className="text-slate-900">{selectedSale.cashierName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Status:</span>
                  <strong className="text-emerald-700 capitalize">Finalizada</strong>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Itens Comercializados
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {selectedSale.items.map((it, idx) => (
                    <div key={idx} className="p-3 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800">{it.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {it.unit === 'kg'
                            ? `${it.weightInGrams || Math.round(it.quantity * 1000)} g x ${formatCurrency(it.unitPrice)}/kg`
                            : `${it.quantity} ${it.unit} x ${formatCurrency(it.unitPrice)}`}
                        </div>
                      </div>
                      <div className="font-bold text-slate-900">{formatCurrency(it.total)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Desconto:</span>
                    <span className="font-mono">-{formatCurrency(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-slate-900 text-sm">
                  <span>Total Pago:</span>
                  <span className="text-blue-700 font-mono">{formatCurrency(selectedSale.total)}</span>
                </div>
              </div>

              {/* Payments */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Formas de Pagamento
                </h4>
                <div className="space-y-1.5">
                  {selectedSale.payments.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center"
                    >
                      <div>
                        <span className="font-bold capitalize">{p.method}</span>
                        {p.method === 'dinheiro' && p.cashTendered && p.cashTendered > p.amount && (
                          <span className="text-slate-500 block text-[10px]">
                            Entregue: {formatCurrency(p.cashTendered)} | Troco:{' '}
                            <strong className="text-emerald-600">{formatCurrency(p.change || 0)}</strong>
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-slate-900">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setIsReceiptModalOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Comprovante</span>
              </button>
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      {isReceiptModalOpen && selectedSale && (
        <ComprovanteModal
          sale={selectedSale}
          settings={settings}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setSelectedSale(null);
          }}
        />
      )}

      {/* Sales List Printable Report Modal */}
      <PrintSalesListModal
        isOpen={isPrintListModalOpen}
        onClose={() => setIsPrintListModalOpen(false)}
        sales={filteredSales}
        settings={settings}
        filters={{
          searchQuery,
          methodFilter,
          startDate,
          endDate,
        }}
        stats={stats}
      />
    </div>
  );
};
