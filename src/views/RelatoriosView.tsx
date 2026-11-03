import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Download,
  Calendar,
  Percent,
  Banknote,
  CreditCard,
  QrCode,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import { Sale, Product, BakerySettings } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { storage } from '../services/storage';
import { PrintManagementReportModal } from '../components/PrintManagementReportModal';

export const RelatoriosView: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>(() => storage.getSales());
  const [products, setProducts] = useState<Product[]>(() => storage.getProducts());
  const [settings, setSettings] = useState<BakerySettings>(() => storage.getSettings());

  // Period filter - defaults to 'today' as requested
  const [period, setPeriod] = useState<'today' | 'yesterday' | '7days' | '30days' | 'month' | 'custom'>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  React.useEffect(() => {
    return storage.subscribe(() => {
      setSales(storage.getSales());
      setProducts(storage.getProducts());
      setSettings(storage.getSettings());
    });
  }, []);

  // Filter sales based on period
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return sales.filter((s) => {
      const saleDate = new Date(s.createdAt);

      if (period === 'today') {
        return saleDate >= startOfToday;
      }
      if (period === 'yesterday') {
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        return saleDate >= startOfYesterday && saleDate < startOfToday;
      }
      if (period === '7days') {
        const sevenDaysAgo = new Date(startOfToday);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return saleDate >= sevenDaysAgo;
      }
      if (period === '30days') {
        const thirtyDaysAgo = new Date(startOfToday);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return saleDate >= thirtyDaysAgo;
      }
      if (period === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return saleDate >= startOfMonth;
      }
      if (period === 'custom') {
        let match = true;
        if (customStart) {
          const s = new Date(customStart);
          s.setHours(0, 0, 0, 0);
          if (saleDate < s) match = false;
        }
        if (customEnd) {
          const e = new Date(customEnd);
          e.setHours(23, 59, 59, 999);
          if (saleDate > e) match = false;
        }
        return match;
      }
      return true;
    });
  }, [sales, period, customStart, customEnd]);

  // KPIs
  const kpis = useMemo(() => {
    const revenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const count = filteredSales.length;
    const ticketMedio = count > 0 ? revenue / count : 0;
    const totalCost = filteredSales.reduce((acc, s) => acc + s.totalCost, 0);
    const grossProfit = filteredSales.reduce((acc, s) => acc + s.profit, 0);
    const marginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    // Payment methods breakdown
    let dinheiro = 0;
    let debito = 0;
    let credito = 0;
    let pix = 0;

    filteredSales.forEach((s) => {
      s.payments.forEach((p) => {
        if (p.method === 'dinheiro') dinheiro += p.amount;
        if (p.method === 'debito') debito += p.amount;
        if (p.method === 'credito') credito += p.amount;
        if (p.method === 'pix') pix += p.amount;
      });
    });

    return {
      revenue,
      count,
      ticketMedio,
      totalCost,
      grossProfit,
      marginPercent,
      dinheiro,
      debito,
      credito,
      pix,
    };
  }, [filteredSales]);

  // Product ranking
  const productRankings = useMemo(() => {
    const map: {
      [id: string]: {
        productId: string;
        name: string;
        unit: string;
        qty: number;
        totalWeightInGrams: number;
        revenue: number;
        cost: number;
        profit: number;
      };
    } = {};

    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        const prodDef = products.find((p) => p.id === it.productId);
        const isKg = it.unit === 'kg' || prodDef?.unit === 'kg';

        let itemWeightGrams = 0;
        if (isKg) {
          if (it.weightInGrams && it.weightInGrams > 0) {
            itemWeightGrams = it.weightInGrams;
          } else if (it.weightInKg && it.weightInKg > 0) {
            itemWeightGrams = it.weightInKg * 1000;
          } else if (it.quantity && it.quantity > 0) {
            itemWeightGrams = it.quantity < 50 ? it.quantity * 1000 : it.quantity;
          }
        }

        const itemCost = isKg
          ? ((itemWeightGrams / 1000) * it.costPrice)
          : (it.costPrice * it.quantity);

        if (!map[it.productId]) {
          map[it.productId] = {
            productId: it.productId,
            name: it.name,
            unit: isKg ? 'kg' : (it.unit || prodDef?.unit || 'un'),
            qty: 0,
            totalWeightInGrams: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
          };
        }

        if (isKg) {
          map[it.productId].unit = 'kg';
          map[it.productId].totalWeightInGrams += itemWeightGrams;
          map[it.productId].qty += itemWeightGrams / 1000;
        } else {
          map[it.productId].qty += it.quantity;
        }

        map[it.productId].revenue += it.total;
        map[it.productId].cost += itemCost;
        map[it.productId].profit += it.total - itemCost;
      });
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, products]);

  // Export report CSV
  const handleExportCSV = () => {
    if (productRankings.length === 0) return;

    const headers = [
      'Produto',
      'Qtd / Peso Vendido',
      'Unidade',
      'Faturamento (R$)',
      'Custo Estimado (R$)',
      'Lucro Bruto (R$)',
      'Margem %',
    ];

    const rows = productRankings.map((p) => {
      const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0';
      const qtdOrWeight =
        p.unit === 'kg'
          ? `${(p.totalWeightInGrams / 1000).toFixed(3).replace('.', ',')} kg (${Math.round(p.totalWeightInGrams)}g)`
          : `${p.qty} ${p.unit || 'un'}`;

      return [
        `"${p.name}"`,
        `"${qtdOrWeight}"`,
        `"${p.unit || 'un'}"`,
        p.revenue.toFixed(2).replace('.', ','),
        p.cost.toFixed(2).replace('.', ','),
        p.profit.toFixed(2).replace('.', ','),
        `${margin}%`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_produtos_lucro_${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Print management report
  const handlePrint = () => {
    window.print();
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'today':
        return 'Hoje';
      case 'yesterday':
        return 'Ontem';
      case '7days':
        return 'Últimos 7 Dias';
      case '30days':
        return 'Últimos 30 Dias';
      case 'month':
        return 'Este Mês';
      case 'custom':
        return `Personalizado (${customStart || 'Início'} até ${customEnd || 'Fim'})`;
      default:
        return 'Período Geral';
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 print:p-8 print:bg-white print:overflow-visible">
      {/* Formal Header for Print Output */}
      <div className="hidden print:block pb-4 mb-4 border-b-2 border-slate-900">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {settings.name}
            </h1>
            {settings.tradeName && (
              <p className="text-xs text-slate-700 font-semibold">{settings.tradeName}</p>
            )}
            <p className="text-[11px] text-slate-600">
              CNPJ: {settings.cnpj} | Telefone: {settings.phone}
            </p>
            <p className="text-[11px] text-slate-600">
              {settings.address} - {settings.city}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-300 text-xs font-bold uppercase rounded-md text-slate-900">
              Relatório Gerencial & Faturamento
            </span>
            <p className="text-xs font-bold text-slate-900 mt-1.5">
              Período: <span className="font-extrabold text-blue-700">{getPeriodLabel()}</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Emissão: {new Date().toLocaleDateString('pt-BR')} às{' '}
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* Header and Period Filter */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Relatórios Financeiros & Faturamento
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhe indicadores de vendas, custos, margens de lucro e ranking de produtos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period quick filters */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/90 shadow-xs">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === 'today'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriod('yesterday')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === 'yesterday'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Ontem
            </button>
            <button
              onClick={() => setPeriod('7days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === '7days'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === 'month'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === 'custom'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Personalizado
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={productRankings.length === 0}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            title="Exportar planilha CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs shadow-blue-600/30 active:scale-95"
            title="Abrir página e layout completo para impressão do relatório gerencial"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* Custom Date Pickers if Selected */}
      {period === 'custom' && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 text-xs print:hidden">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700">Período:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
          />
          <span>até</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>
      )}

      {/* 4 Financial Highlight KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        {/* Faturamento Total */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs print:p-3 print:rounded-lg print:border-slate-300 print:shadow-none">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Faturamento do Período
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(kpis.revenue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {kpis.count} {kpis.count === 1 ? 'venda realizada' : 'vendas realizadas'}
          </div>
        </div>

        {/* Custo Total Estimado */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs print:p-3 print:rounded-lg print:border-slate-300 print:shadow-none">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Custo dos Produtos Vendidos
          </div>
          <div className="text-2xl font-black text-slate-700 mt-1">
            {formatCurrency(kpis.totalCost)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Custo histórico de aquisição</div>
        </div>

        {/* Lucro Bruto Estimado */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs print:p-3 print:rounded-lg print:border-slate-300 print:shadow-none">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
            Lucro Bruto Estimado
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {formatCurrency(kpis.grossProfit)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            Margem Bruta: {formatPercent(kpis.marginPercent)}
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs print:p-3 print:rounded-lg print:border-slate-300 print:shadow-none">
          <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Ticket Médio</div>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {formatCurrency(kpis.ticketMedio)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Valor médio por comanda</div>
        </div>
      </div>

      {/* Payment Modalities Distribution */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 print:p-3 print:rounded-lg print:border-slate-300 print:shadow-none">
        <h3 className="text-sm font-bold text-slate-900">
          Distribuição por Forma de Pagamento no Período
        </h3>

        {/* Progress Bar */}
        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          {kpis.revenue > 0 ? (
            <>
              <div
                style={{ width: `${(kpis.dinheiro / kpis.revenue) * 100}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Dinheiro: ${formatCurrency(kpis.dinheiro)}`}
              />
              <div
                style={{ width: `${(kpis.debito / kpis.revenue) * 100}%` }}
                className="bg-blue-500 h-full transition-all"
                title={`Débito: ${formatCurrency(kpis.debito)}`}
              />
              <div
                style={{ width: `${(kpis.credito / kpis.revenue) * 100}%` }}
                className="bg-indigo-500 h-full transition-all"
                title={`Crédito: ${formatCurrency(kpis.credito)}`}
              />
              <div
                style={{ width: `${(kpis.pix / kpis.revenue) * 100}%` }}
                className="bg-teal-500 h-full transition-all"
                title={`PIX: ${formatCurrency(kpis.pix)}`}
              />
            </>
          ) : (
            <div className="w-full bg-slate-200 h-full" />
          )}
        </div>

        {/* Modality Legend & Values */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Dinheiro</span>
            </div>
            <div className="text-base font-black text-slate-900 mt-1">
              {formatCurrency(kpis.dinheiro)}
            </div>
            <div className="text-[11px] text-emerald-700">
              {kpis.revenue > 0 ? ((kpis.dinheiro / kpis.revenue) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Cartão Débito</span>
            </div>
            <div className="text-base font-black text-slate-900 mt-1">
              {formatCurrency(kpis.debito)}
            </div>
            <div className="text-[11px] text-blue-700">
              {kpis.revenue > 0 ? ((kpis.debito / kpis.revenue) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
              <span className="w-3 h-3 rounded-full bg-indigo-500" />
              <span>Cartão Crédito</span>
            </div>
            <div className="text-base font-black text-slate-900 mt-1">
              {formatCurrency(kpis.credito)}
            </div>
            <div className="text-[11px] text-indigo-700">
              {kpis.revenue > 0 ? ((kpis.credito / kpis.revenue) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className="p-3 bg-teal-50/60 border border-teal-100 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
              <span className="w-3 h-3 rounded-full bg-teal-500" />
              <span>PIX</span>
            </div>
            <div className="text-base font-black text-slate-900 mt-1">
              {formatCurrency(kpis.pix)}
            </div>
            <div className="text-[11px] text-teal-700">
              {kpis.revenue > 0 ? ((kpis.pix / kpis.revenue) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Top Products and Profitability Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 print:p-3 print:rounded-lg print:border-slate-300 print:shadow-none">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Desempenho e Lucratividade por Produto ({productRankings.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">Ordenado por faturamento</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Produto</th>
                <th className="py-2.5 px-3 text-center">Qtd / Peso Vendido</th>
                <th className="py-2.5 px-3 text-right">Faturamento Total</th>
                <th className="py-2.5 px-3 text-right">Custo Total</th>
                <th className="py-2.5 px-3 text-right">Lucro Bruto</th>
                <th className="py-2.5 px-3 text-right">Margem Bruta %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {productRankings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhuma venda registrada no período selecionado.
                  </td>
                </tr>
              ) : (
                productRankings.map((prod, idx) => {
                  const margin = prod.revenue > 0 ? (prod.profit / prod.revenue) * 100 : 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{prod.name}</span>
                          {prod.unit === 'kg' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                              KG
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                        {prod.unit === 'kg' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {(prod.totalWeightInGrams / 1000).toLocaleString('pt-BR', {
                                minimumFractionDigits: 3,
                                maximumFractionDigits: 3,
                              })}{' '}
                              kg
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                              {Math.round(prod.totalWeightInGrams).toLocaleString('pt-BR')} g acumulados
                            </span>
                          </div>
                        ) : (
                          <span>
                            {prod.qty} {prod.unit || 'un'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(prod.revenue)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {formatCurrency(prod.cost)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(prod.profit)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                        {formatPercent(margin)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Impressão do Relatório Gerencial Completo */}
      <PrintManagementReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        settings={settings}
        periodLabel={getPeriodLabel()}
        kpis={kpis}
        productRankings={productRankings}
      />
    </div>
  );
};
