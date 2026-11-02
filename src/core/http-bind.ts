export const DEFAULT_HTTP_BIND_HOST = '127.0.0.1';

export const LAN_HTTP_BIND_HOST = '0.0.0.0';

const ALLOWED_BIND_HOSTS = new Set([DEFAULT_HTTP_BIND_HOST, LAN_HTTP_BIND_HOST]);

export function resolveHttpBindHost(
    envValue?: string | null,

    configValue?: string | null,
): string {
    const env = (envValue ?? '').trim();

    if (ALLOWED_BIND_HOSTS.has(env)) {
        return env;
    }

    const cfg = (configValue ?? '').trim();

    if (ALLOWED_BIND_HOSTS.has(cfg)) {
        return cfg;
    }

    return DEFAULT_HTTP_BIND_HOST;
}
