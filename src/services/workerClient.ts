import { WORKER_URL, WORKER_TOKEN, sanitizeJsonString, safeJSONParse } from '../utils';
import { auth } from './firebase';
import { usageTelemetry, resolveTool } from './usageTelemetryService';
import { creditEngine } from './creditEngineService';
import { resolveCreditAction } from './creditActionRegistry';
import { videoEngineLatencyService } from './videoEngineLatencyService';

export type TransportStatus = 'SUCCESS' | 'NETWORK_ERROR' | 'TIMEOUT' | 'ABORTED' | 'MODEL_ERROR' | 'INVALID_RESPONSE';

export class GeminiRequestAbortedError extends Error {
    readonly isAborted = true;
    readonly code = 'REQUEST_ABORTED';
    readonly transportStatus: TransportStatus = 'ABORTED';

    constructor(message = 'A requisição foi cancelada.') {
        super(message);
        this.name = 'GeminiRequestAbortedError';
        Object.setPrototypeOf(this, GeminiRequestAbortedError.prototype);
    }
}

export class GeminiRequestTimeoutError extends Error {
    readonly isTimeout = true;
    readonly code = 'REQUEST_TIMEOUT';
    readonly transportStatus: TransportStatus = 'TIMEOUT';
    readonly timeoutMs?: number;

    constructor(message = 'Tempo limite esgotado ao aguardar resposta da IA.', timeoutMs?: number) {
        super(message);
        this.name = 'GeminiRequestTimeoutError';
        this.timeoutMs = timeoutMs;
        Object.setPrototypeOf(this, GeminiRequestTimeoutError.prototype);
    }
}

export function isAbortError(err: any): boolean {
    if (!err) return false;
    if (err instanceof GeminiRequestAbortedError) return true;
    if (err.isAborted || err.code === 'REQUEST_ABORTED') return true;
    if (err.name === 'AbortError' && !err.isTimeout) return true;
    const msg = String(err.message || '').toLowerCase();
    if (
        msg.includes('aborted') ||
        msg.includes('cancelada') ||
        msg.includes('the user aborted a request') ||
        msg.includes('the task was canceled') ||
        msg.includes('request was aborted')
    ) {
        return true;
    }
    return false;
}

export function isTimeoutError(err: any): boolean {
    if (!err) return false;
    if (err instanceof GeminiRequestTimeoutError) return true;
    if (err.isTimeout || err.code === 'REQUEST_TIMEOUT') return true;
    if (err.status === 504) return true;
    const msg = String(err.message || '').toLowerCase();
    if (msg.includes('tempo limite') || msg.includes('timeout') || msg.includes('time limit exceeded')) {
        return true;
    }
    return false;
}

export class WorkerRequestError extends Error {
    status?: number;
    endpoint: string;
    requestId?: string;
    diagnostic?: any;
    transportStatus?: TransportStatus;

    constructor(message: string, endpoint: string, status?: number, requestId?: string, diagnostic?: any, transportStatus?: TransportStatus) {
        super(message);
        this.name = 'WorkerRequestError';
        this.status = status;
        this.endpoint = endpoint;
        this.requestId = requestId;
        this.diagnostic = diagnostic;
        this.transportStatus = transportStatus;
    }
}

/**
 * Masks sensitive authorization tokens for secure logging and diagnostics.
 * @param token The raw token to mask
 * @returns Masked token in format abcd...efgh
 */
