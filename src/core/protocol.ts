export const SUPPORTED_PROTOCOL_VERSIONS: string[] = [
    '2025-11-25',
    '2025-06-18',
    '2025-03-26',
    '2024-11-05',
];

export const PREFERRED_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

export function negotiateProtocolVersion(asked: unknown): string {
    if (typeof asked === 'string' && SUPPORTED_PROTOCOL_VERSIONS.includes(asked)) {
        return asked;
    }
    return PREFERRED_PROTOCOL_VERSION;
}
