import React from 'react';
import { Printer, X, CheckCircle, Download } from 'lucide-react';
import { Sale, BakerySettings } from '../types';
import { formatCurrency, formatDateTime, padComanda } from '../utils/formatters';

interface ComprovanteModalProps {
  sale: Sale | null;
  settings: BakerySettings;
  onClose: () => void;
}

export const ComprovanteModal: React.FC<ComprovanteModalProps> = ({
  sale,
  settings,
  onClose,
}) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTxt = () => {
    const lines = [
      '==========================================',
      settings.name.toUpperCase(),
      settings.tradeName ? `(${settings.tradeName})` : '',
      `CNPJ: ${settings.cnpj}`,
      `TEL: ${settings.phone}`,
      settings.address,
      '==========================================',
      `COMPROVANTE DE VENDA NÃO FISCAL`,
      `VENDA Nº: ${sale.code.toString().padStart(6, '0')}`,
      `COMANDA: ${padComanda(sale.comandaNumber)}`,
      `DATA/HORA: ${formatDateTime(sale.createdAt)}`,
      `OPERADOR(A): ${sale.cashierName}`,
      '------------------------------------------',
      'ITEM   QTD  UN   VALOR(R$)   TOTAL(R$)',
      '------------------------------------------',
      ...sale.items.map((it, idx) => {
        const qtyLabel =
          it.unit === 'kg'
            ? `${it.weightInGrams || Math.round(it.quantity * 1000)}g`
            : `${it.quantity} ${it.unit}`;
        const rateLabel = it.unit === 'kg' ? `${it.unitPrice.toFixed(2)}/kg` : it.unitPrice.toFixed(2);
        return `${(idx + 1).toString().padStart(2, '0')} ${it.name.substring(0, 18).padEnd(18, ' ')} ${qtyLabel} x ${rateLabel} = ${it.total.toFixed(2)}`;
      }),
      '------------------------------------------',
      `SUBTOTAL: ${formatCurrency(sale.subtotal)}`,
      sale.discount > 0 ? `DESCONTO: -${formatCurrency(sale.discount)}` : '',
      `TOTAL: ${formatCurrency(sale.total)}`,
      '------------------------------------------',
      'FORMAS DE PAGAMENTO:',
      ...sale.payments.map((p) => {
        let label = p.method.toUpperCase();
        let details = `${label}: ${formatCurrency(p.amount)}`;
        if (p.method === 'dinheiro' && p.cashTendered && p.cashTendered > p.amount) {
          details += ` (Entregue: ${formatCurrency(p.cashTendered)} | Troco: ${formatCurrency(p.change || 0)})`;
        }
        return details;
      }),
      '==========================================',
      settings.receiptFooterMessage,
      '==========================================',
    ].filter(Boolean);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprovante_venda_${sale.code}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm tracking-wide">Venda Concluída com Sucesso!</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Receipt Content Container */}
        <div className="p-6 bg-slate-50 flex justify-center overflow-y-auto max-h-[70vh]">
          {/* Printable Ticket */}
          <div
            id="printable-receipt"
            className="w-full bg-white p-6 shadow-sm border border-slate-200 rounded-lg font-mono text-xs leading-relaxed text-slate-800 select-text"
          >
            {/* Bakery Info */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="font-extrabold text-sm tracking-tight text-slate-900 font-sans">
                {settings.name}
              </h2>
              {settings.tradeName && (
                <div className="text-[11px] text-slate-600">{settings.tradeName}</div>
              )}
              <div className="text-[10px] text-slate-600 mt-1">CNPJ: {settings.cnpj}</div>
              <div className="text-[10px] text-slate-600">TEL: {settings.phone}</div>
              <div className="text-[10px] text-slate-600">{settings.address}</div>
              <div className="text-[10px] text-slate-600">{settings.city}</div>
            </div>

            {/* Receipt Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
              <div className="flex justify-between font-bold">
                <span>CUPOM NÃO FISCAL</span>
                <span>VENDA #{sale.code.toString().padStart(6, '0')}</span>
              </div>
              <div className="flex justify-between">
                <span>{padComanda(sale.comandaNumber)}</span>
                <span>{formatDateTime(sale.createdAt)}</span>
              </div>
              <div className="text-[10px] text-slate-600">
                Atendente / Caixa: {sale.cashierName}
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <div className="font-bold text-[10px] text-slate-600 pb-1 flex justify-between border-b border-slate-200">
                <span>ITEM / DESCRIÇÃO</span>
                <span>TOTAL</span>
              </div>
              <div className="divide-y divide-slate-100 mt-1.5 space-y-1">
                {sale.items.map((it, idx) => (
                  <div key={idx} className="pt-1 text-[11px]">
                    <div className="flex justify-between font-medium">
                      <span>
                        {(idx + 1).toString().padStart(2, '0')}. {it.name}
                      </span>
                      <span className="font-bold">{formatCurrency(it.total)}</span>
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {it.unit === 'kg'
                        ? `${it.weightInGrams || Math.round(it.quantity * 1000)} g x ${formatCurrency(it.unitPrice)}/kg`
                        : `${it.quantity} ${it.unit} x ${formatCurrency(it.unitPrice)}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({sale.items.reduce((a, b) => a + b.quantity, 0)} itens):</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Desconto:</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-slate-200 text-slate-900">
                <span>TOTAL A PAGAR:</span>
                <span className="text-blue-700">{formatCurrency(sale.total)}</span>
              </div>
            </div>

            {/* Payments list */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
              <div className="font-bold text-[10px] text-slate-600 uppercase tracking-wider mb-1">
                Pagamentos Realizados:
              </div>
              {sale.payments.map((p, idx) => (
                <div key={idx} className="text-[11px]">
                  <div className="flex justify-between">
                    <span className="capitalize font-medium">
                      • {p.method === 'pix' ? 'PIX' : p.method === 'debito' ? 'Cartão Débito' : p.method === 'credito' ? 'Cartão Crédito' : 'Dinheiro'}:
                    </span>
                    <span className="font-bold">{formatCurrency(p.amount)}</span>
                  </div>
                  {p.method === 'dinheiro' && p.cashTendered && p.cashTendered > p.amount && (
                    <div className="pl-3 text-[10px] text-slate-600 flex justify-between">
                      <span>Valor entregue: {formatCurrency(p.cashTendered)}</span>
                      <span className="font-bold text-emerald-600">
                        Troco: {formatCurrency(p.change || 0)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer Message */}
            <div className="pt-3 text-center text-[10px] text-slate-600">
              <p className="font-medium">{settings.receiptFooterMessage}</p>
              <p className="mt-1 text-[9px] text-slate-600">Sistema PaniPro Gestão de Padaria</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={handleDownloadTxt}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar .TXT</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Cupom</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-600/30"
            >
              Concluir & Próxima Venda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
