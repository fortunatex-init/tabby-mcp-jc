export {
    BACKUP_SUFFIX,
    OWNERSHIP_MARKER,
    OWNERSHIP_MARKERS,
    TMP_SUFFIX,
    isOurPath,
    normalizeUrl,
    samePath,
    sameUrl,
    writeAtomic,
    writeConfigFile,
} from '../core/config-io';

export type { WriteConfigResult } from '../core/config-io';

export interface ClientStatus {
    configPath: string;
    configExists: boolean;
    parseError?: string;
    installed: boolean;
    orphans?: boolean;
    stale: boolean;
    conflict: boolean;
    recordedEndpoint?: string;
    recordedShimPath?: string;
}

export interface ActionResult {
    ok: boolean;
    message: string;
}
