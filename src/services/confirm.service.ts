import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { mcpModalOptions } from '../components/modal-style';
import { SimpleConfirmComponent } from '../components/simpleConfirm.component';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
    constructor(private ngbModal: NgbModal) {}

    async ask(
        title: string,
        message: string,
        confirmText: string,
        danger = false,
    ): Promise<boolean> {
        const modal = this.ngbModal.open(
            SimpleConfirmComponent,
            mcpModalOptions(danger ? 'danger' : 'primary'),
        );
        const inst = modal.componentInstance as SimpleConfirmComponent;
        inst.title = title;
        inst.message = message;
        inst.confirmText = confirmText;
        inst.danger = danger;
        try {
            return (await modal.result) === true;
        } catch {
            return false;
        }
    }
}
