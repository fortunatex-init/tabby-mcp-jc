import { ApplicationRef, Injector, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { take } from 'rxjs/operators';
import { ConfigProvider, ConfigService, HotkeyProvider, ToolbarButtonProvider } from 'tabby-core';
import { SettingsTabProvider } from 'tabby-settings';
import { TerminalDecorator } from 'tabby-terminal';

import { ClaudeMcpConfigProvider } from './services/config';
import { ClaudeMcpDecorator } from './services/terminal-decorator';
import { McpServerService } from './services/mcp-server.service';
import { ClaudeMcpToolbarButtonProvider } from './services/toolbar-button.provider';
import { ClaudeMcpHotkeyProvider } from './services/hotkey.provider';
import { ActivityTabFlashService } from './services/activity-tab-flash.service';
import { ToastHostService } from './services/toast-host.service';
import { ConfirmModalComponent } from './components/confirmModal.component';
import { SimpleConfirmComponent } from './components/simpleConfirm.component';
import { ClaudeMcpAuditTabComponent } from './components/settings/auditTab.component';
import { ClaudeMcpClientsTabComponent } from './components/settings/clientsTab.component';
import { McpClientCardComponent } from './components/settings/clientCard.component';
import { McpUiStateComponent } from './components/uiState.component';
import { ClaudeMcpConfigTabComponent } from './components/settings/configTab.component';
import { ClaudeMcpWhitelistTabComponent } from './components/settings/whitelistTab.component';
import {
    ClaudeMcpSettingsTabComponent,
    ClaudeMcpSettingsTabProvider,
} from './components/settings/settingsTab.component';
import { McpTPipe } from './i18n/mcp-t.pipe';
import { McpI18nService } from './services/i18n.service';

@NgModule({
    imports: [CommonModule, FormsModule, NgbModule],
    providers: [
        { provide: ConfigProvider, useClass: ClaudeMcpConfigProvider, multi: true },
        { provide: SettingsTabProvider, useClass: ClaudeMcpSettingsTabProvider, multi: true },
        { provide: TerminalDecorator, useClass: ClaudeMcpDecorator, multi: true },
        { provide: ToolbarButtonProvider, useClass: ClaudeMcpToolbarButtonProvider, multi: true },
        { provide: HotkeyProvider, useClass: ClaudeMcpHotkeyProvider, multi: true },
    ],
    declarations: [
        ConfirmModalComponent,
        SimpleConfirmComponent,
        ClaudeMcpSettingsTabComponent,
        ClaudeMcpConfigTabComponent,
        ClaudeMcpClientsTabComponent,
        McpClientCardComponent,
        McpUiStateComponent,
        ClaudeMcpWhitelistTabComponent,
        ClaudeMcpAuditTabComponent,
        McpTPipe,
    ],
})
export default class ClaudeMcpModule {
    constructor(
        config: ConfigService,
        server: McpServerService,
        _flash: ActivityTabFlashService,
        _i18n: McpI18nService,
        toastHost: ToastHostService,
        _appRef: ApplicationRef,
        _injector: Injector,
    ) {
        toastHost.mount();

        config.ready$.pipe(take(1)).subscribe(() => {
            void server.start();
        });

        window.addEventListener('beforeunload', () => {
            void server.stop();
        });
    }
}
