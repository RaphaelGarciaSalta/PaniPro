import React, { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  ShoppingBag,
  Landmark,
  History,
  BarChart3,
  Settings,
  Shield,
  ShieldCheck,
  UserCheck,
  Store,
  LogOut,
  X,
  Lock,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { UserRole } from '../types';

export type ViewType =
  | 'dashboard'
  | 'comandas'
  | 'atendimento'
  | 'produtos'
  | 'caixa'
  | 'historico'
  | 'relatorios'
  | 'configuracoes';

/**
 * Role access rules specified:
 * - Administrador: pode tudo
 * - Gerente: pode tudo
 * - Atendente: pode só ver a aba produtos e comandas
 * - Caixa: pode ver comandas, produtos, controle de caixa e dashboard
 */
export function canUserAccessView(role: UserRole, view: ViewType): boolean {
  if (role === 'admin' || role === 'gerente') {
    return true;
  }
  if (role === 'caixa') {
    return ['comandas', 'atendimento', 'produtos', 'caixa', 'dashboard'].includes(view);
  }
  if (role === 'atendente') {
    return ['comandas', 'atendimento', 'produtos'].includes(view);
  }
  return false;
}

export function getRoleInfo(role: UserRole) {
  switch (role) {
    case 'admin':
      return {
        label: 'Administrador',
        shortLabel: 'Admin',
        description: 'Acesso Total ao Sistema',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        Icon: Shield,
        avatarBg: 'bg-purple-100 text-purple-700',
      };
    case 'gerente':
      return {
        label: 'Gerente',
        shortLabel: 'Gerente',
        description: 'Acesso Total e Gestão',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        Icon: ShieldCheck,
        avatarBg: 'bg-indigo-100 text-indigo-700',
      };
    case 'caixa':
      return {
        label: 'Operador de Caixa',
        shortLabel: 'Caixa',
        description: 'Comandas, Produtos, Caixa & Dashboard',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        Icon: Landmark,
        avatarBg: 'bg-amber-100 text-amber-800',
      };
    case 'atendente':
    default:
      return {
        label: 'Atendente',
        shortLabel: 'Atendente',
        description: 'Apenas Comandas e Produtos',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        Icon: UserCheck,
        avatarBg: 'bg-emerald-100 text-emerald-700',
      };
  }
}

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  userRole: UserRole;
  onToggleRole: () => void;
  onChangeRole?: (role: UserRole) => void;
  openComandasCount: number;
  isCashRegisterOpen: boolean;
  onOpenTestRunner?: () => void;
  userEmail?: string;
  userName?: string;
  onLogout?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  userRole,
  onToggleRole,
  onChangeRole,
  openComandasCount,
  isCashRegisterOpen,
  onOpenTestRunner,
  userEmail,
  userName,
  onLogout,
  isOpen = false,
  onClose,
}) => {
  // Always start collapsed as requested: "inicie sempre com o menu lateral recolhido aparecendo apenas os icones"
  const [isCollapsed, setIsCollapsed] = useState(true);

  const menuItems = [
    {
      id: 'comandas' as ViewType,
      label: 'Comandas',
      icon: Receipt,
      badge: openComandasCount > 0 ? `${openComandasCount} abertas` : null,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
      id: 'produtos' as ViewType,
      label: 'Produtos',
      icon: ShoppingBag,
      badge: null,
    },
    {
      id: 'caixa' as ViewType,
      label: 'Controle de Caixa',
      icon: Landmark,
      badge: isCashRegisterOpen ? 'Aberto' : 'Fechado',
      badgeColor: isCashRegisterOpen
        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
        : 'bg-slate-200 text-slate-700 border-slate-300',
    },
    {
      id: 'dashboard' as ViewType,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'historico' as ViewType,
      label: 'Histórico de Vendas',
      icon: History,
      badge: null,
    },
    {
      id: 'relatorios' as ViewType,
      label: 'Relatórios & DRE',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'configuracoes' as ViewType,
      label: 'Configurações',
      icon: Settings,
      badge: null,
    },
  ];

  const handleItemClick = (id: ViewType) => {
    onNavigate(id);
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile / Tablet Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 flex flex-col h-screen select-none shrink-0 print:hidden transition-all duration-300 ease-in-out lg:static lg:translate-x-0 relative ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          isOpen ? 'w-72 sm:w-64 translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Floating Seam Toggle Button on the side border (Desktop) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3.5 top-6 z-20 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-md text-slate-600 hover:text-blue-600 hover:border-blue-300 items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 group"
          title={isCollapsed ? 'Expandir menu lateral (mostrar nomes)' : 'Recolher menu lateral (apenas ícones)'}
          aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-600 group-hover:-translate-x-0.5 transition-transform" />
          )}
        </button>

        {/* Brand Header */}
        {isCollapsed ? (
          <div className="p-3 border-b border-slate-100 flex flex-col items-center">
            <div
              className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 font-bold text-xl shrink-0 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setIsCollapsed(false)}
              title="PaniPro PDV - Clique para abrir o menu"
            >
              <Store className="w-5 h-5 text-white" />
            </div>

            {/* Setinha para abrir o menu quando recolhido */}
            <button
              onClick={() => setIsCollapsed(false)}
              className="mt-2.5 w-8 h-8 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer group shadow-2xs"
              title="Clique para expandir o menu lateral"
              aria-label="Expandir menu lateral"
            >
              <ChevronRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        ) : (
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 font-bold text-xl shrink-0">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900 tracking-tight text-lg leading-tight flex items-center gap-1.5 truncate">
                  PaniPro <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">PDV</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[11px] text-emerald-700 font-semibold truncate">DB: PANIPRO-ADRIANA</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Botão para recolher no desktop */}
              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:flex p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                aria-label="Recolher menu lateral"
                title="Recolher menu lateral"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Botão de fechar no mobile */}
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden cursor-pointer"
                  aria-label="Fechar menu"
                  title="Fechar menu lateral"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation List */}
        <nav
          className={`flex-1 ${
            isCollapsed ? 'px-2 py-4' : 'px-3 py-4'
          } space-y-1.5 overflow-y-auto overflow-x-hidden`}
        >
          {isCollapsed ? (
            <div className="w-full flex justify-center py-1 mb-1">
              <div className="w-7 h-px bg-slate-200" />
            </div>
          ) : (
            <div className="px-3 pb-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider truncate">
              Módulos Principais
            </div>
          )}

          {menuItems.map((item) => {
            const isActive =
              currentView === item.id || (item.id === 'comandas' && currentView === 'atendimento');
            const hasAccess = canUserAccessView(userRole, item.id);

            if (!hasAccess) {
              if (isCollapsed) {
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-center w-full py-2.5 rounded-xl text-slate-300 cursor-not-allowed select-none opacity-40 relative group"
                    title={`${item.label} (Acesso não autorizado para o perfil atual)`}
                  >
                    <item.icon className="w-5 h-5 text-slate-300" />
                    <span className="absolute bottom-1 right-2 w-1.5 h-1.5 rounded-full bg-slate-300" />
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-300 text-sm font-medium cursor-not-allowed select-none opacity-50"
                  title="Acesso não autorizado para o perfil atual"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon className="w-5 h-5 text-slate-300 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                </div>
              );
            }

            if (isCollapsed) {
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-center p-2.5 rounded-xl transition-all relative group cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title={`${item.label}${item.badge ? ` (${item.badge})` : ''}`}
                  aria-label={item.label}
                >
                  <item.icon
                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-600'
                    }`}
                  />

                  {/* Micro Badges in Collapsed Mode */}
                  {item.id === 'comandas' && openComandasCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs">
                      {openComandasCount}
                    </span>
                  )}
                  {item.id === 'caixa' && (
                    <span
                      className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white ${
                        isCashRegisterOpen ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                  )}
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <item.icon
                    className={`w-5 h-5 transition-transform group-hover:scale-105 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-600'
                    }`}
                  />
                  <span className="font-semibold truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      isActive ? 'bg-white/20 text-white border-white/30' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Role Switcher */}
        {isCollapsed ? (
          <div className="p-2 border-t border-slate-100 bg-slate-50/70 flex flex-col items-center gap-2">
            {(() => {
              const info = getRoleInfo(userRole);
              const RoleIcon = info.Icon;
              return (
                <button
                  onClick={onToggleRole}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-transform hover:scale-105 ${info.avatarBg}`}
                  title={`Perfil: ${info.label} (${info.description}) - Clique para alternar perfil`}
                  aria-label={`Perfil: ${info.label}`}
                >
                  <RoleIcon className="w-5 h-5" />
                </button>
              );
            })()}

            {onLogout && (
              <button
                onClick={onLogout}
                className="w-10 h-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Sair do Sistema"
                aria-label="Sair do Sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="p-3 border-t border-slate-100 bg-slate-50/70">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-2.5">
              {(() => {
                const info = getRoleInfo(userRole);
                const RoleIcon = info.Icon;
                return (
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${info.avatarBg}`}
                    >
                      <RoleIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 leading-tight truncate">
                        {info.label}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {info.description}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Quick Role Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Simular Perfil:
                </label>
                <select
                  value={userRole}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    if (onChangeRole) {
                      onChangeRole(newRole);
                    } else {
                      onToggleRole();
                    }
                  }}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="admin">Administrador (Pode tudo)</option>
                  <option value="gerente">Gerente (Pode tudo)</option>
                  <option value="caixa">Caixa (Comandas, Produtos, Caixa, Dashboard)</option>
                  <option value="atendente">Atendente (Apenas Produtos e Comandas)</option>
                </select>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full py-1.5 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Encerrar sessão no portal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair do Sistema</span>
                </button>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
