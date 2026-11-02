import {
    DEFAULT_HTTP_PORT,
    getLocalMcpUrl,
    readBearerToken,
    resolveHttpBindHost,
    writeHttpPort,
} from './core/http-endpoint';
import { clearPauseOnStartup } from './core/pause-flag';
import { logPipe } from './core/pipe-client';
import { createStreamableHttpServer, tryListen } from './core/streamable-http';

function log(msg: string): void {
    process.stderr.write(`tabby-mcp-jc http: ${msg}\n`);
}

async function main(): Promise<void> {
    clearPauseOnStartup();

    const preferred = Number(process.env.TABBY_MCP_HTTP_PORT) || DEFAULT_HTTP_PORT;
    const bindHost = resolveHttpBindHost(process.env.TABBY_MCP_HTTP_HOST);
    const server = createStreamableHttpServer(log);

    let port: number;
    try {
        port = await tryListen(server, preferred, bindHost, 20, log);
    } catch (e: any) {
        log(`无法监听端口: ${e?.message ?? e}`);
        process.exit(1);
        return;
    }

    try {
        writeHttpPort(port);
    } catch (e: any) {
        log(`写入端口文件失败: ${e?.message ?? e}`);
    }

    const url = getLocalMcpUrl(port);
    const token = readBearerToken();
    log(`listening on ${bindHost}:${port} (client URL ${url})`);
    if (bindHost === '0.0.0.0') {
        log(`已绑局域网 0.0.0.0:终端控制可从网段访问,务必依赖 Bearer;防火墙请仅放行可信来源。`);
    }
    if (!token) {
        log(`警告: token 文件不存在或为空 —— 所有请求会 401。请先启动 Tabby 并启用插件。`);
    } else {
        log(`Bearer token 已加载(${token.length} chars)`);
    }
    log(
        `本机客户端用 ${url};云端客户端需经 HTTPS 隧道(若 cloudflared 跑在本机,origin 可用 127.0.0.1 避免局域网暴露)。`,
    );
    process.stderr.write(`TABBY_MCP_URL=${url}\n`);
    process.stderr.write(`TABBY_MCP_BIND=${bindHost}:${port}\n`);
}

main().catch(e => {
    logPipe(`http-server 启动失败: ${e?.message ?? e}`);
    process.exit(1);
});
