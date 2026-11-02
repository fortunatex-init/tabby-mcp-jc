export const MCP_MODAL_STYLES = `
    .mcp-modal.mcp-modal-primary { --mcp-modal-accent: var(--bs-primary); }
    .mcp-modal.mcp-modal-danger { --mcp-modal-accent: var(--bs-danger); }
    .mcp-modal.mcp-modal-warning { --mcp-modal-accent: var(--bs-warning); }
    .mcp-modal .modal-content {
        background: var(--bs-body-bg);
        color: var(--bs-body-color);
        border: 1px solid var(--mcp-modal-accent);
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, .35);

        overflow: hidden;
    }
    .mcp-modal .modal-header {
        border-bottom: 0;
        padding: 14px 18px 0;
    }
    .mcp-modal .modal-title {
        color: var(--mcp-modal-accent);
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .mcp-modal .mcp-modal-title-icon {
        color: var(--mcp-modal-accent);
        flex: 0 0 auto;
    }
    .mcp-modal .btn-ghost {
        background: transparent;
        border: 1px solid transparent;
        color: var(--bs-body-color);
        opacity: 0.85;
        transition: background 150ms ease, color 150ms ease, opacity 150ms ease;
    }
    .mcp-modal .btn-ghost:hover {
        background: rgba(127, 127, 127, 0.12);
        color: var(--bs-body-color);
        opacity: 1;
    }
    .mcp-modal :focus-visible {
        outline: 2px solid var(--bs-primary);
        outline-offset: 2px;
    }
    .mcp-modal .btn {
        transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, box-shadow 150ms ease;
    }
    .mcp-modal .modal-body {
        padding: 12px 18px;
        line-height: 1.6;
        overflow-wrap: anywhere;
    }
    .mcp-modal .modal-footer {
        border-top: 0;
        padding: 0 18px 14px;
    }
`;

export type McpModalAccent = 'primary' | 'danger' | 'warning';

export function mcpModalOptions(accent: McpModalAccent): {
    backdrop: 'static';
    centered: boolean;
    windowClass: string;
} {
    return {
        backdrop: 'static',
        centered: true,
        windowClass: `mcp-modal mcp-modal-${accent}`,
    };
}
