import { Pipe, PipeTransform } from '@angular/core';

import { t, UiParams } from './t';

@Pipe({ name: 'mcpT', pure: false })
export class McpTPipe implements PipeTransform {
    transform(text: string, params?: UiParams): string {
        return t(text ?? '', params);
    }
}
