# tabby-mcp-jc

[![Tabby](https://img.shields.io/badge/Tabby-plugin-4a90d9)](https://tabby.sh/)
![version](https://img.shields.io/badge/version-0.1.1-blue)
![MCP](https://img.shields.io/badge/MCP-stdio%20%2B%20Streamable%20HTTP-8a63d2)
![license](https://img.shields.io/badge/license-CC%20BY--NC%204.0-green)

[English](README.md) | [简体中文](README.zh-CN.md)

给 Tabby 装上 MCP 小助手 — 模型可以列标签、读屏、把命令打进终端——**但回车这事，它死都不替你按。** 你说了算。

## 四个工具

| 工具               | 干嘛的                                                                |
|------------------|--------------------------------------------------------------------|
| `list_tabs`      | 找本地 / SSH 标签                                                       |
| `read_terminal`  | 读屏（纯文本）；可选增量 `cursor`（下次原样传回）；有过 `write_terminal` 就从写入行起读，否则末尾 N 行 |
| `write_terminal` | 只写入，**不加换行**                                                       |
| `await_enter`    | 挂起等你按回车（单次约 30s）；返回 `submitted` / `timed_out`；可带 `include_output`  |

固定套路：`write_terminal` → 喊你去 Tabby 按回车 → 同轮 `await_enter` 接着等。超时不是报错，是它还在等你。

## 两条通道

| 客户端                | 怎么接                                                                                                      |
|--------------------|----------------------------------------------------------------------------------------------------------|
| **Claude Desktop** | **stdio**（`node` + `dist/shim.js`，token 读文件，重置 Token 后需重启 Claude）                                        |
| **Codex**          | **Streamable HTTP**（`url` + `Authorization: Bearer …`；重置 Token 时仅改写已接入本服务的 TOML Bearer）                  |
| **Cursor**         | **Streamable HTTP**（用户级 `~/.cursor/mcp.json` 的 `url` + `Authorization: Bearer …`；重置 Token 时仅改写已接入本服务的条目） |
| 云端 / 远程            | 同一 HTTP；外面再套一层 HTTPS 隧道                                                                                  |

管道与 HTTP 入口**始终启用**（无总闸）。**Streamable HTTP 在 Tabby 进程内直接监听**（Node 内置 `http`，不另起 `node.exe`；默认绑 `127.0.0.1`，客户端接入页可改局域网 `0.0.0.0`）。默认大概 `http://127.0.0.1:18765/mcp`。Claude Desktop 的 **stdio shim 仍需本机 Node**（`node` + `dist/shim.js`）。

设置 → **客户端接入** → Streamable HTTP：

1. **一键复制接入提示词**（地址 / `Authorization: Bearer` / 请求方式 Streamable HTTP；复制前可选含不含 token）
2. **如何配置公网**（默认折叠：监听地址、公网 URL、Cloudflare / Tailscale 示例）

工具栏按钮单击打开本插件设置页；子菜单可「全部断开并暂停 / 恢复服务」（仅本会话；重启 Tabby 自动恢复）。默认快捷键：`Ctrl-Shift-M` 切换暂停。设置页「最近调用」可查看审计日志。

```bash
cloudflared tunnel --url http://127.0.0.1:18765
```

## 安装

1. 安装 [Tabby](https://tabby.sh/)。**Codex / Cursor / HTTP 接入不需要 Node**。Claude Desktop 的 stdio shim 与本地 `pnpm build` 仍需 Node ≥ 20。
2. 打开 Tabby → **设置 → 插件**，搜索 `tabby-mcp-jc` 并安装（发布后可从插件管理器安装）。开发时：`pnpm build` 后用环境变量 `TABBY_PLUGINS` 指向本仓库目录启动 Tabby。
3. 设置 → **客户端**：一键接入 Claude（stdio）、Codex（HTTP）或 Cursor（HTTP，写入用户级 `~/.cursor/mcp.json`）。
4. 要读屏或使用 `await_enter`，在 **配置** 中打开「读取终端」「等待回车后再继续」。

「最近调用日志」多了 **调用方** 一列（Codex / Claude / Cursor / …）。

## 安全

- 永不代按回车；`write_terminal` 会剥掉换行
- 行上已有未提交输入 → `pending_input`，不硬写
- 白名单外弹确认：倒计时只在这个 Tabby 窗口处于前台时累计 **30 秒**，超时**自动拒绝**（不会偷偷写入）。调用方断开时确认框会关掉
- `await_enter` 单次约 30s；跟确认框是两回事
- 读屏 / 等待默认关着
- HTTP：Origin 校验（无 Origin / loopback / 与 Host 同站）、Bearer 始终必需、绑定可配；设置页可一键重置 Token（旧 token 立刻失效；仅改写已接入本服务且 Bearer 仍为本服务 token 的客户端配置）

## 开发

```bash
pnpm install && pnpm test && pnpm build
```

[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.zh)

### 界面颜色

`src/styles/tabby-theme-vars.css` 只给编辑器占位，不参与打包。运行时由 Tabby/Bootstrap 提供 `--bs-*`。组件样式请用 `var(--bs-primary)`、`var(--bs-body-color)` 等，不要写死十六进制色值。

