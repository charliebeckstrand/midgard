'use client'

import { ArrowUp, CircleDashed, EllipsisVertical, Plus } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Icon } from '../../components/icon'
import { Spacer } from '../../components/spacer'
import { Spinner } from '../../components/spinner'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Textarea } from '../../components/textarea'
import { ChatScroll } from '../../components/virtual-list/chat-scroll'
import { VirtualList, type VirtualListHandle } from '../../components/virtual-list/component'
import { cn } from '../../core'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

// ── Message generation ─────────────────────────────────

type Message = {
	id: string
	role: 'user' | 'agent'
	content: string
	timestamp: Date
}

const userMessages = [
	'Can you explain how virtual scrolling works?',
	'What are the trade-offs compared to regular rendering?',
	'How does this handle variable-height content?',
	'Is there a way to scroll to a specific message?',
	'What about accessibility with virtualized lists?',
	'Can I use this with horizontal scrolling too?',
	'How do you handle loading older messages?',
	'What happens when new messages arrive?',
	'Does this work with React Server Components?',
	'How does the overscan buffer affect performance?',
	'Can you show me the pin-to-bottom behavior?',
	'What is the estimated size used for?',
	'How does dynamic measurement work?',
	'Is the getItemKey prop important?',
	'What about keyboard navigation?',
]

const agentMessages = [
	'Virtual scrolling renders only the items currently visible in the viewport (plus a small buffer called overscan). Instead of mounting thousands of DOM nodes, you mount maybe 20-30. This dramatically reduces memory usage and initial render time.',
	"The main trade-off is complexity. You need to estimate item sizes before they're measured, handle scroll position correction when estimates are wrong, and manage the lifecycle of items entering/leaving the DOM. For lists under ~100 items, regular rendering is usually fine.",
	"Each item is measured after it renders using a ResizeObserver. The virtualizer caches measured heights and uses them for subsequent calculations. When a measured height differs from the estimate, the virtualizer adjusts scroll position to prevent visual jumping — that's the scroll correction mechanism.",
	'Yes! The VirtualList exposes an imperative handle via ref with scrollToIndex(), scrollToEnd(), and scrollToStart() methods. You can scroll to any item by index with configurable alignment (start, center, end).',
	"The virtualizer maintains proper DOM order and uses data-index attributes for identification. Items that aren't in the DOM aren't accessible to screen readers, which is a known limitation. For critical accessibility needs, consider whether virtualization is the right choice.",
	'TanStack Virtual supports horizontal virtualization too — just set horizontal: true. Our VirtualList component currently focuses on vertical scrolling since that covers the vast majority of use cases.',
	"The ChatScroll wrapper fires an onTopReached callback when the user scrolls near the top of the list. You'd use this to fetch older messages from your API and prepend them to the items array. The virtualizer handles the scroll position adjustment automatically.",
	"When new messages arrive and the user is 'pinned' to the bottom (scrolled within the threshold distance), ChatScroll automatically scrolls to show the new message. If the user has scrolled up to read history, new messages won't pull them down.",
	"VirtualList is a client component ('use client') since it depends on DOM measurement and scroll events. You can fetch data in a Server Component and pass the items array down as props to VirtualList.",
	'The overscan controls how many items are rendered beyond the visible area. Higher overscan means smoother scrolling (items are pre-rendered before they scroll into view) but more DOM nodes. The default of 5 is a good balance for most cases.',
	'Try sending a message while scrolled to the bottom — it will auto-scroll to show your new message. Then scroll up a bit and send another — the list stays where you are. This is the pin-to-bottom behavior that ChatScroll provides.',
	"The estimateSize prop gives the virtualizer a starting height for items that haven't been measured yet. It's used to calculate total scrollable height and which items should be in the viewport. After an item renders and gets measured, the real height replaces the estimate.",
	'When an item first renders, the virtualizer attaches a ResizeObserver via the measureElement ref callback. The observer reports the actual height, which gets cached. If the content changes size later (like an image loading), the observer fires again and the virtualizer updates.',
	"Yes, getItemKey is important when items can be reordered or prepended. Without stable keys, the virtualizer uses array indices which break when items shift. For a chat app, use the message ID as the key so prepending older messages doesn't confuse the virtualizer.",
	"Arrow keys work naturally within the scrollable container. The virtualizer doesn't intercept keyboard events — it only controls which items are in the DOM. Focus management within rendered items works the same as any other React list.",
]

let nextId = 0

