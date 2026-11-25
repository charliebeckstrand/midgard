/**
 * The adapters between a chat and an agent that speaks AG-UI: the events of a
 * run become the chunks of a reply, and the answer to an action becomes the
 * tool message of the next run.
 *
 * The types are structural, so the module takes no dependency on
 * `@ag-ui/core`. An event and a message of that package fit them.
 */

import { isRecord } from '../../../utilities/is-record'
import { parseChatAction } from './chat-action-parameters'
import type { ChatActionPart, ChatActionResult, ChatTextPart } from './chat-content/types'
import type { ChatMessageData, ChatReplyChunk } from './types'

/**
 * One event of an AG-UI run. `type` names the event, and the other keys are
 * its payload. The adapter checks each key that it reads, because the event
 * comes from the wire.
 */
export type ChatAgUiEvent = { readonly type: string; readonly [key: string]: unknown }

/**
 * The tool message that answers a tool call in the `messages` of the next
 * `RunAgentInput`.
 */
export type ChatAgUiToolMessage = {
	id: string
	role: 'tool'
	/** The id of the tool call that the message answers. */
	toolCallId: string
	/** The result, as JSON text. */
	content: string
}

/** Options for {@link fromAgUiEvents}. */
export type ChatAgUiOptions = {
	/**
	 * The name of the tool whose calls ask the reader. The agent declares the
	 * tool with `chatActionParameters` as its parameters. A call to each
	 * other tool shows nothing.
	 */
	tool: string
	/**
	 * The shown path of the transcript before the run, as `messages` of
	 * `useChatSend` gives it. A `MESSAGES_SNAPSHOT` can then revise an earlier
	 * reply.
	 */
	messages?: readonly ChatMessageData[]
}

/** Where a text part of an earlier reply is: the id of its message, and its text. @internal */
type Owner = { messageId: string; text: string }

/**
 * The text parts of the assistant messages on the shown path, by part id. A
 * message whose content is a string holds no id that an agent can name.
 *
 * @internal
 */
function getOwners(messages: readonly ChatMessageData[]): Map<string, Owner> {
	const owners = new Map<string, Owner>()

	for (const message of messages) {
		if (message.sender !== 'assistant' || message.id === undefined) continue

		if (typeof message.content === 'string') continue

		for (const part of message.content) {
			if (part.kind === 'text') owners.set(part.id, { messageId: message.id, text: part.text })
		}
	}

	return owners
}

/** A text part with no citations, as an agent sends it. @internal */
function toTextPart(id: string, text: string): ChatTextPart {
	return { kind: 'text', id, text }
}

/**
 * What a run holds while its events come in.
 *
 * @internal
 */
type Run = {
	/** The name of the tool whose calls ask the reader. */
	tool: string
	/** The text of each assistant message of this run so far, by its id. */
	texts: Map<string, string>
	/** The arguments so far of each open call to the tool, by the id of the call. */
	calls: Map<string, string>
	/** The text parts of the earlier replies, by part id. */
	owners: Map<string, Owner>
}

/** Reads one event of a run, and gives the chunks of the reply that it makes. @internal */
type Reader = (run: Run, event: ChatAgUiEvent) => ChatReplyChunk[]

/** A text message of the assistant opens. A message with no role is of the assistant. @internal */
const startText: Reader = (run, { messageId, role }) => {
	if (typeof messageId === 'string' && (role ?? 'assistant') === 'assistant') {
		run.texts.set(messageId, '')
	}

	return []
}

/** Text joins an open message of the assistant, which yields its text so far. @internal */
const addText: Reader = (run, { messageId, delta }) => {
	if (typeof messageId !== 'string' || typeof delta !== 'string') return []

	const text = run.texts.get(messageId)

	if (text === undefined) return []

	run.texts.set(messageId, text + delta)

	return [[toTextPart(messageId, text + delta)]]
}

/** A call to the tool opens. A call to each other tool shows nothing. @internal */
const startCall: Reader = (run, { toolCallId, toolCallName }) => {
	if (typeof toolCallId === 'string' && toolCallName === run.tool) run.calls.set(toolCallId, '')

	return []
}

/** Arguments join an open call to the tool. @internal */
const addArgs: Reader = (run, { toolCallId, delta }) => {
	if (typeof toolCallId !== 'string' || typeof delta !== 'string') return []

	const args = run.calls.get(toolCallId)

	if (args !== undefined) run.calls.set(toolCallId, args + delta)

	return []
}

/** A call to the tool ends, and its complete arguments become an action. @internal */
const endCall: Reader = (run, { toolCallId }) => {
	if (typeof toolCallId !== 'string') return []

	const args = run.calls.get(toolCallId)

	if (args === undefined) return []

	run.calls.delete(toolCallId)

	const part = parseChatAction(toolCallId, args)

	if (!part) {
		throw new Error(
			`The arguments of tool call "${toolCallId}" are not in the shape of chatActionParameters.`,
		)
	}

	return [[part]]
}

