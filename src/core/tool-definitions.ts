export interface McpToolDefinition {
    name: string;
    description: string;
    inputSchema: any;
}

export const TOOL_DEFINITIONS: McpToolDefinition[] = [
    {
        name: 'list_tabs',
        description:
            '列出 Tabby 里所有终端标签页,含本地终端和 SSH 会话。返回的 id 用于 read_terminal、write_terminal、await_enter。',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
        name: 'read_terminal',
        description:
            '读取某个标签页的终端内容(纯文本,不含 ANSI 转义)。若该标签刚被 write_terminal 写过,从写入时的缓冲行读到现在;否则(或锚点失效)读末尾 N 行(N 默认取设置「单次读取行数」,也可由 lines 再收窄);超过 N 只留最后 N 行。含回滚历史。' +
            ' 可选 cursor:传入上次返回的 cursor 做增量读,只返回该位置之后新增的内容(仍受 N 硬上限);每次调用都会返回新的 cursor。' +
            ' 若 scrollback 被裁掉或 cursor 无效,返回 cursor_invalid: true 及 reason,并回退到默认行为(锚点或末尾 N 行)。' +
            ' 如果 alt_screen 为 true,说明当前是 vim/top 这类全屏程序的画面,不是命令历史。' +
            ' 注意:用户可以在设置里关闭终端读取(默认就是关的),那样这个工具会返回' +
            ' read_disabled —— 那是用户的选择,不是故障,别重试,按提示请用户把内容贴给你。' +
            ' 若要等用户按回车后再读结果,请用 await_enter(可选 include_output),不要在本工具里挂起。',
        inputSchema: {
            type: 'object',
            properties: {
                tab_id: { type: 'string', description: 'list_tabs 返回的标签页 id' },
                lines: {
                    type: 'number',
                    description: '最多返回多少行(不超过设置上限),默认取设置「单次读取行数」',
                },
                include_scrollback: {
                    type: 'boolean',
                    description: 'true(默认)读回滚历史;false 只读当前可视区域',
                },
                cursor: {
                    type: 'string',
                    description:
                        '上次 read_terminal 返回的 cursor;传入后只读该位置之后的新增内容。无效时返回 cursor_invalid 并回退默认行为',
                },
            },
            required: ['tab_id'],
            additionalProperties: false,
        },
    },
    {
        name: 'write_terminal',
        description:
            '把一段文本输入到终端标签页里。**不会按回车,命令不会执行** —— 文本写入后光标停在行尾,' +
            '必须由用户自己按回车。所有换行符会被强制剥离。' +
            ' 调用成功后应当告诉用户:命令已经打好了,去 Tabby 里按回车执行。' +
            ' 需要等用户按回车并拿结果时,在同一轮里立刻调用 await_enter。' +
            ' 白名单外的命令会先弹确认框:用户点拒绝则不写入,返回 user_declined;' +
            '倒计时只在确认框所在的 Tabby 窗口处于前台时累计,约 30 秒没人点就自动拒绝并返回 confirm_timeout(不是批准;窗口在后台时停表)。' +
            '调用方断开时确认框会关掉。超时后先告诉用户,问要不要重发,得到同意再调用,别自己马上重试;' +
            '用户拒绝时可能附带理由,message 里会原样给出,请按理由调整后再提,不要原样重试。' +
            ' 如果目标命令行上已经有没提交的内容(用户正打到一半、你上一次写入的命令用户还没执行、' +
            '或者用户正在用输入法打字),不会写入,返回 pending_input —— 这是在防止两段文本拼成一条错命令,' +
            '不是故障:别重试,照实告诉用户先按回车执行或清空这一行,等用户说好了再调用。',
        inputSchema: {
            type: 'object',
            properties: {
                tab_id: { type: 'string', description: 'list_tabs 返回的标签页 id' },
                text: { type: 'string', description: '要输入的命令文本(不要带换行)' },
                explanation: {
                    type: 'string',
                    description:
                        '用一句话说明为什么要输入这条命令、想达到什么目的(例如"查看 8080 端口被哪个进程占用")。' +
                        '会显示在确认框里给用户看,并记进审计日志。用用户的语言写,别复述命令本身。',
                },
            },
            required: ['tab_id', 'text', 'explanation'],
            additionalProperties: false,
        },
    },
    {
        name: 'await_enter',
        description:
            '挂起等待用户在指定标签页按下回车(插件永远不会代按),并在输出稳定后返回;单次最多约 30 秒。' +
            ' 典型用法:write_terminal 成功后立刻调用本工具,同一轮拿到 submitted / timed_out。' +
            ' submitted: true 表示已检测到回车;timed_out: true 表示约 30 秒内仍未按回车 —— 这不是错误,可再调一次继续等。' +
            ' 与白名单确认框无关:确认框超时是自动拒绝写入,本工具超时只是还没等到回车。' +
            ' 可选 include_output: true 时附带当前终端快照(需用户开启"允许读取终端内容")。' +
            ' 用户可在设置里关闭"允许等待响应"(默认关);关着时返回 wait_disabled,不会挂起。',
        inputSchema: {
            type: 'object',
            properties: {
                tab_id: { type: 'string', description: 'list_tabs 返回的标签页 id' },
                include_output: {
                    type: 'boolean',
                    description:
                        'true 则在 submitted 时附带 output 终端快照(与 read_terminal 同一套锚点/末尾 N 行逻辑)。' +
                        ' 读取关着时仍会报告 submitted,但带 read_disabled,不附内容。',
                },
            },
            required: ['tab_id'],
            additionalProperties: false,
        },
    },
];