function generateMessages(count: number, startTime: Date): Message[] {
	const messages: Message[] = []

	for (let i = 0; i < count; i++) {
		const isUser = i % 3 === 0

		const pool = isUser ? userMessages : agentMessages

		const content = pool[i % pool.length] as string

		const timestamp = new Date(startTime.getTime() + i * 45_000)

		messages.push({
			id: `msg-${nextId++}`,
			role: isUser ? 'user' : 'agent',
			content,
			timestamp,
		})
	}

	return messages
}

const INITIAL_COUNT = 120
const LOAD_MORE_COUNT = 30
const baseTime = new Date('2025-03-15T09:00:00')

// ── Chat bubble ────────────────────────────────────────

function ChatBubble({ message }: { message: Message }) {
	const isUser = message.role === 'user'

	const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

	return (
		<Stack direction="row" gap={0}>
			{isUser && <Spacer />}

			<div className="max-w-[80%] space-y-1">
				<div
					className={cn(
						'rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap',
						isUser
							? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-600 dark:text-zinc-100'
							: 'bg-blue-600 text-white dark:bg-blue-500',
					)}
				>
					{message.content}
				</div>
				<Text
					className={cn('text-[10px] px-1', isUser ? 'text-right' : 'text-left')}
					variant="muted"
				>
					{time}
				</Text>
			</div>
		</Stack>
	)
}

// ── Demo ───────────────────────────────────────────────

export default function VirtualListDemo() {
	const [messages, setMessages] = useState(() => generateMessages(INITIAL_COUNT, baseTime))

	const [input, setInput] = useState('')

	const [loading, setLoading] = useState(false)

	const listRef = useRef<VirtualListHandle>(null)

	const loadOlder = useCallback(() => {
		if (loading) return

		setLoading(true)

		// Simulate network delay.
		setTimeout(() => {
			setMessages((prev) => {
				const oldest = prev[0]?.timestamp ?? baseTime

				const olderStart = new Date(oldest.getTime() - LOAD_MORE_COUNT * 45_000)

				const olderMessages = generateMessages(LOAD_MORE_COUNT, olderStart)

				return [...olderMessages, ...prev]
			})
			setLoading(false)
		}, 2000)
	}, [loading])

	const send = () => {
		const text = input.trim()

		if (!text) return

		const now = new Date()

		setMessages((prev) => [
			...prev,
			{ id: `msg-${nextId++}`, role: 'user', content: text, timestamp: now },
		])
		setInput('')

		// Simulated agent reply.
		setTimeout(() => {
			setMessages((prev) => [
				...prev,
				{
					id: `msg-${nextId++}`,
					role: 'agent',
					content:
						'Thanks for the message! This is a simulated reply to demonstrate auto-scrolling.',
					timestamp: new Date(),
				},
			])
		}, 1000)
	}

	return (
		<Stack gap={8}>
			<Example title="Chat with virtualized messages">
				<Stack
					className="h-125 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden"
					gap={0}
				>
					{/* Header */}
					<Flex gap={3} className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
						<div className="size-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
							AI
						</div>
						<div>
							<Text className="font-medium text-sm">Virtual Chat</Text>
							{/* <Text variant="muted" className="text-xs">
								{messages.length} messages
							</Text> */}
						</div>
						<Spacer />
						<div className="-mr-1.5">
							<Button variant="plain">
								<Icon icon={<EllipsisVertical />} />
							</Button>
						</div>
					</Flex>

					{/* Virtualized message list */}
					<div className="flex-1 min-h-0">
						<ChatScroll onTopReached={loadOlder} threshold={150}>
							<VirtualList
								ref={listRef}
								items={messages}
								estimateSize={80}
								overscan={8}
								gap={12}
								getItemKey={(i) => messages[i]?.id ?? i}
								className="h-full p-4"
							>
								{(message) => (
									<>
										{loading && message.id === messages[0]?.id && (
											<div className="flex justify-center py-2">
												<Icon icon={<Spinner />} />
											</div>
										)}
										<ChatBubble message={message} />
									</>
								)}
							</VirtualList>
						</ChatScroll>
					</div>

					{/* Input */}
					<div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
						<Textarea
							id="textarea-actions"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							autoResize
							rows={3}
							className="max-h-48"
							placeholder="Ask anything"
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault()

									send()
								}
							}}
							actions={
								<>
									<Button size="sm" variant="plain">
										<Icon icon={<CircleDashed />} />
										<span className="ml-1">Data Analyst</span>
									</Button>
									<Spacer />
									<Button size="sm" variant="plain">
										<Icon icon={<Plus />} />
									</Button>
									<Button size="sm" color="amber" disabled={!input.trim()} onClick={send}>
										<Icon icon={<ArrowUp />} />
									</Button>
								</>
							}
						/>
					</div>
				</Stack>
			</Example>
		</Stack>
	)
}
