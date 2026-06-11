import { CircleDashed } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { ChatPrompt } from '../../components/chat-prompt'
import { Icon } from '../../components/icon'
import { Example } from '../components/example'

export const meta = { category: 'Chat' }

function DefaultExample() {
	const [value, setValue] = useState('')

	return <ChatPrompt value={value} onValueChange={setValue} onSubmit={() => setValue('')} />
}

function WithActionsExample() {
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

function AttachmentsExample() {
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

function StreamingExample() {
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
		<>
			<Example title="Default">
				<DefaultExample />
			</Example>

			<Example title="With actions">
				<WithActionsExample />
			</Example>

			<Example title="With attachments">
				<AttachmentsExample />
			</Example>

			<Example title="Streaming">
				<StreamingExample />
			</Example>
		</>
	)
}
