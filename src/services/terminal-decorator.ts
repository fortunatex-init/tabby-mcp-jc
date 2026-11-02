import { Injectable } from '@angular/core';
import { EMPTY, Subscription } from 'rxjs';
import { distinctUntilChanged, startWith, switchMap, tap } from 'rxjs/operators';
import { BaseTerminalTabComponent, TerminalDecorator } from 'tabby-terminal';

import { TabRegistryService } from './tab-registry.service';

const CR = 0x0d;

@Injectable()
export class ClaudeMcpDecorator extends TerminalDecorator {
    constructor(private registry: TabRegistryService) {
        super();
    }

    attach(tab: BaseTerminalTabComponent<any>): void {
        this.registry.register(tab);

        if (tab.frontendIsReady) {
            this.watchInput(tab);
            this.watchLine(tab);
        } else {
            this.subscribeUntilDetached(
                tab,
                tab.frontendReady$.subscribe(() => {
                    this.watchInput(tab);
                    this.watchLine(tab);
                }),
            );
        }
    }

    detach(tab: BaseTerminalTabComponent<any>): void {
        super.detach(tab);
        this.registry.unregister(tab);
    }

    private watchInput(tab: BaseTerminalTabComponent<any>): void {
        const frontend = tab.frontend;
        if (!frontend) {
            return;
        }
        this.subscribeUntilDetached(
            tab,
            frontend.input$.subscribe(data => {
                if (data.includes(CR)) {
                    this.registry.markEnter(tab);
                }
            }),
        );
    }

    private watchLine(tab: BaseTerminalTabComponent<any>): void {
        this.subscribeUntilDetached(
            tab,
            tab.sessionChanged$
                .pipe(
                    startWith(tab.session),
                    tap(() => this.registry.resetLine(tab)),
                    switchMap(session => session?.middleware.outputToSession$ ?? EMPTY),
                )
                .subscribe(data => {
                    if (!this.registry.isAiWriting(tab)) {
                        this.registry.recordInput(tab, data, 'user');
                    }
                }),
        );

        const frontend = tab.frontend;
        if (!frontend) {
            return;
        }

        this.subscribeUntilDetached(
            tab,
            frontend.alternateScreenActive$
                .pipe(distinctUntilChanged())
                .subscribe(() => this.registry.resetLine(tab)),
        );

        const xterm = (frontend as any).xterm;
        if (!xterm) {
            return;
        }

        const written = xterm.onWriteParsed(() => this.registry.recordOutput(tab));
        this.subscribeUntilDetached(tab, new Subscription(() => written.dispose()));

        const textarea: HTMLTextAreaElement | undefined = xterm.textarea;
        if (textarea) {
            const onStart = () => this.registry.setComposing(tab, true);
            const onEnd = () => setTimeout(() => this.registry.setComposing(tab, false));
            textarea.addEventListener('compositionstart', onStart);
            textarea.addEventListener('compositionend', onEnd);
            this.subscribeUntilDetached(
                tab,
                new Subscription(() => {
                    textarea.removeEventListener('compositionstart', onStart);
                    textarea.removeEventListener('compositionend', onEnd);
                }),
            );
        }
    }
}
