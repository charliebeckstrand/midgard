import { CircleDashed, Pencil, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../../components/badge'
import { Button } from '../../../components/button'
import { CopyButton } from '../../../components/copy-button'
import { Icon } from '../../../components/icon'
import { Stack } from '../../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { ToggleIconButton } from '../../../components/toggle-icon-button'
import { ChatMessage, ChatPrompt } from '../../../modules/chat'
import { Example } from '../../engine'

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
		<div className="flex flex-col gap-2">
			<ChatPrompt
				value={value}
				onValueChange={setValue}
				onSubmit={() => {
					setValue('')
					setFiles([])
				}}
				onAttach={(picked) => setFiles((prev) => [...prev, ...picked])}
				accept=".pdf,.csv,.txt"
			/>
			{files.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{files.map((file) => (
						<Badge key={`${file.name}-${file.lastModified}`}>{file.name}</Badge>
					))}
				</div>
			)}
		</div>
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
										<CopyButton size="xs" value="Heading out now, ETA 3pm." />
										<ToggleIconButton
											size="xs"
											pressed={false}
											icon={<RotateCcw />}
											aria-label="Retry"
										/>
										<ToggleIconButton
											size="xs"
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
			</TabContents>
		</Tabs>
	)
}
