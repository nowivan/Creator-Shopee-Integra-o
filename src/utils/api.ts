import { WORKER_URL } from '../utils';

export type ProxyStatus =
  | "checking"
  | "online"
  | "offline"
  | "method_mismatch"
  | "token_invalid"
  | "route_missing"
  | "cors_blocked"
  | "timeout"
  | "network_error"
  | "unknown";

export interface HealthCheckResult {
    ok: boolean;
    status: 'Proxy Online' | 'Proxy Offline' | 'Token Inválido' | 'Erro de CORS' | 'Rota Inexistente' | 'Checking' | 'Proxy Online — Method mismatch';
    detailedError?: string;
    httpStatus?: number | string;
    rawResponse?: string;
    timestamp: string;
}

/**
 * Normalizes complex HealthCheckResult states into highly granular, type-safe ProxyStatus states.
 */
export function normalizeProxyStatus(result: HealthCheckResult): ProxyStatus {
    const statusStr = result.status;
    const httpStatus = Number(result.httpStatus || 0);
    const lowercaseErr = (result.detailedError || "").toLowerCase();

    if (statusStr === 'Proxy Online') {
        return "online";
    }
    if (statusStr === 'Proxy Online — Method mismatch' || httpStatus === 405) {
        return "method_mismatch";
    }
    if (statusStr === 'Token Inválido' || httpStatus === 401) {
        return "token_invalid";
    }
    if (statusStr === 'Rota Inexistente' || httpStatus === 404) {
        return "route_missing";
    }
    if (statusStr === 'Erro de CORS') {
        return "cors_blocked";
    }
    if (lowercaseErr.includes("tempo limite") || lowercaseErr.includes("timeout")) {
        return "timeout";
    }
    if (lowercaseErr.includes("failed to fetch") || lowercaseErr.includes("fetch") || lowercaseErr.includes("conexão") || lowercaseErr.includes("rede")) {
        return "network_error";
    }
    if (statusStr === 'Proxy Offline') {
        return "offline";
    }
    return "unknown";
}

/**
 * Returns a ProxyStatus enum value matching a raw state string
 */
export function getNormalizedProxyStatus(statusStr: string): ProxyStatus {
    if (statusStr === 'Proxy Online' || statusStr === 'online') return "online";
    if (statusStr === 'Proxy Online — Method mismatch' || statusStr === 'method_mismatch') return "method_mismatch";
    if (statusStr === 'Token Inválido' || statusStr === 'token_invalid') return "token_invalid";
    if (statusStr === 'Rota Inexistente' || statusStr === 'route_missing') return "route_missing";
    if (statusStr === 'Erro de CORS' || statusStr === 'cors_blocked') return "cors_blocked";
    if (statusStr === 'Checking' || statusStr === 'checking') return "checking";
    if (statusStr === 'Proxy Offline' || statusStr === 'offline') return "offline";
    return "unknown";
}

/**
 * Checks whether generation is allowed with a given proxy status string
 */
export function canGenerateWithProxy(statusStr: string): boolean {
    return getNormalizedProxyStatus(statusStr) === "online";
}

/**
 * Performs an asynchronous health check on the Worker's health endpoint.
 * Validates the response JSON and returns real-time proxy status metrics.
 */
