// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	type ChatAgUiEvent,
	type ChatAgUiOptions,
	fromAgUiEvents,
	toAgUiToolMessage,
} from '../../modules/chat/engine/chat-ag-ui'
import type { ChatActionPart } from '../../modules/chat/engine/chat-content/types'
import type { ChatMessageData, ChatReplyChunk } from '../../modules/chat/engine/types'

const args = {
	prompt: 'Which carrier?',
	title: 'Carrier',
	success: 'Carrier picked',
	input: { kind: 'choice', name: 'carrier', options: [{ value: 'atlas', label: 'Atlas' }] },
}

const ask: ChatActionPart = {
	kind: 'action',
	id: 'c1',
	...args,
	input: { ...args.input, kind: 'choice' },
}

/** The chunks that the adapter yields for the events. */
async function play(
	events: ChatAgUiEvent[],
	options: ChatAgUiOptions = { tool: 'ask_reader' },
): Promise<ChatReplyChunk[]> {
	const chunks: ChatReplyChunk[] = []

	const source = (async function* () {
		yield* events
	})()

	for await (const chunk of fromAgUiEvents(source, options)) chunks.push(chunk)

	return chunks
}

/** The events of a call to `name` whose arguments arrive in two pieces. */
function toolCall(id: string, name: string, json: string): ChatAgUiEvent[] {
	const half = Math.floor(json.length / 2)

	return [
		{ type: 'TOOL_CALL_START', toolCallId: id, toolCallName: name },
		{ type: 'TOOL_CALL_ARGS', toolCallId: id, delta: json.slice(0, half) },
		{ type: 'TOOL_CALL_ARGS', toolCallId: id, delta: json.slice(half) },
		{ type: 'TOOL_CALL_END', toolCallId: id },
	]
}

describe('fromAgUiEvents', () => {
	it('yields the text of each assistant message so far, under the id of the message', async () => {
		const chunks = await play([
			{ type: 'RUN_STARTED', threadId: 't', runId: 'r' },
			{ type: 'TEXT_MESSAGE_START', messageId: 'm1', role: 'assistant' },
			{ type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: 'Two carriers' },
			{ type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: ' can take it.' },
			{ type: 'TEXT_MESSAGE_END', messageId: 'm1' },
			{ type: 'RUN_FINISHED', threadId: 't', runId: 'r' },
		])

		expect(chunks).toEqual([
			[{ kind: 'text', id: 'm1', text: 'Two carriers' }],
			[{ kind: 'text', id: 'm1', text: 'Two carriers can take it.' }],
		])
	})

	it('reads a text message with no role as the assistant, and skips each other role', async () => {
		const chunks = await play([
			{ type: 'TEXT_MESSAGE_START', messageId: 'm1' },
			{ type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: 'Hi.' },
			{ type: 'TEXT_MESSAGE_START', messageId: 'm2', role: 'developer' },
			{ type: 'TEXT_MESSAGE_CONTENT', messageId: 'm2', delta: 'Hidden.' },
			{ type: 'TEXT_MESSAGE_CONTENT', messageId: 'm3', delta: 'Not started.' },
		])

		expect(chunks).toEqual([[{ kind: 'text', id: 'm1', text: 'Hi.' }]])
	})

	it('yields an action at the end of a call to the tool, and not before', async () => {
		const events = toolCall('c1', 'ask_reader', JSON.stringify(args))

		const chunks = await play(events)

		expect(chunks).toEqual([[ask]])

		expect(await play(events.slice(0, -1))).toEqual([])
	})

	it('skips a call to another tool', async () => {
		expect(await play(toolCall('c1', 'search', JSON.stringify(args)))).toEqual([])
	})

	it('fails the reply when the arguments are not an action', async () => {
		await expect(play(toolCall('c1', 'ask_reader', '{"prompt":"Which?"}'))).rejects.toThrow(
			/tool call "c1"/,
		)
	})

	it('fails the reply with the message of a run error', async () => {
		await expect(
			play([
				{ type: 'TEXT_MESSAGE_START', messageId: 'm1' },
				{ type: 'RUN_ERROR', message: 'Rate limited' },
			]),
		).rejects.toThrow('Rate limited')
	})

	describe('MESSAGES_SNAPSHOT', () => {
		const messages: ChatMessageData[] = [
			{ id: 'u1', sender: 'user', content: [{ kind: 'text', id: 'q1', text: 'Who?' }] },
			{
				id: 'r1',
				sender: 'assistant',
				content: [{ kind: 'text', id: 'm0', text: 'Two carriers can take it.' }, ask],
			},
			{ id: 'r2', sender: 'assistant', content: 'A string has no id.' },
		]

		it('revises the earlier reply that holds the text part', async () => {
			const chunks = await play(
				[
					{
						type: 'MESSAGES_SNAPSHOT',
						messages: [
							{ id: 'q1', role: 'user', content: 'Changed by the agent.' },
							{ id: 'm0', role: 'assistant', content: 'Atlas takes it.' },
							{ id: 'tool-1', role: 'tool', toolCallId: 'c1', content: '{}' },
						],
					},
				],
				{ tool: 'ask_reader', messages },
			)

			expect(chunks).toEqual([
				{ revise: 'r1', parts: [{ kind: 'text', id: 'm0', text: 'Atlas takes it.' }] },
			])
		})

		it('changes the text of this run in the reply', async () => {
			const chunks = await play(
				[
					{ type: 'TEXT_MESSAGE_START', messageId: 'm1' },
					{ type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: 'Draft.' },
					{
						type: 'MESSAGES_SNAPSHOT',
						messages: [{ id: 'm1', role: 'assistant', content: 'Final.' }],
					},
				],
				{ tool: 'ask_reader', messages },
			)

			expect(chunks.at(-1)).toEqual([{ kind: 'text', id: 'm1', text: 'Final.' }])
		})

		it('yields nothing for a message whose text is the same, or that the chat does not show', async () => {
			const chunks = await play(
				[
					{
						type: 'MESSAGES_SNAPSHOT',
						messages: [
							{ id: 'm0', role: 'assistant', content: 'Two carriers can take it.' },
							{ id: 'text', role: 'assistant', content: 'A string has no id.!' },
							{ id: 'm9', role: 'assistant', content: 'Never shown.' },
						],
					},
				],
				{ tool: 'ask_reader', messages },
			)

			expect(chunks).toEqual([])
		})
	})
})

describe('toAgUiToolMessage', () => {
	it('answers the tool call of the action with its result as JSON', () => {
		expect(toAgUiToolMessage({ ...ask, result: { carrier: 'atlas' } }, 'tool-1')).toEqual({
			id: 'tool-1',
			role: 'tool',
			toolCallId: 'c1',
			content: '{"carrier":"atlas"}',
		})
	})
})
