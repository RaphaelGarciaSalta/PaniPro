import React, { useMemo } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Receipt,
  TrendingUp,
  Banknote,
  CreditCard,
  QrCode,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Landmark,
} from 'lucide-react';
import { Sale, Product, Comanda } from '../types';
import { formatCurrency, formatDateTime, formatTime, padComanda } from '../utils/formatters';
import { storage } from '../services/storage';

interface DashboardViewProps {
  onNavigate: (view: any) => void;
  onOpenComandaQuick: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenComandaQuick,
}) => {
  const sales = storage.getSales();
  const comandas = storage.getComandas();
  const products = storage.getProducts();
  const activeRegister = storage.getActiveCashRegister();

  // Filter sales from TODAY
  const todaySales = useMemo(() => {
    const today = new Date().toDateString();
    return sales.filter((s) => {
      const d = new Date(s.createdAt).toDateString();
      return d === today && s.status === 'finalizada';
    });
  }, [sales]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const revenue = todaySales.reduce((acc, s) => acc + s.total, 0);
    const count = todaySales.length;
    const ticketMedio = count > 0 ? revenue / count : 0;
    const openComandasCount = comandas.filter((c) => c.status === 'em_atendimento').length;

    let dinheiro = 0;
    let debito = 0;
    let credito = 0;
    let pix = 0;

    todaySales.forEach((s) => {
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
      openComandasCount,
      dinheiro,
      debito,
      credito,
      pix,
    };
  }, [todaySales, comandas]);

  // Top products sold today
  const topProducts = useMemo(() => {
    const map: { [id: string]: { name: string; qty: number; revenue: number } } = {};

    todaySales.forEach((s) => {
      s.items.forEach((it) => {
        if (!map[it.productId]) {
          map[it.productId] = { name: it.name, qty: 0, revenue: 0 };
        }
        map[it.productId].qty += it.quantity;
        map[it.productId].revenue += it.total;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [todaySales]);

  // Recent sales (latest 6)
  const recentSales = useMemo(() => {
    return sales.slice(0, 6);
  }, [sales]);

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      {/* Quick Action Top Alert / Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
            Painel Operacional em Tempo Real
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-0.5">
            Faturamento de Hoje: {formatCurrency(kpis.revenue)}
          </h2>
          <p className="text-xs text-blue-100 mt-1">
            {kpis.count} {kpis.count === 1 ? 'venda registrada' : 'vendas registradas'} hoje com
            ticket médio de {formatCurrency(kpis.ticketMedio)}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('comandas')}
            className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>Ver Comandas ({kpis.openComandasCount})</span>
          </button>
          <button
            onClick={() => onNavigate('caixa')}
            className="px-4 py-2.5 bg-blue-800/80 hover:bg-blue-900 text-white rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Landmark className="w-4 h-4" />
            <span>{activeRegister ? 'Caixa Aberto' : 'Abrir Caixa'}</span>
          </button>
        </div>
      </div>

      {/* Main 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Faturamento de Hoje
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(kpis.revenue)}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Receita confirmada</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Quantidade de Vendas */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Vendas Realizadas
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{kpis.count}</div>
            <div className="text-[11px] text-slate-600 mt-0.5">Atendimentos finalizados</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Comandas Abertas */}
        <div
          onClick={() => onNavigate('comandas')}
          className="p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-amber-400 shadow-xs flex items-center justify-between cursor-pointer transition-all"
        >
          <div>
            <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Comandas Abertas
            </div>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {kpis.openComandasCount}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">Em consumo no momento</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Ticket Médio
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(kpis.ticketMedio)}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">Por cliente atendido</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 4 Cards for Payment Methods */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Faturamento por Forma de Pagamento (Hoje)
          </h3>
          <span className="text-xs text-slate-600">Considera pagamentos divididos</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Dinheiro */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-bold">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>Dinheiro</span>
            </div>
            <div className="text-lg font-black text-slate-900 mt-1.5">
              {formatCurrency(kpis.dinheiro)}
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              {kpis.revenue > 0 ? ((kpis.dinheiro / kpis.revenue) * 100).toFixed(1) : 0}% do faturamento
            </div>
          </div>

          {/* Débito */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-bold">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Cartão Débito</span>
            </div>
            <div className="text-lg font-black text-slate-900 mt-1.5">
              {formatCurrency(kpis.debito)}
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              {kpis.revenue > 0 ? ((kpis.debito / kpis.revenue) * 100).toFixed(1) : 0}% do faturamento
            </div>
          </div>

          {/* Crédito */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-bold">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Cartão Crédito</span>
            </div>
            <div className="text-lg font-black text-slate-900 mt-1.5">
              {formatCurrency(kpis.credito)}
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              {kpis.revenue > 0 ? ((kpis.credito / kpis.revenue) * 100).toFixed(1) : 0}% do faturamento
            </div>
          </div>

          {/* PIX */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-bold">
              <QrCode className="w-4 h-4 text-teal-600" />
              <span>PIX Instantâneo</span>
            </div>
            <div className="text-lg font-black text-slate-900 mt-1.5">
              {formatCurrency(kpis.pix)}
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              {kpis.revenue > 0 ? ((kpis.pix / kpis.revenue) * 100).toFixed(1) : 0}% do faturamento
            </div>
          </div>
        </div>
      </div>

      {/* 2 Column Section: Recent Sales + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Sales (8 cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Últimas Vendas Realizadas</h3>
              </div>
              <button
                onClick={() => onNavigate('historico')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sales Table */}
            {recentSales.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Receipt className="w-10 h-10 mx-auto stroke-1 mb-2 text-slate-300" />
                <p className="text-xs font-semibold">Nenhuma venda registrada ainda</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Abra uma comanda no menu Comandas para iniciar.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-2.5 px-2">Venda #</th>
                      <th className="py-2.5 px-2">Comanda</th>
                      <th className="py-2.5 px-2">Horário</th>
                      <th className="py-2.5 px-2">Total</th>
                      <th className="py-2.5 px-2">Pagamento</th>
                      <th className="py-2.5 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {recentSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-2 font-bold text-slate-900">
                          #{sale.code.toString().padStart(4, '0')}
                        </td>
                        <td className="py-2.5 px-2 font-semibold text-blue-700">
                          {padComanda(sale.comandaNumber)}
                        </td>
                        <td className="py-2.5 px-2 text-slate-500">{formatTime(sale.createdAt)}</td>
                        <td className="py-2.5 px-2 font-bold text-slate-900">
                          {formatCurrency(sale.total)}
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex flex-wrap gap-1">
                            {sale.payments.map((p, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 capitalize"
                              >
                                {p.method}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Finalizada
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Top Products (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Mais Vendidos Hoje</h3>
              </div>
              <button
                onClick={() => onNavigate('produtos')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Catálogo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {topProducts.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <ShoppingBag className="w-10 h-10 mx-auto stroke-1 mb-2 text-slate-300" />
                <p className="text-xs font-semibold">Sem vendas hoje ainda</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2 space-y-2">
                {topProducts.map((prod, idx) => (
                  <div key={idx} className="pt-2 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-800">{prod.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {prod.qty} unidades vendidas
                        </div>
                      </div>
                    </div>
                    <div className="font-extrabold text-slate-900">
                      {formatCurrency(prod.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 text-center">
            Atualizado automaticamente a cada comanda finalizada
          </div>
        </div>
      </div>
    </div>
  );
};
