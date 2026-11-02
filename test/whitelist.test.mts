import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkWhitelist, DEFAULT_WHITELIST } from '../src/core/whitelist.ts';

test('常见只读命令直接放行', () => {
    for (const cmd of ['ls', 'ls -la', 'pwd', 'git status', 'git log --oneline', 'df -h']) {
        assert.equal(checkWhitelist(cmd).allowed, true, `应放行: ${cmd}`);
    }
});

test('前缀匹配必须落在词边界 —— ls 不能匹配 lsof', () => {
    assert.equal(checkWhitelist('lsof -i').allowed, false);
    assert.equal(checkWhitelist('catalina.sh run').allowed, false);
    assert.equal(checkWhitelist('dirname /a/b').allowed, false);
});

test('写操作不在白名单里', () => {
    for (const cmd of ['rm -rf /tmp/x', 'git push', 'docker rm -f c1', 'npm install left-pad']) {
        assert.equal(checkWhitelist(cmd).allowed, false, `应拦截: ${cmd}`);
    }
});

test('分隔符切段后逐段匹配 —— 前缀是白名单命令也挡不住后面的段', () => {
    const cases: Array<[string, string]> = [
        ['ls; rm -rf /', 'rm -rf /'],
        ['ls | xargs rm', 'xargs rm'],
        ['ls && rm -rf /', 'rm -rf /'],
        ['ls || rm -rf /', 'rm -rf /'],
        ['ls & rm -rf /', 'rm -rf /'],
        ['ls |& rm -rf /', 'rm -rf /'],
    ];
    for (const [cmd, segment] of cases) {
        const r = checkWhitelist(cmd);
        assert.equal(r.allowed, false, `应拦截: ${cmd}`);
        assert.equal(r.reason, 'no-match', `${cmd} 应因某一段不在白名单被拦`);
        assert.equal(r.detail, segment);
    }
});

test('能执行命令或写文件的结构一律强制确认', () => {
    const cases: Array<[string, string]> = [
        ['ls `rm -rf /`', '`'],
        ['ls $(rm -rf /)', '$('],
        ['echo "$(rm -rf /)"', '$('],
        ['echo "`rm -rf /`"', '`'],
        ['echo x > /etc/passwd', '>'],
        ['echo x >> out.txt', '>'],
        ['cat < /etc/shadow', '<'],
        ['echo (Remove-Item -Recurse -Force *)', '('],
        ['echo @(Remove-Item secret.txt)', '('],
        ['cat =(touch /tmp/pwned)', '('],
        ['ls | Get-Content -Path { Remove-Item -Force secret.txt }', '{'],
        ['find . -type f -exec rm -f {} \\;', '{'],
        ["echo 'unclosed", '引号'],
    ];
    for (const [cmd, label] of cases) {
        const r = checkWhitelist(cmd);
        assert.equal(r.allowed, false, `应拦截: ${cmd}`);
        assert.equal(r.reason, 'shell-metachar', `${cmd} 应因结构被拦`);
        assert.ok(r.detail?.includes(label), `${cmd} 的 detail 应含 ${label},实际 ${r.detail}`);
    }
});

test('全部段都在白名单里就放行,matchedRule 列出命中的规则', () => {
    const r = checkWhitelist('git log --oneline | head -20; echo ----; git status');
    assert.equal(r.allowed, true);
    assert.equal(r.matchedRule, 'git log, head, echo, git status');
});

test('引号里的分隔符不切段', () => {
    assert.equal(checkWhitelist("grep -E 'error|warn' app.log").allowed, true);
    assert.equal(checkWhitelist('grep "a;b" app.log').allowed, true);
    assert.equal(checkWhitelist("grep 'fn(x) { }' app.log").allowed, true);
});

test('无害的重定向放行:空设备和流合并', () => {
    for (const cmd of [
        'ls /x 2>/dev/null',
        'ls /x 2> /dev/null',
        'ls /x >/dev/null 2>&1',
        'echo x >&2',
        'Get-Item x 2>$null',
        'dir x 2>nul',
        'dir x 2>NUL',
        'ls /x >>/dev/null',
    ]) {
        assert.equal(checkWhitelist(cmd).allowed, true, `应放行: ${cmd}`);
    }
});

test('看起来像空设备但其实不是的重定向要拦', () => {
    for (const cmd of ['ls >/dev/nullx', 'ls 2>nul.txt', 'ls 3>&1', 'ls foo2>/dev/null']) {
        const r = checkWhitelist(cmd);
        assert.equal(r.allowed, false, `应拦截: ${cmd}`);
        assert.equal(r.reason, 'shell-metachar', cmd);
    }
});

test('&> 按分隔符处理 —— cmd 里 & 就是分隔符,不能当重定向吃掉', () => {
    const r = checkWhitelist('echo ok &>NUL del C:\\data\\important.txt');
    assert.equal(r.allowed, false);
});

