export const MESSAGES: Record<string, { zh: string; en: string }> = {
    'settings.portChip': {
        zh: '端口',
        en: 'Port',
    },
    'settings.windowId': {
        zh: '窗口 ID',
        en: 'Window ID',
    },
    'settings.restart': {
        zh: '重启',
        en: 'Restart',
    },
    'settings.config': {
        zh: '配置',
        en: 'Settings',
    },
    'settings.clients': {
        zh: '客户端',
        en: 'Clients',
    },
    'settings.whitelist': {
        zh: '白名单',
        en: 'Whitelist',
    },
    'settings.audit': {
        zh: '最近调用',
        en: 'Recent calls',
    },
    'settings.running': {
        zh: '运行中',
        en: 'Running',
    },
    'settings.stopped': {
        zh: '已停止',
        en: 'Stopped',
    },
    'settings.disabled': {
        zh: '已禁用',
        en: 'Disabled',
    },
    'settings.startFailed': {
        zh: '启动失败',
        en: 'Failed to start',
    },
    'settings.httpRunning': {
        zh: '运行中',
        en: 'Running',
    },
    'settings.httpIdle': {
        zh: '未启动',
        en: 'Not started',
    },
    'settings.httpStarting': {
        zh: '启动中',
        en: 'Starting',
    },
    'settings.httpError': {
        zh: '出错',
        en: 'Error',
    },
    'settings.hostedElsewhere': {
        zh: '由其他 Tabby 窗口托管',
        en: 'Hosted by another Tabby window',
    },
    'settings.portFallback': {
        zh: '端口 {old} 被占用，已使用 {new}',
        en: 'Port {old} is in use; using {new}',
    },
    'settings.lanePipe': {
        zh: '本地管道',
        en: 'Local pipe',
    },
    'settings.laneHttp': {
        zh: 'HTTP 入口',
        en: 'HTTP endpoint',
    },
    'settings.lanChip': {
        zh: '局域网可访问',
        en: 'LAN accessible',
    },
    'settings.pauseBadge': {
        zh: '已暂停',
        en: 'Paused',
    },
    'settings.pauseBarBody': {
        zh: '已暂停 — HTTP 返回 503；本会话有效，重启服务会解除暂停',
        en: 'Paused — HTTP returns 503; lasts for this session, and restarting clears the pause',
    },
    'settings.resumeService': {
        zh: '恢复服务',
        en: 'Resume service',
    },
    'settings.portChipTitle': {
        zh: '当前 HTTP 入口实际端口（占用时会顺延）',
        en: 'Actual HTTP endpoint port (falls back if the preferred port is busy)',
    },
    'clients.otherPill': {
        zh: '其他',
        en: 'Other',
    },
    'clients.otherName': {
        zh: '其他客户端',
        en: 'Other clients',
    },
    'clients.otherSub': {
        zh: '通过 Streamable HTTP 接入',
        en: 'Connect over Streamable HTTP',
    },
    'clients.otherAvailable': {
        zh: '可用',
        en: 'Available',
    },
    'clients.otherUnavailable': {
        zh: '不可用',
        en: 'Unavailable',
    },
    'clients.copyPrompt': {
        zh: '复制接入说明',
        en: 'Copy setup note',
    },
    'clients.previewPrompt': {
        zh: '预览',
        en: 'Preview',
    },
    'clients.kvAddress': {
        zh: '地址',
        en: 'Address',
    },
    'clients.kvAuth': {
        zh: '鉴权',
        en: 'Auth',
    },
    'clients.copyAddress': {
        zh: '复制地址',
        en: 'Copy address',
    },
    'clients.copyAuthToken': {
        zh: '复制 Token',
        en: 'Copy Token',
    },
    'clients.addressCopied': {
        zh: '地址已复制',
        en: 'Address copied',
    },
    'clients.promptAddress': {
        zh: '接入地址',
        en: 'Setup address',
    },
    'clients.credentials': {
        zh: '访问凭证',
        en: 'Credentials',
    },
    'clients.publicLink': {
        zh: '公网 / 隧道',
        en: 'Public / tunnel',
    },
    'clients.publicLinkHint': {
        zh: '填写 Cloudflare / Tailscale 等隧道 URL',
        en: 'Enter a Cloudflare / Tailscale tunnel URL',
    },
    'clients.httpError': {
        zh: 'HTTP 入口异常',
        en: 'HTTP listener error',
    },
    'clients.httpErrorDetail': {
        zh: 'HTTP 入口异常：{detail}',
        en: 'HTTP listener error: {detail}',
    },

    'settings.tokenFileWriteFailed': {
        zh: '无法写入 token 文件: {err}',
        en: 'Could not write the token file: {err}',
    },
    'config.modelCanDo': {
        zh: '模型权限',
        en: 'Model permissions',
    },
    'config.networkSection': {
        zh: '网络',
        en: 'Network',
    },
    'config.networkBadge': {
        zh: 'HTTP 监听策略',
        en: 'HTTP listen policy',
    },
    'config.bindAddress': {
        zh: '监听地址',
        en: 'Listen address',
    },
    'config.bindLoopback': {
        zh: '仅本机',
        en: 'This computer only',
    },
    'config.bindLan': {
        zh: '局域网',
        en: 'Local network',
    },
    'config.bindHelp': {
        zh: '本机客户端仍使用 127.0.0.1。更改后会重启 HTTP 入口。',
        en: 'Local clients still use 127.0.0.1. Changing this restarts the HTTP listener.',
    },
    'config.lanWarning': {
        zh: '局域网会把终端控制暴露到网络。请保管好 Token，并限制可访问的网段。',
        en: 'LAN mode exposes terminal control on the network. Keep the Token private and limit which networks can reach it.',
    },
    'config.allowRead': {
        zh: '读取终端',
        en: 'Read the terminal',
    },
    'config.allowReadHelp': {
        zh: '终端可能含密钥，默认关闭。关闭时读取请求会被拒绝。',
        en: 'The terminal may contain secrets, so this is off by default. While off, read requests are rejected.',
    },
    'config.maxLines': {
        zh: '单次最多读取行数',
        en: 'Max lines per read',
    },
    'config.maxLinesHelp': {
        zh: '上限,防止把整个回滚缓冲灌给模型',
        en: 'Cap, so the whole scrollback is not sent to the model',
    },
    'config.allowWait': {
        zh: '等待回车后再继续',
        en: 'Wait for Enter before continuing',
    },
    'config.allowWaitHelp': {
        zh: '写入后最多等待约 30 秒；你按回车后继续并读取输出。',
        en: 'After a write, waits up to about 30 seconds; after you press Enter it continues and reads the output.',
    },
    'config.waitNeedsRead': {
        zh: '拿结果要读终端,上面那项关着的时候,只能知道你按了回车,看不到输出。',
        en: 'Seeing the result requires reading the terminal. While that switch is off, it only learns that you pressed Enter, not what was printed.',
    },
    'config.safety': {
        zh: '安全',
        en: 'Safety',
    },
    'config.confirmOutside': {
        zh: '白名单外需确认',
        en: 'Confirm outside the whitelist',
    },
    'config.confirmHelp': {
        zh: '关闭后直接写入终端。倒计时仅前台累计 30 秒。不会代按回车。',
        en: 'When off, text is written straight to the terminal. The countdown runs only while this window is in front, for 30 seconds total. Never presses Enter for you.',
    },
    'config.log': {
        zh: '记录',
        en: 'Log',
    },
    'config.audit': {
        zh: '审计日志',
        en: 'Audit log',
    },
    'config.auditHelp': {
        zh: '每天一个文件,保留 {days} 天,过期的自动删掉。',
        en: 'One file per day, kept for {days} days, then deleted.',
    },
    'whitelist.help': {
        zh: '每行一条。写 <code>git status</code> 是命令前缀匹配(按词边界,所以 <code>ls</code> 不会匹配 <code>lsof</code>);写 <code>/^kubectl (get|describe) /</code> 是正则。命中的命令免确认直接写入。<br />用 <code>;</code> <code>|</code> <code>&amp;&amp;</code> 串起来的命令会按段拆开(引号里的不算),<strong>每一段</strong>都命中才免确认;确认框里会指出是哪一段没命中。<code>2&gt;/dev/null</code> <code>2&gt;&amp;1</code> <code>&gt;$null</code> 这类不写文件的重定向不影响判断。<br />含有 <code>&#96;</code> <code>$(</code> <code>(</code> <code>{</code> <code>&lt;</code>、或者写文件的 <code>&gt;</code> 的命令一律强制确认 —— 它们能把一条只读命令变成任意命令。',
        en: 'One rule per line. <code>git status</code> is a command prefix (on a word boundary, so <code>ls</code> does not match <code>lsof</code>). <code>/^kubectl (get|describe) /</code> is a regular expression. A match is written with no dialog.<br />Commands joined with <code>;</code> <code>|</code> <code>&amp;&amp;</code> are split into segments (not inside quotes). <strong>Every</strong> segment must match. The dialog names the one that did not.<br />Redirects that do not write a file, such as <code>2&gt;/dev/null</code>, <code>2&gt;&amp;1</code>, and <code>&gt;$null</code>, are ignored.<br />Anything with <code>&#96;</code>, <code>$(</code>, <code>(</code>, <code>{</code>, <code>&lt;</code>, or a file-writing <code>&gt;</code> always asks — those can turn a read-only command into an arbitrary one.',
    },
    'whitelist.restore': {
        zh: '恢复默认',
        en: 'Restore defaults',
    },
    'whitelist.hintPrefix': {
        zh: '前缀匹配',
        en: 'Prefix match',
    },
    'whitelist.hintRegex': {
        zh: '/regex/flags',
        en: '/regex/flags',
    },
    'whitelist.hintForce': {
        zh: '匹配则跳过确认',
        en: 'Skip confirmation on a match',
    },
    'whitelist.countPill': {
        zh: '{n} 条规则',
        en: '{n} rules',
    },
    'whitelist.saveHint': {
        zh: '失焦 / 防抖保存',
        en: 'Saved on blur / debounce',
    },
    'whitelist.count': {
        zh: '当前 {n} 条规则,改动即时保存',
        en: '{n} rules, saved as you type',
    },
    'whitelist.restoreTitle': {
        zh: '恢复默认白名单',
        en: 'Restore the default whitelist',
    },
    'whitelist.restoreBody': {
        zh: '将用默认的 {after} 条替换现有的 {before} 条。此操作无法撤销。',
        en: 'Replace the current {before} rules with the {after} defaults. This cannot be undone.',
    },
    'whitelist.cancelled': {
        zh: '已取消，未更改白名单',
        en: 'Cancelled. The whitelist was not changed.',
    },
    'whitelist.savedCount': {
        zh: '{before} 条 → {after} 条,已保存',
        en: '{before} → {after}, saved',
    },
    'whitelist.restored': {
        zh: '已恢复默认白名单',
        en: 'Default whitelist restored',
    },
    'audit.refresh': {
        zh: '刷新',
        en: 'Refresh',
    },
    'audit.clear': {
        zh: '清空',
        en: 'Clear',
    },
    'audit.searchPlaceholder': {
        zh: '搜索命令 / 说明…',
        en: 'Search command / note…',
    },
    'audit.allCallers': {
        zh: '全部调用方',
        en: 'All callers',
    },
    'audit.allResults': {
        zh: '全部结果',
        en: 'All results',
    },
    'audit.emptyHint': {
        zh: '模型调用工具后，记录会出现在这里。',
        en: 'Entries appear here after the model calls a tool.',
    },
    'audit.filterEmpty': {
        zh: '没有匹配的记录',
        en: 'No matching entries',
    },
    'audit.filterEmptyHint': {
        zh: '试试清空筛选条件。',
        en: 'Try clearing the filters.',
    },
    'audit.justNow': {
        zh: '刚刚',
        en: 'Just now',
    },
    'audit.minutesAgo': {
        zh: '{n} 分钟前',
        en: '{n}m ago',
    },
    'audit.hoursAgo': {
        zh: '{n} 小时前',
        en: '{n}h ago',
    },
    'audit.daysAgo': {
        zh: '{n} 天前',
        en: '{n}d ago',
    },
    'audit.loadingHint': {
        zh: '正在读取审计日志…',
        en: 'Reading the audit log…',
    },
    'audit.empty': {
        zh: '暂无记录',
        en: 'No entries yet',
    },
    'audit.time': {
        zh: '时间',
        en: 'Time',
    },
    'audit.caller': {
        zh: '来源',
        en: 'Source',
    },
    'audit.tool': {
        zh: '工具',
        en: 'Tool',
    },
    'audit.tab': {
        zh: '标签页',
        en: 'Tab',
    },
    'audit.command': {
        zh: '命令',
        en: 'Command',
    },
    'audit.note': {
        zh: '说明',
        en: 'Note',
    },
    'audit.result': {
        zh: '结果',
        en: 'Result',
    },
    'audit.reason': {
        zh: '原因：{reason}',
        en: 'Reason: {reason}',
    },
    'audit.timeout': {
        zh: '窗口在前台累计 30 秒,已自动拒绝',
        en: 'The window stayed in front for 30 seconds, so this was refused',
    },
    'audit.disconnected': {
        zh: '调用方已断开,确认框已关闭',
        en: 'The caller disconnected and the dialog was closed',
    },
    'audit.refreshedDelta': {
        zh: '已刷新,共 {n} 条(新增 {delta} 条)',
        en: 'Refreshed, {n} entries ({delta} new)',
    },
    'audit.refreshed': {
        zh: '已刷新,共 {n} 条',
        en: 'Refreshed, {n} entries',
    },
    'audit.nothingToClear': {
        zh: '没有可清空的记录',
        en: 'Nothing to clear',
    },
    'audit.clearTitle': {
        zh: '清空审计日志？',
        en: 'Clear the audit log?',
    },
    'audit.clearBody': {
        zh: '将删除保留期内的全部日志（当前 {n} 条），无法恢复。',
        en: 'Deletes every log still inside the retention window ({n} shown). This cannot be undone.',
    },
    'audit.clearCancelled': {
        zh: '已取消,日志没有改动',
        en: 'Cancelled. The log was not changed.',
    },
    'audit.clearStillThere': {
        zh: '清空后仍读到 {n} 条,日志文件可能删不掉(权限或被占用)',
        en: 'Still read {n} entries after clearing. The files may be locked or not writable.',
    },
    'audit.clearFailed': {
        zh: '清空失败',
        en: 'Clear failed',
    },
    'audit.cleared': {
        zh: '审计日志已清空',
        en: 'Audit log cleared',
    },
    'confirm.title': {
        zh: '写入终端？',
        en: 'Write to the terminal?',
    },
    'confirm.target': {
        zh: '目标',
        en: 'Target',
    },
    'confirm.modelNote': {
        zh: '模型的说明(仅供参考,请以命令本身为准)',
        en: 'The model’s note (a hint only — judge the command itself)',
    },
    'confirm.promise': {
        zh: '只会把文本写到光标处，回车仍由你来按。',
        en: 'Only types text at the cursor; you still press Enter.',
    },
    'confirm.reasonLabel': {
        zh: '拒绝理由(可选,会告诉模型)',
        en: 'Reason for refusing (optional, sent to the model)',
    },
    'confirm.reasonPlaceholder': {
        zh: '例如:别用 rm,改用 trash;或者先 cd 到项目目录',
        en: 'For example: don’t use rm, use trash; or cd into the project first',
    },
    'confirm.countdown': {
        zh: '{n} 秒后自动拒绝',
        en: 'Refuses automatically in {n}s',
    },
    'confirm.paused': {
        zh: '等你回到这个窗口，回来后还有 {n} 秒',
        en: 'Waiting until this window is in front. {n}s left after that.',
    },
    'confirm.refuse': {
        zh: '拒绝',
        en: 'Refuse',
    },
    'confirm.write': {
        zh: '写入',
        en: 'Write',
    },
    'confirm.metachar': {
        zh: '命令里含有 {detail},可以把一条只读命令变成任意命令,因此强制确认。',
        en: 'The command contains {detail}, which can turn a read-only command into an arbitrary one, so it always asks.',
    },
    'confirm.segment': {
        zh: '这一段不在白名单里:{detail}',
        en: 'This segment is not on the whitelist: {detail}',
    },
    'confirm.notOnList': {
        zh: '这条命令不在白名单里。',
        en: 'This command is not on the whitelist.',
    },
    'confirm.notWhitelisted': {
        zh: '这条命令不在白名单里。',
        en: 'This command is not on the whitelist.',
    },
    'confirm.ambiguous': {
        zh: '白名单匹配不唯一：{detail}',
        en: 'Ambiguous whitelist match: {detail}',
    },
    'common.loading': {
        zh: '加载中…',
        en: 'Loading…',
    },
    'common.cancel': {
        zh: '取消',
        en: 'Cancel',
    },
    'common.confirm': {
        zh: '确认',
        en: 'Confirm',
    },
    'common.ok': {
        zh: '确定',
        en: 'OK',
    },
    'common.withoutToken': {
        zh: '不含 token',
        en: 'Without token',
    },
    'common.copyWithToken': {
        zh: '复制（含 Token）',
        en: 'Copy (includes Token)',
    },
    'toolbar.paused': {
        zh: 'MCP（已暂停）',
        en: 'MCP (paused)',
    },
    'toolbar.resume': {
        zh: '恢复服务',
        en: 'Resume',
    },
    'toolbar.pauseAll': {
        zh: '全部断开并暂停',
        en: 'Disconnect all and pause',
    },
    'toolbar.resumed': {
        zh: '已恢复',
        en: 'Resumed',
    },
    'toolbar.pausedToast': {
        zh: '已暂停。重启 Tabby 后会自动恢复。',
        en: 'Paused. Restarting Tabby turns it back on.',
    },
    'toolbar.hotkey': {
        zh: 'MCP：全部断开并暂停 / 恢复服务',
        en: 'MCP: disconnect all and pause / resume',
    },
    'card.configPath': {
        zh: '配置文件 <code>{path}</code>',
        en: 'Config file <code>{path}</code>',
    },
    'card.configPathLab': {
        zh: '配置',
        en: 'Config',
    },
    'card.recorded': {
        zh: '配置里记录的:',
        en: 'Recorded in the config:',
    },
    'card.expected': {
        zh: '当前应该是:',
        en: 'It should be:',
    },
    'card.parseSuffix': {
        zh: ' —— 为避免破坏你的配置,接入按钮已禁用。',
        en: ' — the connect button is disabled so your config is left alone.',
    },
    'card.parsePrefix': {
        zh: '解析错误:',
        en: 'Parse error: ',
    },
    'card.rewrite': {
        zh: '写入',
        en: 'Write',
    },
    'card.connect': {
        zh: '接入',
        en: 'Connect',
    },
    'card.remove': {
        zh: '移除',
        en: 'Remove',
    },
    'card.refresh': {
        zh: '刷新',
        en: 'Refresh',
    },
    'card.manual': {
        zh: '手动配置',
        en: 'Configure manually',
    },
    'clients.claudeName': {
        zh: 'Claude Desktop',
        en: 'Claude Desktop',
    },
    'clients.codexName': {
        zh: 'Codex',
        en: 'Codex',
    },
    'clients.cursorName': {
        zh: 'Cursor',
        en: 'Cursor',
    },
    'clients.claudeSub': {
        zh: 'stdio · 本地',
        en: 'stdio · local',
    },
    'clients.codexSub': {
        zh: 'Streamable HTTP',
        en: 'Streamable HTTP',
    },
    'clients.cursorSub': {
        zh: 'Streamable HTTP',
        en: 'Streamable HTTP',
    },
    'clients.claudeTitle': {
        zh: '接入 Claude Desktop',
        en: 'Connect Claude Desktop',
    },
    'clients.codexTitle': {
        zh: '接入 Codex',
        en: 'Connect Codex',
    },
    'clients.cursorTitle': {
        zh: '接入 Cursor',
        en: 'Connect Cursor',
    },
    'clients.parseError': {
        zh: '配置文件无法解析',
        en: 'The config file could not be parsed',
    },
    'clients.unhandled': {
        zh: '配置文件无法处理',
        en: 'The config file could not be handled',
    },
    'clients.nameTaken': {
        zh: '"{name}" 这个名字已被其它条目占用',
        en: 'The name "{name}" is already used by another entry',
    },
    'clients.sectionTaken': {
        zh: '[mcp_servers.{name}] 已被其它条目占用',
        en: '[mcp_servers.{name}] is already used by another entry',
    },
    'clients.conflictEntry': {
        zh: '配置里已有一个叫 {name} 的条目,但不是本插件写的,不会覆盖它。',
        en: 'There is already an entry named {name}, and this plugin did not write it, so it will not be overwritten.',
    },
    'clients.conflictSection': {
        zh: '配置里已有 [mcp_servers.{name}] 这一段,但不是本插件写的,不会覆盖它。',
        en: 'There is already a [mcp_servers.{name}] section, and this plugin did not write it, so it will not be overwritten.',
    },
    'clients.conflictMcp': {
        zh: '配置里已有 mcpServers.{name} 这一条,但不是本插件写的,不会覆盖它。',
        en: 'There is already an mcpServers.{name} entry, and this plugin did not write it, so it will not be overwritten.',
    },
    'clients.snippetMcp': {
        zh: '把下面这段加进 {path} 的 mcpServers 里。',
        en: 'Add the block below to mcpServers in {path}.',
    },
    'clients.snippetFile': {
        zh: '把下面这段加进 {path}。',
        en: 'Add the block below to {path}.',
    },
    'clients.stale': {
        zh: '已接入,但记录的端点已过期',
        en: 'Connected, but the recorded endpoint is out of date',
    },
    'clients.connected': {
        zh: '已接入',
        en: 'Connected',
    },
    'clients.notConnectedYet': {
        zh: '未接入（接入时会创建配置文件）',
        en: 'Not connected (connecting will create the config file)',
    },
    'clients.notConnected': {
        zh: '未接入',
        en: 'Not connected',
    },
    'clients.cancelled': {
        zh: '已取消,配置文件没有改动',
        en: 'Cancelled. The config file was not changed.',
    },
    'clients.claude.rewriteTitle': {
        zh: '重新写入 Claude Desktop 配置',
        en: 'Write the Claude Desktop config again',
    },
    'clients.claude.installBody': {
        zh: '会修改 {path}\n在 mcpServers 里{verb} "{name}" 条目,指向:\n{shim}\n\n原文件会先备份。文件里其它的 MCP server 不受影响。',
        en: 'This will edit {path}\nIt will {verb} the "{name}" entry under mcpServers, pointing at:\n{shim}\n\nThe original file is backed up first. Other MCP servers in the file are left alone.',
    },
    'common.update': {
        zh: '更新',
        en: 'update',
    },
    'common.add': {
        zh: '添加',
        en: 'add',
    },
    'common.connect': {
        zh: '接入',
        en: 'Connect',
    },
    'clients.claude.connected': {
        zh: '已接入 Claude Desktop',
        en: 'Connected to Claude Desktop',
    },
    'clients.claude.failed': {
        zh: '接入 Claude Desktop 失败',
        en: 'Could not connect Claude Desktop',
    },
    'clients.claude.removeTitle': {
        zh: '从 Claude Desktop 移除',
        en: 'Remove from Claude Desktop',
    },
    'clients.claude.removeBody': {
        zh: '会从 {path} 的 mcpServers 里删除 "{name}" 条目。\n原文件会先备份,其它 MCP server 不受影响。',
        en: 'This will delete the "{name}" entry from mcpServers in {path}.\nThe original file is backed up first. Other MCP servers are left alone.',
    },
    'common.remove': {
        zh: '移除',
        en: 'Remove',
    },
    'clients.claude.removed': {
        zh: '已从 Claude Desktop 移除',
        en: 'Removed from Claude Desktop',
    },
    'clients.removeFailed': {
        zh: '移除失败',
        en: 'Could not remove it',
    },
    'clients.codex.rewriteTitle': {
        zh: '重新写入 Codex 配置',
        en: 'Write the Codex config again',
    },
    'clients.codex.installBody': {
        zh: '会修改 {path}\n{verb} [mcp_servers.{name}] 为 Streamable HTTP:\nurl = {url}\nhttp_headers.Authorization = Bearer <token>\n\n原文件会先备份。只动这一段 —— 你的注释、格式和其它 MCP server 都不受影响。',
        en: 'This will edit {path}\nIt will {verb} [mcp_servers.{name}] as Streamable HTTP:\nurl = {url}\nhttp_headers.Authorization = Bearer <token>\n\nThe original file is backed up first. Only that section changes — your comments, formatting, and other MCP servers stay as they are.',
    },
    'clients.codex.connected': {
        zh: '已接入 Codex',
        en: 'Connected to Codex',
    },
    'clients.codex.failed': {
        zh: '接入 Codex 失败',
        en: 'Could not connect Codex',
    },
    'clients.codex.removeTitle': {
        zh: '从 Codex 移除',
        en: 'Remove from Codex',
    },
    'clients.codex.removeBody': {
        zh: '会从 {path} 里删除 [mcp_servers.{name}] 这一段。\n原文件会先备份,其它内容不受影响。',
        en: 'This will delete the [mcp_servers.{name}] section from {path}.\nThe original file is backed up first. The rest of the file is left alone.',
    },
    'clients.codex.removed': {
        zh: '已从 Codex 移除',
        en: 'Removed from Codex',
    },
    'clients.cursor.rewriteTitle': {
        zh: '重新写入 Cursor 配置',
        en: 'Write the Cursor config again',
    },
    'clients.cursor.installBody': {
        zh: '会修改 {path}\n在 mcpServers 里{verb} "{name}" 为 Streamable HTTP:\nurl = {url}\nheaders.Authorization = Bearer <token>\n\n原文件会先备份。只动这一条 —— 其它 MCP server 不受影响。项目级 .cursor/mcp.json 不会改。',
        en: 'This will edit {path}\nIt will {verb} "{name}" under mcpServers as Streamable HTTP:\nurl = {url}\nheaders.Authorization = Bearer <token>\n\nThe original file is backed up first. Only that entry changes. A project .cursor/mcp.json is not touched.',
    },
    'clients.cursor.connected': {
        zh: '已接入 Cursor',
        en: 'Connected to Cursor',
    },
    'clients.cursor.failed': {
        zh: '接入 Cursor 失败',
        en: 'Could not connect Cursor',
    },
    'clients.cursor.removeTitle': {
        zh: '从 Cursor 移除',
        en: 'Remove from Cursor',
    },
    'clients.cursor.removed': {
        zh: '已从 Cursor 移除',
        en: 'Removed from Cursor',
    },
    'clients.tokenHeading': {
        zh: 'Token',
        en: 'Token',
    },
    'clients.tokenHelp': {
        zh: '重置后旧 Token 立即失效。已接入本服务的 Codex / Cursor 会自动改写；Claude 通过 Token 文件生效，需重启 Claude；远程客户端需手动更新。',
        en: 'After a reset the old Token stops working immediately. Connected Codex / Cursor configs that already point at this service are rewritten; Claude picks up the Token file (restart Claude); update remote clients by hand.',
    },
    'common.hide': {
        zh: '隐藏',
        en: 'Hide',
    },
    'common.show': {
        zh: '显示',
        en: 'Show',
    },
    'common.copy': {
        zh: '复制',
        en: 'Copy',
    },
    'clients.resetting': {
        zh: '重置中…',
        en: 'Resetting…',
    },
    'clients.resetToken': {
        zh: '重置 Token',
        en: 'Reset token',
    },
    'clients.lastReset': {
        zh: '上次重置：{when}',
        en: 'Last reset: {when}',
    },
    'clients.resetResult': {
        zh: '重置结果',
        en: 'Reset result',
    },
    'clients.resetDetails': {
        zh: '详情',
        en: 'Details',
    },
    'clients.fingerprint': {
        zh: '（指纹 {fp}）',
        en: '(fingerprint {fp})',
    },
    'clients.codexStatus': {
        zh: 'Codex：{status} — {message}',
        en: 'Codex: {status} — {message}',
    },
    'clients.cursorStatus': {
        zh: 'Cursor：{status} — {message}',
        en: 'Cursor: {status} — {message}',
    },
    'clients.claudeStatus': {
        zh: 'Claude：{status} — {message}',
        en: 'Claude: {status} — {message}',
    },
    'clients.remoteStatus': {
        zh: '远程：{status} — {message}',
        en: 'Remote: {status} — {message}',
    },
    'clients.httpIntro': {
        zh: '管道与 HTTP 入口始终启用。暂停/恢复在工具栏（会话内有效，重启 Tabby 自动恢复）。 HTTP 状态：{status} · 端口 <code>{port}</code>',
        en: 'The pipe and the HTTP listener are always on. Pause and resume live on the toolbar (this session only; restarting Tabby turns it back on). HTTP status: {status} · port <code>{port}</code>',
    },
    'clients.bindAddress': {
        zh: '监听地址',
        en: 'Listen address',
    },
    'clients.bindLoopback': {
        zh: '仅本机',
        en: 'This computer only',
    },
    'clients.bindLan': {
        zh: '局域网',
        en: 'Local network',
    },
    'clients.localUrlNote': {
        zh: '本机 URL 仍为 <code>{url}</code>（本地客户端照常用）。 改绑定会重启 HTTP 入口。',
        en: 'The local URL stays <code>{url}</code> (local clients keep using it). Changing the bind address restarts the HTTP listener.',
    },
    'clients.lanWarning': {
        zh: '会把终端控制暴露到网络。请限制访问范围并保管好 Token。',
        en: 'This exposes terminal control on the network. Limit who can reach it and keep the Token private.',
    },
    'clients.prompt': {
        zh: '提示词',
        en: 'Prompt',
    },
    'clients.publicWarning': {
        zh: '会把终端控制暴露到网络。请限制访问范围并保管好 Token。',
        en: 'This exposes terminal control on the network. Limit who can reach it and keep the Token private.',
    },
    'common.address': {
        zh: '地址',
        en: 'Address',
    },
    'clients.addrLoopback': {
        zh: '本机（{url}）',
        en: 'This machine ({url})',
    },
    'clients.addrLan': {
        zh: '局域网（{url}）',
        en: 'LAN ({url})',
    },
    'clients.addrPublic': {
        zh: '公网（{url}）',
        en: 'Public ({url})',
    },
    'clients.publicUnset': {
        zh: '未设置 — 见下方「如何配置公网」',
        en: 'not set — see “How to publish a public address” below',
    },
    'clients.howPublic': {
        zh: '如何配置公网',
        en: 'How to publish a public address',
    },
    'clients.howPublicBody': {
        zh: '把本机 HTTP 入口暴露到局域网或公网后，上方地址下拉可选「公网」，复制提示词即可给远程 AI 使用。',
        en: 'After the local HTTP endpoint is reachable on the LAN or the public internet, pick Public in the address menu above and copy the prompt for a remote AI.',
    },
    'clients.publicUrlLabel': {
        zh: '公网 / 隧道地址',
        en: 'Public / tunnel address',
    },
    'common.save': {
        zh: '保存',
        en: 'Save',
    },
    'clients.publicSaved': {
        zh: '已保存：<code>{url}</code>',
        en: 'Saved: <code>{url}</code>',
    },
    'clients.publicExpose': {
        zh: '公网会把终端控制暴露到互联网，请确认隧道与防火墙只对可信来源开放，并保管好 token。',
        en: 'A public address exposes terminal control to the internet. Make sure the tunnel and firewall only allow trusted sources, and keep the token private.',
    },
    'clients.cloudflareHelp': {
        zh: '把输出的 <code>https://….trycloudflare.com</code> 加上路径 <code>/mcp</code> 填入上方公网地址并保存。',
        en: 'Take the printed <code>https://….trycloudflare.com</code>, add <code>/mcp</code>, paste it above, and save.',
    },
    'clients.tailscaleHelp': {
        zh: '用 Tailscale 给出的 HTTPS 地址（含 <code>/mcp</code>）保存为公网地址。',
        en: 'Save the HTTPS address Tailscale gives you (including <code>/mcp</code>) as the public address.',
    },
    'clients.noTokenYet': {
        zh: '(尚未生成)',
        en: '(not created yet)',
    },
    'clients.pausedWarning': {
        zh: '服务已暂停，地址会返回 503。请先在工具栏恢复。',
        en: 'The service is paused; the address returns 503. Resume it from the toolbar first.',
    },
    'clients.httpDown': {
        zh: 'HTTP 未运行。确认插件已加载后再试。',
        en: 'HTTP is not running. Confirm the plugin is loaded, then try again.',
    },
    'clients.noAddress': {
        zh: '(未选择地址)',
        en: '(no address selected)',
    },
    'clients.rebindHttp': {
        zh: '正在按新的监听地址重启 HTTP 入口…',
        en: 'Restarting the HTTP listener on the new address…',
    },
    'clients.publicSavedToast': {
        zh: '已保存公网地址',
        en: 'Public address saved',
    },
    'clients.publicCleared': {
        zh: '已清空公网地址',
        en: 'Public address cleared',
    },
    'clients.noToken': {
        zh: '还没有 token',
        en: 'There is no token yet',
    },
    'clients.tokenCopied': {
        zh: '已复制 token',
        en: 'Token copied',
    },
    'common.copyFailed': {
        zh: '复制失败',
        en: 'Could not copy',
    },
    'clients.oldTokenDies': {
        zh: '旧 token 会立刻失效。',
        en: 'The old token stops working immediately.',
    },
    'clients.rotateCodex': {
        zh: 'Codex：{label} — {detail}',
        en: 'Codex: {label} — {detail}',
    },
    'clients.rotateCursor': {
        zh: 'Cursor：{label} — {detail}',
        en: 'Cursor: {label} — {detail}',
    },
    'clients.rotateClaude': {
        zh: 'Claude：{label} — {detail}',
        en: 'Claude: {label} — {detail}',
    },
    'clients.rotateRemote': {
        zh: '远程：{detail}',
        en: 'Remote: {detail}',
    },
    'common.continue': {
        zh: '继续？',
        en: 'Continue?',
    },
    'clients.confirmReset': {
        zh: '重置',
        en: 'Reset',
    },
    'clients.tokenReset': {
        zh: 'Token 已重置',
        en: 'Token reset',
    },
    'clients.fingerprintToast': {
        zh: '指纹 {fp}',
        en: 'Fingerprint {fp}',
    },
    'clients.resetFailed': {
        zh: '重置失败',
        en: 'Reset failed',
    },
    'clients.needAddress': {
        zh: '请先选择或填写地址',
        en: 'Choose or type an address first',
    },
    'clients.copiedWithToken': {
        zh: '已复制（含 Token）',
        en: 'Copied (with Token)',
    },
    'clients.remoteNote': {
        zh: '远程接入说明',
        en: 'Remote setup note',
    },
    'common.copyFailedManual': {
        zh: '复制失败,请手动选取',
        en: 'Could not copy. Select the text yourself.',
    },
    'rotate.willUpdateBearer': {
        zh: '将更新配置中的 Bearer（仅当 token 仍是本服务的）',
        en: 'Will update the Bearer in the config (only if the token is still this service’s)',
    },
    'rotate.wontEdit': {
        zh: '不会修改配置文件',
        en: 'Will not edit the config file',
    },
    'rotate.willUpdateCursor': {
        zh: '将更新 ~/.cursor/mcp.json 中的 Bearer（仅当 token 仍是本服务的）',
        en: 'Will update the Bearer in ~/.cursor/mcp.json (only if the token is still this service’s)',
    },
    'rotate.claudeFile': {
        zh: 'token 文件自动生效（需重启 Claude Desktop）；不改 claude_desktop_config.json',
        en: 'The token file takes effect on its own (restart Claude Desktop). claude_desktop_config.json is not edited.',
    },
    'common.remote': {
        zh: '远程',
        en: 'Remote',
    },
    'rotate.updateBearer': {
        zh: '需手动更新 Bearer',
        en: 'Update the Bearer yourself',
    },
    'rotate.inProgress': {
        zh: '重置进行中',
        en: 'A reset is already running',
    },
    'rotate.claudeAuto': {
        zh: '自动生效(需重启 Claude Desktop);未改 claude_desktop_config.json',
        en: 'Takes effect on its own (restart Claude Desktop). claude_desktop_config.json was not edited.',
    },
    'rotate.notConnected': {
        zh: '未接入,不会修改配置文件',
        en: 'Not connected, so the config file was not edited',
    },
    'rotate.manualRemote': {
        zh: '需手动更新(远程客户端 / 隧道侧 Bearer)',
        en: 'Update it yourself (remote client / Bearer on the tunnel)',
    },
    'rotate.manual': {
        zh: '需手动更新',
        en: 'Update it yourself',
    },
    'install.noToken': {
        zh: '还没有 token —— 请先启动 Tabby 并启用本插件,再一键接入。',
        en: 'There is no token yet. Start Tabby with this plugin enabled, then connect.',
    },
    'install.readFailed': {
        zh: '读不了配置文件,已中止:{err}',
        en: 'Could not read the config file, aborted: {err}',
    },
    'install.codexDuplicate': {
        zh: '配置里有多个 [mcp_servers.{name}] 段,TOML 不允许重复定义,为避免越改越乱没有改动。请先手动清理。',
        en: 'There is more than one [mcp_servers.{name}] section. TOML cannot define it twice, so nothing was changed. Clean it up by hand first.',
    },
    'install.codexForeign': {
        zh: '配置里已经有一个 [mcp_servers.{name}] 段,但不是本插件写的,为避免覆盖你的配置没有改动。请手动处理后再试。',
        en: 'There is already a [mcp_servers.{name}] section, and this plugin did not write it. Nothing was changed. Fix it by hand and try again.',
    },
    'install.unrecognized': {
        zh: '无法完成操作。请重试，或反馈问题。',
        en: 'Could not finish. Try again, or report the issue.',
    },
    'install.noFile': {
        zh: '配置文件不存在,无需移除。',
        en: 'The config file does not exist. Nothing to remove.',
    },
    'install.notPresent': {
        zh: '配置里本来就没有本插件的条目。',
        en: 'This plugin was not in the config.',
    },
    'install.codexNotOurs': {
        zh: '[mcp_servers.{name}] 这一段不是本插件写的,没有删除。请手动处理。',
        en: 'The [mcp_servers.{name}] section was not written by this plugin, so it was not deleted. Handle it yourself.',
    },
    'install.stillThere': {
        zh: '无法完成操作。请重试，或反馈问题。',
        en: 'Could not finish. Try again, or report the issue.',
    },
    'install.codexWrote': {
        zh: '已写入 {path}(Streamable HTTP)。{backup}请确保本机已启动: node "{server}"。需要重开 Codex 会话才会生效。',
        en: 'Wrote {path} (Streamable HTTP). {backup}Make sure this is running locally: node "{server}". Reopen the Codex session for it to take effect.',
    },
    'install.codexRemoved': {
        zh: '已从 {path} 移除。{backup}需要重开 Codex 会话才会生效。',
        en: 'Removed from {path}. {backup}Reopen the Codex session for it to take effect.',
    },
    'install.backedUp': {
        zh: '原文件备份在 {path}。',
        en: 'The original file was backed up at {path}.',
    },
    'install.claudeWrote': {
        zh: '已写入 {path}。{backup}需要重启 Claude Desktop 才会生效。',
        en: 'Wrote {path}. {backup}Restart Claude Desktop for it to take effect.',
    },
    'install.claudeRemoved': {
        zh: '已从 {path} 移除。{backup}需要重启 Claude Desktop 才会生效。',
        en: 'Removed from {path}. {backup}Restart Claude Desktop for it to take effect.',
    },
    'install.badJson': {
        zh: '配置文件不是合法 JSON,已中止,没有改动任何内容:{err}',
        en: 'The config file is not valid JSON. Nothing was changed: {err}',
    },
    'install.notObject': {
        zh: '配置文件的顶层不是一个 JSON 对象',
        en: 'The top level of the config file is not a JSON object.',
    },
    'install.notObjectAbort': {
        zh: '配置文件的顶层不是一个 JSON 对象,已中止',
        en: 'The top level of the config file is not a JSON object. Aborted.',
    },
    'install.mcpNotObject': {
        zh: 'mcpServers 字段不是一个对象',
        en: 'The mcpServers field is not an object.',
    },
    'install.mcpNotObjectAbort': {
        zh: 'mcpServers 字段不是一个对象,已中止',
        en: 'The mcpServers field is not an object. Aborted.',
    },
    'install.mcpForeign': {
        zh: 'mcpServers 里已经有一个叫 "{name}" 的条目,但不是本插件写的,为避免覆盖你的配置没有改动。请手动处理后再试。',
        en: 'mcpServers already has an entry named "{name}", and this plugin did not write it. Nothing was changed. Fix it by hand and try again.',
    },
    'install.badJsonAbort': {
        zh: '配置文件不是合法 JSON,已中止:{err}',
        en: 'The config file is not valid JSON. Aborted: {err}',
    },
    'install.entryNotOurs': {
        zh: '"{name}" 这个条目不是本插件写的,没有删除。请手动处理。',
        en: 'The "{name}" entry was not written by this plugin, so it was not deleted. Handle it yourself.',
    },
    'install.writeFailed': {
        zh: '写入失败:{err}',
        en: 'Write failed: {err}',
    },
    'install.cursorWrote': {
        zh: '已写入 {path}(Streamable HTTP)。{backup}请保持 Tabby 打开。在 Cursor 的 MCP 设置里刷新该服务器,或重载窗口后生效。',
        en: 'Wrote {path} (Streamable HTTP). {backup}Keep Tabby open. Refresh the server in Cursor’s MCP settings, or reload the window.',
    },
    'install.cursorRemoved': {
        zh: '已从 {path} 移除。{backup}在 Cursor 的 MCP 设置里刷新,或重载窗口后生效。',
        en: 'Removed from {path}. {backup}Refresh it in Cursor’s MCP settings, or reload the window.',
    },
    'install.backupFailed': {
        zh: '备份失败,已中止:{err}',
        en: 'Backup failed, aborted: {err}',
    },
    'install.mkdirFailed': {
        zh: '无法创建配置目录:{err}',
        en: 'Could not create the config directory: {err}',
    },
    'install.backupHint': {
        zh: '(原文件已备份到 {path})',
        en: '(the original file was backed up at {path})',
    },
    'bearer.empty': {
        zh: '配置文件为空,无 tabby 段',
        en: 'The config file is empty and has no tabby section',
    },
    'bearer.noSection': {
        zh: '未接入：无 [mcp_servers.tabby] 段,不会修改',
        en: 'Not connected: there is no [mcp_servers.tabby] section, so nothing was changed',
    },
    'bearer.ambiguous': {
        zh: '配置里有多个 [mcp_servers.tabby] 段,已跳过',
        en: 'There is more than one [mcp_servers.tabby] section, so this was skipped',
    },
    'bearer.wrongUrl': {
        zh: '未接入：tabby 段未指向本服务 URL,不会修改',
        en: 'Not connected: the tabby section does not point at this service’s URL, so nothing was changed',
    },
    'bearer.noBearer': {
        zh: 'tabby 段无 Authorization Bearer,未改',
        en: 'The tabby section has no Authorization Bearer, so nothing was changed',
    },
    'bearer.foreign': {
        zh: '已跳过：配置中的 token 不是本服务的',
        en: 'Skipped: the token in the config is not this service’s',
    },
    'bearer.replaceFailed': {
        zh: 'tabby 段找到但未能替换 Bearer,未改',
        en: 'Found the tabby section but could not replace the Bearer, so nothing was changed',
    },
    'bearer.updatedN': {
        zh: '已更新 {n} 处 Authorization Bearer',
        en: 'Updated {n} Authorization Bearer value(s)',
    },
    'bearer.codexMissing': {
        zh: '未接入：Codex 配置文件不存在,不会修改',
        en: 'Not connected: the Codex config file does not exist, so nothing was changed',
    },
    'bearer.codexReadFailed': {
        zh: '读取 Codex 配置失败: {err}',
        en: 'Could not read the Codex config: {err}',
    },
    'bearer.codexWriteFailed': {
        zh: '写入 Codex 配置失败: {err}',
        en: 'Could not write the Codex config: {err}',
    },
    'bearer.badJson': {
        zh: '配置不是合法 JSON,未改:{err}',
        en: 'The config is not valid JSON, so nothing was changed: {err}',
    },
    'bearer.notChanged': {
        zh: '{err},未改',
        en: '{err}, nothing was changed',
    },
    'bearer.aborted': {
        zh: '{err},已中止',
        en: '{err}, aborted',
    },
    'bearer.noCursorEntry': {
        zh: '未接入：无 tabby 条目,不会修改',
        en: 'Not connected: there is no tabby entry, so nothing was changed',
    },
    'bearer.cursorWrongUrl': {
        zh: '未接入：tabby 条目未指向本服务 URL,不会修改',
        en: 'Not connected: the tabby entry does not point at this service’s URL, so nothing was changed',
    },
    'bearer.cursorNoBearer': {
        zh: 'tabby 条目无 Authorization Bearer,未改',
        en: 'The tabby entry has no Authorization Bearer, so nothing was changed',
    },
    'bearer.updated': {
        zh: '已更新 Authorization Bearer',
        en: 'Updated the Authorization Bearer',
    },
    'bearer.cursorMissing': {
        zh: '未接入：Cursor 配置文件不存在,不会修改',
        en: 'Not connected: the Cursor config file does not exist, so nothing was changed',
    },
    'bearer.cursorReadFailed': {
        zh: '读取 Cursor 配置失败: {err}',
        en: 'Could not read the Cursor config: {err}',
    },
    'bearer.cursorWriteFailed': {
        zh: '写入 Cursor 配置失败: {err}',
        en: 'Could not write the Cursor config: {err}',
    },
    'clients.remotePrompt.intro': {
        zh: '请把下面这个 MCP 服务器添加到你的 MCP 配置中（传输方式 Streamable HTTP），添加后重连并调用 list_tabs 验证。',
        en: 'Add the MCP server below to your MCP configuration (transport: Streamable HTTP). Then reconnect and call list_tabs to verify.',
    },
    'clients.remotePrompt.name': {
        zh: '名称: {name}',
        en: 'Name: {name}',
    },
    'clients.remotePrompt.jsonHeading': {
        zh: '—— mcpServers JSON ——',
        en: '—— mcpServers JSON ——',
    },
    'clients.remotePrompt.footer': {
        zh: '若你无法修改自身配置，请把对应片段和配置文件位置告诉用户。',
        en: 'If you cannot edit your own configuration, give the user this snippet and the config file location.',
    },
    'toast.info': {
        zh: '提示',
        en: 'Info',
    },
    'toast.success': {
        zh: '成功',
        en: 'Success',
    },
    'toast.warning': {
        zh: '注意',
        en: 'Warning',
    },
    'toast.danger': {
        zh: '错误',
        en: 'Error',
    },
    'settings.pluginTitle': {
        zh: 'MCP Server',
        en: 'MCP Server',
    },
    'settings.restarting': {
        zh: '重启中…',
        en: 'Restarting…',
    },
    'settings.restartTitle': {
        zh: '解除暂停，并重启管道和 HTTP',
        en: 'Clears pause and restarts pipe and HTTP',
    },
    'settings.restartedToast': {
        zh: 'MCP 服务已重启',
        en: 'MCP service restarted',
    },
    'settings.httpChipIdleTitle': {
        zh: 'HTTP 入口未在运行；地址暂不可用。点「重启」可一并拉起。',
        en: 'HTTP entry is not running; this address is not live. Use Restart to bring it up.',
    },
    'clients.httpHeading': {
        zh: 'Streamable HTTP',
        en: 'Streamable HTTP',
    },
    'clients.bindReadonly': {
        zh: '监听',
        en: 'Listening',
    },
    'clients.bindChangeInConfig': {
        zh: '在配置中更改',
        en: 'Change in Config',
    },
    'clients.bindPromptNote': {
        zh: '下方的「地址」只用于复制提示词，不会改变实际监听。',
        en: 'The Address control below is only for the copyable prompt; it does not change the actual listen address.',
    },
    'clients.bindSummaryLoopback': {
        zh: '仅本机 · 端口 {port}',
        en: 'This computer only · port {port}',
    },
    'clients.bindSummaryLan': {
        zh: '局域网 · 端口 {port}',
        en: 'Local network · port {port}',
    },
    'clients.cursor.removeBody': {
        zh: '会从 {path} 的 mcpServers 里删除 "{name}" 条目。\n原文件会先备份,其它 MCP server 不受影响。',
        en: 'This will delete the "{name}" entry from mcpServers in {path}.\nThe original file is backed up first. Other MCP servers are left alone.',
    },
    'clients.pillConflict': {
        zh: '名称冲突',
        en: 'Name conflict',
    },
    'audit.resultOk': {
        zh: '成功',
        en: 'OK',
    },
    'audit.resultDenied': {
        zh: '已拒绝',
        en: 'Denied',
    },
    'audit.resultError': {
        zh: '错误',
        en: 'Error',
    },
    'config.maxLinesInvalid': {
        zh: '读取行数需在 1–5000 之间，已纠正为 {n}。',
        en: 'Max lines must be between 1 and 5000; corrected to {n}.',
    },
    'whitelist.emptyTitle': {
        zh: '暂无规则',
        en: 'No rules yet',
    },
    'whitelist.emptyWarning': {
        zh: '添加规则前，每次写入都会先确认。',
        en: 'Until you add rules, every write will ask for confirmation first.',
    },
    'whitelist.invalidRegex': {
        zh: '第 {lines} 行的正则写法无效，保存后不会当作匹配规则。',
        en: 'Invalid regex on line(s) {lines}; those lines will not match.',
    },
    'whitelist.saved': {
        zh: '已保存',
        en: 'Saved',
    },
};
