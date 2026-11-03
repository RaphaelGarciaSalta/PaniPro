import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Store,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  User,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import {
  authService,
  DEFAULT_ADMIN_EMAIL,
  SECONDARY_ADMIN_EMAIL,
} from '../services/authService';
import { FIREBASE_PROJECT_ID, FIREBASE_PROJECT_NAME } from '../services/firebase';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = () => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1-Click Master Admin Login
  const handleDirectAdminLogin = async (targetEmail = DEFAULT_ADMIN_EMAIL) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      await authService.loginAsMasterAdmin(targetEmail);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Erro ao entrar como administrador.');
    }
  };

  // Google Login
  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      await authService.loginWithGoogle();
      // Auth listener in App will transition to main dashboard
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(
        err.message || 'Erro ao entrar com o Google. Certifique-se de que sua conta está permitida.'
      );
    }
  };

  // Email/Password Submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Preencha seu e-mail e senha.');
      return;
    }

    setIsLoading(true);
    try {
      if (authMode === 'login') {
        await authService.loginWithEmail(email, password);
      } else {
        await authService.registerWithEmail(email, password, name);
        setSuccessMessage('Senha cadastrada com sucesso! Entrando...');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Erro na autenticação.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center items-center p-4 selection:bg-blue-600 selection:text-white">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Brand Banner */}
        <div className="p-8 pb-6 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 mb-4">
            <Store className="w-7 h-7 text-white" />
          </div>

          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">PaniPro</h1>
            <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-extrabold border border-blue-200">
              PDV
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-1.5 font-medium">
            Portal de Gestão & Ponto de Venda de Padaria
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-bold text-emerald-700 mt-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Projeto Firebase: {FIREBASE_PROJECT_NAME} ({FIREBASE_PROJECT_ID})</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8 pt-6 space-y-5">
          {/* Messages */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-relaxed">
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1-Click Fast Access as Master Admin */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleDirectAdminLogin(DEFAULT_ADMIN_EMAIL)}
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl text-sm font-extrabold shadow-md shadow-blue-600/30 hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              <ShieldCheck className="w-5 h-5 text-amber-300 shrink-0" />
              <span>Entrar no PDV como Raphael Mendes Garcia</span>
              <ArrowRight className="w-4 h-4 text-blue-200 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => handleDirectAdminLogin(SECONDARY_ADMIN_EMAIL)}
              disabled={isLoading}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Acessar com raphaelgarcia369@gmail.com</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center pt-1">
            <div className="w-full border-t border-slate-200" />
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              ou outros métodos
            </span>
          </div>

          {/* 1-Click Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            {/* Official Google G Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Entrar com o Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-slate-200" />
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              ou com e-mail
            </span>
          </div>

          {/* Mode Switcher: Login / Primeiro Acesso */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                authMode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fazer Login
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                authMode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Criar Senha
            </button>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Seu Nome</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">E-mail Cadastrado</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@empresa.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {authMode === 'login' ? 'Senha' : 'Criar Nova Senha (mínimo 6 dígitos)'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Autenticando no banco...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>{authMode === 'login' ? 'Acessar Sistema' : 'Salvar Senha & Entrar'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Whitelist explanation note */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-[11px] text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-700 block mb-0.5">
              Base de Dados Vinculada: {FIREBASE_PROJECT_NAME}
            </span>
            Apenas e-mails registrados na lista de permitidos podem abrir este portal. Administradores autorizados:{' '}
            <strong className="text-slate-700 font-mono text-[10px]">{DEFAULT_ADMIN_EMAIL}</strong> e{' '}
            <strong className="text-slate-700 font-mono text-[10px]">{SECONDARY_ADMIN_EMAIL}</strong>.
          </div>
        </div>
      </div>
    </div>
  );
};
