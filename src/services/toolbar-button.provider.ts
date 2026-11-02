import { Injectable } from '@angular/core';
import { AppService, HotkeysService, ToolbarButton, ToolbarButtonProvider } from 'tabby-core';
import { SettingsTabComponent } from 'tabby-settings';

import { McpControlService } from './mcp-control.service';
import { ToastService } from './toast.service';
import { HOTKEY_TOGGLE_PAUSE } from './hotkey.provider';
import { t } from '../i18n/t';

const SETTINGS_TAB_ID = 'claude-mcp';

const SPARK_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 2 20 20" fill="none"' +
    ' stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 3 14.5 9.5 21 12 14.5 14.5 12 21 9.5 14.5 3 12 9.5 9.5Z"/>' +
    '</svg>';

const PAUSE_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">' +
    '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>' +
    '</svg>';

@Injectable()
export class ClaudeMcpToolbarButtonProvider extends ToolbarButtonProvider {
    constructor(
        private app: AppService,
        private control: McpControlService,
        private toast: ToastService,
        hotkeys: HotkeysService,
    ) {
        super();
        hotkeys.hotkey$.subscribe(id => {
            if (id === HOTKEY_TOGGLE_PAUSE) this.togglePause();
        });
    }

    provide(): ToolbarButton[] {
        const paused = this.control.paused;
        return [
            {
                icon: paused ? PAUSE_ICON : SPARK_ICON,
                title: paused ? t('toolbar.paused') : t('settings.pluginTitle'),
                weight: 9,
                click: () => this.openSettings(),
                submenu: async () => [
                    {
                        title: paused ? t('toolbar.resume') : t('toolbar.pauseAll'),
                        click: () => this.togglePause(),
                    },
                ],
            },
        ];
    }

    private togglePause(): void {
        if (this.control.paused) {
            this.control.resume();
            this.toast.success(t('toolbar.resumed'));
        } else {
            this.control.pauseAll();
            this.toast.notice(t('toolbar.pausedToast'));
        }
    }

    private openSettings(): void {
        const existing = this.app.tabs.find(t => t instanceof SettingsTabComponent) as
            | SettingsTabComponent
            | undefined;
        if (existing) {
            existing.activeTab = SETTINGS_TAB_ID;
            this.app.selectTab(existing);
            return;
        }
        this.app.openNewTabRaw({
            type: SettingsTabComponent,
            inputs: { activeTab: SETTINGS_TAB_ID },
        });
    }
}
