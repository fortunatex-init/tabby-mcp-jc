import { Injectable } from '@angular/core';

import { ConfigProvider } from 'tabby-core';

import { DEFAULT_WHITELIST } from '../core/whitelist';
import { DEFAULT_CONFIRM_NON_WHITELISTED } from '../core/confirm-non-whitelisted';

export { isConfirmNonWhitelisted, DEFAULT_CONFIRM_NON_WHITELISTED } from '../core/confirm-non-whitelisted';

export interface ClaudeMcpConfig {
    enabled: boolean;

    whitelist: string[];

    confirmNonWhitelisted: boolean;

    auditLog: boolean;

    allowReadTerminal: boolean;

    maxReadLines: number;

    waitForEnter: boolean;

    httpBindHost: '127.0.0.1' | '0.0.0.0';

    publicMcpUrl: string;
}

@Injectable()
export class ClaudeMcpConfigProvider extends ConfigProvider {
    defaults = {
        hotkeys: {
            'mcp-jc-toggle-pause': ['Ctrl-Shift-M'],
        },

        claudeMcp: {
            enabled: true,

            whitelist: DEFAULT_WHITELIST,

            confirmNonWhitelisted: DEFAULT_CONFIRM_NON_WHITELISTED,

            auditLog: true,

            allowReadTerminal: false,

            maxReadLines: 200,

            waitForEnter: false,

            httpBindHost: '127.0.0.1',
            publicMcpUrl: '',
        } as ClaudeMcpConfig,
    };
}
