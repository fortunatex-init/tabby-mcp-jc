import { Injectable } from '@angular/core';
import { HotkeyDescription, HotkeyProvider } from 'tabby-core';

import { t } from '../i18n/t';

export const HOTKEY_TOGGLE_PAUSE = 'mcp-jc-toggle-pause';

@Injectable()
export class ClaudeMcpHotkeyProvider extends HotkeyProvider {
    async provide(): Promise<HotkeyDescription[]> {
        return [{ id: HOTKEY_TOGGLE_PAUSE, name: t('toolbar.hotkey') }];
    }
}
