import { useMemo } from 'react'
import {
	type ChatCitation,
	ChatPrompt,
	type ChatPromptSource,
	ChatTranscript,
	type ChatTransport,
	useChatDraft,
	useChatSend,
} from 'ui/chat'
import { Stack } from 'ui/stack'

const DATASETS = [
	{ key: 'late', label: 'Late stops', description: 'Stops that missed their window' },
	{ key: 'routes', label: 'Routes', description: 'Planned and driven routes' },
	{ key: 'depots', label: 'Depots', description: 'Depots and their docks' },
	{ key: 'drivers', label: 'Drivers', description: 'Drivers and their shifts' },
]

const COMMANDS = [
	{ key: 'summarize', label: 'summarize', description: 'Summarize a dataset' },
	{ key: 'clear', label: 'clear', description: 'Clear the conversation' },
]

/** Waits `ms`, or rejects when `signal` aborts. */
function wait(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, ms)

		signal.addEventListener('abort', () => {
			clearTimeout(timer)

			reject(signal.reason)
		})
	})
}

const matches = (label: string, query: string) => label.toLowerCase().includes(query.toLowerCase())

const sources: ChatPromptSource[] = [
	{
		trigger: '@',
		target: 'dataset',
		label: 'Datasets',
		// A server search: the picker aborts the signal when the query changes.
		search: async (query, signal) => {
			await wait(250, signal)

			return DATASETS.filter((d) => matches(d.label, query)).map((d) => ({
				...d,
				selector: { dataset: d.key },
			}))
		},
	},
	{
		trigger: '/',
		target: 'command',
		label: 'Commands',
		at: 'start',
		// A list in memory: the picker shows it at once.
		search: (query) =>
			COMMANDS.filter((c) => matches(c.label, query)).map((c) => ({ ...c, selector: c.key })),
	},
]

/** The citations of a message that the transport gets, as `target: quote` pairs. */
function readScope(parts: Parameters<ChatTransport>[2]['parts']): string {
	return parts
		.flatMap((part) => (part.kind === 'text' ? (part.citations ?? []) : []))
		.map((citation) => `${citation.target} ${citation.quote}`)
		.join(', ')
}

const transport: ChatTransport = async function* (_content, signal, message) {
	await wait(300, signal)

	const scope = readScope(message.parts)

	yield scope ? `I got ${scope}.` : 'I got no scope. Type @ to choose a dataset.'
}

export default function MentionsAndCommands() {
	const chat = useChatSend({ transport })

	const { setMessages } = chat

	const onSubmit = useMemo(
		() => (value: string, citations: readonly ChatCitation[]) => {
			// The chat runs no command. The app reads a command at offset 0 and decides.
			const command = citations.find((c) => c.target === 'command' && c.start === 0)

			if (command?.selector === 'clear') {
				setMessages([])

				return
			}

			void chat.send(value, citations)
		},
		[chat.send, setMessages],
	)

	const draft = useChatDraft({ onSubmit })

	return (
		<Stack gap="md" className="h-96 justify-end">
			<ChatTranscript messages={chat.messages} streaming={chat.streaming} />
			<ChatPrompt
				value={draft.value}
				citations={draft.citations}
				onValueChange={draft.setValue}
				sources={sources}
				onSubmit={draft.submit}
				onStop={chat.stop}
				streaming={chat.streaming}
				placeholder="Type @ for a dataset, or / for a command"
			/>
		</Stack>
	)
}
