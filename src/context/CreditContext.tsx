import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useFirebase } from './FirebaseContext';
import { 
  UserCreditAccount, 
  CreatorPlanDefinition, 
  CreatorPlanId, 
  CreditUsageLedgerEntry, 
  UsagePermissionResult,
  CreditActionId 
} from '../types/credits';
import { creditEngine } from '../services/creditEngineService';
import { getPlan } from '../services/planRegistry';

interface CreditContextType {
  account: UserCreditAccount | null;
  plan: CreatorPlanDefinition;
  balance: number;
  monthlyAllocation: number;
  ledger: CreditUsageLedgerEntry[];
  isLoading: boolean;
  isPlansModalOpen: boolean;
  isInsufficientCreditsModalOpen: boolean;
  insufficientCreditsDetail: UsagePermissionResult | null;
  
  openPlansModal: () => void;
  closePlansModal: () => void;
  openInsufficientCreditsModal: (detail?: UsagePermissionResult) => void;
  closeInsufficientCreditsModal: () => void;
  
  refreshCredits: () => Promise<void>;
  setUserPlan: (planId: CreatorPlanId) => Promise<void>;
  grantBonusCredits: (amount: number, reason?: string) => Promise<void>;
  checkPermission: (toolId?: string, actionId?: CreditActionId) => Promise<UsagePermissionResult>;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

export function CreditProvider({ children }: { children: React.ReactNode }) {
  const { user, authLoading, isAuthenticated } = useFirebase();

  const [account, setAccount] = useState<UserCreditAccount | null>(null);
  const [ledger, setLedger] = useState<CreditUsageLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState<boolean>(false);
  const [isInsufficientCreditsModalOpen, setIsInsufficientCreditsModalOpen] = useState<boolean>(false);
  const [insufficientCreditsDetail, setInsufficientCreditsDetail] = useState<UsagePermissionResult | null>(null);

  const plan = useMemo(() => {
    return getPlan(account?.planId || 'FREE');
  }, [account?.planId]);

  const loadUserData = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const acc = await creditEngine.getAccount(userId);
      setAccount(acc);
      const entries = await creditEngine.getLedger(userId, 50);
      setLedger(entries);
    } catch (e) {
      console.warn("[CREDIT CONTEXT] Error loading credit data:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Synchronize on authentication change
  useEffect(() => {
    if (authLoading) return;
    if (user?.uid) {
      loadUserData(user.uid);
    } else {
      setAccount(null);
      setLedger([]);
      setIsLoading(false);
    }
  }, [user?.uid, authLoading, loadUserData]);

  // Listen to real-time events broadcasted from creditEngine
  useEffect(() => {
    const handleCreditsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<UserCreditAccount>;
      if (customEvent.detail && user?.uid && customEvent.detail.userId === user.uid) {
        setAccount({ ...customEvent.detail });
        creditEngine.getLedger(user.uid, 50).then(entries => setLedger(entries)).catch(() => {});
      }
    };

    const handleOpenInsufficientModal = (e: Event) => {
      const customEvent = e as CustomEvent<UsagePermissionResult>;
      if (customEvent.detail) {
        setInsufficientCreditsDetail(customEvent.detail);
      }
      setIsInsufficientCreditsModalOpen(true);
    };

    const handleOpenPlansModal = () => {
      setIsPlansModalOpen(true);
    };

    window.addEventListener('creator-credits-updated', handleCreditsUpdated);
    window.addEventListener('open-insufficient-credits-modal', handleOpenInsufficientModal);
    window.addEventListener('open-plans-modal', handleOpenPlansModal);

    return () => {
      window.removeEventListener('creator-credits-updated', handleCreditsUpdated);
      window.removeEventListener('open-insufficient-credits-modal', handleOpenInsufficientModal);
      window.removeEventListener('open-plans-modal', handleOpenPlansModal);
    };
  }, [user?.uid]);

  const refreshCredits = useCallback(async () => {
    if (user?.uid) {
      await loadUserData(user.uid);
    }
  }, [user?.uid, loadUserData]);

  const setUserPlan = useCallback(async (newPlanId: CreatorPlanId) => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");
    const updated = await creditEngine.setUserPlan(user.uid, newPlanId);
    setAccount({ ...updated });
    const entries = await creditEngine.getLedger(user.uid, 50);
    setLedger(entries);
  }, [user?.uid]);

  const grantBonusCredits = useCallback(async (amount: number, reason = 'Bônus concedido') => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");
    const updated = await creditEngine.grantCredits(user.uid, amount, reason);
    setAccount({ ...updated });
    const entries = await creditEngine.getLedger(user.uid, 50);
    setLedger(entries);
  }, [user?.uid]);

  const checkPermission = useCallback(async (toolId?: string, actionId?: CreditActionId): Promise<UsagePermissionResult> => {
    if (!user?.uid) {
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
    return creditEngine.checkPermission(user.uid, toolId, actionId);
  }, [user?.uid]);

  const openPlansModal = useCallback(() => setIsPlansModalOpen(true), []);
  const closePlansModal = useCallback(() => setIsPlansModalOpen(false), []);

  const openInsufficientCreditsModal = useCallback((detail?: UsagePermissionResult) => {
    if (detail) setInsufficientCreditsDetail(detail);
    setIsInsufficientCreditsModalOpen(true);
  }, []);

  const closeInsufficientCreditsModal = useCallback(() => {
    setIsInsufficientCreditsModalOpen(false);
    setInsufficientCreditsDetail(null);
  }, []);

  const contextValue = useMemo(() => ({
    account,
    plan,
    balance: account?.balance ?? 0,
    monthlyAllocation: account?.monthlyAllocation ?? plan.monthlyCredits,
    ledger,
    isLoading,
    isPlansModalOpen,
    isInsufficientCreditsModalOpen,
    insufficientCreditsDetail,
    openPlansModal,
    closePlansModal,
    openInsufficientCreditsModal,
    closeInsufficientCreditsModal,
    refreshCredits,
    setUserPlan,
    grantBonusCredits,
    checkPermission
  }), [
    account,
    plan,
    ledger,
    isLoading,
    isPlansModalOpen,
    isInsufficientCreditsModalOpen,
    insufficientCreditsDetail,
    openPlansModal,
    closePlansModal,
    openInsufficientCreditsModal,
    closeInsufficientCreditsModal,
    refreshCredits,
    setUserPlan,
    grantBonusCredits,
    checkPermission
  ]);

  return (
    <CreditContext.Provider value={contextValue}>
      {children}
    </CreditContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditContext);
  if (!context) {
    throw new Error('useCredits must be used within a CreditProvider');
  }
  return context;
}
