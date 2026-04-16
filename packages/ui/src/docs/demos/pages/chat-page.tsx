'use client'

import { ArrowUp, CircleDashed, Plus, Trash } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '../../../components/button'
import { ConfirmDialog } from '../../../components/dialog'
import { Heading } from '../../../components/heading'
import { Icon } from '../../../components/icon'
import {
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarSection,
} from '../../../components/sidebar'
import { Spacer } from '../../../components/spacer'
import { Stack } from '../../../components/stack'
import { Text } from '../../../components/text'
import { Textarea } from '../../../components/textarea'
import { cn } from '../../../core'
import {
	SidebarLayout,
	SidebarLayoutBody,
	SidebarLayoutFooter,
	SidebarLayoutHeader,
} from '../../../layouts'
import { Example } from '../../components/example'

export const meta = { category: 'Pages' }

type Message = {
	id: number
	role: 'user' | 'agent'
	content: string
}

const conversations = [
	{ id: 1, title: 'Project kickoff', preview: 'Let me help you plan...', active: true },
	{ id: 2, title: 'Bug investigation', preview: 'I found the root cause...' },
	{ id: 3, title: 'Code review', preview: 'The implementation looks...' },
	{ id: 4, title: 'Architecture design', preview: 'Here are the trade-offs...' },
	{ id: 5, title: 'Deployment strategy', preview: 'For zero-downtime...' },
]

const initialMessages: Message[] = [
	{ id: 1, role: 'user', content: 'Can you help me plan the project kickoff meeting?' },
	{
		id: 2,
		role: 'agent',
		content:
			"Of course! I'd be happy to help you plan the kickoff meeting. Let's start by identifying the key stakeholders and objectives. Who will be attending?",
	},
	{
		id: 3,
		role: 'user',
		content:
			'The engineering team, product manager, and the design lead. We need to align on the Q2 roadmap.',
	},
	{
		id: 4,
		role: 'agent',
		content:
			"Great team composition. Here's a suggested agenda:\n\n1. Welcome & introductions (5 min)\n2. Q2 objectives overview (15 min)\n3. Technical architecture review (20 min)\n4. Design system updates (15 min)\n5. Sprint planning & timeline (20 min)\n6. Q&A and next steps (10 min)\n\nShall I draft a more detailed outline for any of these sections?",
	},
	{
		id: 5,
		role: 'user',
		content: 'Yes, can you expand on the technical architecture section?',
	},
	{
		id: 6,
		role: 'agent',
		content:
			'For the technical architecture section, I recommend covering:\n\n- Current system overview and pain points\n- Proposed microservices migration plan\n- API versioning strategy\n- Database scaling considerations\n- CI/CD pipeline improvements\n\nThis gives the team context on where we are and where we need to go.',
	},
]

function ChatMessage({ role, children }: { role: 'user' | 'agent'; children: React.ReactNode }) {
	return (
		<Stack direction="row" gap={0} data-slot="chat-message" data-role={role}>
			{role === 'user' && <Spacer />}

			<div
				className={cn(
					'max-w-[80%] rounded-2xl px-4 py-3.5 whitespace-pre-wrap',
					role === 'user' ? 'bg-blue-600 text-white' : '',
				)}
			>
				{children}
			</div>
		</Stack>
	)
}

export default function ChatPageDemo() {
	const [messages, setMessages] = useState(initialMessages)

	const [input, setInput] = useState('')

	const bodyRef = useRef<HTMLDivElement>(null)

	const send = () => {
		const text = input.trim()

		if (!text) return

		const userMsg: Message = { id: Date.now(), role: 'user', content: text }

		setMessages((prev) => [...prev, userMsg])

		setInput('')

		setTimeout(() => {
			const agentMsg: Message = {
				id: Date.now() + 1,
				role: 'agent',
				content:
					'Thanks for sharing that. Let me think about the best approach and get back to you with a detailed plan.',
			}

			setMessages((prev) => [...prev, agentMsg])

			requestAnimationFrame(() => {
				bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
			})
		}, 800)

		requestAnimationFrame(() => {
			bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
		})
	}

	const [confirmDialog, setConfirmDialog] = useState(false)

	const sidebar = (
		<>
			<Sidebar>
				<SidebarHeader>
					<Stack direction="row" align="center" gap={2}>
						<Heading level={3}>Messages</Heading>
					</Stack>
				</SidebarHeader>
				<SidebarBody>
					<SidebarSection>
						{conversations.map((conv) => (
							<SidebarItem key={conv.id} current={conv.active}>
								<Stack direction="row" align="center" gap={4} full>
									<Stack gap={0} full className="min-w-0">
										<SidebarLabel>{conv.title}</SidebarLabel>
										<Text className="text-xs truncate" variant="muted">
											{conv.preview}
										</Text>
									</Stack>
									<Spacer />
									{!conv.active && (
										<Button
											color="red"
											variant="soft"
											size="sm"
											onClick={() => setConfirmDialog(true)}
										>
											<Icon icon={<Trash />} />
										</Button>
									)}
								</Stack>
							</SidebarItem>
						))}
					</SidebarSection>
				</SidebarBody>
			</Sidebar>

			<ConfirmDialog
				open={confirmDialog}
				onClose={() => {
					setConfirmDialog(false)
				}}
				onConfirm={() => {
					setConfirmDialog(false)
				}}
				confirm={{ color: 'red' }}
				title="Delete conversation"
				description="Are you sure you want to delete this conversation? This action cannot be undone."
			/>
		</>
	)

	return (
		<Example>
			<SidebarLayout sidebar={sidebar}>
				<SidebarLayoutHeader>
					<Stack direction="row" align="center" gap={3}>
						<Heading level={3}>Project kickoff</Heading>
					</Stack>
				</SidebarLayoutHeader>

				<SidebarLayoutBody ref={bodyRef}>
					<Stack gap={4} full flex>
						{messages.map((msg) => (
							<ChatMessage key={msg.id} role={msg.role}>
								{msg.content}
							</ChatMessage>
						))}
					</Stack>
				</SidebarLayoutBody>

				<SidebarLayoutFooter>
					<Textarea
						id="textarea-actions"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						autoResize
						rows={3}
						className="max-h-48"
						placeholder="Ask anything"
						actions={
							<>
								<Button variant="plain" size="sm">
									<Icon icon={<CircleDashed />} />
									<span className="ml-1">Data Analyst</span>
								</Button>
								<Button variant="plain" size="sm" className="ml-auto">
									<Icon icon={<Plus />} />
								</Button>
								<Button size="sm" color="amber" disabled={!input.trim()} onClick={send}>
									<Icon icon={<ArrowUp />} />
								</Button>
							</>
						}
					/>
				</SidebarLayoutFooter>
			</SidebarLayout>
		</Example>
	)
}
