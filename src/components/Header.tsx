import React, { useState, useEffect } from 'react';
import {
  Clock,
  PlusCircle,
  Landmark,
  Receipt,
  LogOut,
  Menu,
  Store,
} from 'lucide-react';
import { ViewType, getRoleInfo } from './Sidebar';
import { UserRole } from '../types';

interface HeaderProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  userRole: UserRole;
  isCashRegisterOpen: boolean;
  openComandasCount: number;
  onOpenComandaQuick: () => void;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  userRole,
  isCashRegisterOpen,
  openComandasCount,
  onOpenComandaQuick,
  userName,
  userEmail,
  onLogout,
  onOpenMobileMenu,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getViewDetails = () => {
    switch (currentView) {
      case 'dashboard':
        return {
          title: 'Visão Geral & Dashboard',
          subtitle: 'Métricas e faturamento em tempo real',
        };
      case 'comandas':
        return {
          title: 'Painel de Comandas',
          subtitle: 'Gerencie suas comandas em tempo real',
        };
      case 'atendimento':
        return {
          title: 'Atendimento & Pedidos',
          subtitle: 'Lançamento ágil de itens na comanda',
        };
      case 'produtos':
        return {
          title: 'Catálogo de Produtos',
          subtitle: 'Gestão de itens, categorias e preços',
        };
      case 'caixa':
        return {
          title: 'Controle de Caixa',
          subtitle: 'Abertura, fechamento e sangrias',
        };
      case 'historico':
        return {
          title: 'Histórico de Vendas',
          subtitle: 'Registro completo de transações',
        };
      case 'relatorios':
        return {
          title: 'Relatórios & DRE',
          subtitle: 'Desempenho financeiro e faturamento',
        };
      case 'configuracoes':
        return {
          title: 'Configurações',
          subtitle: 'Parâmetros e equipe do sistema',
        };
      default:
        return {
          title: 'Painel de Comandas',
          subtitle: 'Gerencie suas comandas em tempo real',
        };
    }
  };

  const { title, subtitle } = getViewDetails();
  const roleInfo = getRoleInfo(userRole);
  const RoleIcon = roleInfo.Icon;

  // Extract user initials
  const initials = (userName || roleInfo.label)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  return (
    <header className="h-[86px] min-h-[86px] bg-white border-b border-[#E8EDF3] px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 print:hidden z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all">
      {/* LEFT SECTION: Logo, Title, PDV Active */}
      <div className="flex items-center gap-3 sm:gap-4 md:gap-5 min-w-0">
        {/* Mobile menu trigger */}
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="p-2 -ml-2 text-[#718096] hover:text-[#17243A] hover:bg-slate-100 rounded-xl lg:hidden cursor-pointer transition-colors"
            aria-label="Abrir menu lateral"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* A. Sistema & Marca PaniPro */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Store className="w-4.5 h-4.5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#17243A] text-base tracking-tight hidden xs:inline-block">
              PaniPro
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/70">
              PDV
            </span>
          </div>
        </div>

        {/* Subtle separator */}
        <div className="h-6 w-px bg-[#E8EDF3] hidden sm:block shrink-0" />

        {/* B. Título da página & subtítulo */}
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm sm:text-base lg:text-lg font-bold text-[#17243A] tracking-tight truncate leading-tight">
            {title}
          </h1>
          <p className="text-[11px] sm:text-xs text-[#718096] font-normal leading-tight truncate hidden md:block">
            {subtitle}
          </p>
        </div>

        {/* C. Indicador de funcionamento do PDV (minimalista, ponto verde) */}
        <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-[#E8EDF3] shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
          </span>
          <span className="text-xs font-medium text-[#17243A] select-none">
            PDV Ativo
          </span>
        </div>
      </div>

      {/* RIGHT SECTION: Clock, Caixa Status, Comandas, Action Button, Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* D. Horário e data unificados em tempo real */}
        <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-50/80 transition-colors text-left border border-transparent hover:border-[#E8EDF3]">
          <Clock className="w-4 h-4 text-[#718096] shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-xs font-semibold text-[#17243A] tracking-tight">
              {currentTime}
            </span>
            <span className="text-[10px] text-[#718096] capitalize font-medium">
              {currentDate}
            </span>
          </div>
        </div>

        {/* E. Status do caixa integrado */}
        <button
          type="button"
          onClick={() => onNavigate('caixa')}
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E8EDF3] hover:border-slate-300 bg-white hover:bg-slate-50/80 text-xs transition-colors cursor-pointer group"
          title="Clique para gerenciar o caixa"
        >
          <Landmark className="w-3.5 h-3.5 text-[#718096] group-hover:text-[#17243A] transition-colors" />
          <span className="font-medium text-[#17243A]">
            {isCashRegisterOpen ? 'Caixa Aberto' : 'Caixa Fechado'}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isCashRegisterOpen ? 'bg-[#10B981]' : 'bg-[#EF4444]'
            }`}
          />
        </button>

        {/* F. Comandas abertas dinâmicas */}
        <button
          type="button"
          onClick={() => onNavigate('comandas')}
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E8EDF3] hover:border-slate-300 bg-white hover:bg-slate-50/80 text-xs transition-colors cursor-pointer group"
          title="Ver comandas ativas"
        >
          <Receipt className="w-3.5 h-3.5 text-[#718096] group-hover:text-[#17243A] transition-colors" />
          <span className="font-medium text-[#17243A]">
            {openComandasCount}{' '}
            <span className="text-[#718096]">
              {openComandasCount === 1 ? 'comanda aberta' : 'comandas abertas'}
            </span>
          </span>
        </button>

        {/* G. Botão principal: Atender Comanda (destaque suave e elegante) */}
        <button
          type="button"
          onClick={onOpenComandaQuick}
          className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Atender Comanda</span>
        </button>

        {/* H. Perfil do usuário (Apple minimalista) */}
        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-[#E8EDF3]">
          {/* Avatar circular */}
          <div
            className={`w-9 h-9 rounded-full border border-[#E8EDF3] flex items-center justify-center font-bold text-xs shadow-xs ${roleInfo.avatarBg}`}
            title={`${roleInfo.label} (${userEmail || ''})`}
          >
            {initials ? (
              <span className="font-semibold">{initials}</span>
            ) : (
              <RoleIcon className="w-4 h-4" />
            )}
          </div>

          {/* Nome e cargo do usuário */}
          <div className="hidden xl:flex flex-col text-left leading-tight">
            <span className="text-xs font-semibold text-[#17243A] truncate max-w-[130px]">
              {userName || roleInfo.label}
            </span>
            <span className="text-[10px] text-[#718096] font-medium">
              {roleInfo.label}
            </span>
          </div>

          {/* Botão discreto de logout */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 text-[#718096] hover:text-[#EF4444] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Sair do sistema"
              aria-label="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
