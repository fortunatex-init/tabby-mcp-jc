import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TOOL_DEFINITIONS } from '../src/core/tool-definitions.ts';

const byName = (name: string) => TOOL_DEFINITIONS.find(d => d.name === name);

test('恒定暴露四个工具,顺序固定', () => {
    assert.deepEqual(
        TOOL_DEFINITIONS.map(d => d.name),
        ['list_tabs', 'read_terminal', 'write_terminal', 'await_enter'],
    );
});

test('read_terminal 暴露可选 cursor', () => {
    const props = byName('read_terminal').inputSchema.properties;
    assert.equal(props.cursor?.type, 'string');
    assert.ok(byName('read_terminal').description.includes('cursor'));
    assert.ok(byName('read_terminal').description.includes('cursor_invalid'));
});

test('read_terminal 不再暴露 wait_for_enter', () => {
    const props = byName('read_terminal').inputSchema.properties;
    assert.equal(props.wait_for_enter, undefined);
});

test('write_terminal 不再暴露 wait_for_result', () => {
    const props = byName('write_terminal').inputSchema.properties;
    assert.equal(props.wait_for_result, undefined);
});

test('await_enter 有 tab_id 必填和可选 include_output', () => {
    const schema = byName('await_enter').inputSchema;
    assert.equal(schema.properties.tab_id?.type, 'string');
    assert.equal(schema.properties.include_output?.type, 'boolean');
    assert.ok(schema.required.includes('tab_id'));
    assert.ok(!schema.required.includes('include_output'));
    assert.ok(schema.properties.include_output.description.includes('read_disabled'));
    assert.ok(byName('await_enter').description.includes('wait_disabled'));
    assert.ok(byName('await_enter').description.includes('submitted'));
});

test('read_terminal 的描述里写明了可能被关闭', () => {
    const d = byName('read_terminal').description;
    assert.ok(d.includes('read_disabled'), '没告诉模型被拒时的错误码');
    assert.ok(d.includes('关闭'), '没说明这个能力可能是关着的');
});

test('read_terminal 描述指向 await_enter', () => {
    assert.ok(byName('read_terminal').description.includes('await_enter'));
});

test('write_terminal 的描述里写明了 pending_input', () => {
    const d = byName('write_terminal').description;
    assert.ok(d.includes('pending_input'), '没告诉模型被拒时的错误码');
    assert.ok(d.includes('别重试'), '没告诉模型不要重试');
});

test('write_terminal 描述指向 await_enter', () => {
    assert.ok(byName('write_terminal').description.includes('await_enter'));
});

test('write_terminal 的 explanation 是必填的 string 参数', () => {
    const schema = byName('write_terminal').inputSchema;
    assert.equal(schema.properties.explanation?.type, 'string');
    assert.ok(schema.required.includes('explanation'));
});

test('所有工具的 additionalProperties 都是 false', () => {
    for (const d of TOOL_DEFINITIONS) {
        assert.equal(d.inputSchema.additionalProperties, false, `${d.name}`);
        assert.equal(d.inputSchema.type, 'object', `${d.name}`);
    }
});

test('每个工具都有非空 description,required 里的字段必须已声明', () => {
    for (const d of TOOL_DEFINITIONS) {
        assert.ok(d.description?.length > 0, `${d.name} missing description`);
        for (const key of d.inputSchema.required ?? []) {
            assert.ok(d.inputSchema.properties[key], `${d.name} required refs undeclared ${key}`);
        }
    }
});

test('每个参数都有描述 —— 模型只能靠这个判断怎么传', () => {
    for (const d of TOOL_DEFINITIONS) {
        for (const [key, schema] of Object.entries(d.inputSchema.properties)) {
            assert.ok(schema.description?.length > 0, `${d.name}.${key} missing description`);
        }
    }
});
test('read_terminal 描述写明写入锚点 / 末尾 N 行兜底', () => {
    const d = byName('read_terminal').description;
    assert.ok(d.includes('write_terminal'), '应提到 write_terminal 锚点');
    assert.ok(d.includes('末尾'), '应提到末尾 N 行兜底');
});

test('await_enter include_output 描述与 read_terminal 同源逻辑', () => {
    const d = byName('await_enter').inputSchema.properties.include_output.description;
    assert.ok(d.includes('read_terminal') || d.includes('锚点'));
});
