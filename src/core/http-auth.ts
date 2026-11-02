export function hostnameFromHostHeader(hostHeader: string | undefined | null): string | null {
    if (!hostHeader) {
        return null;
    }

    const h = hostHeader.trim().toLowerCase();

    if (!h) {
        return null;
    }

    if (h.startsWith('[')) {
        const end = h.indexOf(']');

        if (end > 0) {
            return h.slice(1, end);
        }

        return null;
    }

    const first = h.indexOf(':');

    const last = h.lastIndexOf(':');

    if (first > 0 && first === last) {
        return h.slice(0, first);
    }

    return h;
}

function isLoopbackHostname(host: string): boolean {
    const h = host.toLowerCase().replace(/^\[|\]$/g, '');

    return h === '127.0.0.1' || h === 'localhost' || h === '::1';
}

export function isAllowedOrigin(
    origin: string | undefined | null,

    hostHeader?: string | undefined | null,
): boolean {
    if (origin === undefined || origin === null || origin === '') {
        return true;
    }

    try {
        const u = new URL(origin);

        const originHost = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');

        if (isLoopbackHostname(originHost)) {
            return true;
        }

        const reqHost = hostnameFromHostHeader(hostHeader);

        if (reqHost && originHost === reqHost) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

export function extractBearerToken(authorization: string | undefined | null): string | null {
    if (!authorization) {
        return null;
    }

    const m = /^Bearer\s+(\S+)\s*$/i.exec(authorization.trim());

    return m ? m[1] : null;
}

export function isAuthorized(
    authorization: string | undefined | null,
    expectedToken: string,
): boolean {
    if (!expectedToken) {
        return false;
    }

    const got = extractBearerToken(authorization);

    return got !== null && got === expectedToken;
}
