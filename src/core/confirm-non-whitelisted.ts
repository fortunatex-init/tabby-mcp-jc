export const DEFAULT_CONFIRM_NON_WHITELISTED = true;

export function isConfirmNonWhitelisted(
    v: boolean | null | undefined,
): boolean {
    return v !== false;
}
