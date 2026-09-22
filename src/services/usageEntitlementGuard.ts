/**
 * Creator Intelligence Pro — Usage Entitlement Guard (Etapa 4A).
 * Pre-flight guard and execution wrapper enforcing plan tool limits and credit deductions.
 */

import { UsagePermissionResult, CreditActionId } from '../types/credits';
import { creditEngine } from './creditEngineService';
import { resolveCreditAction } from './creditActionRegistry';
import { getPlan } from './planRegistry';

/**
 * Validates whether the user is permitted to execute a specific AI action or access a tool.
 */
export async function checkUsagePermission(params: {
  userId?: string;
  toolId?: string;
  actionId?: CreditActionId;
}): Promise<UsagePermissionResult> {
  const { userId, toolId, actionId } = params;
  return creditEngine.checkPermission(userId, toolId, actionId);
}

/**
 * Returns a human-friendly error message formatted in Portuguese.
 */
export function formatEntitlementErrorMessage(result: UsagePermissionResult): string {
  if (result.allowed) return '';

  switch (result.reason) {
    case 'AUTH_REQUIRED':
      return 'É necessário entrar na sua conta para utilizar os recursos de IA.';
    case 'PLAN_TOOL_LOCKED':
      return `Esta ferramenta é exclusiva para membros do Plano PRO ou superior. Seu plano atual é o ${getPlan(result.planId).name}.`;
    case 'INSUFFICIENT_CREDITS':
      return `Saldo insuficiente: você possui ${result.currentBalance} crédito(s), mas esta ação requer ${result.requiredCredits} crédito(s).`;
    case 'DAILY_LIMIT_REACHED':
      return 'Limite diário de gerações atingido para o seu plano atual. Tente novamente amanhã ou faça upgrade.';
    default:
      return result.message || 'Ação não permitida.';
  }
}

/**
 * Higher-order executor that wraps an AI execution task with credit checks,
 * automatic deduction upon execution, and automatic refund if execution fails or is aborted.
 */
export async function withCreditEntitlementGuard<T>(
  params: {
    userId: string;
    toolId?: string;
    toolLabel?: string;
    actionId?: CreditActionId;
    requestId: string;
    metadata?: Record<string, any>;
  },
  task: () => Promise<T>
): Promise<T> {
  const { userId, toolId, toolLabel, requestId, metadata } = params;
  const actionDef = params.actionId ? { actionId: params.actionId } : resolveCreditAction(toolId);
  const resolvedActionId = actionDef.actionId;

  // 1. Pre-flight check
  const permission = await checkUsagePermission({
    userId,
    toolId,
    actionId: resolvedActionId
  });

  if (!permission.allowed) {
    const errorMsg = formatEntitlementErrorMessage(permission);
    const err = new Error(errorMsg);
    (err as any).code = permission.reason;
    (err as any).permissionResult = permission;
    throw err;
  }

  // 2. Pre-debit credits
  await creditEngine.debitCredits({
    userId,
    actionId: resolvedActionId,
    requestId,
    toolId,
    toolLabel,
    metadata
  });

  // 3. Execute the actual task
  try {
    const result = await task();
    return result;
  } catch (err: any) {
    // 4. In case of execution failure or cancellation, auto-refund the credits!
    console.warn(`[ENTITLEMENT GUARD] Task failed (${err.message}). Auto-refunding credits for requestId: ${requestId}`);
    try {
      await creditEngine.refundCredits({
        userId,
        requestId,
        actionId: resolvedActionId,
        toolId,
        reason: `Estorno de erro de IA: ${err.message || 'Falha na requisição'}`
      });
    } catch (refundErr) {
      console.error("[ENTITLEMENT GUARD] Error during credit refund:", refundErr);
    }
    throw err;
  }
}
