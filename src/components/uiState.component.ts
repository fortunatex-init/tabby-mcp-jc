import { Component, Input } from '@angular/core';

export type McpUiStateKind = 'empty' | 'loading';

@Component({
    selector: 'mcp-ui-state',
    template: `
        <div
            class="mcp-ui-state"
            [class.mcp-ui-state-empty]="kind === 'empty'"
            [class.mcp-ui-state-loading]="kind === 'loading'"
            [attr.role]="kind === 'loading' ? 'status' : 'status'"
            [attr.aria-busy]="kind === 'loading'"
        >
            <div class="mcp-ui-state-ico">
                <span
                    *ngIf="kind === 'loading'"
                    class="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                ></span>
                <i *ngIf="kind === 'empty'" class="fas" [ngClass]="icon || 'fa-inbox'"></i>
            </div>
            <div class="mcp-ui-state-title">{{ titleKey | mcpT }}</div>
            <div class="mcp-ui-state-hint" *ngIf="hintKey">{{ hintKey | mcpT }}</div>
        </div>
    `,
})
export class McpUiStateComponent {
    @Input() kind: McpUiStateKind = 'empty';
    @Input() titleKey = '';
    @Input() hintKey = '';
    @Input() icon = 'fa-inbox';
}
