export const VERSION = '0.1.1';

function sparkIcon(stroke: string): string {
    const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 2 20 20" fill="none"' +
        ` stroke="${stroke}" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">` +
        '<path d="M12 3 14.5 9.5 21 12 14.5 14.5 12 21 9.5 14.5 3 12 9.5 9.5Z"/>' +
        '</svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

export const SERVER_INFO = {
    name: 'tabby-mcp-jc',
    version: VERSION,
    icons: [
        { src: sparkIcon('#1f2328'), mimeType: 'image/svg+xml', sizes: ['any'], theme: 'light' },
        { src: sparkIcon('#e6edf3'), mimeType: 'image/svg+xml', sizes: ['any'], theme: 'dark' },
    ],
};

export const SERVER_INSTRUCTIONS = `
通过 Tabby 终端观察和输入命令。

关键语义:write_terminal **只是把文本打进终端,不会按回车**。命令不会执行,
光标停在行尾,必须由用户自己在 Tabby 里按回车。每次调用 write_terminal 成功后,
都要明确告诉用户"命令已经打好了,请按回车执行"。

典型流程:
1. list_tabs 找到目标标签页(本地终端和 SSH 会话都在列表里)
2. 先告诉用户"命令马上打好,请到 Tabby 按回车"
3. write_terminal 把命令打进去,用 explanation 一句话说明目的(用户审批时看得到)
4. 同一轮立刻调用 await_enter(tab_id) 等用户按回车;需要屏幕内容就带 include_output: true
5. 返回 timed_out: true / submitted: false 说明用户还没按:再调 await_enter 接着等,别重新 write_terminal

读取终端内容和等待响应(等用户按回车)是两个独立的开关,用户随时可以关,默认都是关的:
- 读取关着时 read_terminal / include_output 返回 read_disabled,你**看不到**执行结果 —— 别去猜输出,
  也别假装读到了,请用户把终端里的内容贴给你。
- 等待关着时 await_enter 返回 wait_disabled,不会挂起。
这两种都是用户的选择而不是故障,不要重试,照实告诉用户就行。

write_terminal 返回 pending_input 说明目标命令行上已经有没提交的内容(用户打到一半、
你上一次写入的命令还没执行、或者用户正在用输入法打字),插件没有写入,免得拼成一条错命令。
你没有办法替用户清空这一行:照实告诉用户先按回车执行或清空,等用户说好了再调用。
一次只写一条完整的命令,用户按回车之前不要再调 write_terminal。

await_enter 单次最多约 30 秒;超时会正常返回,带 timed_out: true / submitted: false 表示用户还没按回车。
这不是错误:可以告诉用户你还在等,然后再调一次接着等。
白名单外确认框的 30 秒倒计时只在该 Tabby 窗口处于前台时累计,窗口在后台时停表。超时自动拒绝写入(confirm_timeout),不是批准。调用方断开时确认框会关掉。

read_terminal / await_enter(include_output) 默认从最近一次 write_terminal 写入时的缓冲行读到现在;没有记过或行号对不上就退回末尾 N 行(N = 设置里的「单次读取行数」)。N 始终是硬上限。
read_terminal 可传上次返回的 cursor 做增量读(只拿新增内容);每次都会返回新的 cursor。scrollback 被裁或 cursor 无效时带 cursor_invalid 并回退默认行为。增量读请带 cursor,不要无 cursor 反复轮询整屏。

read_terminal 返回的 alt_screen 为 true 时,说明终端正在跑 vim/top 这类
全屏程序,看到的是它的画面而不是命令历史。

开着多个 Tabby 窗口时,所有窗口的标签页都会出现在 list_tabs 里,window 字段标明它在哪个窗口。
tab_id 原样使用 list_tabs 返回的值即可,不要自己拼。

工具调用返回 tabby_not_running 说明 Tabby 没开或者插件没启用 —— 请用户先打开 Tabby,
打开后直接重试即可,不用重启客户端。
`.trim();
