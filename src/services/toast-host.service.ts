import { ApplicationRef, ComponentRef, Injectable, Injector, createComponent } from '@angular/core';

import { ToastHostComponent } from '../components/toastHost.component';

@Injectable({ providedIn: 'root' })
export class ToastHostService {
    private ref: ComponentRef<ToastHostComponent> | null = null;

    constructor(
        private appRef: ApplicationRef,
        private injector: Injector,
    ) {}

    mount(): void {
        if (this.ref || typeof document === 'undefined') {
            return;
        }
        this.ref = createComponent(ToastHostComponent, {
            environmentInjector: this.appRef.injector,
            elementInjector: this.injector,
        });
        this.appRef.attachView(this.ref.hostView);
        document.body.appendChild(this.ref.location.nativeElement);
    }
}
