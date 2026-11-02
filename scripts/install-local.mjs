/// <reference types="node" />
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as url from 'url';

const ROOT = path.resolve(url.fileURLToPath(new URL('.', import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const NAME = pkg.name;

function fail(msg) {
    console.error(`✗ ${msg}`);
    process.exit(1);
}

const args = process.argv.slice(2);
let dryRun = false;
let dirArg = null;
let keep = 5;
for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run') {
        dryRun = true;
    } else if (a === '--dir') {
        dirArg = args[++i];
        if (!dirArg) fail('--dir 后面要跟 dataDir 路径');
    } else if (a === '--keep') {
        keep = Number(args[++i]);
        if (!Number.isInteger(keep) || keep < 1) fail('--keep 后面要跟正整数');
    } else {
        fail(`不认识的参数: ${a}`);
    }
}
const tag = dryRun ? '[dry-run] ' : '';

function defaultDataDir() {
    const home = os.homedir();
    if (process.platform === 'win32') {
        return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'tabby');
    }
    if (process.platform === 'darwin') {
        return path.join(home, 'Library', 'Application Support', 'tabby');
    }
    return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'tabby');
}

const dataDir = path.resolve(dirArg || defaultDataDir());
const pluginsDir = path.join(dataDir, 'plugins');
if (!fs.existsSync(pluginsDir)) {
    fail(`找不到 ${pluginsDir} —— Tabby 没装/没启动过,或者是便携版,用 --dir <dataDir> 指定`);
}
const target = path.join(pluginsDir, 'node_modules', NAME);
const backupsDir = path.join(dataDir, NAME, 'backups');
console.log(`${tag}dataDir: ${dataDir}`);
console.log(`${tag}目标目录: ${target}`);

const dist = path.join(ROOT, 'dist');
for (const f of ['index.js', 'shim.js', 'http-server.js']) {
    if (!fs.existsSync(path.join(dist, f))) {
        fail(`dist/${f} 不存在 —— 先跑 pnpm build`);
    }
}

const deps = Object.keys(pkg.dependencies || {});
if (deps.length) {
    console.warn(`⚠ package.json 里有运行时依赖(${deps.join(', ')}),本脚本不会安装,需要另外处理`);
}

const items = [
    ['package.json', 'package.json'],
    ['README.md', 'README.md'],
];
if (fs.existsSync(path.join(ROOT, 'LICENSE'))) items.push(['LICENSE', 'LICENSE']);
items.push(
    ['dist/index.js', 'dist/index.js'],
    ['dist/shim.js', 'dist/shim.js'],
    ['dist/http-server.js', 'dist/http-server.js'],
);

function copyRecursive(src, dst) {
    const st = fs.statSync(src);
    if (st.isDirectory()) {
        fs.mkdirSync(dst, { recursive: true });
        for (const e of fs.readdirSync(src)) {
            const s = path.join(src, e);
            copyRecursive(s, path.join(dst, e));
        }
    } else {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
    }
}

function moveDir(src, dst) {
    try {
        fs.renameSync(src, dst);
    } catch (e) {
        console.log(`  rename 失败(${e.code}),改用复制 + 删除`);
        copyRecursive(src, dst);
        fs.rmSync(src, { recursive: true, force: true });
    }
}

function stamp() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

let backup = null;
if (fs.existsSync(target)) {
    backup = path.join(backupsDir, `${NAME}-${stamp()}`);
    for (let i = 1; fs.existsSync(backup); i++)
        backup = path.join(backupsDir, `${NAME}-${stamp()}-${i}`);
    console.log(`${tag}备份旧插件 → ${backup}`);
    if (!dryRun) {
        try {
            fs.mkdirSync(backupsDir, { recursive: true });
            moveDir(target, backup);
        } catch (e) {
            fail(`备份失败: ${e.message}(旧插件未改动,可能 Tabby 正占用文件,关掉 Tabby 再试)`);
        }
    }
} else {
    console.log(`${tag}目标目录不存在,首次安装,无需备份`);
}

for (const [src, rel] of items) {
    console.log(`${tag}复制 ${src} → ${path.join(target, rel)}`);
}
if (!dryRun) {
    try {
        fs.mkdirSync(target, { recursive: true });
        for (const [src, rel] of items) copyRecursive(path.join(ROOT, src), path.join(target, rel));
    } catch (e) {
        console.error(`✗ 复制失败: ${e.message}`);
        try {
            fs.rmSync(target, { recursive: true, force: true });
            if (backup) {
                moveDir(backup, target);
                console.error('  已把旧插件从备份还原');
            }
        } catch (e2) {
            console.error(`  还原失败: ${e2.message} —— 旧插件还在 ${backup},请手动挪回去`);
        }
        process.exit(1);
    }
}

const BACKUP_RE = new RegExp(
    `^${NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{8}-\\d{6}(-\\d+)?$`,
);
if (fs.existsSync(backupsDir)) {
    const all = fs
        .readdirSync(backupsDir)
        .filter(n => BACKUP_RE.test(n) && fs.statSync(path.join(backupsDir, n)).isDirectory());
    if (dryRun && backup) all.push(path.basename(backup));
    all.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    const stale = all.slice(0, Math.max(0, all.length - keep));
    for (const n of stale) {
        console.log(`${tag}删除旧备份 ${path.join(backupsDir, n)}`);
        if (!dryRun) {
            try {
                fs.rmSync(path.join(backupsDir, n), { recursive: true, force: true });
            } catch (e) {
                console.warn(`  ⚠ 删除失败: ${e.message}`);
            }
        }
    }
}

function tabbyRunning() {
    try {
        if (process.platform === 'win32') {
            const out = execFileSync('tasklist', ['/FI', 'IMAGENAME eq Tabby.exe', '/NH'], {
                encoding: 'utf8',
            });
            return /tabby\.exe/i.test(out);
        }
        execFileSync('pgrep', ['-i', 'tabby'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

console.log(dryRun ? '[dry-run] 结束,未改动任何文件' : `✓ 已安装 ${NAME}@${pkg.version}`);
if (tabbyRunning()) console.log('⚠ Tabby 正在运行,需要重启 Tabby 生效');
console.log(
    '提示: Claude Desktop 需重连以用上新的 dist/shim.js（仍需 node）；Codex/HTTP 为进程内监听，重开 Tabby 即可，无需 node.exe',
);
