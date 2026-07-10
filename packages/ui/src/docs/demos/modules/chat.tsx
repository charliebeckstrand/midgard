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
	ChatList,
	ChatListItem,
	ChatMessage,
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

const chartSpec = JSON.stringify(
	{
		type: 'line',
		title: 'Signups per week',
		data: [
			{ week: 'W1', signups: 210, churn: 40 },
			{ week: 'W2', signups: 260, churn: 52 },
			{ week: 'W3', signups: 300, churn: 47 },
			{ week: 'W4', signups: 365, churn: 55 },
			{ week: 'W5', signups: 410, churn: 61 },
			{ week: 'W6', signups: 490, churn: 58 },
		],
		series: [
			{ xKey: 'week', yKey: 'signups', yName: 'Signups' },
			{ xKey: 'week', yKey: 'churn', yName: 'Churn' },
		],
	},
	null,
	'\t',
)

const chartMessage = [
	'Signups keep climbing while churn holds flat — the last six weeks:',
	'',
	'```chart',
	chartSpec,
	'```',
	'',
	'Worth showing this trend in the kickoff deck.',
].join('\n')

// A long generated history exercising the windowed transcript; the tail ends
// on a chart-bearing reply so the pinned-open view shows a rich bubble.
const history: ChatContent[] = [
	...Array.from({ length: 199 }, (_, i): ChatContent => {
		const role = i % 2 === 0 ? ('user' as const) : ('agent' as const)

		return {
			id: String(i),
			role,
			content:
				i % 7 === 3
					? `Message ${i}: a longer turn that wraps across a few lines, the way real answers do — context, a caveat, and a follow-up question to keep the thread moving.`
					: `Message ${i}`,
		}
	}),
	{ id: '199', role: 'agent', content: chartMessage },
]

const transcript: ChatContent[] = [
	{
		id: '1',
		role: 'user',
		content: 'Can you help me plan the project kickoff meeting?',
		timestamp: '11:10 AM',
	},
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
	{
		id: '4',
		role: 'agent',
		content: 'Looking forward to it!',
		timestamp: '11:12 AM',
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
				<Tab value="List">List</Tab>
				<Tab value="Prompt">Prompt</Tab>
			</TabList>
			<TabContents fade={false}>
				<TabContent value="Message">
					<Stack gap="xl">
						<Example title="Default">
							<Stack gap="sm">
								<ChatMessage type="assistant">Hi there! How can I help you today?</ChatMessage>
								<ChatMessage type="user">Can you help me plan the project kickoff?</ChatMessage>
							</Stack>
						</Example>

						<Example title="System">
							<ChatMessage type="system">Conversation started</ChatMessage>
						</Example>

						<Example title="Streaming">
							<ChatMessage type="assistant" streaming>
								Thinking through the problem
							</ChatMessage>
						</Example>

						<Example title="With a chart">
							<ChatMessage type="assistant">{chartMessage}</ChatMessage>
						</Example>

						<Example title="Timestamped">
							<ChatMessage type="assistant" timestamp="11:10 AM">
								Heading out now, ETA 3pm.
							</ChatMessage>
							<ChatMessage type="user" timestamp="11:12 AM">
								Got it — door code is 4421.
							</ChatMessage>
						</Example>

						<Example title="With actions">
							<ChatMessage
								type="assistant"
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
					<Stack gap="xl">
						<Example title="Transcript">
							<ChatTranscript messages={transcript} />
						</Example>

						<Example title="Virtualized">
							{/* Windowing needs a bounded viewport; only the visible messages mount. */}
							<div className="flex h-96 flex-col">
								<ChatTranscript messages={history} virtualize />
							</div>
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