export function maskToken(token?: string): string {
    if (!token) return 'Vazio';
    const trimmed = token.trim();
    if (trimmed.length <= 8) return '****';
    return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

const cleanCandidates = (candidatesArray: any[]) => {
    if (!Array.isArray(candidatesArray)) return candidatesArray;
    return candidatesArray.map(candidate => {
        if (!candidate?.content?.parts) return candidate;
        const parts = candidate.content.parts;
        const nonThoughtParts = parts.filter((p: any) => p && p.text && !p.thought);
        if (nonThoughtParts.length > 0) {
            return {
                ...candidate,
                content: {
                    ...candidate.content,
                    parts: nonThoughtParts
                }
            };
        }
        return candidate;
    });
};

/**
 * Normalizes any worker/Gemini payload into a standardized structured format.
 */
export function normalizeWorkerResponse(response: any): any {
    if (!response) {
        return {
            ok: false,
            partial: false,
            mode: null,
            request_id: null,
            data: null,
            raw_text: "",
            warnings: [],
            errorMessage: "Resposta nula ou inválida recebida da IA.",
            candidates: [],
            raw: null
        };
    }

    // 1. Double check wrap format from Cloudflare Worker
    const hasWorkerFields = ('ok' in response) || ('raw_text' in response) || ('request_id' in response);
    
    if (hasWorkerFields) {
        const ok = response.ok !== false && !response.error;
        let raw_text = response.raw_text || response.message || "";
        let data = response.data || null;

        // Extract raw_text from candidates if it's there
        if (!raw_text && response.candidates?.[0]?.content?.parts?.[0]?.text) {
            raw_text = response.candidates[0].content.parts[0].text;
        }

        // Try parsing json from raw_text
        if (!data && raw_text) {
            data = safeJSONParse(raw_text, null);
        }

        const candidates = cleanCandidates(response.candidates) || [
            {
                content: {
                    parts: [
                        { text: raw_text }
                    ]
                },
                finishReason: "STOP"
            }
        ];

        const worker_version = response.worker_version || response.execution_meta?.worker_version || null;
        const proxy_path = response.proxy_path || (response.failover_used ? 'server_failover' : 'cloudflare_worker');
        const failover_used = Boolean(response.failover_used);
        const synthetic_fallback_used = Boolean(response.synthetic_fallback_used);
        const execution_meta = response.execution_meta || null;
        const requested_model = response.requested_model || response.execution_meta?.requested_model || null;
        const executed_model = response.executed_model || response.execution_meta?.executed_model || null;

        const diagnostic_meta = response.diagnostic_meta ? {
            ...response.diagnostic_meta,
            L4: (response.raw_text || raw_text || '').length
        } : null;

        const usageMetadata = response.usageMetadata || response.usage_metadata || response.execution_meta?.usageMetadata || response.execution_meta?.usage_metadata || response.raw?.usageMetadata || null;

        return {
            ok,
            partial: !!response.partial,
            mode: response.mode || null,
            request_id: response.request_id || null,
            worker_version,
            proxy_path,
            failover_used,
            synthetic_fallback_used,
            requested_model,
            executed_model,
            execution_meta,
            diagnostic_meta,
            usageMetadata,
            data,
            raw_text,
            warnings: response.warnings || [],
            errorMessage: response.message || (ok ? null : "Erro do Worker."),
            candidates,
            raw: response
        };
    }

    // 2. Direct Gemini Candidates Format
    if (response.candidates && Array.isArray(response.candidates)) {
        const candidate = response.candidates[0];
        const parts = candidate?.content?.parts || [];
        const nonThoughtParts = parts.filter((p: any) => p && p.text && !p.thought);
        const text = nonThoughtParts.length > 0 
            ? nonThoughtParts.map((p: any) => p.text).join("")
            : (parts.filter((p: any) => p && p.text).map((p: any) => p.text).join("") || "");
        
        let parsedData = safeJSONParse(text, null);
        const usageMetadata = response.usageMetadata || response.usage_metadata || null;

        return {
            ok: true,
            partial: false,
            mode: null,
            request_id: null,
            usageMetadata,
            data: parsedData,
            raw_text: text,
            warnings: [],
            errorMessage: null,
            candidates: cleanCandidates(response.candidates),
            raw: response
        };
    }

    // 3. Simple fallback dictionary format
    let raw_text = typeof response === 'string' ? response : (response.text || JSON.stringify(response));
    let parsedData = null;
    if (typeof response === 'object' && response !== null) {
        parsedData = response;
    } else {
        try {
            parsedData = JSON.parse(raw_text);
        } catch (_) {}
    }

    const candidates = [
        {
            content: {
                parts: [
                    { text: raw_text }
                ]
            },
            finishReason: "STOP"
        }
    ];

    const usageMetadata = (typeof response === 'object' && response !== null) ? (response.usageMetadata || response.usage_metadata || null) : null;

    return {
        ok: true,
        partial: false,
        mode: null,
        request_id: null,
        usageMetadata,
        data: parsedData || response,
        raw_text,
        warnings: [],
        errorMessage: null,
        candidates,
        raw: response
    };
}

/**
 * Robust central client routine to post payloads to the Worker with complete diagnostic recovery.
 * It is fully protected against empty responses, JSON exceptions, timeouts, and authorization errors.
 */
export async function postToWorker<TResponse = any>(
    endpoint: string,
    payload: Record<string, any>,
    options?: {
        timeoutMs?: number;
        debug?: boolean;
        toolId?: string;
        moduleName?: string;
        workerUrl?: string;
        clientToken?: string;
        signal?: AbortSignal;
    }
): Promise<TResponse> {
    const isDebug = options?.debug ?? true;
    const moduleName = options?.moduleName || options?.toolId || payload?.toolId || payload?.moduleName || "Central Worker Client";
    const base = (options?.workerUrl || WORKER_URL || '').trim();
    const token = (options?.clientToken || WORKER_TOKEN || '').trim();

    if (typeof window !== 'undefined' && !auth.currentUser) {
        if (typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('open-auth-modal'));
        }
        throw new Error("Autenticação necessária. Por favor, faça login para continuar.");
    }

    if (!base) {
        throw new WorkerRequestError(
            `[${moduleName}] URL do Worker não configurada ou vazia.`,
            endpoint,
            undefined,
            undefined,
            "Certifique-se de que a variável WORKER_URL está definida nas configurações.",
            'NETWORK_ERROR'
        );
    }

    const cleanedRoute = endpoint.trim().startsWith('/') ? endpoint.trim() : `/${endpoint.trim()}`;
    const fullUrl = base.endsWith('/') ? `${base.slice(0, -1)}${cleanedRoute}` : `${base}${cleanedRoute}`;

    const requestId = `req_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const startTime = performance.now();

    const mode = (payload.mode || payload.ai_target || payload.currentMode || "").toString();
    const isAnalysisMode = mode === "product_analysis" || mode === "product_image_analysis";
    const isComplianceOrPunishment = mode === "compliance_script_audit" || mode === "punishment_print_analysis";
    const isTTS = base.includes("tts") || (!payload.contents && !payload.prompt && payload.text && payload.voice);

    const rawToolIdentifier = options?.toolId || payload?.toolId || options?.moduleName || payload?.moduleName || payload?.mode || payload?.ai_target || payload?.currentMode || 'unknown_tool';
    const resolvedTool = resolveTool(rawToolIdentifier);
    const telemetryToolId = resolvedTool.id;
    const modelStr = String(payload.model || 'gemini-3.5-flash');

    // =========================================================================
    // CREATOR INTELLIGENCE PRO — ETAPA 4A: INTERNAL CREDIT ENGINE & USAGE GUARD
    // =========================================================================
    const resolvedAction = resolveCreditAction(telemetryToolId, mode);
    const currentUser = auth.currentUser;

    if (currentUser?.uid) {
        const permission = await creditEngine.checkPermission(
            currentUser.uid,
            telemetryToolId,
            resolvedAction.actionId
        );

        if (!permission.allowed) {
            if (permission.reason === 'INSUFFICIENT_CREDITS') {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-insufficient-credits-modal', { detail: permission }));
                }
            } else if (permission.reason === 'PLAN_TOOL_LOCKED') {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-plans-modal', { detail: permission }));
                }
            }
            throw new Error(permission.message);
        }

        // Pre-debit credits idempotently
        await creditEngine.debitCredits({
            userId: currentUser.uid,
            actionId: resolvedAction.actionId,
            requestId,
            toolId: telemetryToolId,
            toolLabel: resolvedTool.label,
            metadata: {
                mode: payload.mode || payload.ai_target || undefined,
                model: modelStr
            }
        });
    }

    try {
        usageTelemetry.trackGenerationStarted({
            requestId,
            toolId: telemetryToolId,
            model: modelStr,
            provider: 'google_gemini',
            metadata: {
                mode: payload.mode || payload.ai_target || undefined
            }
        });
    } catch {
        // Non-blocking telemetry
    }

    const cleanedPayload: Record<string, any> = {};

    if (isTTS) {
        // TTS: Keep all fields from payload
        for (const key of Object.keys(payload)) {
            if (payload[key] !== undefined) {
                cleanedPayload[key] = payload[key];
            }
        }
    } else if (isComplianceOrPunishment) {
        // Compliance & Punishment modes: Keep ONLY standard Gemini fields + model
        const standardGeminiFields = new Set([
            'contents',
            'generationConfig',
            'safetySettings',
            'systemInstruction',
            'tools',
            'toolConfig',
            'model'
        ]);
        for (const key of Object.keys(payload)) {
            if (payload[key] !== undefined && standardGeminiFields.has(key)) {
                cleanedPayload[key] = payload[key];
            }
        }
    } else if (isAnalysisMode) {
        // Analysis: Keep all fields, but omit request_metadata to prevent forwarding errors
        const analysisAllowedKeys = new Set([
            'mode', 'ai_target', 'currentMode',
            'product_image', 'image', 'productImage', 'uploaded_product_image',
            'image_base64', 'image_mime_type', 'mime_type',
            'model', 'risk_metadata'
        ]);
        for (const key of Object.keys(payload)) {
            if (payload[key] !== undefined && (analysisAllowedKeys.has(key) || key.startsWith('product_') || key.startsWith('image_'))) {
                cleanedPayload[key] = payload[key];
            }
        }
    } else {
        // Standard Gemini API Request: Keep standard Gemini fields + prompt, text, model
        const standardGeminiFields = new Set([
            'contents',
            'generationConfig',
            'safetySettings',
            'systemInstruction',
            'tools',
            'toolConfig',
            'model',
            'prompt',
            'text',
            'input',
            'mode'
        ]);
        for (const key of Object.keys(payload)) {
            if (payload[key] !== undefined && standardGeminiFields.has(key)) {
                cleanedPayload[key] = payload[key];
            }
        }
        if (!cleanedPayload.contents && (cleanedPayload.prompt || cleanedPayload.text)) {
            cleanedPayload.contents = [{ parts: [{ text: String(cleanedPayload.prompt || cleanedPayload.text) }] }];
        }
    }

    const isScene3Cta = mode === 'scene3_cta_engine' || mode === 'scene3_cta_engine_repair';
    const activeModel = String(cleanedPayload.model || payload.model || modelStr || '');
    const isFlashThinkingFamily = !activeModel || /gemini-(3\.[1-8]|flash)/i.test(activeModel);

    if (cleanedPayload.generationConfig && typeof cleanedPayload.generationConfig === 'object') {
        if (isScene3Cta && isFlashThinkingFamily) {
            // Authorized Scene 3 CTA Engine: enforce thinkingBudget: 0 strictly
            cleanedPayload.generationConfig = {
                ...cleanedPayload.generationConfig,
                thinkingConfig: {
                    thinkingBudget: 0
                }
            };
        } else {
            // All other agents/modes: strip thinkingConfig
            const { thinkingConfig, thinking_config, ...restGenConfig } = cleanedPayload.generationConfig;
            cleanedPayload.generationConfig = restGenConfig;
        }
    } else if (isScene3Cta && isFlashThinkingFamily) {
        cleanedPayload.generationConfig = {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2048,
            thinkingConfig: {
                thinkingBudget: 0
            }
        };
    }
    delete cleanedPayload.thinkingConfig;
    delete cleanedPayload.thinking_config;

    if (isDebug) {
        console.log(`[${moduleName}] Enviando POST para ${fullUrl} (ID: ${requestId})`, {
            payloadSize: JSON.stringify(cleanedPayload).length,
            token: maskToken(token)
        });
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Client-Token': token,
        'X-Request-Id': requestId,
        'X-Timestamp': timestamp,
        'X-Module-Name': moduleName
    };

    const timeout = options?.timeoutMs || 180000; // 3 minutes default
    let isTimedOut = false;
    const internalController = new AbortController();
    const timer = setTimeout(() => {
        isTimedOut = true;
        internalController.abort();
    }, timeout);

    const externalSignal = options?.signal;
    if (externalSignal?.aborted) {
        clearTimeout(timer);
        throw new GeminiRequestAbortedError(`A requisição para '${moduleName}' foi cancelada antes de iniciar.`);
    }

    const onExternalAbort = () => {
        internalController.abort();
    };

    if (externalSignal) {
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    let proxyUrl = '/api/proxy';
    if (typeof window !== 'undefined' && window.location) {
        let baseOrigin = window.location.origin;
        if (!baseOrigin || baseOrigin === 'null') {
            try {
                const urlObj = new URL(window.location.href);
                baseOrigin = `${urlObj.protocol}//${urlObj.host}`;
            } catch (e) {
                baseOrigin = '';
            }
        }
        if (baseOrigin) {
            proxyUrl = `${baseOrigin}/api/proxy`;
        }
    } else if (typeof window === 'undefined') {
        proxyUrl = 'http://localhost:3000/api/proxy';
    }

    try {
        const proxyPayload = {
            url: fullUrl,
            method: 'POST',
            headers,
            payload: cleanedPayload
        };

        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: JSON.stringify(proxyPayload),
            signal: internalController.signal
        });
        clearTimeout(timer);
        if (externalSignal) {
            externalSignal.removeEventListener('abort', onExternalAbort);
        }

        const status = response.status;
        const contentType = response.headers.get('content-type') || 'não especificado';
        const rawText = (await response.text()).trim();

        // Safe temporary diagnostic logging for Frontend -> Cloudflare Worker communication
        console.log(`[Diagnóstico Worker] Comunicação Frontend → Cloudflare Worker:`, {
            targetUrl: fullUrl,
            method: 'POST',
            httpStatus: status,
            responseOk: response.ok,
            contentType: contentType,
            sanitizedResponseSample: rawText ? (rawText.length > 300 ? rawText.slice(0, 300) + '...' : rawText) : '(vazio)'
        });

        if (status === 400) {
            throw new WorkerRequestError(
                `Requisição inválida (HTTP 400): Os parâmetros enviados no módulo '${moduleName}' foram rejeitados pelo Worker.`,
                endpoint,
                400,
                requestId,
                "Verifique se todos os campos obrigatórios estão preenchidos de forma válida.",
                'INVALID_RESPONSE'
            );
        }

        if (status >= 500) {
            throw new WorkerRequestError(
                `Erro interno no Worker ou Gemini (HTTP ${status}): Falha na infraestrutura de processamento de IA para o módulo '${moduleName}'.`,
                endpoint,
                status,
                requestId,
                "Ocorreu um erro no servidor do Cloudflare Worker ou nas APIs do Gemini do parceiro.",
                'MODEL_ERROR'
            );
        }

        if (status === 401) {
            throw new WorkerRequestError(
                `Não autorizado (HTTP 401): O token '${maskToken(token)}' fornecido para o módulo '${moduleName}' foi rejeitado pelo Worker.`,
                endpoint,
                401,
                requestId,
                "Verifique a senha de integração/X-Client-Token do Worker nas Configurações da Suíte.",
                'NETWORK_ERROR'
            );
        }

        if (status === 404) {
            throw new WorkerRequestError(
                `Rota não encontrada (HTTP 404): O endpoint '${cleanedRoute}' não está ativo no Worker de endereço '${base}'.`,
                endpoint,
                404,
                requestId,
                "Verifique as rotas registradas no arquivo de código principal do seu Worker ou use a rota de fallback '/'.",
                'NETWORK_ERROR'
            );
        }

        if (status === 405) {
            throw new WorkerRequestError(
                `Método não permitido (HTTP 405): O Worker rejeitou o método POST para o endpoint '${cleanedRoute}'.`,
                endpoint,
                405,
                requestId,
                "Certifique-se de que o Worker aceita requisições POST para fluxos de processamento e geração de conteúdo.",
                'NETWORK_ERROR'
            );
        }

        if (status === 413) {
            throw new WorkerRequestError(
                `Tamanho de carga excedido (HTTP 413): O tamanho das imagens ou do texto enviado excede o limite suportado pelo servidor.`,
                endpoint,
                413,
                requestId,
                "Reduza a resolução da imagem ou a quantidade de texto enviada e tente novamente.",
                'INVALID_RESPONSE'
            );
        }

        if (status === 429) {
            throw new WorkerRequestError(
                `Limite de requisições excedido (HTTP 429): Limite de API atingido ao processar com Gemini no módulo '${moduleName}'.`,
                endpoint,
                429,
                requestId,
                "Aguarde alguns segundos para que sua cota de requisições por minuto (RPM) reinicie e tente enviar novamente.",
                'MODEL_ERROR'
            );
        }

        if (!rawText) {
            throw new WorkerRequestError(
                `Resposta vazia do Worker (HTTP ${status}) no módulo '${moduleName}'.`,
                endpoint,
                status,
                requestId,
                "O Cloudflare Worker respondeu com sucesso mas entregou um corpo vazio de dados.",
                'INVALID_RESPONSE'
            );
        }

        let parsedJSON: any = safeJSONParse(rawText, null);
        if (!parsedJSON) {
            if (status >= 200 && status < 300) {
                // Treat text as success raw_text field to assist calling components
                parsedJSON = {
                    ok: true,
                    raw_text: rawText,
                    data: rawText
                };
            } else {
                let errSummary = rawText.slice(0, 300);
                if (status === 413 || rawText.toLowerCase().includes("too large")) {
                    errSummary = "Tamanho do payload/imagem excedido (HTTP 413). Reduza a resolução dos arquivos.";
                } else if (rawText.includes("<html") || rawText.includes("<!DOCTYPE")) {
                    errSummary = `Erro de servidor HTTP ${status}`;
                }

                throw new WorkerRequestError(
                    `Erro de execução da IA (HTTP ${status}): ${errSummary}`,
                    endpoint,
                    status,
                    requestId,
                    { error: errSummary, raw: rawText.slice(0, 500) },
                    'MODEL_ERROR'
                );
            }
        }

        if (!response.ok || (parsedJSON && parsedJSON.error)) {
            const apiErrorMsg = parsedJSON?.error?.message || parsedJSON?.message || parsedJSON?.error || `Erro HTTP ${status}`;
            throw new WorkerRequestError(
                `Erro de execução da IA: ${apiErrorMsg}`,
                endpoint,
                status,
                requestId,
                parsedJSON,
                'MODEL_ERROR'
            );
        }

        // Return standardized object for unified consumption
        const normalizedResult = normalizeWorkerResponse(parsedJSON) as TResponse;
        const latencyMs = Math.round(performance.now() - startTime);
        const usageMeta = (normalizedResult as any)?.usageMetadata || parsedJSON?.usageMetadata || parsedJSON?.usage_metadata;
        const inputTokens = typeof usageMeta?.promptTokenCount === 'number' ? usageMeta.promptTokenCount : undefined;
        const outputTokens = typeof usageMeta?.candidatesTokenCount === 'number' ? usageMeta.candidatesTokenCount : undefined;
        const thinkingTokens = typeof usageMeta?.thoughtsTokenCount === 'number'
            ? usageMeta.thoughtsTokenCount
            : (typeof usageMeta?.thinkingTokenCount === 'number' ? usageMeta.thinkingTokenCount : undefined);
        const totalTokens = typeof usageMeta?.totalTokenCount === 'number'
            ? usageMeta.totalTokenCount
            : (typeof inputTokens === 'number' && typeof outputTokens === 'number'
                ? inputTokens + outputTokens + (thinkingTokens || 0)
                : undefined);
        const executedModel = (normalizedResult as any)?.executed_model || (normalizedResult as any)?.requested_model || modelStr;

        let tokenReconciliation: 'EXACT' | 'PARTIAL' | 'MISMATCH' | 'NONE' = 'NONE';
        if (typeof totalTokens === 'number') {
            const knownSum = (inputTokens || 0) + (outputTokens || 0) + (thinkingTokens || 0);
            if (inputTokens !== undefined && outputTokens !== undefined) {
                if (knownSum === totalTokens) {
                    tokenReconciliation = 'EXACT';
                } else if (knownSum < totalTokens) {
                    tokenReconciliation = 'PARTIAL';
                } else {
                    tokenReconciliation = 'MISMATCH';
                }
            } else {
                tokenReconciliation = 'PARTIAL';
            }
        }

        try {
            usageTelemetry.trackGenerationSuccess({
                requestId,
                toolId: telemetryToolId,
                model: executedModel,
                provider: 'google_gemini',
                latencyMs,
                inputTokens,
                outputTokens,
                thinkingTokens,
                totalTokens,
                tokenReconciliation,
                metadata: {
                    mode: payload.mode || payload.ai_target || undefined,
                    thoughtsTokenCount: thinkingTokens
                }
            });

            // Feed real-time video engine latency telemetry
            const isVideoTool = telemetryToolId === 'cinematic' || telemetryToolId === 'reverse' || telemetryToolId === 'try-on' || telemetryToolId === 'ai-video-project' || telemetryToolId === 'visual-reference-agent';
            const targetEngine = isVideoTool ? 'google_veo' : 'gemini_video_gateway';
            videoEngineLatencyService.recordEngineCall(targetEngine, latencyMs, true, status, `Chamada em ${telemetryToolId}`);
        } catch {
            // Non-blocking telemetry
        }

        return normalizedResult;

    } catch (err: any) {
        clearTimeout(timer);
        if (externalSignal) {
            externalSignal.removeEventListener('abort', onExternalAbort);
        }

        let finalError = err;

        if (err instanceof GeminiRequestAbortedError || err instanceof GeminiRequestTimeoutError) {
            finalError = err;
        } else if (err instanceof WorkerRequestError) {
            finalError = err;
        } else {
            const wasAbortedExternally = externalSignal?.aborted || (err.name === 'AbortError' && !isTimedOut);
            if (wasAbortedExternally) {
                finalError = new GeminiRequestAbortedError(`A requisição no módulo '${moduleName}' foi cancelada.`);
            } else if (isTimedOut || (err.name === 'AbortError' && isTimedOut)) {
                finalError = new GeminiRequestTimeoutError(
                    `Tempo limite esgotado (${timeout / 1000}s) ao aguardar resposta no módulo '${moduleName}'.`,
                    timeout
                );
            } else {
                const isNetworkErr = err.message === 'Failed to fetch' || err.name === 'TypeError';
                if (isNetworkErr) {
                    finalError = new WorkerRequestError(
                        `Erro de rede / Bloqueio CORS: Falha de conexão externa aos servidores do Worker de endereço '${base}'.`,
                        endpoint,
                        0,
                        requestId,
                        "Verifique se o Worker está ativo, se a URL está correta ou se as regras de CORS (Access-Control-Allow-Origin: *) estão ativas no Worker.",
                        'NETWORK_ERROR'
                    );
                } else {
                    finalError = new WorkerRequestError(
                        `Erro de conexão desconhecido no canal do Worker: ${err.message || String(err)}`,
                        endpoint,
                        err.status || 500,
                        requestId,
                        err,
                        'MODEL_ERROR'
                    );
                }
            }
        }

        const latencyMs = Math.round(performance.now() - startTime);
        try {
            usageTelemetry.trackGenerationError({
                requestId,
                toolId: telemetryToolId,
                model: modelStr,
                provider: 'google_gemini',
                latencyMs,
                error: finalError,
                metadata: {
                    mode: payload.mode || payload.ai_target || undefined
                }
            });
        } catch {
            // Non-blocking telemetry
        }

        // Auto-refund credits if user was charged and generation failed/aborted
        if (currentUser?.uid) {
            try {
                await creditEngine.refundCredits({
                    userId: currentUser.uid,
                    requestId,
                    actionId: resolvedAction.actionId,
                    toolId: telemetryToolId,
                    reason: `Estorno automático: ${finalError.message || 'Falha na requisição de IA'}`
                });
            } catch (refundErr) {
                console.warn("[WORKER CLIENT] Error attempting credit refund:", refundErr);
            }
        }

        throw finalError;
    }
}
