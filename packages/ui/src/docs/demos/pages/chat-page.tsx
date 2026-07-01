import { CircleDashed } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/button'
import { Heading } from '../../../components/heading'
import { Icon } from '../../../components/icon'
import {
	type ChatContent,
	ChatLayout,
	type ChatTransport,
	useChatSend,
} from '../../../modules/chat'
import { Example } from '../../engine'

const initialConversations = [
	{ id: '1', title: 'Project kickoff', preview: 'Let me help you plan...' },
	{ id: '2', title: 'Bug investigation', preview: 'I found the root cause...' },
	{ id: '3', title: 'Code review', preview: 'The implementation looks...' },
	{ id: '4', title: 'Architecture design', preview: 'Here are the trade-offs...' },
	{ id: '5', title: 'Deployment strategy', preview: 'For zero-downtime...' },
]

const kickoffMessages: ChatContent[] = [
	{ role: 'user', content: 'Can you help me plan the project kickoff meeting?' },
	{
		role: 'agent',
		content:
			"Of course! I'd be happy to help you plan the kickoff meeting. Let's start by identifying the key stakeholders and objectives. Who will be attending?",
	},
	{
		role: 'user',
		content:
			'The engineering team, product manager, and the design lead. We need to align on the Q2 roadmap.',
	},
	{
		role: 'agent',
		content:
			"Great team composition. Here's a suggested agenda:\n\n1. Welcome & introductions (5 min)\n2. Q2 objectives overview (15 min)\n3. Technical architecture review (20 min)\n4. Design system updates (15 min)\n5. Sprint planning & timeline (20 min)\n6. Q&A and next steps (10 min)\n\nShall I draft a more detailed outline for any of these sections?",
	},
	{ role: 'user', content: 'Yes, can you expand on the technical architecture section?' },
	{
		role: 'agent',
		content:
			'For the technical architecture section, I recommend covering:\n\n- Current system overview and pain points\n- Proposed microservices migration plan\n- API versioning strategy\n- Database scaling considerations\n- CI/CD pipeline improvements\n\nThis gives the team context on where we are and where we need to go.',
	},
]

// Each conversation opens on its own transcript, so selecting a row swaps the
// messages area.
const initialTranscripts: Record<string, ChatContent[]> = {
	'1': kickoffMessages,
	'2': [
		{ role: 'user', content: 'The checkout endpoint times out under load. Any ideas?' },
		{
			role: 'agent',
			content:
				'I found the root cause: the orders table is missing an index on `customer_id`, so the join falls back to a full scan. Adding it should bring latency back under budget.',
		},
	],
	'3': [
		{ role: 'user', content: 'Can you review the new pagination helper?' },
		{
			role: 'agent',
			content:
				'The implementation looks solid. One note: the cursor is decoded on every call — memoize it so repeated reads on the same page stay cheap.',
		},
	],
	'4': [
		{ role: 'user', content: 'Should we split the monolith into services now?' },
		{
			role: 'agent',
			content:
				"Here are the trade-offs. Extracting the billing boundary first buys the most isolation for the least churn; the rest can stay in place until there's a clear seam.",
		},
	],
	'5': [
		{ role: 'user', content: 'How do we ship this without downtime?' },
		{
			role: 'agent',
			content:
				'For zero-downtime, roll out behind a flag, migrate the schema in expand/contract phases, and drain the old pods only after the new ones pass health checks.',
		},
	],
}

// New conversations open on a single agent greeting (shown with the prompt docked).
const newChatGreeting = 'Hi! How can I help you today?'

// A mock transport that streams a canned reply word by word, emitting the
// cumulative text on each tick (the snapshot shape ChatTransport expects).
// Checks `signal` between words so the demo's stop control has something real
// to cancel.
const mockTransport: ChatTransport = (_content, signal) =>
	(async function* () {
		const reply =
			'Thanks for sharing that. Let me think about the best approach and get back to you with a detailed plan.'

		let snapshot = ''

		for (const word of reply.split(' ')) {
			if (signal.aborted) return

			snapshot = snapshot ? `${snapshot} ${word}` : word

			await new Promise((resolve) => setTimeout(resolve, 60))

			yield snapshot
		}
	})()

export function Demo() {
	const [conversations, setConversations] = useState(initialConversations)

	const [transcripts, setTranscripts] = useState(initialTranscripts)

	const [currentId, setCurrentId] = useState('1')

	const { messages, sending, send, stop, setMessages } = useChatSend({
		transport: mockTransport,
		initialMessages: initialTranscripts['1'],
	})

	const currentTitle = conversations.find((conversation) => conversation.id === currentId)?.title

	// Stash the live transcript under the outgoing id, then load the target's.
	function openConversation(id: string) {
		if (id === currentId) return

		setTranscripts((prev) => ({ ...prev, [currentId]: messages }))

		setMessages(transcripts[id] ?? [])

		setCurrentId(id)
	}

	function removeConversation(id: string) {
		const remaining = conversations.filter((conversation) => conversation.id !== id)

		setConversations(remaining)

		setTranscripts(({ [id]: _removed, ...rest }) => rest)

		// Fall back to the first remaining conversation when the open one is removed.
		if (id === currentId && remaining[0]) {
			setMessages(transcripts[remaining[0].id] ?? [])

			setCurrentId(remaining[0].id)
		}
	}

	// A new conversation opens as a draft seeded with an agent greeting, then becomes current.
	function createConversation() {
		const id = crypto.randomUUID()

		const greeting: ChatContent = {
			id: crypto.randomUUID(),
			role: 'agent',
			content: newChatGreeting,
		}

		setConversations((prev) => [{ id, title: 'New conversation', preview: 'Draft' }, ...prev])

		// Stash the live transcript before swapping in the new one.
		setTranscripts((prev) => ({ ...prev, [currentId]: messages, [id]: [greeting] }))

		setMessages([greeting])

		setCurrentId(id)
	}

	return (
		<Example>
			<div className="h-136">
				<ChatLayout
					messages={messages}
					sending={sending}
					onSend={send}
					onStop={stop}
					onAttach={() => {}}
					aria-label={`Message ${currentTitle ?? 'conversation'}`}
					header={<Heading level={2}>{currentTitle}</Heading>}
					conversations={conversations}
					currentConversationId={currentId}
					onConversationSelect={openConversation}
					onConversationRemove={removeConversation}
					onConversationCreate={createConversation}
					promptActions={
						<Button variant="plain" size="sm">
							<Icon icon={<CircleDashed />} />
							Data Analyst
						</Button>
					}
				/>
			</div>
		</Example>
	)
}
