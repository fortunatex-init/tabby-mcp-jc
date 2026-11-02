import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { Toast, ToastService } from '../services/toast.service';
import { MCP_UI_STYLES } from './shared-ui-styles';

@Component({
    standalone: true,
    selector: 'mcp-toast-host',
    imports: [CommonModule, NgbModule],
    encapsulation: ViewEncapsulation.None,
    styles: [MCP_UI_STYLES],
    template: `
        <div class="mcp-toast-stack" role="status" aria-live="polite" aria-relevant="additions">
            <ngb-toast
                *ngFor="let t of toast.toasts; trackBy: trackToast"
                #tt="ngbToast"
                [ngClass]="'mcp-toast-' + t.kind"
                [autohide]="true"
                [delay]="t.delay"
                (hidden)="toast.remove(t)"
            >
                <ng-template ngbToastHeader>
                    <i
                        class="fas fa-fw mcp-toast-tone-icon"
                        [ngClass]="t.icon"
                        aria-hidden="true"
                    ></i>
                    <strong class="me-auto">{{ t.title }}</strong>
                </ng-template>
                <div class="d-flex align-items-start gap-2" (click)="tt.hide()">
                    <span>{{ t.message }}</span>
                </div>
            </ngb-toast>
        </div>
    `,
})
export class ToastHostComponent {
    constructor(public toast: ToastService) {}

    trackToast(_: number, t: Toast): number {
        return t.id;
    }
}
