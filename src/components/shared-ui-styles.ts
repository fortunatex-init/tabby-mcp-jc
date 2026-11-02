export const MCP_UI_STYLES = `
    .mcp-dim {
        opacity: 0.78;
    }
    .mcp-mono {
        font-family: 'Source Code Pro', ui-monospace, monospace;
    }
    .mcp-pointer {
        cursor: pointer;
    }
    .mcp-pre {
        background: rgba(127, 127, 127, 0.15);
        color: var(--bs-body-color);
        white-space: pre-wrap;
        word-break: break-all;
        border: 1px solid var(--bs-border-color, rgba(127, 127, 127, 0.35));
        border-radius: 8px;
        padding: 0.75rem;
        margin: 0;
    }
    .mcp-code-chip {
        background: rgba(127, 127, 127, 0.2);
        color: inherit;
        padding: 1px 5px;
        border-radius: 4px;
        overflow-wrap: anywhere;
    }
    .mcp-section-card {
        background: rgba(127, 127, 127, 0.06);
        border: 1px solid var(--bs-border-color, rgba(127, 127, 127, 0.35));
        border-radius: 8px;
        padding: 14px 16px;
        margin-bottom: 12px;
    }
    .mcp-details-summary {
        cursor: pointer;
        user-select: none;
    }
    .mcp-details-summary:focus-visible {
        outline: 0;
        box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.35);
        border-radius: 4px;
    }
    .mcp-badge-result {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
    }
    .mcp-badge-ok {
        background: color-mix(in srgb, var(--bs-success) 25%, transparent);
        color: var(--bs-success);
    }
    .mcp-badge-denied {
        background: color-mix(in srgb, var(--bs-warning) 20%, transparent);
        color: var(--bs-warning);
    }
    .mcp-badge-error {
        background: color-mix(in srgb, var(--bs-danger) 25%, transparent);
        color: var(--bs-danger);
    }

    .mcp-toast-stack {
        position: fixed;
        right: 24px;
        bottom: 24px;
        left: auto;
        top: auto;
        transform: none;
        z-index: 1090;
        width: min(400px, calc(100vw - 40px));
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
    }
    .mcp-toast-stack .toast {
        pointer-events: auto;
        width: 100%;
        max-width: none;
        margin: 0;
        background: var(--bs-body-bg);
        color: var(--bs-body-color);
        border: 1px solid rgba(127, 127, 127, 0.35);
        border-left: 3px solid var(--mcp-toast-accent);
        border-radius: 10px;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);
        overflow: hidden;
    }
    .mcp-toast-stack .toast.mcp-toast-info {
        --mcp-toast-accent: var(--bs-info);
    }
    .mcp-toast-stack .toast.mcp-toast-success {
        --mcp-toast-accent: var(--bs-success);
    }
    .mcp-toast-stack .toast.mcp-toast-error,
    .mcp-toast-stack .toast.mcp-toast-danger {
        --mcp-toast-accent: var(--bs-danger);
    }
    .mcp-toast-stack .toast.mcp-toast-warning {
        --mcp-toast-accent: var(--bs-warning);
    }
    .mcp-toast-stack .toast-header {
        background: transparent;
        color: var(--mcp-toast-accent);
        border-bottom: 0;
        padding: 10px 14px 0;
        font-weight: 600;
    }
    .mcp-toast-stack .toast-header .btn-close {
        display: inline-block;
        margin-left: auto;
        box-sizing: content-box;
        width: 0.6em;
        height: 0.6em;
        padding: 0.25em;
        color: var(--bs-body-color);
        background: transparent
            url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23ccc'%3e%3cpath d='M.293.293a1 1 0 011.414 0L8 6.586 14.293.293a1 1 0 111.414 1.414L9.414 8l6.293 6.293a1 1 0 01-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 01-1.414-1.414L6.586 8 .293 1.707a1 1 0 010-1.414z'/%3e%3c/svg%3e")
            center/0.6em auto no-repeat;
        border: 0;
        border-radius: 0.25rem;
        opacity: 0.75;
        cursor: pointer;
    }
    .mcp-toast-stack .toast-header .btn-close:hover {
        opacity: 1;
    }
    .mcp-toast-stack .toast-body {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 14px;
        line-height: 1.5;
        cursor: pointer;
    }
    .mcp-toast-stack .toast-body > i {
        margin-top: 2px;
        color: var(--mcp-toast-accent);
        font-size: 1.1rem;
        flex: 0 0 auto;
    }
    .mcp-toast-stack .toast-header .mcp-toast-tone-icon {
        color: var(--mcp-toast-accent);
        margin-right: 8px;
    }
    .mcp-toast-stack .toast-body > span {
        min-width: 0;
        overflow-wrap: anywhere;
    }

    .btn-ghost {
        background: transparent;
        border: 1px solid transparent;
        color: var(--bs-body-color);
        opacity: 0.85;
        transition: background 150ms ease, color 150ms ease, opacity 150ms ease;
    }
    .btn-ghost:hover {
        background: rgba(127, 127, 127, 0.12);
        color: var(--bs-body-color);
        opacity: 1;
    }
    .btn-ghost:focus-visible {
        outline: 0;
        box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.35);
    }

    .mcp-hero {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 16px;
        align-items: center;
        padding: 16px 18px;
        border-radius: 12px;
        background:
            linear-gradient(
                135deg,
                rgba(13, 110, 253, 0.14),
                rgba(25, 135, 84, 0.08) 55%,
                rgba(127, 127, 127, 0.04)
            ),
            rgba(127, 127, 127, 0.06);
        border: 1px solid rgba(13, 110, 253, 0.28);
        margin-bottom: 16px;
    }
    .mcp-hero-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0 0 8px;
    }
    .mcp-hero-title .mcp-ver {
        font-size: 12px;
        font-weight: 600;
        opacity: 0.7;
        padding: 2px 8px;
        border-radius: 999px;
        border: 1px solid rgba(127, 127, 127, 0.4);
    }
    .mcp-status-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 10px;
    }
    .mcp-status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--bs-success);
        box-shadow: 0 0 0 4px rgba(25, 135, 84, 0.22);
        flex: 0 0 auto;
    }
    .mcp-status-dot.warn {
        background: var(--bs-warning);
        box-shadow: 0 0 0 4px rgba(255, 193, 7, 0.22);
    }
    .mcp-status-dot.err {
        background: var(--bs-danger);
        box-shadow: 0 0 0 4px rgba(220, 53, 69, 0.22);
    }
    .mcp-status-dot.off {
        background: var(--bs-secondary);
        box-shadow: 0 0 0 4px rgba(108, 117, 125, 0.22);
    }
    .mcp-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }
    .mcp-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        background: rgba(127, 127, 127, 0.12);
        border: 1px solid rgba(127, 127, 127, 0.32);
        font-size: 12px;
        line-height: 1.2;
    }
    .mcp-chip strong {
        font-weight: 600;
    }
    .mcp-chip code {
        color: var(--bs-primary);
        background: transparent;
        padding: 0;
    }
    .mcp-hero-msg {
        font-size: 12px;
        opacity: 0.78;
        margin-top: 8px;
    }

    .mcp-client-card {
        background: rgba(127, 127, 127, 0.06);
        border: 1px solid var(--bs-border-color, rgba(127, 127, 127, 0.35));
        border-radius: 12px;
        padding: 16px;
        transition: border-color 150ms ease, box-shadow 150ms ease;
    }
    .mcp-client-card:hover {
        border-color: rgba(13, 110, 253, 0.45);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    }
    .mcp-client-head {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
    }
    .mcp-avatar {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        font-weight: 800;
        font-size: 15px;
        letter-spacing: -0.02em;
        color: #fff;
        flex: 0 0 auto;
        overflow: hidden;
    }
    .mcp-avatar-logo {
        width: 22px;
        height: 22px;
        display: block;
        object-fit: contain;

        pointer-events: none;
    }
    .mcp-avatar.claude {
        background: rgba(217, 119, 87, 0.18);
    }
    .mcp-avatar.codex {
        background: #fff;
    }
    .mcp-avatar.cursor {
        background: transparent;
        padding: 0;
    }
    .mcp-avatar.cursor .mcp-avatar-logo {
        width: 40px;
        height: 40px;
    }
    .mcp-avatar.other {
        background: var(--bs-primary);
        color: #fff;
        font-size: 11px;
        letter-spacing: 0.02em;
    }
    .mcp-pill-avatar.other {
        display: inline-grid;
        place-items: center;
        width: 1.25rem;
        height: 1.25rem;
        border-radius: 4px;
        background: var(--bs-primary);
        color: #fff;
        font-size: 7px;
        font-weight: 800;
        line-height: 1;
    }
    .mcp-client-name {
        font-size: 1.05rem;
        font-weight: 700;
        margin: 0;
        line-height: 1.2;
    }
    .mcp-client-sub {
        font-size: 12px;
        opacity: 0.78;
        margin: 2px 0 0;
    }
    .mcp-status-pill {
        margin-left: auto;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
    }
    .mcp-status-pill.on {
        background: color-mix(in srgb, var(--bs-success) 22%, transparent);
        color: var(--bs-success);
        border: 1px solid color-mix(in srgb, var(--bs-success) 35%, transparent);
    }
    .mcp-status-pill.off {
        background: color-mix(in srgb, var(--bs-secondary) 20%, transparent);
        color: var(--bs-body-color);
        opacity: 0.9;
        border: 1px solid color-mix(in srgb, var(--bs-secondary) 35%, transparent);
    }
    .mcp-status-pill.warn {
        background: color-mix(in srgb, var(--bs-warning) 18%, transparent);
        color: var(--bs-warning);
        border: 1px solid color-mix(in srgb, var(--bs-warning) 35%, transparent);
    }
    .mcp-status-pill.err {
        background: color-mix(in srgb, var(--bs-danger) 22%, transparent);
        color: var(--bs-danger);
        border: 1px solid color-mix(in srgb, var(--bs-danger) 35%, transparent);
    }
    .mcp-path-row {
        font-size: 12px;
        opacity: 0.78;
        margin-bottom: 12px;
    }
    .mcp-path-row.mcp-path-ellipsis {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 8px;
        align-items: center;
        overflow: hidden;
    }
    .mcp-path-row.mcp-path-ellipsis .lab {
        opacity: 0.7;
        white-space: nowrap;
    }
    .mcp-path-row.mcp-path-ellipsis code,
    .mcp-path-row.mcp-path-ellipsis .mcp-path-value {
        display: block;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        background: rgba(127, 127, 127, 0.2);
        padding: 2px 6px;
        border-radius: 4px;
        color: inherit;
    }
    .mcp-client-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
    }

    .mcp-cfg-section {
        background: rgba(127, 127, 127, 0.06);
        border: 1px solid var(--bs-border-color, rgba(127, 127, 127, 0.35));
        border-radius: 12px;
        padding: 4px 4px 8px;
        margin-bottom: 16px;
    }
    .mcp-cfg-section-h {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 14px 8px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.02em;
        color: var(--bs-body-color);
    }
    .mcp-cfg-section-h .badge {
        font-weight: 600;
    }
    .mcp-cfg-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        align-items: start;
        padding: 12px 14px;
        border-top: 1px solid rgba(127, 127, 127, 0.18);
        transition: background 150ms ease;
    }
    .mcp-cfg-row:hover {
        background: rgba(127, 127, 127, 0.06);
    }
    .mcp-cfg-row .mcp-cfg-help {
        font-size: 12px;
        opacity: 0.78;
        margin-top: 4px;
    }
    .mcp-cfg-under {
        padding: 0 14px 12px;
        border-top: 0;
    }

    .mcp-wl-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        margin-bottom: 10px;
    }
    .mcp-hint-chip {
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        background: rgba(13, 110, 253, 0.12);
        color: var(--bs-primary);
        border: 1px solid rgba(13, 110, 253, 0.3);
    }
    .mcp-hint-chip.regex {
        background: rgba(13, 202, 240, 0.1);
        color: var(--bs-info);
        border-color: rgba(13, 202, 240, 0.3);
    }
    .mcp-hint-chip.force {
        background: rgba(255, 193, 7, 0.1);
        color: var(--bs-warning);
        border-color: rgba(255, 193, 7, 0.3);
    }
    .mcp-editor-shell {
        display: grid;
        grid-template-columns: 44px 1fr;
        border: 1px solid var(--bs-border-color, rgba(127, 127, 127, 0.35));
        border-radius: 10px;
        overflow: hidden;
        background: rgba(127, 127, 127, 0.06);
    }
    .mcp-gutter {
        background: rgba(127, 127, 127, 0.08);
        border-right: 1px solid rgba(127, 127, 127, 0.25);
        padding: 12px 0;
        text-align: right;
        color: var(--bs-body-color);
        opacity: 0.45;
        font-size: 12px;
        line-height: 1.55;
        font-family: 'Source Code Pro', ui-monospace, monospace;
        user-select: none;
        overflow: hidden;
    }
    .mcp-gutter span {
        display: block;
        padding: 0 8px;
    }
    .mcp-editor-body {
        margin: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        resize: vertical;
        min-height: 220px;
        padding: 12px;
        line-height: 1.55;
        font-size: 13px;
        color: var(--bs-body-color);
        box-shadow: none;
    }
    .mcp-editor-body:focus {
        outline: 0;
        box-shadow: none;
    }
    .mcp-wl-foot {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 10px;
        flex-wrap: wrap;
    }
    .mcp-count-pill {
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        background: rgba(127, 127, 127, 0.14);
        border: 1px solid rgba(127, 127, 127, 0.3);
    }

    .mcp-audit-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        margin-bottom: 12px;
    }
    .mcp-audit-bar .form-control,
    .mcp-audit-bar .form-select {
        width: auto;
        min-width: 140px;
    }
    .mcp-table-wrap {
        border: 1px solid var(--bs-border-color, rgba(127, 127, 127, 0.35));
        border-radius: 10px;
        overflow: auto;
        max-height: 420px;
    }
    .mcp-table-wrap table {
        margin-bottom: 0;
    }
    .mcp-table-wrap table thead th {
        position: sticky;
        top: 0;
        z-index: 1;
        background: var(--bs-body-bg);
        box-shadow: 0 1px 0 rgba(127, 127, 127, 0.35);
    }
    .mcp-table-wrap tbody tr {
        transition: background 150ms ease;
    }
    .mcp-table-wrap tbody tr:hover {
        background: rgba(13, 110, 253, 0.08) !important;
    }
    .mcp-empty-state {
        text-align: center;
        padding: 48px 16px;
        border: 1px dashed rgba(127, 127, 127, 0.4);
        border-radius: 12px;
        background: rgba(127, 127, 127, 0.04);
    }
    .mcp-empty-state .mcp-empty-ico {
        width: 56px;
        height: 56px;
        margin: 0 auto 12px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: rgba(13, 110, 253, 0.12);
        color: var(--bs-primary);
        font-size: 22px;
    }

    .mcp-settings {
        --mcp-type-1: 1.25rem;
        --mcp-type-2: 0.9375rem;
        --mcp-type-3: 0.8125rem;
        --mcp-space-16: 16px;
        --mcp-space-24: 24px;
    }
    .mcp-type-1,
    .mcp-hero-title,
    .mcp-settings > h3 {
        font-size: var(--mcp-type-1, 1.25rem);
        font-weight: 700;
        line-height: 1.3;
    }
    .mcp-type-2,
    .mcp-cfg-section-h,
    .mcp-client-name,
    .mcp-section-card > h5 {
        font-size: var(--mcp-type-2, 0.9375rem);
        font-weight: 700;
        line-height: 1.35;
    }
    .mcp-type-3,
    .mcp-cfg-help,
    .mcp-client-sub,
    .mcp-path-row,
    .mcp-hero-msg,
    .mcp-chip {
        font-size: var(--mcp-type-3, 0.8125rem);
        line-height: 1.45;
    }
    .mcp-hero {
        margin-bottom: var(--mcp-space-24, 24px);
    }
    .mcp-cfg-section,
    .mcp-section-card,
    .mcp-client-card {
        margin-bottom: var(--mcp-space-16, 16px);
    }
    .mcp-settings .nav-tabs {
        margin-bottom: var(--mcp-space-16, 16px);
    }

    .mcp-settings :focus-visible,
    .mcp-toast-stack :focus-visible,
    .mcp-modal :focus-visible {
        outline: 2px solid var(--bs-primary);
        outline-offset: 2px;
    }
    .mcp-settings .btn,
    .mcp-settings .nav-link,
    .mcp-settings .form-check-input,
    .mcp-settings .form-control,
    .mcp-settings .form-select,
    .mcp-settings .mcp-client-card,
    .mcp-settings .mcp-cfg-row,
    .mcp-toast-stack .toast,
    .mcp-modal .btn {
        transition:
            background-color 150ms ease,
            border-color 150ms ease,
            color 150ms ease,
            box-shadow 150ms ease,
            opacity 150ms ease,
            transform 150ms ease;
    }

    .mcp-ui-state {
        text-align: center;
        padding: 48px 16px;
        border: 1px dashed rgba(127, 127, 127, 0.4);
        border-radius: 12px;
        background: rgba(127, 127, 127, 0.04);
    }
    .mcp-ui-state-ico {
        width: 56px;
        height: 56px;
        margin: 0 auto 12px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: rgba(13, 110, 253, 0.12);
        color: var(--bs-primary);
        font-size: 22px;
    }
    .mcp-ui-state-loading .mcp-ui-state-ico {
        background: rgba(127, 127, 127, 0.12);
        color: var(--bs-secondary);
    }
    .mcp-ui-state-title {
        font-size: var(--mcp-type-2, 0.9375rem);
        font-weight: 700;
        margin-bottom: 4px;
    }
    .mcp-ui-state-hint {
        font-size: var(--mcp-type-3, 0.8125rem);
        opacity: 0.78;
    }

    .mcp-lanes {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin: 10px 0 12px;
    }
    .mcp-lane {
        background: rgba(127, 127, 127, 0.08);
        border: 1px solid rgba(127, 127, 127, 0.28);
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .mcp-lane-h {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        opacity: 0.78;
    }
    .mcp-lane-body {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }
    .mcp-lane-body strong {
        font-size: 14px;
    }
    .mcp-lane .lane-msg {
        font-size: 12px;
        opacity: 0.78;
    }
    .mcp-chip.lan {
        background: color-mix(in srgb, var(--bs-warning) 14%, transparent);
        border-color: color-mix(in srgb, var(--bs-warning) 45%, transparent);
        color: var(--bs-warning);
    }
    .mcp-chip.lan strong {
        color: var(--bs-warning);
    }
    .mcp-pause-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        padding: 10px 12px;
        margin: 0 0 12px;
        border-radius: 10px;
        background: color-mix(in srgb, var(--bs-warning) 12%, transparent);
        border: 1px solid color-mix(in srgb, var(--bs-warning) 40%, transparent);
        color: var(--bs-warning);
    }
    .mcp-pause-bar .pause-badge {
        font-weight: 800;
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--bs-warning) 22%, transparent);
        border: 1px solid color-mix(in srgb, var(--bs-warning) 50%, transparent);
        color: var(--bs-warning);
    }
    .mcp-pause-bar .pause-text {
        flex: 1;
        min-width: 180px;
        font-size: 13px;
        color: var(--bs-body-color);
    }
    .mcp-hero.paused {
        border-color: color-mix(in srgb, var(--bs-warning) 45%, transparent);
        background:
            linear-gradient(
                135deg,
                color-mix(in srgb, var(--bs-warning) 12%, transparent),
                rgba(127, 127, 127, 0.04) 60%
            ),
            rgba(127, 127, 127, 0.06);
    }
    .mcp-hero-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: stretch;
    }
    .mcp-hero-actions .btn {
        white-space: nowrap;
        text-align: center;
        align-self: center;
    }
    .mcp-section-sep {
        height: 14px;
        margin: 4px 0 12px;
        border: 0;
        border-top: 1px dashed rgba(127, 127, 127, 0.35);
    }
    .mcp-cfg-section.network-only {
        border-color: color-mix(in srgb, var(--bs-primary) 35%, transparent);
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--bs-primary) 8%, transparent);
    }

    .mcp-kv {
        display: grid;
        grid-template-columns: 48px 1fr auto;
        gap: 8px;
        align-items: center;
        padding: 8px 10px;
        border: 1px solid rgba(127, 127, 127, 0.22);
        border-radius: 8px;
        background: rgba(127, 127, 127, 0.06);
        margin-bottom: 8px;
    }
    .mcp-kv.mcp-kv-tail {
        margin-bottom: 12px;
    }
    .mcp-kv .k {
        font-size: 12px;
        opacity: 0.72;
    }
    .mcp-kv .v,
    .mcp-kv .v.mono {
        font-size: 12.5px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
        font-family: "Source Code Pro", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .mcp-kv .ico {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 1px solid rgba(127, 127, 127, 0.3);
        background: transparent;
        color: var(--bs-body-color);
        opacity: 0.75;
        display: grid;
        place-items: center;
        cursor: pointer;
        padding: 0;
    }
    .mcp-kv .ico:hover:not(:disabled) {
        background: rgba(127, 127, 127, 0.12);
        color: var(--bs-body-color);
        opacity: 1;
    }
    .mcp-kv .ico:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
    .mcp-link-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        font-size: 12.5px;
        margin-top: 12px;
    }
    .mcp-link-row .btn-link {
        color: var(--bs-link-color, #9ec5fe);
        text-decoration: none;
        padding: 0;
    }
    .mcp-public-panel {
        margin-top: 10px;
        padding: 12px 14px;
        border-radius: 10px;
        border: 1px solid rgba(127, 127, 127, 0.28);
        background: rgba(127, 127, 127, 0.06);
    }
    .mcp-token-band {
        margin-top: 12px;
        padding: 12px 14px;
        border-radius: 10px;
        border: 1px solid rgba(127, 127, 127, 0.25);
        background: rgba(127, 127, 127, 0.05);
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }
    .mcp-token-band .lab {
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
    }
    .mcp-token-band .grow,
    .mcp-token-band .flex-grow-1 {
        flex: 1;
        min-width: 160px;
    }
    .mcp-token-band .mcp-client-actions {
        margin-left: auto;
    }
    .mcp-token-band .mcp-code-chip {
        border-color: rgba(127, 127, 127, 0.35) !important;
    }
    .mcp-prompt-preview {
        max-height: 280px;
        overflow: auto;
    }
    .mcp-reset-details {
        margin-top: 6px;
    }

    @media (max-width: 960px) {
        .mcp-lanes {
            grid-template-columns: 1fr;
        }
        .mcp-hero {
            grid-template-columns: 1fr;
            gap: 12px;
            align-items: stretch;
        }
        .mcp-hero-actions {
            flex-direction: row;
            flex-wrap: wrap;
        }
        .mcp-hero-actions .btn {
            flex: 0 0 auto;
            align-self: center;
            text-align: center;
            white-space: nowrap;
        }
    }

    .mcp-empty-state {
        text-align: center;
        padding: 48px 16px;
        border: 1px dashed rgba(127, 127, 127, 0.4);
        border-radius: 12px;
        background: rgba(127, 127, 127, 0.04);
    }

`;
