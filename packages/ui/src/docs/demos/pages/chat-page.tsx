import { CircleDashed, Trash } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/button'
import { Confirm } from '../../../components/confirm'
import { Heading } from '../../../components/heading'
import { Icon } from '../../../components/icon'
import { Sidebar, SidebarBody, SidebarHeader } from '../../../components/sidebar'
import {
	type ChatContent,
	ChatLayout,
	ChatList,
	ChatListItem,
	type ChatTransport,
	useChatSend,
} from '../../../modules/chat'
import { Example } from '../../engine'

const conversations = [
	{ id: 1, title: 'Project kickoff', preview: 'Let me help you plan...' },
	{ id: 2, title: 'Bug investigation', preview: 'I found the root cause...' },
	{ id: 3, title: 'Code review', preview: 'The implementation looks...' },
	{ id: 4, title: 'Architecture design', preview: 'Here are the trade-offs...' },
	{ id: 5, title: 'Deployment strategy', preview: 'For zero-downtime...' },
]

const initialMessages: ChatContent[] = [
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

// A mock transport that streams a canned reply word by word, emitting the
// cumulative text on each tick (the snapshot shape ChatTransport expects).
const mockTransport: ChatTransport = () =>
	(async function* () {
		const reply =
			'Thanks for sharing that. Let me think about the best approach and get back to you with a detailed plan.'

		let snapshot = ''

		for (const word of reply.split(' ')) {
			snapshot = snapshot ? `${snapshot} ${word}` : word

			await new Promise((resolve) => setTimeout(resolve, 60))

			yield snapshot
		}
	})()

export function Demo() {
	const { messages, sending, send } = useChatSend({ transport: mockTransport, initialMessages })

	const [current, setCurrent] = useState(1)

	const [confirmOpen, setConfirmOpen] = useState(false)

	const sidebar = (
		<>
			<Sidebar className="w-64 shrink-0">
				<SidebarHeader>
					<Heading level={3}>Messages</Heading>
				</SidebarHeader>
				<SidebarBody>
					<ChatList aria-label="Conversations">
						{conversations.map((conversation) => (
							<ChatListItem
								key={conversation.id}
								title={conversation.title}
								preview={conversation.preview}
								current={conversation.id === current}
								onSelect={() => setCurrent(conversation.id)}
								actions={
									<Button
										aria-label="Delete conversation"
										color="red"
										variant="plain"
										size="sm"
										onClick={() => setConfirmOpen(true)}
									>
										<Icon icon={<Trash />} />
									</Button>
								}
							/>
						))}
					</ChatList>
				</SidebarBody>
			</Sidebar>

			<Confirm
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				onConfirm={() => setConfirmOpen(false)}
				confirm={{ color: 'red' }}
				title="Delete conversation"
				description="Are you sure you want to delete this conversation? This action cannot be undone."
			/>
		</>
	)

	return (
		<Example>
			<div className="h-[34rem]">
				<ChatLayout
					messages={messages}
					sending={sending}
					onSend={send}
					onAttach={() => {}}
					aria-label="Message Project kickoff"
					header={<Heading level={3}>Project kickoff</Heading>}
					sidebar={sidebar}
					composerActions={
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
