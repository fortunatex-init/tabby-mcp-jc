import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { MESSAGES } from '../src/i18n/messages.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = path.join(root, 'src')

function walk (dir) {
    const out = []
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.name === 'node_modules' || ent.name === 'dist') continue
        const p = path.join(dir, ent.name)
        if (ent.isDirectory()) out.push(...walk(p))
        else if (/\.(ts|html)$/.test(ent.name)) out.push(p)
    }
    return out
}

function collectUsedKeys (files) {
    const keys = new Set()
    const patterns = [
        /(?<![.\w])t\(\s*'([^']+)'/g,
        /(?<![.\w])t\(\s*"([^"]+)"/g,
        /mcpT\(\s*'([^']+)'/g,
        /mcpT\(\s*"([^"]+)"/g,
        /'([^']+)'\s*\|\s*mcpT/g,
        /"([^"]+)"\s*\|\s*mcpT/g,
    ]
    const skip = new Set([
        path.join(srcRoot, 'i18n', 'messages.ts'),
        path.join(srcRoot, 'i18n', 't.ts'),
        path.join(srcRoot, 'i18n', 'mcp-t.pipe.ts'),
    ])
    for (const file of files) {
        if (skip.has(file)) continue
        const text = fs.readFileSync(file, 'utf8')
        for (const re of patterns) {
            re.lastIndex = 0
            let m
            while ((m = re.exec(text))) {
                const id = m[1]
                if (!/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+)+$/.test(id)) continue
                keys.add(id)
            }
        }
    }
    return keys
}

test('every t()/mcpT() key used in src has zh+en in MESSAGES', () => {
    const files = walk(srcRoot)
    const used = collectUsedKeys(files)
    assert.ok(used.size > 50, `expected many keys, got ${used.size}`)

    const missing = []
    const empty = []
    for (const id of [...used].sort()) {
        const entry = MESSAGES[id]
        if (!entry) {
            missing.push(id)
            continue
        }
        if (!entry.zh || !String(entry.zh).trim()) empty.push(`${id}.zh`)
        if (!entry.en || !String(entry.en).trim()) empty.push(`${id}.en`)
    }

    assert.deepEqual(
        missing,
        [],
        `missing MESSAGES entries for: ${missing.join(', ')}`,
    )
    assert.deepEqual(
        empty,
        [],
        `empty zh/en for: ${empty.join(', ')}`,
    )
})

test('v4 status/network keys resolve in zh and en', () => {
    const expect = {
        'settings.lanePipe': { zh: '本地管道', en: 'Local pipe' },
        'settings.laneHttp': { zh: 'HTTP 入口', en: 'HTTP endpoint' },
        'settings.lanChip': { zh: '局域网可访问', en: 'LAN accessible' },
        'settings.pauseBadge': { zh: '已暂停', en: 'Paused' },
        'settings.resumeService': { zh: '恢复服务', en: 'Resume service' },
        'settings.restart': { zh: '重启', en: 'Restart' },
        'settings.restartTitle': {
            zh: '解除暂停，并重启管道和 HTTP',
            en: 'Clears pause and restarts pipe and HTTP',
        },
        'config.networkBadge': { zh: 'HTTP 监听策略', en: 'HTTP listen policy' },
    }
    for (const [id, want] of Object.entries(expect)) {
        assert.equal(MESSAGES[id]?.zh, want.zh, id + '.zh')
        assert.equal(MESSAGES[id]?.en, want.en, id + '.en')
    }
    assert.match(MESSAGES['settings.pauseBarBody'].zh, /503/)
    assert.match(MESSAGES['settings.pauseBarBody'].zh, /重启/)
    assert.match(MESSAGES['settings.pauseBarBody'].en, /503/i)
    assert.match(MESSAGES['settings.pauseBarBody'].en, /restart/i)
})