/**
 * The chunk that one message of a `MESSAGES_SNAPSHOT` gives, when it is an
 * assistant message whose text changed. A part of this run changes in the
 * reply. A part of an earlier reply changes through a revision of that reply.
 *
 * @internal
 */
function snapshotChunk(run: Run, message: unknown): ChatReplyChunk | undefined {
	if (!isRecord(message) || message.role !== 'assistant') return undefined

	const { id, content } = message

	if (typeof id !== 'string' || typeof content !== 'string') return undefined

	const text = run.texts.get(id)

	if (text !== undefined) {
		if (text === content) return undefined

		run.texts.set(id, content)

		return [toTextPart(id, content)]
	}

	const owner = run.owners.get(id)

	if (!owner || owner.text === content) return undefined

	owner.text = content

	return { revise: owner.messageId, parts: [toTextPart(id, content)] }
}

/** A snapshot of the messages changes each text that it changes. @internal */
const readSnapshot: Reader = (run, { messages }) => {
	if (!Array.isArray(messages)) return []

	// A chunk can be a list of parts, so `flatMap` would take it apart.
	return messages
		.map((message) => snapshotChunk(run, message))
		.filter((chunk) => chunk !== undefined)
}

/** A run error fails the reply with its message. @internal */
const failRun: Reader = (_run, event) => {
	throw new Error(typeof event.message === 'string' ? event.message : 'The run failed.', {
		cause: event,
	})
}

/** The reader of each event that the adapter reads, by its type. @internal */
const READERS: ReadonlyMap<string, Reader> = new Map([
	['TEXT_MESSAGE_START', startText],
	['TEXT_MESSAGE_CONTENT', addText],
	['TOOL_CALL_START', startCall],
	['TOOL_CALL_ARGS', addArgs],
	['TOOL_CALL_END', endCall],
	['MESSAGES_SNAPSHOT', readSnapshot],
	['RUN_ERROR', failRun],
])

/**
 * The chunks of a reply from the events of an AG-UI run: give it to the
 * stream of a `ChatTransport`.
 *
 * @remarks
 * Each assistant text message of the run is a text part of the reply, under
 * the id of the message. Each `TEXT_MESSAGE_CONTENT` yields the text of its
 * message so far.
 *
 * A call to the tool of `options` is an action part, under the id of the tool
 * call. The arguments become the part at `TOOL_CALL_END`, and not before,
 * because the arguments are not complete until then. Arguments that are not
 * in the shape of `chatActionParameters` fail the reply. AG-UI gives no
 * `TOOL_CALL_RESULT` for a tool of the client. The reader answers the call, and
 * {@link toAgUiToolMessage} gives the answer to the next run.
 *
 * A `MESSAGES_SNAPSHOT` changes the text parts whose text it changes, and
 * nothing more. A text part of an earlier reply changes through a
 * `ChatRevision`, so that reply shows "(revised)". Give the shown path in
 * `options.messages` for this. A `RUN_ERROR` fails the reply with its message.
 * The adapter reads no other event.
 *
 * The adapter reads the events that the AG-UI client expands, and not the
 * `*_CHUNK` events that it expands from.
 *
 * @example
 *   const transport: ChatTransport = (content, signal, message) =>
 *     fromAgUiEvents(runAgent(content, message, signal), { tool: 'ask_reader', messages: shown.current })
 */
export async function* fromAgUiEvents(
	events: AsyncIterable<ChatAgUiEvent>,
	options: ChatAgUiOptions,
): AsyncGenerator<ChatReplyChunk> {
	const run: Run = {
		tool: options.tool,
		texts: new Map(),
		calls: new Map(),
		owners: getOwners(options.messages ?? []),
	}

	for await (const event of events) {
		yield* READERS.get(event.type)?.(run, event) ?? []
	}
}

/**
 * The tool message that gives the answer to an action to the next run of the
 * agent: add it to the `messages` of the `RunAgentInput`. The transport gets
 * the action in `message.action` of its third argument.
 *
 * @remarks
 * The id of the part is the id of the tool call, and the content is the
 * `result` as JSON. `id` names the new message, as the client names each
 * message that it adds.
 *
 * @example
 *   const tool = toAgUiToolMessage(message.action.part, crypto.randomUUID())
 */
export function toAgUiToolMessage(
	part: ChatActionPart & { result: ChatActionResult },
	id: string,
): ChatAgUiToolMessage {
	return { id, role: 'tool', toolCallId: part.id, content: JSON.stringify(part.result) }
}
