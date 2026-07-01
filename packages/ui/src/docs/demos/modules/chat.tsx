import { CircleDashed, Pencil, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/button'
import { CopyButton } from '../../../components/copy-button'
import { Icon } from '../../../components/icon'
import { Stack } from '../../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { ToggleIconButton } from '../../../components/toggle-icon-button'
import {
	type ChatContent,
	ChatLayout,
	ChatList,
	ChatListItem,
	ChatMessage,
	ChatPrompt,
	ChatTranscript,
	type ChatTransport,
	useChatSend,
} from '../../../modules/chat'
import { Example } from '../../engine'

const conversations = [
	{ id: '1', title: 'Project kickoff', preview: 'Let me help you plan…', timestamp: '2h' },
	{ id: '2', title: 'Bug investigation', preview: 'I found the root cause…', timestamp: '5h' },
	{ id: '3', title: 'Code review', preview: 'The implementation looks…', timestamp: '1d' },
	{ id: '4', title: 'Architecture design', preview: 'Here are the trade-offs…', timestamp: '3d' },
]

const transcript: ChatContent[] = [
	{ id: '1', role: 'user', content: 'Can you help me plan the project kickoff meeting?' },
	{
		id: '2',
		role: 'agent',
		content: "Of course! Who's attending, and what outcome do you need from it?",
	},
	{
		id: '3',
		role: 'user',
		content: 'Engineering, product, and design — to align on the Q2 roadmap.',
	},
]

// A mock transport that streams a canned reply word by word, emitting the
// cumulative text on each tick (the snapshot shape ChatTransport expects).
// Checks `signal` between words so the demo's stop control has something real
// to cancel.
const mockTransport: ChatTransport = (_content, signal) =>
	(async function* () {
		const reply =
			'Thanks for sharing that. Here is a streamed reply so the transcript scrolls and the prompt toggles to its stop control while a response is in flight.'

		let snapshot = ''

		for (const word of reply.split(' ')) {
			if (signal.aborted) return

			snapshot = snapshot ? `${snapshot} ${word}` : word

			await new Promise((resolve) => setTimeout(resolve, 50))

			yield snapshot
		}
	})()

function ConversationList() {
	const [current, setCurrent] = useState('1')

	return (
		<ChatList aria-label="Conversations" className="max-w-xs">
			{conversations.map((conversation) => (
				<ChatListItem
					key={conversation.id}
					title={conversation.title}
					preview={conversation.preview}
					timestamp={conversation.timestamp}
					current={conversation.id === current}
					onSelect={() => setCurrent(conversation.id)}
					remove
				/>
			))}
		</ChatList>
	)
}

function LayoutDemo() {
	const [current, setCurrent] = useState('1')

	const { messages, sending, send, stop } = useChatSend({
		transport: mockTransport,
		initialMessages: [
			{ role: 'user', content: 'Can you help me plan the kickoff?' },
			{ role: 'agent', content: 'Of course — who will be attending?' },
		],
	})

	return (
		<div className="h-96">
			<ChatLayout
				messages={messages}
				sending={sending}
				onSend={send}
				onStop={stop}
				conversations={conversations}
				currentConversationId={current}
				onConversationSelect={setCurrent}
				aria-label="Message the assistant"
			/>
		</div>
	)
}

function DefaultPrompt() {
	const [value, setValue] = useState('')

	return <ChatPrompt value={value} onValueChange={setValue} onSubmit={() => setValue('')} />
}

function PromptWithActions() {
	const [value, setValue] = useState('')

	return (
		<ChatPrompt
			value={value}
			onValueChange={setValue}
			onSubmit={() => setValue('')}
			actions={
				<Button variant="plain" size="sm">
					<Icon icon={<CircleDashed />} />
					Data Analyst
				</Button>
			}
		/>
	)
}

function PromptWithAttachments() {
	const [value, setValue] = useState('')
	const [files, setFiles] = useState<File[]>([])

	return (
		<ChatPrompt
			value={value}
			onValueChange={setValue}
			onSubmit={() => {
				setValue('')
				setFiles([])
			}}
			onAttach={(picked) => setFiles((prev) => [...prev, ...picked])}
			accept=".pdf,.csv,.txt"
			attachments={files}
			onRemoveAttachment={(index) => setFiles((prev) => prev.filter((_, i) => i !== index))}
		/>
	)
}

function StreamingPrompt() {
	const [value, setValue] = useState('')
	const [streaming, setStreaming] = useState(false)

	return (
		<ChatPrompt
			value={value}
			onValueChange={setValue}
			onSubmit={() => {
				setValue('')
				setStreaming(true)
			}}
			onStop={() => setStreaming(false)}
			streaming={streaming}
		/>
	)
}

export const meta = { name: 'Chat' }

export function Demo() {
	return (
		<Tabs defaultValue="Message">
			<TabList aria-label="Chat module">
				<Tab value="Message">Message</Tab>
				<Tab value="Prompt">Prompt</Tab>
				<Tab value="Transcript">Transcript</Tab>
				<Tab value="Conversations">Conversations</Tab>
				<Tab value="Layout">Layout</Tab>
			</TabList>
			<TabContents fade={false}>
				<TabContent value="Message">
					<Stack gap="xl">
						<Example title="Default">
							<Stack gap="sm">
								<ChatMessage type="assistant" timestamp="11:10 AM">
									Heading out now, ETA 3pm.
								</ChatMessage>
								<ChatMessage type="user" timestamp="11:12 AM">
									Got it — door code is 4421.
								</ChatMessage>
							</Stack>
						</Example>

						<Example title="System message">
							<ChatMessage type="system">Conversation started</ChatMessage>
						</Example>

						<Example title="Streaming">
							<ChatMessage type="assistant" streaming>
								Thinking through the problem
							</ChatMessage>
						</Example>

						<Example title="With actions">
							<ChatMessage
								type="assistant"
								timestamp="11:10 AM"
								actions={
									<>
										<CopyButton size="sm" value="Heading out now, ETA 3pm." />
										<ToggleIconButton
											size="sm"
											pressed={false}
											icon={<RotateCcw />}
											aria-label="Retry"
										/>
										<ToggleIconButton
											size="sm"
											pressed={false}
											icon={<Pencil />}
											aria-label="Edit"
										/>
									</>
								}
							>
								Heading out now, ETA 3pm.
							</ChatMessage>
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Prompt">
					<Stack gap="xl">
						<Example title="Default">
							<DefaultPrompt />
						</Example>

						<Example title="With actions">
							<PromptWithActions />
						</Example>

						<Example title="With attachments">
							<PromptWithAttachments />
						</Example>

						<Example title="Streaming">
							<StreamingPrompt />
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Transcript">
					<Example title="Transcript">
						<div className="h-80">
							<ChatTranscript messages={transcript} />
						</div>
					</Example>
				</TabContent>

				<TabContent value="Conversations">
					<Example title="Conversation list">
						<ConversationList />
					</Example>
				</TabContent>

				<TabContent value="Layout">
					<Example title="Full composition">
						<LayoutDemo />
					</Example>
				</TabContent>
			</TabContents>
		</Tabs>
	)
}
