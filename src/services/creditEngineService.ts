/**
 * Creator Intelligence Pro — Central Credit Engine Service (Etapa 4A).
 * Manages user credit balance, monthly cycles, entitlements, and transaction ledger.
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  orderBy, 
  limit as firestoreLimit, 
  getDocs 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, isFirestoreQuotaExceeded } from './firebase';
import { 
  CreatorPlanId, 
  UserCreditAccount, 
  CreditUsageLedgerEntry, 
  CreditActionId, 
  UsagePermissionResult,
  CreditTransactionType 
} from '../types/credits';
import { getPlan, isToolAllowedForPlan } from './planRegistry';
import { getCreditCost, resolveCreditAction } from './creditActionRegistry';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

class CreditEngineService {
  private processedRequests = new Set<string>();
  private refundedRequests = new Set<string>();
  private cachedAccounts = new Map<string, { account: UserCreditAccount; expiresAt: number }>();

  /**
   * Generates storage keys for local fallback.
   */
  private getLocalAccountKey(userId: string): string {
    return `robizin_credit_account_${userId}`;
  }

  private getLocalLedgerKey(userId: string): string {
    return `robizin_credit_ledger_${userId}`;
  }

  /**
   * Broadcasts real-time credit updates to all UI components.
   */
  private notifyUpdate(account: UserCreditAccount) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('creator-credits-updated', { detail: account }));
    }
  }

  /**
   * Loads or creates a UserCreditAccount with automatic monthly cycle renewal.
   */
  public async getAccount(userId: string, defaultPlanId: CreatorPlanId = 'PRO'): Promise<UserCreditAccount> {
    if (!userId) {
      throw new Error("ID de usuário inválido para carregar conta de créditos.");
    }

    // Check memory cache (5s TTL)
    const cached = this.cachedAccounts.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.account;
    }

    let account: UserCreditAccount | null = null;
    const now = Date.now();

    // 1. Try Firestore if online & quota OK
    if (!isFirestoreQuotaExceeded) {
      try {
        const docRef = doc(db, 'users', userId, 'credit_account', 'main');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          account = snap.data() as UserCreditAccount;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${userId}/credit_account/main`);
      }
    }

    // 2. Try Local Storage Fallback
    if (!account && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.getLocalAccountKey(userId));
        if (raw) {
          account = JSON.parse(raw) as UserCreditAccount;
        }
      } catch (e) {
        console.warn("[CREDIT ENGINE] Error parsing local credit account:", e);
      }
    }

    // 3. Initialize new account if none exists
    if (!account) {
      const plan = getPlan(defaultPlanId);
      account = {
        userId,
        planId: plan.id,
        balance: plan.monthlyCredits,
        monthlyAllocation: plan.monthlyCredits,
        billingCycleStart: now,
        billingCycleEnd: now + THIRTY_DAYS_MS,
        lifetimeUsedCredits: 0,
        lifetimeGrantedCredits: plan.monthlyCredits,
        isAdminBypass: plan.id === 'ADMIN',
        createdAt: now,
        updatedAt: now
      };

      // Record initial grant in ledger
      await this.recordLedgerEntry(userId, {
        id: `init_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        type: 'INITIAL_GRANT',
        amount: plan.monthlyCredits,
        balanceAfter: account.balance,
        reason: `Cota inicial do ${plan.name}`,
        timestamp: now
      });

      await this.saveAccount(account);
    } else {
      // 4. Monthly Cycle Check & Auto-Renewal
      if (now > account.billingCycleEnd) {
        const plan = getPlan(account.planId);
        const renewalAmount = plan.monthlyCredits;
        const newBalance = plan.rolloverCredits 
          ? account.balance + renewalAmount 
          : Math.max(account.balance, renewalAmount);

        account = {
          ...account,
          balance: newBalance,
          monthlyAllocation: renewalAmount,
          billingCycleStart: now,
          billingCycleEnd: now + THIRTY_DAYS_MS,
          lifetimeGrantedCredits: account.lifetimeGrantedCredits + renewalAmount,
          updatedAt: now
        };

        await this.recordLedgerEntry(userId, {
          id: `renew_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId,
          type: 'MONTHLY_RENEWAL',
          amount: renewalAmount,
          balanceAfter: account.balance,
          reason: `Renovação mensal de créditos — ${plan.name}`,
          timestamp: now
        });

        await this.saveAccount(account);
      }
    }

    // Update memory cache
    this.cachedAccounts.set(userId, { account, expiresAt: Date.now() + 5000 });
    return account;
  }

  /**
   * Persists the user account to Firestore & Local Storage.
   */
  public async saveAccount(account: UserCreditAccount): Promise<void> {
    account.updatedAt = Date.now();
    this.cachedAccounts.set(account.userId, { account, expiresAt: Date.now() + 5000 });

    // 1. Local Storage immediate write
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getLocalAccountKey(account.userId), JSON.stringify(account));
      } catch (e) {
        console.warn("[CREDIT ENGINE] Error writing local account:", e);
      }
    }

    // 2. Cloud Firestore write
    if (!isFirestoreQuotaExceeded) {
      try {
        const docRef = doc(db, 'users', account.userId, 'credit_account', 'main');
        await setDoc(docRef, account, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${account.userId}/credit_account/main`);
      }
    }

    this.notifyUpdate(account);
  }

  /**
   * Checks pre-flight usage permission for a given tool and action.
   */
  public async checkPermission(
    userId: string | undefined, 
    toolId?: string, 
    actionId?: CreditActionId
  ): Promise<UsagePermissionResult> {
    if (!userId) {
      return {
        allowed: false,
        reason: 'AUTH_REQUIRED',
        requiredCredits: 0,
        currentBalance: 0,
        planId: 'FREE',
        toolId,
        actionId,
        message: 'Você precisa estar autenticado para utilizar as ferramentas de IA.'
      };
    }

    const account = await this.getAccount(userId);
    const plan = getPlan(account.planId);

    // Admin bypass check
    if (account.isAdminBypass || plan.id === 'ADMIN') {
      return {
        allowed: true,
        reason: 'ALLOWED',
        requiredCredits: 0,
        currentBalance: account.balance,
        planId: account.planId,
        toolId,
        actionId,
        message: 'Acesso liberado (Modo Administrador - Sem consumo de créditos).'
      };
    }

    // Tool entitlement check
    if (toolId && !isToolAllowedForPlan(account.planId, toolId)) {
      return {
        allowed: false,
        reason: 'PLAN_TOOL_LOCKED',
        requiredCredits: 0,
        currentBalance: account.balance,
        planId: account.planId,
        toolId,
        actionId,
        message: `A ferramenta solicitada é restrita para o plano ${plan.name}. Faça upgrade para o Plano PRO para desbloquear.`
      };
    }

    // Credit requirement check
    const resolvedAction = actionId 
      ? { creditCost: getCreditCost(actionId) } 
      : resolveCreditAction(toolId);
    
    const requiredCredits = resolvedAction.creditCost;

    if (account.balance < requiredCredits) {
      return {
        allowed: false,
        reason: 'INSUFFICIENT_CREDITS',
        requiredCredits,
        currentBalance: account.balance,
        planId: account.planId,
        toolId,
        actionId,
        message: `Saldo insuficiente: você possui ${account.balance} crédito(s), mas esta ação requer ${requiredCredits} crédito(s).`
      };
    }

    return {
      allowed: true,
      reason: 'ALLOWED',
      requiredCredits,
      currentBalance: account.balance,
      planId: account.planId,
      toolId,
      actionId,
      message: 'Ação permitida.'
    };
  }

  /**
   * Idempotent credit debit routine.
   * Prevents double-charging if requestId was already processed.
   */
  public async debitCredits(params: {
    userId: string;
    actionId: CreditActionId;
    requestId: string;
    toolId?: string;
    toolLabel?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; balanceAfter: number; debitedAmount: number }> {
    const { userId, actionId, requestId, toolId, toolLabel, metadata } = params;

    if (!userId) {
      throw new Error("ID de usuário obrigatório para débito de créditos.");
    }

    // Idempotency check
    if (requestId && this.processedRequests.has(requestId)) {
      console.log(`[CREDIT ENGINE] Request ${requestId} already debited (idempotent no-op).`);
      const account = await this.getAccount(userId);
      return { success: true, balanceAfter: account.balance, debitedAmount: 0 };
    }

    const account = await this.getAccount(userId);
    const plan = getPlan(account.planId);

    // Admin bypass: 0 cost
    if (account.isAdminBypass || plan.id === 'ADMIN') {
      if (requestId) this.processedRequests.add(requestId);
      return { success: true, balanceAfter: account.balance, debitedAmount: 0 };
    }

    const cost = getCreditCost(actionId);

    if (account.balance < cost) {
      throw new Error(`Créditos insuficientes: Saldo atual de ${account.balance} é menor que o custo de ${cost} créditos.`);
    }

    const now = Date.now();
    account.balance -= cost;
    account.lifetimeUsedCredits += cost;
    account.lastDebitTimestamp = now;

    if (requestId) {
      this.processedRequests.add(requestId);
    }

    // Record Debit in Ledger
    await this.recordLedgerEntry(userId, {
      id: `deb_${now}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      type: 'DEBIT',
      amount: -cost,
      balanceAfter: account.balance,
      actionId,
      toolId,
      toolLabel,
      requestId,
      reason: `Uso de IA: ${toolLabel || actionId}`,
      metadata,
      timestamp: now
    });

    await this.saveAccount(account);

    return {
      success: true,
      balanceAfter: account.balance,
      debitedAmount: cost
    };
  }

  /**
   * Idempotent refund routine in case of AI execution error or abort.
   */
  public async refundCredits(params: {
    userId: string;
    requestId: string;
    amount?: number;
    actionId?: CreditActionId;
    toolId?: string;
    reason?: string;
  }): Promise<{ refunded: boolean; balanceAfter: number }> {
    const { userId, requestId, amount, actionId, toolId, reason } = params;

    if (!userId || !requestId) {
      return { refunded: false, balanceAfter: 0 };
    }

    // Prevent double refunds
    if (this.refundedRequests.has(requestId)) {
      console.log(`[CREDIT ENGINE] Request ${requestId} already refunded (idempotent no-op).`);
      const account = await this.getAccount(userId);
      return { refunded: false, balanceAfter: account.balance };
    }

    // Only refund if it was indeed previously debited
    if (!this.processedRequests.has(requestId)) {
      const account = await this.getAccount(userId);
      return { refunded: false, balanceAfter: account.balance };
    }

    const refundCost = amount || (actionId ? getCreditCost(actionId) : 2);
    const account = await this.getAccount(userId);

    // If admin bypass, no credit balance change needed
    if (account.isAdminBypass || account.planId === 'ADMIN') {
      this.refundedRequests.add(requestId);
      return { refunded: true, balanceAfter: account.balance };
    }

    const now = Date.now();
    account.balance += refundCost;
    account.lifetimeUsedCredits = Math.max(0, account.lifetimeUsedCredits - refundCost);

    this.refundedRequests.add(requestId);

    await this.recordLedgerEntry(userId, {
      id: `ref_${now}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      type: 'REFUND',
      amount: refundCost,
      balanceAfter: account.balance,
      actionId,
      toolId,
      requestId,
      reason: reason || 'Estorno automático devido a erro ou cancelamento da geração de IA',
      timestamp: now
    });

    await this.saveAccount(account);

    return {
      refunded: true,
      balanceAfter: account.balance
    };
  }

  /**
   * Grants bonus or promotional credits to a user.
   */
  public async grantCredits(userId: string, amount: number, reason: string): Promise<UserCreditAccount> {
    if (amount <= 0) throw new Error("A quantidade de créditos concedida deve ser positiva.");
    const account = await this.getAccount(userId);
    const now = Date.now();

    account.balance += amount;
    account.lifetimeGrantedCredits += amount;

    await this.recordLedgerEntry(userId, {
      id: `grt_${now}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      type: 'ADMIN_ADJUSTMENT',
      amount: amount,
      balanceAfter: account.balance,
      reason: reason || 'Créditos concedidos manualmente',
      timestamp: now
    });

    await this.saveAccount(account);
    return account;
  }

  /**
   * Changes user plan tier and recalibrates monthly allocations and entitlements.
   */
  public async setUserPlan(userId: string, newPlanId: CreatorPlanId): Promise<UserCreditAccount> {
    const account = await this.getAccount(userId);
    const newPlan = getPlan(newPlanId);
    const oldPlan = getPlan(account.planId);
    const now = Date.now();

    const previousBalance = account.balance;
    // When upgrading to a higher tier plan, grant the difference or full new monthly allocation
    const bonus = Math.max(0, newPlan.monthlyCredits - oldPlan.monthlyCredits);
    const newBalance = newPlan.id === 'ADMIN' ? 999999 : previousBalance + bonus;

    const updatedAccount: UserCreditAccount = {
      ...account,
      planId: newPlan.id,
      balance: newBalance,
      monthlyAllocation: newPlan.monthlyCredits,
      isAdminBypass: newPlan.id === 'ADMIN',
      billingCycleStart: now,
      billingCycleEnd: now + THIRTY_DAYS_MS,
      lifetimeGrantedCredits: account.lifetimeGrantedCredits + bonus,
      updatedAt: now
    };

    await this.recordLedgerEntry(userId, {
      id: `upg_${now}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      type: 'PLAN_UPGRADE',
      amount: bonus,
      balanceAfter: updatedAccount.balance,
      reason: `Alteração de Plano: ${oldPlan.name} ➔ ${newPlan.name}`,
      timestamp: now
    });

    await this.saveAccount(updatedAccount);
    return updatedAccount;
  }

  /**
   * Records a ledger entry in Firestore and Local Storage.
   */
  public async recordLedgerEntry(userId: string, entry: CreditUsageLedgerEntry): Promise<void> {
    // 1. Local Storage write
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.getLocalLedgerKey(userId));
        const entries: CreditUsageLedgerEntry[] = raw ? JSON.parse(raw) : [];
        const next = [entry, ...entries.filter(e => e.id !== entry.id)].slice(0, 100);
        localStorage.setItem(this.getLocalLedgerKey(userId), JSON.stringify(next));
      } catch (e) {
        console.warn("[CREDIT ENGINE] Error writing local ledger:", e);
      }
    }

    // 2. Cloud Firestore write
    if (!isFirestoreQuotaExceeded) {
      try {
        const safeId = entry.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
        const docRef = doc(db, 'users', userId, 'credit_ledger', safeId);
        await setDoc(docRef, entry);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${userId}/credit_ledger/${entry.id}`);
      }
    }
  }

  /**
   * Retrieves transaction ledger for a user.
   */
  public async getLedger(userId: string, maxItems = 50): Promise<CreditUsageLedgerEntry[]> {
    if (!userId) return [];

    let entries: CreditUsageLedgerEntry[] = [];

    // 1. Try Firestore if available
    if (!isFirestoreQuotaExceeded) {
      try {
        const q = query(
          collection(db, 'users', userId, 'credit_ledger'),
          orderBy('timestamp', 'desc'),
          firestoreLimit(maxItems)
        );
        const snapshot = await getDocs(q);
        snapshot.forEach(docSnap => {
          entries.push(docSnap.data() as CreditUsageLedgerEntry);
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, `users/${userId}/credit_ledger`);
      }
    }

    // 2. Fallback to Local Storage if cloud returned empty or errored
    if (entries.length === 0 && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.getLocalLedgerKey(userId));
        if (raw) {
          entries = (JSON.parse(raw) as CreditUsageLedgerEntry[]).slice(0, maxItems);
        }
      } catch (e) {
        console.warn("[CREDIT ENGINE] Error reading local ledger:", e);
      }
    }

    return entries;
  }
}

export const creditEngine = new CreditEngineService();
