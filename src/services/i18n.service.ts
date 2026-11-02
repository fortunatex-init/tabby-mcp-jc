import { Injectable } from '@angular/core';
import { LocaleService } from 'tabby-core';

import { setUiLocale, t, UiParams } from '../i18n/t';

@Injectable({ providedIn: 'root' })
export class McpI18nService {
    constructor(locale: LocaleService) {
        const apply = () => setUiLocale(locale.getLocale());
        apply();
        locale.localeChanged$.subscribe(apply);
    }

    t(text: string, params?: UiParams): string {
        return t(text, params);
    }
}