export const checkWorkerHealth = async (workerUrl: string, clientToken: string): Promise<HealthCheckResult> => {
    if (!workerUrl || !workerUrl.trim()) {
        return {
            ok: false,
            status: 'Proxy Offline',
            detailedError: "WORKER_URL está vazio ou não especificado.",
            timestamp: new Date().toISOString()
        };
    }

    const urlToCheck = workerUrl.trim();
    // Exclusively verify health using GET /health (avoiding duplicate subpaths)
    let fullUrl = urlToCheck;
    if (!fullUrl.endsWith('/health') && !fullUrl.endsWith('/health/')) {
        fullUrl = fullUrl.endsWith('/') ? `${fullUrl}health` : `${fullUrl}/health`;
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'X-Client-Token': clientToken.trim()
    };

    const timestamp = new Date().toISOString();

    try {
        console.log("=== EXECUTING ASYNC HEALTH CHECK (src/utils/api.ts) ===");
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout

        // Exclusively perform a GET request to verify health endpoint status
        const proxyPayload = {
            url: fullUrl,
            method: 'GET',
            headers
        };

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
        }

        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: JSON.stringify(proxyPayload),
            signal: controller.signal
        });
        clearTimeout(timer);

        const textResponse = await response.text();
        const httpStatus = response.status;

        // Try parsing the response as JSON if possible to inspect internal contents
        let isJSON = false;
        let parsedJSON: any = null;
        try {
            parsedJSON = JSON.parse(textResponse);
            isJSON = true;
        } catch (_) {
            // Not a valid JSON
        }

        // Check for specific method mismatch indicators
        const isMethodMismatch = 
            httpStatus === 405 || 
            (isJSON && parsedJSON && (
                parsedJSON.error === "Method not allowed" || 
                parsedJSON.message === "Use POST." || 
                String(parsedJSON.message).toLowerCase().includes("use post") ||
                String(parsedJSON.error).toLowerCase().includes("method not allowed")
            ));

        if (isMethodMismatch) {
            return {
                ok: false, // Since /health didn't return ok:true, ok is false
                status: 'Proxy Online — Method mismatch',
                detailedError: "HTTP 405 Method Not Allowed ou resposta 'Use POST': O Worker exige requisições POST para endpoints normais. Verifique se o endpoint em si exige GET.",
                httpStatus,
                rawResponse: textResponse,
                timestamp
            };
        }

        if (httpStatus === 200) {
            if (isJSON && parsedJSON) {
                // Show Proxy Online only when /health returns ok:true (or similar successful indicator)
                if (parsedJSON.ok === true || parsedJSON.status === 'online') {
                    return {
                        ok: true,
                        status: 'Proxy Online',
                        detailedError: "OK: Rota /health respondeu JSON válido com status online!",
                        httpStatus,
                        rawResponse: textResponse,
                        timestamp
                    };
                } else {
                    return {
                        ok: true, // Do not mark proxy offline since it responded with valid JSON
                        status: 'Proxy Online',
                        detailedError: `Worker respondeu HTTP 200 com JSON, mas sem 'ok: true' explícito. JSON recebido: ${JSON.stringify(parsedJSON)}`,
                        httpStatus,
                        rawResponse: textResponse,
                        timestamp
                    };
                }
            } else {
                // Not a valid JSON but responded with 200
                return {
                    ok: true,
                    status: 'Proxy Online',
                    detailedError: `Worker retornou status 200, mas o corpo não é um JSON válido. Resposta: ${textResponse.slice(0, 500)}`,
                    httpStatus,
                    rawResponse: textResponse,
                    timestamp
                };
            }
        } else if (httpStatus === 401) {
            return {
                ok: false,
                status: 'Token Inválido',
                detailedError: "HTTP 401 Unauthorized: Seu X-Client-Token foi rejeitado pelo Worker.",
                httpStatus,
                rawResponse: textResponse,
                timestamp
            };
        } else if (httpStatus === 404) {
            return {
                ok: false,
                status: 'Rota Inexistente',
                detailedError: "HTTP 404 Not Found: A rota /health não foi encontrada no Worker.",
                httpStatus,
                rawResponse: textResponse,
                timestamp
            };
        } else {
            // Any other HTTP code but with valid JSON is online! "Do not mark the proxy offline when the Worker responds with JSON"
            if (isJSON) {
                return {
                    ok: true, // Reachable and returned JSON
                    status: 'Proxy Online',
                    detailedError: `Worker respondeu com HTTP ${httpStatus} acompanhado de payload de erro JSON estruturado.`,
                    httpStatus,
                    rawResponse: textResponse,
                    timestamp
                };
            } else {
                return {
                    ok: false,
                    status: 'Proxy Offline',
                    detailedError: `Worker retornou código de erro HTTP: ${httpStatus}. Resposta: ${textResponse.slice(0, 300)}`,
                    httpStatus,
                    rawResponse: textResponse,
                    timestamp
                };
            }
        }
    } catch (err: any) {
        console.warn("Health check failed in utils/api.ts:", err);
        let status: 'Proxy Offline' | 'Erro de CORS' = 'Proxy Offline';
        let detailedError = err.message || JSON.stringify(err);

        if (err instanceof TypeError && err.message === 'Failed to fetch') {
            status = 'Erro de CORS';
            detailedError = "TypeError: Failed to fetch. Isso indica erro de segurança/CORS no Worker ou servidor offline.";
        } else if (err.name === 'AbortError') {
            status = 'Proxy Offline';
            detailedError = "A requisição de health check excedeu o tempo limite de 8 segundos.";
        }

        return {
            ok: false,
            status,
            detailedError,
            timestamp
        };
    }
};
