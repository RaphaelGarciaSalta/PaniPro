import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, ViewType, canUserAccessView } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { ComandasView } from './views/ComandasView';
import { AtendimentoView } from './views/AtendimentoView';
import { ProdutosView } from './views/ProdutosView';
import { CaixaView } from './views/CaixaView';
import { HistoricoVendasView } from './views/HistoricoVendasView';
import { RelatoriosView } from './views/RelatoriosView';
import { ConfiguracoesView } from './views/ConfiguracoesView';
import { LoginView } from './views/LoginView';
import { ComprovanteModal } from './components/ComprovanteModal';
import { TestRunnerModal } from './components/TestRunnerModal';
import { UserRole, Sale, BakerySettings } from './types';
import { storage } from './services/storage';
import { authService } from './services/authService';
import { padComanda } from './utils/formatters';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('comandas');
  const [selectedComandaNumber, setSelectedComandaNumber] = useState<number | null>(null);

  // Authentication State with Firestore Whitelist
  const [authState, setAuthState] = useState(() => authService.getCurrentState());

  // User Role (synced with logged-in allowed user)
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const current = authService.getCurrentState().allowedUser?.role;
    if (current) return current;
    const saved = localStorage.getItem('panis_user_role_v1');
    return (saved as UserRole) || 'admin';
  });

  // App settings & states
  const [settings, setSettings] = useState<BakerySettings>(() => storage.getSettings());
  const [openComandasCount, setOpenComandasCount] = useState<number>(0);
  const [isCashRegisterOpen, setIsCashRegisterOpen] = useState<boolean>(false);

  // Modals
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState<boolean>(false);
  const [isQuickOpenModalActive, setIsQuickOpenModalActive] = useState<boolean>(false);
  const [quickComandaInput, setQuickComandaInput] = useState<string>('');
  const [quickOpenError, setQuickOpenError] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [quotaStatus, setQuotaStatus] = useState(() => storage.getQuotaStatus());
  const [isQuotaBannerDismissed, setIsQuotaBannerDismissed] = useState<boolean>(false);
  const quickInputRef = useRef<HTMLInputElement>(null);

  // Synchronize auth state
  useEffect(() => {
    return authService.subscribe((state) => {
      setAuthState(state);
      if (state.allowedUser) {
        setUserRole(state.allowedUser.role);
        localStorage.setItem('panis_user_role_v1', state.allowedUser.role);
      }
    });
  }, []);

  // Synchronize state with storage
  const syncWithStorage = () => {
    const comandas = storage.getComandas();
    setOpenComandasCount(comandas.filter((c) => c.status === 'em_atendimento').length);
    setIsCashRegisterOpen(storage.getActiveCashRegister() !== null);
    setSettings(storage.getSettings());
    setQuotaStatus(storage.getQuotaStatus());
  };

  useEffect(() => {
    syncWithStorage();
    return storage.subscribe(syncWithStorage);
  }, []);

  const handleChangeRole = (nextRole: UserRole) => {
    setUserRole(nextRole);
    localStorage.setItem('panis_user_role_v1', nextRole);

    // If new role cannot access current view, redirect to comandas
    if (!canUserAccessView(nextRole, currentView)) {
      setCurrentView('comandas');
    }
  };

  const handleToggleRole = () => {
    const roles: UserRole[] = ['admin', 'gerente', 'caixa', 'atendente'];
    const currentIndex = roles.indexOf(userRole);
    const nextRole = roles[(currentIndex + 1) % roles.length];
    handleChangeRole(nextRole);
  };

  // Open comanda and transition to atendimento view
  const handleSelectComanda = (num: number) => {
    setSelectedComandaNumber(num);
    setCurrentView('atendimento');
  };

  // Open modal with zeroed/empty input and immediate focus
  const handleOpenQuickComandaModal = () => {
    setQuickComandaInput('');
    setQuickOpenError(null);
    setIsQuickOpenModalActive(true);
  };

  // Whenever modal opens, ensure cursor focuses inside the input
  useEffect(() => {
    if (isQuickOpenModalActive) {
      const timer = setTimeout(() => {
        quickInputRef.current?.focus();
        quickInputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isQuickOpenModalActive]);

  // On sale completed
  const handleSaleComplete = (sale: Sale) => {
    setCompletedSale(sale);
    setSelectedComandaNumber(null);
    setCurrentView('comandas');
  };

  // Quick Open Comanda prompt
  const handleConfirmQuickOpen = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickOpenError(null);
    if (!quickComandaInput || quickComandaInput.trim() === '') {
      setQuickOpenError(`Digite o número da comanda (1 a ${settings.comandasCount}).`);
      quickInputRef.current?.focus();
      return;
    }
    const num = parseInt(quickComandaInput, 10);
    if (isNaN(num) || num < 1 || num > settings.comandasCount) {
      setQuickOpenError(`Informe um número de comanda válido entre 1 e ${settings.comandasCount}.`);
      quickInputRef.current?.focus();
      return;
    }

    const comanda = storage.getComandaByNumber(num);
    if (!comanda) {
      setQuickOpenError(`Comanda ${num} não encontrada.`);
      return;
    }

    if (comanda.status === 'bloqueada') {
      setQuickOpenError(`A ${padComanda(num)} está temporariamente bloqueada.`);
      return;
    }

    if (comanda.status === 'disponivel') {
      const activeRegister = storage.getActiveCashRegister();
      if (!activeRegister || activeRegister.status !== 'aberto') {
        setIsQuickOpenModalActive(false);
        setCurrentView('caixa');
        return;
      }
      try {
        storage.openComanda(num, userRole === 'admin' ? 'Administrador' : 'Atendente');
      } catch (err: any) {
        setQuickOpenError(err.message);
        return;
      }
    }

    setIsQuickOpenModalActive(false);
    handleSelectComanda(num);
  };

  const cashierDisplayName =
    authState.allowedUser?.name || (userRole === 'admin' ? 'Administrador' : 'Atendente Caixa');
  const userEmail = authState.allowedUser?.email || '';

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  // 1. Initial Auth Loading State
  if (authState.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/10 mb-4 animate-pulse">
            <span className="text-3xl">🥖</span>
          </div>
          <h1 className="text-xl font-black tracking-tight text-white mb-2">PaniPro Padaria</h1>
          <p className="text-xs text-slate-400 mb-6">
            Conectando ao banco de dados e verificando permissões de acesso...
          </p>
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // 2. Authentication Gating: User MUST be logged in and in the Firestore whitelist!
  if (!authState.isAuthorized || !authState.allowedUser) {
    return <LoginView />;
  }

  // 3. Authenticated & Whitelisted Portal
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Fixed Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          if (!canUserAccessView(userRole, view)) {
            setCurrentView('comandas');
            return;
          }
          if (view === 'atendimento' && !selectedComandaNumber) {
            setCurrentView('comandas');
          } else {
            setCurrentView(view);
          }
        }}
        userRole={userRole}
        onToggleRole={handleToggleRole}
        onChangeRole={handleChangeRole}
        openComandasCount={openComandasCount}
        isCashRegisterOpen={isCashRegisterOpen}
        onOpenTestRunner={() => setIsTestRunnerOpen(true)}
        userEmail={userEmail}
        userName={cashierDisplayName}
        onLogout={handleLogout}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Header
          currentView={currentView}
          onNavigate={setCurrentView}
          userRole={userRole}
          isCashRegisterOpen={isCashRegisterOpen}
          openComandasCount={openComandasCount}
          onOpenComandaQuick={handleOpenQuickComandaModal}
          userName={cashierDisplayName}
          userEmail={userEmail}
          onLogout={handleLogout}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        />

        {/* Firebase Quota Contingency Mode Alert */}
        {quotaStatus.isExceeded && !isQuotaBannerDismissed && (
          <div className="bg-amber-50 border-b border-amber-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 shadow-xs shrink-0 z-10 transition-all">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <div className="truncate">
                <span className="font-bold">Modo de Contingência Local Ativo: </span>
                <span>
                  A cota diária gratuita de gravações do Firebase foi atingida hoje (renova amanhã). O sistema continua operando normalmente com dados 100% seguros no navegador.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3">
              <a
                href={quotaStatus.upgradeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold hover:text-amber-950 transition-colors hidden sm:inline-block"
              >
                Ver no Console Firebase
              </a>
              <button
                type="button"
                onClick={() => setIsQuotaBannerDismissed(true)}
                className="text-amber-600 hover:text-amber-900 font-bold px-1.5 py-0.5 rounded hover:bg-amber-100 transition-colors cursor-pointer"
                aria-label="Dispensar aviso"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <main
          className={`flex-1 flex flex-col min-h-0 bg-slate-50/70 ${
            currentView === 'atendimento' ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentView}
              onOpenComandaQuick={handleOpenQuickComandaModal}
            />
          )}

          {currentView === 'comandas' && (
            <ComandasView
              onSelectComanda={handleSelectComanda}
              cashierName={cashierDisplayName}
              onNavigate={setCurrentView}
              isCashRegisterOpen={isCashRegisterOpen}
            />
          )}

          {currentView === 'atendimento' && selectedComandaNumber && (
            <AtendimentoView
              comandaNumber={selectedComandaNumber}
              cashierName={cashierDisplayName}
              onBack={() => setCurrentView('comandas')}
              onSaleComplete={handleSaleComplete}
            />
          )}

          {currentView === 'produtos' && <ProdutosView userRole={userRole} />}

          {currentView === 'caixa' && (
            <CaixaView userRole={userRole} userName={cashierDisplayName} />
          )}

          {currentView === 'historico' && <HistoricoVendasView />}

          {currentView === 'relatorios' && <RelatoriosView />}

          {currentView === 'configuracoes' && (
            <ConfiguracoesView
              userRole={userRole}
              currentUserEmail={userEmail}
              onOpenTestRunner={() => setIsTestRunnerOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Printable Thermal Receipt Modal on completed sale */}
      {completedSale && (
        <ComprovanteModal
          sale={completedSale}
          settings={settings}
          onClose={() => setCompletedSale(null)}
        />
      )}

      {/* 10/10 Mandatory Tests Modal */}
      {isTestRunnerOpen && (
        <TestRunnerModal
          isOpen={isTestRunnerOpen}
          onClose={() => setIsTestRunnerOpen(false)}
          onTestsComplete={syncWithStorage}
        />
      )}

      {/* Fast Open Comanda Modal */}
      {isQuickOpenModalActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <span className="font-bold text-sm">Abrir / Acessar Comanda Rápida</span>
              <button
                type="button"
                onClick={() => {
                  setQuickOpenError(null);
                  setQuickComandaInput('');
                  setIsQuickOpenModalActive(false);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleConfirmQuickOpen} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número da Comanda (1 a {settings.comandasCount})
                </label>
                <input
                  ref={quickInputRef}
                  type="number"
                  min="1"
                  max={settings.comandasCount}
                  autoFocus
                  required
                  value={quickComandaInput}
                  onChange={(e) => {
                    setQuickComandaInput(e.target.value);
                    if (quickOpenError) setQuickOpenError(null);
                  }}
                  placeholder="Digite o número da comanda..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center text-lg font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {quickOpenError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
                  {quickOpenError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickOpenError(null);
                    setQuickComandaInput('');
                    setIsQuickOpenModalActive(false);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  Abrir Atendimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
