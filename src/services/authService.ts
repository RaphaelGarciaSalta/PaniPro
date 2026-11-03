import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  isFirebaseCloudConfigured,
  isFirestoreQuotaExceeded,
  markFirestoreQuotaExceeded,
  type FirebaseUser,
} from './firebase';
import { AllowedUser, UserRole } from '../types';

export const DEFAULT_ADMIN_EMAIL = 'raphaelmendesgarcia@gmail.com';
export const SECONDARY_ADMIN_EMAIL = 'raphaelgarcia369@gmail.com';
export const MASTER_ADMIN_EMAILS = [
  DEFAULT_ADMIN_EMAIL.toLowerCase(),
  SECONDARY_ADMIN_EMAIL.toLowerCase(),
];

const LOCAL_AUTH_KEYS = {
  ALLOWED_USERS: 'panipro_adriana_allowed_users_v1',
  SESSION: 'panipro_adriana_auth_session_v1',
  CREDENTIALS: 'panipro_adriana_credentials_v1',
};

export function isMasterAdminEmail(email: string): boolean {
  return MASTER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

class AuthService {
  private allowedUsersCache: Map<string, AllowedUser> = new Map();
  private isInitialized = false;
  private authListeners: Set<
    (state: {
      user: FirebaseUser | null;
      allowedUser: AllowedUser | null;
      isAuthorized: boolean;
      isLoading: boolean;
      authError: string | null;
    }) => void
  > = new Set();

  private currentState: {
    user: FirebaseUser | null;
    allowedUser: AllowedUser | null;
    isAuthorized: boolean;
    isLoading: boolean;
    authError: string | null;
  } = {
    user: null,
    allowedUser: null,
    isAuthorized: false,
    isLoading: true,
    authError: null,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private loadLocalAllowedUsers(): void {
    try {
      const raw = localStorage.getItem(LOCAL_AUTH_KEYS.ALLOWED_USERS);
      if (raw) {
        const parsed: AllowedUser[] = JSON.parse(raw);
        parsed.forEach((u) => {
          if (u && u.email) {
            this.allowedUsersCache.set(u.email.toLowerCase().trim(), u);
          }
        });
      }
    } catch (err) {
      console.warn('Error reading local allowed users:', err);
    }
  }

  private persistLocalAllowedUsers(): void {
    try {
      const list = Array.from(this.allowedUsersCache.values());
      localStorage.setItem(LOCAL_AUTH_KEYS.ALLOWED_USERS, JSON.stringify(list));
    } catch (err) {
      console.warn('Error persisting local allowed users:', err);
    }
  }

  private getLocalCredentials(): Record<string, string> {
    try {
      const raw = localStorage.getItem(LOCAL_AUTH_KEYS.CREDENTIALS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveLocalCredential(email: string, password: string): void {
    const creds = this.getLocalCredentials();
    creds[email.toLowerCase().trim()] = password;
    localStorage.setItem(LOCAL_AUTH_KEYS.CREDENTIALS, JSON.stringify(creds));
  }

  private createMockFirebaseUser(allowedUser: AllowedUser): FirebaseUser {
    return {
      uid: 'local-' + allowedUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      email: allowedUser.email,
      displayName: allowedUser.name,
      emailVerified: true,
      isAnonymous: false,
      providerData: [{ providerId: 'password', email: allowedUser.email }],
    } as unknown as FirebaseUser;
  }

  private async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      this.loadLocalAllowedUsers();
      await this.seedDefaultAdmin();

      if (isFirebaseCloudConfigured && db && auth) {
        // Real-time sync of allowed users list from PANIPRO-ADRIANA Firestore
        onSnapshot(
          collection(db, 'allowed_users'),
          (snapshot) => {
            if (!snapshot.empty) {
              this.allowedUsersCache.clear();
              snapshot.forEach((d) => {
                const data = d.data() as AllowedUser;
                if (data.email) {
                  this.allowedUsersCache.set(data.email.toLowerCase().trim(), data);
                }
              });
              this.persistLocalAllowedUsers();
            }

            if (auth?.currentUser?.email) {
              this.verifyAndSetUser(auth.currentUser);
            }
          },
          (err) => console.warn('Allowed users sync note:', err.message)
        );

        // Listen to Firebase Auth state changes
        onAuthStateChanged(auth, async (firebaseUser) => {
          if (!firebaseUser) {
            const savedSessionEmail = localStorage.getItem(LOCAL_AUTH_KEYS.SESSION);
            if (savedSessionEmail) {
              const check = await this.isEmailAllowed(savedSessionEmail);
              if (check.allowed && check.user) {
                this.updateState({
                  user: this.createMockFirebaseUser(check.user),
                  allowedUser: check.user,
                  isAuthorized: true,
                  isLoading: false,
                  authError: null,
                });
                return;
              }
            }

            this.updateState({
              user: null,
              allowedUser: null,
              isAuthorized: false,
              isLoading: false,
              authError: null,
            });
            return;
          }

          await this.verifyAndSetUser(firebaseUser);
        });
      } else {
        // Local persistence mode (before live Web SDK API key is injected)
        const savedSessionEmail = localStorage.getItem(LOCAL_AUTH_KEYS.SESSION);
        if (savedSessionEmail) {
          const check = await this.isEmailAllowed(savedSessionEmail);
          if (check.allowed && check.user) {
            this.updateState({
              user: this.createMockFirebaseUser(check.user),
              allowedUser: check.user,
              isAuthorized: true,
              isLoading: false,
              authError: null,
            });
            return;
          } else {
            localStorage.removeItem(LOCAL_AUTH_KEYS.SESSION);
          }
        }

        this.updateState({
          user: null,
          allowedUser: null,
          isAuthorized: false,
          isLoading: false,
          authError: null,
        });
      }
    } catch (err: any) {
      console.warn('AuthService init:', err);
      this.updateState({ isLoading: false });
    }
  }

  /**
   * Seeds the initial master admins in PANIPRO-ADRIANA (Firestore + Local Cache).
   */
  public async seedDefaultAdmin(): Promise<void> {
    const defaultAdmins: { email: string; name: string }[] = [
      { email: DEFAULT_ADMIN_EMAIL.toLowerCase().trim(), name: 'Raphael Mendes Garcia (Admin)' },
      { email: SECONDARY_ADMIN_EMAIL.toLowerCase().trim(), name: 'Raphael Garcia (Admin)' },
    ];

    for (const admin of defaultAdmins) {
      if (!this.allowedUsersCache.has(admin.email)) {
        const adminData: AllowedUser = {
          email: admin.email,
          name: admin.name,
          role: 'admin',
          active: true,
          createdAt: new Date().toISOString(),
        };
        this.allowedUsersCache.set(admin.email, adminData);
      }
    }
    this.persistLocalAllowedUsers();

    if (!db || isFirestoreQuotaExceeded()) return;

    try {
      for (const admin of defaultAdmins) {
        const adminDocRef = doc(db, 'allowed_users', admin.email);
        const snapshot = await getDoc(adminDocRef);

        if (!snapshot.exists()) {
          const adminData = this.allowedUsersCache.get(admin.email)!;
          await setDoc(adminDocRef, adminData);
        } else {
          this.allowedUsersCache.set(admin.email, snapshot.data() as AllowedUser);
        }
      }
      this.persistLocalAllowedUsers();
    } catch (err: any) {
      if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
        markFirestoreQuotaExceeded();
        return;
      }
      console.warn('Seed default admin note:', err);
    }
  }

  /**
   * Checks whitelist to verify if email is allowed.
   */
  public async isEmailAllowed(
    rawEmail: string
  ): Promise<{ allowed: boolean; user?: AllowedUser; reason?: string }> {
    const email = rawEmail.toLowerCase().trim();

    let allowedData = this.allowedUsersCache.get(email);

    if (!allowedData && db) {
      try {
        const snap = await getDoc(doc(db, 'allowed_users', email));
        if (snap.exists()) {
          allowedData = snap.data() as AllowedUser;
          this.allowedUsersCache.set(email, allowedData);
          this.persistLocalAllowedUsers();
        }
      } catch (err: any) {
        console.warn('Error fetching user whitelist doc:', err.message);
      }
    }

    if (!allowedData) {
      return {
        allowed: false,
        reason: `O e-mail "${rawEmail}" não está na lista de usuários permitidos no banco de dados PANIPRO-ADRIANA. Contate o administrador.`,
      };
    }

    if (!allowedData.active) {
      return {
        allowed: false,
        reason: `O usuário associado ao e-mail "${rawEmail}" foi desativado no banco de dados.`,
      };
    }

    return { allowed: true, user: allowedData };
  }

  private async verifyAndSetUser(firebaseUser: FirebaseUser) {
    this.updateState({ isLoading: true, authError: null });

    const email = firebaseUser.email || '';
    if (!email) {
      if (auth) await signOut(auth);
      this.updateState({
        user: null,
        allowedUser: null,
        isAuthorized: false,
        isLoading: false,
        authError: 'Não foi possível identificar o endereço de e-mail da conta.',
      });
      return;
    }

    const check = await this.isEmailAllowed(email);

    if (!check.allowed || !check.user) {
      if (auth) await signOut(auth);
      this.updateState({
        user: null,
        allowedUser: null,
        isAuthorized: false,
        isLoading: false,
        authError: check.reason || `Acesso negado: O e-mail ${email} não possui autorização no sistema.`,
      });
      return;
    }

    const updatedUser: AllowedUser = {
      ...check.user,
      lastLoginAt: new Date().toISOString(),
    };
    this.allowedUsersCache.set(email.toLowerCase().trim(), updatedUser);
    this.persistLocalAllowedUsers();

    if (db && !isFirestoreQuotaExceeded()) {
      try {
        const userDocRef = doc(db, 'allowed_users', email.toLowerCase().trim());
        setDoc(userDocRef, updatedUser, { merge: true }).catch((err) => {
          if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
            markFirestoreQuotaExceeded();
          }
        });
      } catch {}
    }

    this.updateState({
      user: firebaseUser,
      allowedUser: updatedUser,
      isAuthorized: true,
      isLoading: false,
      authError: null,
    });
  }

  private updateState(partial: Partial<typeof this.currentState>) {
    this.currentState = { ...this.currentState, ...partial };
    this.authListeners.forEach((listener) => {
      try {
        listener(this.currentState);
      } catch (err) {
        console.error('Error in auth listener:', err);
      }
    });
  }

  public subscribe(listener: (state: typeof this.currentState) => void): () => void {
    this.authListeners.add(listener);
    listener(this.currentState);
    return () => this.authListeners.delete(listener);
  }

  public getCurrentState() {
    return this.currentState;
  }

  // --- LOGIN ACTIONS ---

  /**
   * 1-Click Instant Login as Master Administrator for zero-friction access.
   * Directly sets up the authenticated admin session and syncs with Firestore.
   */
  public async loginAsMasterAdmin(targetEmail = DEFAULT_ADMIN_EMAIL): Promise<AllowedUser> {
    this.updateState({ isLoading: true, authError: null });
    const email = targetEmail.toLowerCase().trim();

    const check = await this.isEmailAllowed(email);
    if (!check.allowed || !check.user) {
      this.updateState({ isLoading: false });
      throw new Error(`Administrador ${email} não encontrado.`);
    }

    const updatedUser: AllowedUser = {
      ...check.user,
      lastLoginAt: new Date().toISOString(),
    };
    this.allowedUsersCache.set(email, updatedUser);
    this.persistLocalAllowedUsers();
    localStorage.setItem(LOCAL_AUTH_KEYS.SESSION, email);

    if (db && !isFirestoreQuotaExceeded()) {
      try {
        await setDoc(doc(db, 'allowed_users', email), updatedUser, { merge: true });
      } catch (err: any) {
        if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
          markFirestoreQuotaExceeded();
        } else {
          console.warn('Sync admin login to cloud:', err);
        }
      }
    }

    this.updateState({
      user: this.createMockFirebaseUser(updatedUser),
      allowedUser: updatedUser,
      isAuthorized: true,
      isLoading: false,
      authError: null,
    });
    return updatedUser;
  }

  /**
   * Signs in with Google popup (or authorizes primary admin in local persistence mode).
   */
  public async loginWithGoogle(): Promise<AllowedUser> {
    this.updateState({ isLoading: true, authError: null });

    if (!isFirebaseCloudConfigured || !auth) {
      const check = await this.isEmailAllowed(DEFAULT_ADMIN_EMAIL);
      if (!check.allowed || !check.user) {
        this.updateState({ isLoading: false });
        throw new Error('Administrador padrão não encontrado na lista de permissões.');
      }
      const updatedUser: AllowedUser = {
        ...check.user,
        lastLoginAt: new Date().toISOString(),
      };
      this.allowedUsersCache.set(updatedUser.email.toLowerCase(), updatedUser);
      this.persistLocalAllowedUsers();
      localStorage.setItem(LOCAL_AUTH_KEYS.SESSION, updatedUser.email.toLowerCase());

      this.updateState({
        user: this.createMockFirebaseUser(updatedUser),
        allowedUser: updatedUser,
        isAuthorized: true,
        isLoading: false,
        authError: null,
      });
      return updatedUser;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email;
      if (!email) {
        await signOut(auth);
        throw new Error('E-mail não retornado pelo Google.');
      }

      const check = await this.isEmailAllowed(email);
      if (!check.allowed || !check.user) {
        await signOut(auth);
        const reason =
          check.reason || `O e-mail ${email} não está na lista de permitidos do banco de dados.`;
        this.updateState({
          user: null,
          allowedUser: null,
          isAuthorized: false,
          isLoading: false,
          authError: reason,
        });
        throw new Error(reason);
      }

      return check.user;
    } catch (err: any) {
      this.updateState({ isLoading: false });
      throw err;
    }
  }

  /**
   * Signs in with Email and Password.
   */
  public async loginWithEmail(emailInput: string, passwordInput: string): Promise<AllowedUser> {
    const email = emailInput.trim().toLowerCase();
    this.updateState({ isLoading: true, authError: null });

    try {
      const check = await this.isEmailAllowed(email);
      if (!check.allowed || !check.user) {
        const reason = check.reason || `O e-mail "${email}" não está na lista de usuários permitidos.`;
        this.updateState({
          user: null,
          allowedUser: null,
          isAuthorized: false,
          isLoading: false,
          authError: reason,
        });
        throw new Error(reason);
      }

      if (!isFirebaseCloudConfigured || !auth) {
        const creds = this.getLocalCredentials();
        const storedPw = creds[email];
        if (storedPw && storedPw !== passwordInput) {
          throw { code: 'auth/wrong-password' };
        }
        if (!storedPw) {
          if (passwordInput.length < 6) {
            throw new Error('A senha deve conter pelo menos 6 caracteres.');
          }
          this.saveLocalCredential(email, passwordInput);
        }

        const updatedUser: AllowedUser = {
          ...check.user,
          lastLoginAt: new Date().toISOString(),
        };
        this.allowedUsersCache.set(email, updatedUser);
        this.persistLocalAllowedUsers();
        localStorage.setItem(LOCAL_AUTH_KEYS.SESSION, email);

        this.updateState({
          user: this.createMockFirebaseUser(updatedUser),
          allowedUser: updatedUser,
          isAuthorized: true,
          isLoading: false,
          authError: null,
        });
        return updatedUser;
      }

      await signInWithEmailAndPassword(auth, email, passwordInput);
      return check.user;
    } catch (err: any) {
      this.updateState({ isLoading: false });
      let message = err.message || 'Erro ao realizar login.';
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        message = 'E-mail ou senha incorretos.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Muitas tentativas sem sucesso. Aguarde alguns instantes e tente novamente.';
      }
      throw new Error(message);
    }
  }

  /**
   * Creates an account with Email/Password for an email that is ALREADY on the whitelist.
   */
  public async registerWithEmail(
    emailInput: string,
    passwordInput: string,
    displayName?: string
  ): Promise<AllowedUser> {
    const email = emailInput.trim().toLowerCase();
    this.updateState({ isLoading: true, authError: null });

    try {
      const check = await this.isEmailAllowed(email);
      if (!check.allowed || !check.user) {
        const reason = `Cadastro não permitido: o e-mail "${email}" não consta na lista de usuários autorizados no banco de dados PANIPRO-ADRIANA.`;
        this.updateState({ isLoading: false, authError: reason });
        throw new Error(reason);
      }

      if (passwordInput.length < 6) {
        throw { code: 'auth/weak-password' };
      }

      if (!isFirebaseCloudConfigured || !auth) {
        const creds = this.getLocalCredentials();
        if (creds[email]) {
          throw { code: 'auth/email-already-in-use' };
        }
        this.saveLocalCredential(email, passwordInput);
        const updatedUser: AllowedUser = {
          ...check.user,
          name: displayName?.trim() || check.user.name,
          lastLoginAt: new Date().toISOString(),
        };
        this.allowedUsersCache.set(email, updatedUser);
        this.persistLocalAllowedUsers();
        localStorage.setItem(LOCAL_AUTH_KEYS.SESSION, email);

        this.updateState({
          user: this.createMockFirebaseUser(updatedUser),
          allowedUser: updatedUser,
          isAuthorized: true,
          isLoading: false,
          authError: null,
        });
        return updatedUser;
      }

      await createUserWithEmailAndPassword(auth, email, passwordInput);

      if (displayName && check.user.name !== displayName) {
        check.user.name = displayName;
        this.allowedUsersCache.set(email, check.user);
        this.persistLocalAllowedUsers();
        if (db) {
          await setDoc(doc(db, 'allowed_users', email), check.user, { merge: true });
        }
      }

      return check.user;
    } catch (err: any) {
      this.updateState({ isLoading: false });
      let message = err.message || 'Erro ao cadastrar senha.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'Este e-mail já possui uma conta criada. Faça login com sua senha.';
      } else if (err.code === 'auth/weak-password') {
        message = 'A senha deve conter pelo menos 6 caracteres.';
      }
      throw new Error(message);
    }
  }

  /**
   * Signs out current user
   */
  public async logout(): Promise<void> {
    localStorage.removeItem(LOCAL_AUTH_KEYS.SESSION);
    if (auth) {
      await signOut(auth);
    }
    this.updateState({
      user: null,
      allowedUser: null,
      isAuthorized: false,
      isLoading: false,
      authError: null,
    });
  }

  // --- WHITELIST MANAGEMENT (Firestore Database + Local Cache) ---

  public async getAllowedUsers(): Promise<AllowedUser[]> {
    if (db && !isFirestoreQuotaExceeded()) {
      try {
        const snap = await getDocs(collection(db, 'allowed_users'));
        if (!snap.empty) {
          const list: AllowedUser[] = [];
          snap.forEach((d) => {
            const u = d.data() as AllowedUser;
            list.push(u);
            if (u.email) {
              this.allowedUsersCache.set(u.email.toLowerCase().trim(), u);
            }
          });
          this.persistLocalAllowedUsers();
          return list.sort((a, b) => a.email.localeCompare(b.email));
        }
      } catch (err: any) {
        if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
          markFirestoreQuotaExceeded();
        } else {
          console.warn('getAllowedUsers error:', err);
        }
      }
    }
    return Array.from(this.allowedUsersCache.values()).sort((a, b) =>
      a.email.localeCompare(b.email)
    );
  }

  public async saveAllowedUser(userData: {
    email: string;
    name: string;
    role: UserRole;
    active: boolean;
  }): Promise<void> {
    const email = userData.email.trim().toLowerCase();
    const existing = this.allowedUsersCache.get(email);

    const payload: AllowedUser = {
      email,
      name: userData.name.trim() || email.split('@')[0],
      role: userData.role,
      active: userData.active,
      createdAt: existing?.createdAt || new Date().toISOString(),
      lastLoginAt: existing?.lastLoginAt,
    };

    this.allowedUsersCache.set(email, payload);
    this.persistLocalAllowedUsers();

    if (db && !isFirestoreQuotaExceeded()) {
      try {
        const docRef = doc(db, 'allowed_users', email);
        await setDoc(docRef, payload, { merge: true });
      } catch (err: any) {
        if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
          markFirestoreQuotaExceeded();
        } else {
          console.warn('saveAllowedUser cloud note (saved in local cache):', err?.message);
        }
      }
    }
  }

  public async removeAllowedUser(emailInput: string): Promise<void> {
    const email = emailInput.trim().toLowerCase();
    if (isMasterAdminEmail(email)) {
      throw new Error('Não é permitido remover um administrador principal do sistema.');
    }

    this.allowedUsersCache.delete(email);
    this.persistLocalAllowedUsers();

    if (db && !isFirestoreQuotaExceeded()) {
      try {
        await deleteDoc(doc(db, 'allowed_users', email));
      } catch (err: any) {
        if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
          markFirestoreQuotaExceeded();
        } else {
          console.warn('removeAllowedUser cloud note (removed in local cache):', err?.message);
        }
      }
    }
  }
}

export const authService = new AuthService();
