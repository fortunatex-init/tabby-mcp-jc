import { register } from 'node:module';

const hook = new URL('./resolve-ts-hook.mjs', import.meta.url);
register(hook.href, import.meta.url);
