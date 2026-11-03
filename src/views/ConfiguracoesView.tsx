import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  Receipt,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Printer,
  Sparkles,
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Trash2,
  RefreshCw,
  Database,
} from 'lucide-react';
import { BakerySettings, UserRole, AllowedUser } from '../types';
import { storage } from '../services/storage';
import {
  authService,
  DEFAULT_ADMIN_EMAIL,
  SECONDARY_ADMIN_EMAIL,
  isMasterAdminEmail,
} from '../services/authService';
import {
  FIREBASE_PROJECT_ID,
  FIREBASE_PROJECT_NAME,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_DATABASE_ID,
  isFirebaseCloudConfigured,
} from '../services/firebase';

interface ConfiguracoesViewProps {
  userRole: UserRole;
  currentUserEmail?: string;
  onOpenTestRunner: () => void;
}

export const ConfiguracoesView: React.FC<ConfiguracoesViewProps> = ({
  userRole,
  currentUserEmail,
  onOpenTestRunner,
}) => {
  const [settings, setSettings] = useState<BakerySettings>(() => storage.getSettings());
  const [comandasInput, setComandasInput] = useState<number>(settings.comandasCount);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Allowed Users (Firestore Whitelist)
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('atendente');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [confirmRemoveEmail, setConfirmRemoveEmail] = useState<string | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  const loadAllowedUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const users = await authService.getAllowedUsers();
      setAllowedUsers(users);
    } catch (err: any) {
      console.warn('Erro ao carregar usuários permitidos:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadAllowedUsers();
  }, []);

  const handleAddAllowedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setErrorMessage('Informe um e-mail válido para autorizar.');
      return;
    }

    setIsSubmittingUser(true);
    try {
      await authService.saveAllowedUser({
        email: newEmail.trim(),
        name: newName.trim() || newEmail.split('@')[0],
        role: newRole,
        active: true,
      });
      setNewEmail('');
      setNewName('');
      setNewRole('atendente');
      await loadAllowedUsers();
      showToast('Usuário adicionado à lista de permissões no Firestore!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao autorizar usuário.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleToggleUserStatus = async (user: AllowedUser) => {
    setErrorMessage(null);
    if (isMasterAdminEmail(user.email)) {
      setErrorMessage('Não é permitido desativar um administrador principal.');
      return;
    }

    try {
      await authService.saveAllowedUser({
        email: user.email,
        name: user.name,
        role: user.role,
        active: !user.active,
      });
      await loadAllowedUsers();
      showToast(`Status de ${user.email} atualizado com sucesso!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao alterar status do usuário.');
    }
  };

  const handleRemoveAllowedUser = async (user: AllowedUser) => {
    setErrorMessage(null);
    if (isMasterAdminEmail(user.email)) {
      setErrorMessage('Não é permitido remover um administrador principal.');
      return;
    }

    if (confirmRemoveEmail !== user.email) {
      setConfirmRemoveEmail(user.email);
      return;
    }

    try {
      await authService.removeAllowedUser(user.email);
      setConfirmRemoveEmail(null);
      await loadAllowedUsers();
      showToast(`Acesso de ${user.email} revogado no banco de dados!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao revogar acesso.');
    }
  };

  const handleSyncToCloud = async () => {
    setErrorMessage(null);
    setIsSyncingCloud(true);
    try {
      const result = await storage.syncAllLocalToCloud();
      if (result.synced) {
        showToast(result.message);
      } else {
        showToast(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao sincronizar dados com o Firebase.');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveEstablishment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      storage.saveSettings(settings);
      showToast('Dados do estabelecimento salvos com sucesso!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar configurações.');
    }
  };

  const handleUpdateComandasCount = () => {
    setErrorMessage(null);
    if (comandasInput < 1 || comandasInput > 200) {
      setErrorMessage('A quantidade de comandas deve ser entre 1 e 200.');
      return;
    }

    try {
      const updated = { ...settings, comandasCount: comandasInput };
      storage.saveSettings(updated);
      setSettings(updated);
      showToast(`Quantidade de comandas atualizada para ${comandasInput}!`);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleExportBackup = () => {
    const json = storage.exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_padaria_panipro_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON exportado com sucesso!');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (storage.importBackup(content)) {
        setSettings(storage.getSettings());
        setComandasInput(storage.getSettings().comandasCount);
        showToast('Backup importado e restaurado com sucesso!');
      } else {
        setErrorMessage('Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
  };


  if (userRole !== 'admin' && userRole !== 'gerente') {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Acesso Restrito às Configurações</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Apenas Administradores e Gerentes possuem permissão para acessar e modificar as configurações do sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-5xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Configurações Gerais</h2>
        <p className="text-xs text-slate-500">
          Personalize dados da padaria, banco de dados Firebase ({FIREBASE_PROJECT_NAME}), comandas, layout do cupom e backups.
        </p>
      </div>

      {/* Firebase Project Status Card: PANIPRO-ADRIANA */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Base de Dados Firebase — Projeto {FIREBASE_PROJECT_NAME}
              </h3>
              <p className="text-[11px] text-slate-500">
                Configuração apontada para o seu projeto no Firebase Console.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSyncToCloud}
            disabled={isSyncingCloud}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
            <span>{isSyncingCloud ? 'Sincronizando...' : 'Sincronizar com PANIPRO-ADRIANA'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Project ID</span>
            <span className="font-mono font-bold text-slate-900 mt-0.5 block">{FIREBASE_PROJECT_ID}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Auth Domain</span>
            <span className="font-mono font-semibold text-slate-800 mt-0.5 block truncate" title={FIREBASE_AUTH_DOMAIN}>
              {FIREBASE_AUTH_DOMAIN}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Firestore Database</span>
            <span className="font-mono font-semibold text-slate-800 mt-0.5 block">{FIREBASE_DATABASE_ID}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Modo de Operação</span>
            <span className={`font-bold mt-0.5 block ${isFirebaseCloudConfigured ? 'text-emerald-700' : 'text-blue-700'}`}>
              {isFirebaseCloudConfigured ? 'Cloud Firestore Conectado' : 'Cache Local + Pronto p/ Cloud'}
            </span>
          </div>
        </div>
      </div>

      {/* Form: Dados da Padaria */}
      <form
        onSubmit={handleSaveEstablishment}
        className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Store className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Dados do Estabelecimento</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Razão Social *</label>
            <input
              type="text"
              required
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome Fantasia</label>
            <input
              type="text"
              value={settings.tradeName}
              onChange={(e) => setSettings({ ...settings, tradeName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">CNPJ</label>
            <input
              type="text"
              value={settings.cnpj}
              onChange={(e) => setSettings({ ...settings, cnpj: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
            <input
              type="text"
              value={settings.phone}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Endereço Completo</label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Cidade / UF</label>
            <input
              type="text"
              value={settings.city}
              onChange={(e) => setSettings({ ...settings, city: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Cupom Preferences */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-slate-500" />
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Preferências de Impressão e Cupom Não Fiscal
            </h4>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mensagem no Rodapé do Cupom
            </label>
            <input
              type="text"
              value={settings.receiptFooterMessage}
              onChange={(e) => setSettings({ ...settings, receiptFooterMessage: e.target.value })}
              placeholder="Ex: Obrigado pela preferência! Volte sempre."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-600/30 transition-all cursor-pointer"
          >
            Salvar Dados da Padaria
          </button>
        </div>
      </form>

      {/* Comandas Configuration Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Receipt className="w-5 h-5 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-900">Capacidade de Comandas Numeradas</h3>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="max-w-md">
            <p className="text-xs text-slate-600">
              Defina a quantidade de cartões/comandas físicas da sua padaria (ex: 30, 50, 100). As
              comandas são numeradas de forma fixa e reutilizáveis infinitamente após cada pagamento.
            </p>
            <p className="text-[11px] text-amber-700 font-semibold mt-1">
              O sistema não permite reduzir a quantidade se houver comandas acima do limite em atendimento.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="200"
              value={comandasInput}
              onChange={(e) => setComandasInput(parseInt(e.target.value) || 1)}
              className="w-24 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-center text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleUpdateComandasCount}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              Atualizar Capacidade
            </button>
          </div>
        </div>
      </div>

      {/* Backup and Data Maintenance */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Download className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">Backup e Integridade de Dados</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Export */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800">Exportar Backup Completo</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Gera um arquivo JSON contendo produtos, vendas históricas, caixa e configurações.
              </p>
            </div>
            <button
              onClick={handleExportBackup}
              className="w-full py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Backup JSON</span>
            </button>
          </div>

          {/* Import */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800">Restaurar de Arquivo</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Restaura dados a partir de um arquivo JSON de backup prévio.
              </p>
            </div>
            <label className="w-full py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer text-center">
              <Upload className="w-3.5 h-3.5" />
              <span>Carregar Arquivo</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Access Control & Whitelist (Firestore Database) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Controle de Acesso ao Portal (Banco de Dados Firebase)
              </h3>
              <p className="text-[11px] text-slate-500">
                Lista de permissões salva diretamente no Firestore (<code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700">allowed_users</code>). Quem não constar na lista é bloqueado ao tentar entrar.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadAllowedUsers}
            disabled={isLoadingUsers}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
            <span>Atualizar Lista</span>
          </button>
        </div>

        {/* Master Admin Indicator */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
          <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Administradores Master do Sistema ({FIREBASE_PROJECT_NAME}): </span>
            <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300 text-amber-800 font-bold mr-1">
              {DEFAULT_ADMIN_EMAIL}
            </code>
            <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300 text-amber-800 font-bold">
              {SECONDARY_ADMIN_EMAIL}
            </code>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Estes e-mails são provisionados e validados na coleção <code className="font-mono">allowed_users</code> do projeto {FIREBASE_PROJECT_ID}.
            </p>
          </div>
        </div>

        {/* Add Allowed User Form */}
        <form onSubmit={handleAddAllowedUser} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Autorizar Novo Usuário
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                E-mail (Google ou Login) *
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="exemplo@gmail.com"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nome do Colaborador
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Maria Atendente"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Perfil de Acesso
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              >
                <option value="admin">Administrador (Pode tudo)</option>
                <option value="gerente">Gerente (Pode tudo)</option>
                <option value="caixa">Caixa (Comandas, Produtos, Caixa, Dashboard)</option>
                <option value="atendente">Atendente (Apenas Produtos e Comandas)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSubmittingUser}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isSubmittingUser ? 'Salvando no Banco...' : 'Autorizar no Firestore'}</span>
            </button>
          </div>
        </form>

        {/* Allowed Users Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Usuários Cadastrados no Banco ({allowedUsers.length})
            </h4>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            {allowedUsers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Nenhum usuário carregado ainda. Clique em "Atualizar Lista".
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">E-mail</th>
                      <th className="py-2.5 px-3">Nome</th>
                      <th className="py-2.5 px-3">Perfil</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allowedUsers.map((u) => {
                      const isMasterAdmin = isMasterAdminEmail(u.email);
                      const isCurrentUser =
                        currentUserEmail && u.email.toLowerCase() === currentUserEmail.toLowerCase();

                      return (
                        <tr key={u.email} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span>{u.email}</span>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-bold">
                                  Você
                                </span>
                              )}
                              {isMasterAdmin && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">
                                  Master
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{u.name || '-'}</td>
                          <td className="py-2.5 px-3">
                            {isMasterAdmin ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                                Administrador
                              </span>
                            ) : (
                              <select
                                value={u.role || 'atendente'}
                                onChange={async (e) => {
                                  const targetRole = e.target.value as UserRole;
                                  try {
                                    await authService.saveAllowedUser({
                                      email: u.email,
                                      name: u.name,
                                      role: targetRole,
                                      active: u.active,
                                    });
                                    await loadAllowedUsers();
                                    showToast(`Perfil de ${u.email} alterado para ${targetRole}!`);
                                  } catch (err: any) {
                                    setErrorMessage(err.message || 'Erro ao alterar perfil.');
                                  }
                                }}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-pointer focus:outline-hidden ${
                                  u.role === 'admin'
                                    ? 'bg-purple-50 text-purple-800 border-purple-300'
                                    : u.role === 'gerente'
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                                    : u.role === 'caixa'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                }`}
                              >
                                <option value="admin">Administrador</option>
                                <option value="gerente">Gerente</option>
                                <option value="caixa">Caixa</option>
                                <option value="atendente">Atendente</option>
                              </select>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u)}
                              disabled={isMasterAdmin}
                              title={isMasterAdmin ? 'Admin master não pode ser desativado' : 'Clique para alterar status'}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                                u.active
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              } ${isMasterAdmin ? 'cursor-not-allowed opacity-80' : ''}`}
                            >
                              {u.active ? '● Ativo' : '○ Inativo'}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {isMasterAdmin ? (
                              <span className="text-[11px] text-slate-400 font-medium italic">
                                Protegido
                              </span>
                            ) : confirmRemoveEmail === u.email ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAllowedUser(u)}
                                  className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmRemoveEmail(null)}
                                  className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-200 cursor-pointer"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRemoveAllowedUser(u)}
                                title="Revogar acesso no banco de dados"
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 15 Test Suite Runner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="font-extrabold text-sm">Bateria de Homologação dos 10 Testes Obrigatórios</h3>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            Validação automatizada de cadastro de pão francês, comanda 01, split payment, troco e isolamento de preços históricos.
          </p>
        </div>

        <button
          onClick={onOpenTestRunner}
          className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl text-xs shadow-sm transition-all whitespace-nowrap cursor-pointer"
        >
          Executar Testes (10/10)
        </button>
      </div>
    </div>
  );
};