test("两种方言都要通过:posix 的 \\' 转义不能把后面的命令藏进引号", () => {
    const r = checkWhitelist("echo ok \\'; rm -rf ~ ; echo \\'");
    assert.equal(r.allowed, false);
    assert.equal(r.reason, 'no-match');
    assert.equal(r.detail, 'rm -rf ~');
});

test('两种方言都要通过:PowerShell 路径里的 \\; 仍然是分隔符', () => {
    const r = checkWhitelist('dir C:\\; rm x');
    assert.equal(r.allowed, false);
    assert.equal(r.detail, 'rm x');
});

test('排查命令:缺哪段就指出哪段,补上规则后放行', () => {
    const cmd =
        'journalctl --list-boots 2>/dev/null | tail -6; echo ----; ls /sys/fs/pstore/ 2>/dev/null; ' +
        'echo ----; ls -lh /var/log/kern.log* /var/log/syslog* 2>/dev/null; echo ----; ' +
        "zgrep -aiE 'out of memory|oom-killer|rcu.*stall|mmc[0-9].*(error|timeout)|under-?voltage' " +
        '/var/log/kern.log* /var/log/syslog* 2>/dev/null | tail -40; echo ----; ' +
        'ps -o pid,args -p 710; readlink /proc/761/cwd; ls -lh /opt/lambnearend/';

    const denied = checkWhitelist(cmd);
    assert.equal(denied.allowed, false);
    assert.equal(denied.reason, 'no-match');
    assert.ok(denied.detail?.startsWith('zgrep -aiE'), `实际 ${denied.detail}`);

    const allowed = checkWhitelist(cmd, [...DEFAULT_WHITELIST, 'zgrep', 'readlink']);
    assert.equal(allowed.allowed, true);
});

test('journalctl 只放行查询,会删改日志的参数(含缩写)要确认', () => {
    for (const cmd of [
        'journalctl',
        'journalctl --list-boots',
        'journalctl -u nginx --since today --no-pager',
        'journalctl -k -b -1 | tail -40',
        'journalctl --system --user --root=/mnt --reverse -o json',
    ]) {
        assert.equal(checkWhitelist(cmd).allowed, true, `应放行: ${cmd}`);
    }
    for (const cmd of [
        'journalctl --vacuum-size=100M',
        'journalctl --vacuum-t=1s',
        'journalctl --rotate',
        'journalctl --rot',
        'journalctl --flush',
        'journalctl --sync',
        'journalctl --relinquish-var',
        'journalctl --smart-relinquish-var',
        'journalctl --setup-keys',
        'journalctl --update-catalog',
        'journalctlx',
    ]) {
        assert.equal(checkWhitelist(cmd).allowed, false, `应拦截: ${cmd}`);
    }
});

test('no-match 的 detail 过长时截断', () => {
    const r = checkWhitelist(`ls; rm ${'x'.repeat(200)}`);
    assert.equal(r.reason, 'no-match');
    assert.ok(r.detail!.length <= 81);
});

test('只有分隔符没有命令不放行', () => {
    assert.equal(checkWhitelist(';').allowed, false);
    assert.equal(checkWhitelist(' | ').allowed, false);
});

test('正则规则生效:kubectl 只放行只读子命令', () => {
    assert.equal(checkWhitelist('kubectl get pods').allowed, true);
    assert.equal(checkWhitelist('kubectl describe node n1').allowed, true);
    assert.equal(checkWhitelist('kubectl delete pod p1').allowed, false);
    assert.equal(checkWhitelist('kubectl apply -f x.yaml').allowed, false);
});

test('git 子命令区分读写', () => {
    assert.equal(checkWhitelist('git diff HEAD~1').allowed, true);
    assert.equal(checkWhitelist('git reset --hard').allowed, false);
    assert.equal(checkWhitelist('git commit -m x').allowed, false);
});

test('空命令不放行', () => {
    assert.equal(checkWhitelist('').allowed, false);
    assert.equal(checkWhitelist('   ').reason, 'empty');
});

test('自定义规则可以完全替换默认表', () => {
    assert.equal(checkWhitelist('ls', ['pwd']).allowed, false);
    assert.equal(checkWhitelist('pwd', ['pwd']).allowed, true);
});

test('规则写坏的正则不会让检查崩溃', () => {
    assert.doesNotThrow(() => checkWhitelist('ls', ['/[unclosed/']));
    assert.equal(checkWhitelist('ls', ['/[unclosed/']).allowed, false);
});

test('默认白名单里没有明显的写操作', () => {
    const dangerous = ['rm', 'mv', 'dd', 'mkfs', 'shutdown', 'reboot', 'chmod', 'chown', 'kill'];
    for (const rule of DEFAULT_WHITELIST) {
        const head = rule.replace(/^\//, '').split(/[\s(]/)[0].toLowerCase();
        assert.ok(!dangerous.includes(head), `默认白名单不该含写操作: ${rule}`);
    }
});
