import { Button } from 'ui/button'
import { BarChart } from 'ui/chart'
import {
	type ChatCitation,
	ChatPrompt,
	ChatTranscript,
	type ChatTransport,
	useChatDraft,
	useChatSend,
} from 'ui/chat'
import { Stack } from 'ui/stack'
import { dayNames as day } from '../../../../data/calendar.ts'

const DAYS = [
	{ day: day.mon, late: 1 },
	{ day: day.tue, late: 7 },
	{ day: day.wed, late: 2 },
	{ day: day.thu, late: 1 },
	{ day: day.fri, late: 1 },
]

const dataset = { label: 'Late stops by day' }

const question = { text: 'Which day is the worst?' }

/** Waits `ms`. The send races each wait against its stop, so the wait needs no signal. */
function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * A transport that reads the scope of the question from the parts of the
 * message. A real transport sends the `selector` of each citation to the
 * server, and the server authorizes it before it reads the dataset.
 */
const transport: ChatTransport = async function* (_content, _signal, message) {
	const scope = message.parts.flatMap((part) =>
		part.kind === 'text' ? (part.citations ?? []) : [],
	)

	await wait(400)

	const [first] = scope

	if (first === undefined) {
		yield 'Which data do you mean? Ask about the chart to scope the question.'

		return
	}

	// The reply cites the scope that it read, so the reader sees which data it used.
	const lead = 'Scoped to '

	const text = `${lead}${first.quote}: Tuesday is the worst, with seven late stops.`

	const cited: ChatCitation = {
		...first,
		id: `${first.id}-reply`,
		start: lead.length,
		end: lead.length + first.quote.length,
	}

	yield [{ kind: 'text', id: 'text', text, citations: [cited] }]
}

export default function AskAboutAChart() {
	const chat = useChatSend({ transport })

	const draft = useChatDraft({ onSubmit: chat.send })

	// The app builds the citation, so the reader cannot type one. A typed `@` is prose.
	const ask = () => {
		const quote = `@${dataset.label}`

		const scope: ChatCitation = {
			id: crypto.randomUUID(),
			start: 0,
			end: quote.length,
			quote,
			target: 'dataset',
			selector: { dataset: 'late-stops-by-day' },
		}

		draft.setValue(`${quote} ${question.text}`, [scope])
	}

	return (
		<Stack gap="lg">
			<Stack gap="sm">
				<BarChart
					aria-label={dataset.label}
					data={DAYS}
					series={[{ xKey: 'day', yKey: 'late', yName: 'Late stops' }]}
				/>
				<Button variant="outline" className="self-start" onClick={ask}>
					Ask about this chart
				</Button>
			</Stack>
			<ChatTranscript messages={chat.messages} streaming={chat.streaming} />
			<ChatPrompt
				value={draft.value}
				citations={draft.citations}
				onValueChange={draft.setValue}
				onSubmit={draft.submit}
				onStop={chat.stop}
				streaming={chat.streaming}
			/>
		</Stack>
	)
}
