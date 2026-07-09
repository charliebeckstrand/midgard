import { CircleDashed } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../../components/button'
import { Icon } from '../../../../components/icon'
import { Stack } from '../../../../components/stack'
import { ChatPrompt } from '../../../../modules/chat'
import { Example } from '../../../engine'

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

export function Demo() {
	return (
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
	)
}
