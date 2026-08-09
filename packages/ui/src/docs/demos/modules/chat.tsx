import { CircleDashed, Pencil, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/button'
import { CopyButton } from '../../../components/copy-button'
import { Icon } from '../../../components/icon'
import { Sparkline } from '../../../components/sparkline'
import { Stack } from '../../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { ToggleIconButton } from '../../../components/toggle-icon-button'
import {
	ChatEmbedProvider,
	type ChatEmbedRenderer,
	ChatList,
	ChatListItem,
	ChatMessage,
	type ChatMessageData,
	ChatPrompt,
	ChatTranscript,
} from '../../../modules/chat'
import { Example } from '../../engine'

const conversations = [
	{ id: '1', title: 'Project kickoff', timestamp: '2h' },
	{ id: '2', title: 'Bug investigation', timestamp: '5h' },
	{ id: '3', title: 'Code review', timestamp: '1d' },
	{ id: '4', title: 'Architecture design', timestamp: '3d' },
]

const transcript: ChatMessageData[] = [
	{
		id: '1',
		role: 'user',
		content: 'Can you help me plan the project kickoff meeting?',
		timestamp: '11:10 AM',
	},
	{
		id: '2',
		role: 'assistant',
		content: "Of course! Who's attending, and what outcome do you need from it?",
	},
	{
		id: '3',
		role: 'user',
		content: 'Engineering, product, and design — to align on the Q2 roadmap.',
	},
	{
		id: '4',
		role: 'assistant',
		content: 'Looking forward to it!',
		timestamp: '11:12 AM',
	},
]

// The chat imports no chart. The app names one renderer, and a reply that
// carries a `stops-trend` block draws through it — hoisted out of the render,
// because a fresh record each render is a fresh registry.
const embedRenderers = {
	'stops-trend': (part) => (
		<Sparkline
			data={part.data as number[]}
			variant="bar"
			color="blue"
			width={160}
			aria-label="Late stops per day over the last week"
		/>
	),
} satisfies Record<string, ChatEmbedRenderer>

const embedded: ChatMessageData[] = [
	{ id: '1', role: 'user', content: 'How are late stops trending this week?' },
	{
		id: '2',
		role: 'assistant',
		content: [
			{ kind: 'text', id: 't1', text: 'Late stops rose from **4** to **14** across the week.' },
			{ kind: 'embed', id: 'e1', name: 'stops-trend', data: [4, 6, 5, 9, 12, 11, 14] },
			{ kind: 'text', id: 't2', text: 'Most of the rise sits on the north routes.' },
		],
	},
]

const unregistered: ChatMessageData[] = [
	{
		id: '1',
		role: 'assistant',
		content: [
			{ kind: 'text', id: 't1', text: 'Here are those twelve stops on the map.' },
			{ kind: 'embed', id: 'e1', name: 'stops-map', data: null },
		],
	},
]

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
	const [current, setCurrent] = useState('1')

	return (
		<Tabs defaultValue="Message">
			<TabList aria-label="Chat module">
				<Tab value="Message">Message</Tab>
				<Tab value="Transcript">Transcript</Tab>
				<Tab value="Embeds">Embeds</Tab>
				<Tab value="List">List</Tab>
				<Tab value="Prompt">Prompt</Tab>
			</TabList>
			<TabContents fade={false}>
				<TabContent value="Message">
					<Stack gap="xl">
						<Example title="Default">
							<Stack gap="sm">
								<ChatMessage role="assistant">Hi there! How can I help you today?</ChatMessage>
								<ChatMessage role="user">Can you help me plan the project kickoff?</ChatMessage>
							</Stack>
						</Example>

						<Example title="System">
							<ChatMessage role="system">Conversation started</ChatMessage>
						</Example>

						<Example title="Streaming">
							<ChatMessage role="assistant" streaming>
								Thinking through the problem
							</ChatMessage>
						</Example>

						<Example title="Timestamped">
							<ChatMessage role="assistant" timestamp="11:10 AM">
								Heading out now, ETA 3pm.
							</ChatMessage>
							<ChatMessage role="user" timestamp="11:12 AM">
								Got it — door code is 4421.
							</ChatMessage>
						</Example>

						<Example title="With actions">
							<ChatMessage
								role="assistant"
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

				<TabContent value="Transcript">
					<Example title="Transcript">
						<ChatTranscript messages={transcript} />
					</Example>
				</TabContent>

				<TabContent value="Embeds">
					<Stack gap="xl">
						<Example title="Registered renderer">
							<ChatEmbedProvider renderers={embedRenderers}>
								<ChatTranscript messages={embedded} />
							</ChatEmbedProvider>
						</Example>

						<Example title="Unregistered name">
							<ChatEmbedProvider renderers={embedRenderers}>
								<ChatTranscript messages={unregistered} />
							</ChatEmbedProvider>
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="List">
					<Example title="List">
						<ChatList aria-label="Conversations" className="max-w-xs">
							{conversations.map((conversation) => (
								<ChatListItem
									key={conversation.id}
									title={conversation.title}
									current={conversation.id === current}
									onSelect={() => setCurrent(conversation.id)}
								/>
							))}
						</ChatList>
					</Example>
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
			</TabContents>
		</Tabs>
	)
}
