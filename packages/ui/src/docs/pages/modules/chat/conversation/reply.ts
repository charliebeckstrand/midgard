import type { ChatTextPart, ChatToolPart, ChatTransport } from 'ui/chat'
import { dayNames as day } from '../../../../data/calendar.ts'
import type { LateDay } from './targets.tsx'

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

// The phrase that the citation covers is a text of its own, so a translation
// keeps the phrase whole, and the offsets come from the translated reply.
const phrase = { label: '**4** to **14**' }

const reply = {
	text: `Late stops rose from ${phrase.label} across the week. Most of the rise sits on the north routes.`,
}

const { text } = reply

// The late stops of each day. The citation sends them, so the chart that it
// opens draws the data behind the phrase.
const days: LateDay[] = [
	{ day: day.mon, north: 2, south: 2 },
	{ day: day.tue, north: 3, south: 3 },
	{ day: day.wed, north: 3, south: 2 },
	{ day: day.thu, north: 6, south: 3 },
	{ day: day.fri, north: 9, south: 3 },
	{ day: day.sat, north: 8, south: 3 },
	{ day: day.sun, north: 11, south: 3 },
]

// The citation comes with the first word. It draws when the text holds its quote.
const answer: ChatTextPart = {
	kind: 'text',
	id: 'answer',
	text,
	citations: [
		{
			id: 'trend',
			start: text.indexOf(phrase.label),
			end: text.indexOf(phrase.label) + phrase.label.length,
			quote: phrase.label,
			target: 'late-trend',
			selector: { days },
		},
	],
}

/** Waits `ms`. The send races each wait against its stop, so the wait needs no signal. */
function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * A transport that plays one scripted reply: a step that runs and then
 * finishes, and prose that arrives a word at a time, with a citation that
 * opens a chart. A real transport
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
}
