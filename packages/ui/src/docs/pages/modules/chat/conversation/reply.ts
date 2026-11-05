import type { ChatMessageData, ChatPart, ChatToolPart, ChatTransport } from 'ui/chat'

/** The steps of the scripted reply, as the transport sends them. */
const step: ChatToolPart = {
	kind: 'tool',
	id: 'step',
	label: 'Count late stops',
	status: 'running',
}

const counted: ChatToolPart = {
	...step,
	status: 'done',
	summary: 'Seven days, north and south routes',
}

const answer = {
	kind: 'text',
	id: 'answer',
	text: 'Late stops rose from **4** to **14** across the week. Most of the rise sits on the north routes.',
} as const

const trend: ChatPart = {
	kind: 'embed',
	id: 'trend',
	name: 'stops-trend',
	data: [4, 6, 5, 9, 12, 11, 14],
	height: 32,
}

/** Waits `ms`. The send races each wait against its stop, so the wait needs no signal. */
function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * A transport that plays one scripted reply: a step that runs and then
 * finishes, prose that arrives a word at a time, and a chart. A real transport
 * reads the reply from a stream, such as a `fetch` of the server.
 */
export const transport: ChatTransport = async function* () {
	yield [step]

	await wait(800)

	yield [counted]

	const words = answer.text.split(' ')

	for (let count = 1; count <= words.length; count++) {
		await wait(60)

		yield [{ ...answer, text: words.slice(0, count).join(' ') }]
	}

	await wait(300)

	yield [trend]
}

/** The text of a message, for its copy action. */
export function messageText(message: ChatMessageData): string {
	if (typeof message.content === 'string') return message.content

	return message.content.flatMap((part) => (part.kind === 'text' ? [part.text] : [])).join('\n\n')
}
