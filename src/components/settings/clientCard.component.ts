import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';

import { ClientStatus } from '../../clients/client-config';
import { brandSvgDataUrl } from '../../assets/clients/brand-icons';
import { MCP_UI_STYLES } from '../shared-ui-styles';

export type ClientBrand = 'claude' | 'codex' | 'cursor';

@Component({
    selector: 'mcp-client-card',
    encapsulation: ViewEncapsulation.None,
    styles: [MCP_UI_STYLES],
    template: `
        <div class="mcp-client-card mb-0">
            <div class="mcp-client-head">
                <div class="mcp-avatar" [ngClass]="brand" [attr.aria-hidden]="true">
                    <img
                        *ngIf="brandLogoSrc as src"
                        class="mcp-avatar-logo"
                        [src]="src"
                        alt=""
                    />
                    <span *ngIf="!brandLogoSrc">{{ avatarLetters }}</span>
                </div>
                <div class="flex-grow-1 min-w-0">
                    <h5 class="mcp-client-name">{{ nameKey | mcpT }}</h5>
                    <p class="mcp-client-sub" *ngIf="subtitleKey">{{ subtitleKey | mcpT }}</p>
                </div>
                <span class="mcp-status-pill" [ngClass]="pillTone">
                    <i class="fas fa-check me-1" *ngIf="pillTone === 'on'"></i>{{ label | mcpT }}
                </span>
            </div>

            <p class="text-muted small" *ngIf="hintHtml" [innerHTML]="hintHtml | mcpT"></p>

            <div class="mcp-path-row mcp-path-ellipsis" [attr.title]="status.configPath">
                <span class="lab">{{ 'card.configPathLab' | mcpT }}</span>
                <code>{{ status.configPath }}</code>
            </div>
            <div class="mcp-path-row mcp-path-ellipsis" *ngIf="status.stale" [attr.title]="recorded">
                <span class="lab">{{ 'card.recorded' | mcpT }}</span>
                <code>{{ recorded }}</code>
            </div>
            <div class="mcp-path-row mcp-path-ellipsis" *ngIf="status.stale" [attr.title]="expected">
                <span class="lab">{{ 'card.expected' | mcpT }}</span>
                <code>{{ expected }}</code>
            </div>
            <div class="mcp-path-row text-danger" *ngIf="status.parseError">
                {{ parsePrefix | mcpT }}{{ status.parseError }}{{ 'card.parseSuffix' | mcpT }}
            </div>
            <div class="mcp-path-row text-warning" *ngIf="status.conflict">{{ conflictText | mcpT }}</div>

            <div class="mcp-client-actions">
                <button
                    class="btn btn-primary btn-sm"
                    (click)="install.emit()"
                    [disabled]="busy || !!status.parseError || status.conflict"
                >
                    <span
                        class="spinner-border spinner-border-sm me-1"
                        role="status"
                        aria-hidden="true"
                        *ngIf="busy"
                    ></span>
                    {{ status.installed ? ('card.rewrite' | mcpT) : ('card.connect' | mcpT) }}
                </button>
                <button
                    class="btn btn-outline-danger btn-sm"
                    (click)="remove.emit()"
                    [disabled]="busy || !status.installed"
                >
                    {{ 'card.remove' | mcpT }}
                </button>
                <button class="btn btn-ghost btn-sm" (click)="refresh.emit()" [disabled]="busy">
                    <i class="fas fa-rotate me-1"></i>{{ 'card.refresh' | mcpT }}
                </button>
            </div>

            <details class="mt-3">
                <summary class="text-muted small mcp-details-summary" tabindex="0">
                    {{ 'card.manual' | mcpT }}
                </summary>
                <p class="text-muted small mt-2">{{ snippetLead | mcpT }}</p>
                <pre class="mcp-pre">{{ snippet }}</pre>
            </details>
        </div>
    `,
})
export class McpClientCardComponent {
    @Input() brand: ClientBrand = 'claude';
    @Input() nameKey = '';
    @Input() subtitleKey = '';
    @Input() title = '';
    @Input() hintHtml = '';
    @Input() status!: ClientStatus;
    @Input() label = '';
    @Input() recorded = '';
    @Input() expected = '';
    @Input() parsePrefix = '';
    @Input() conflictText = '';
    @Input() snippetLead = '';
    @Input() snippet = '';
    @Input() busy = false;

    @Output() install = new EventEmitter<void>();
    @Output() remove = new EventEmitter<void>();
    @Output() refresh = new EventEmitter<void>();

    get avatarLetters(): string {
        return { claude: 'Cl', codex: 'Cx', cursor: 'Cu' }[this.brand] ?? '??';
    }

    get brandLogoSrc(): string | null {
        return brandSvgDataUrl(this.brand);
    }

    get pillTone(): 'on' | 'off' | 'warn' | 'err' {
        const s = this.status;
        if (!s) return 'off';
        if (s.parseError) return 'err';
        if (s.conflict || (s.installed && s.stale)) return 'warn';
        if (s.installed) return 'on';
        return 'off';
    }
}
