'use client'

import { CircleDashed } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { ChatPrompt } from '../../components/chat-prompt'
import { Icon } from '../../components/icon'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Chat' }

function DefaultDemo() {
	const [value, setValue] = useState('')

	return <ChatPrompt value={value} onValueChange={setValue} onSubmit={() => setValue('')} />
}

function WithActionsDemo() {
	const [value, setValue] = useState('')

	return (
		<ChatPrompt
			value={value}
			onValueChange={setValue}
			onSubmit={() => setValue('')}
			actions={
				<Button variant="plain" size="sm" prefix={<Icon icon={<CircleDashed />} />}>
					Data Analyst
				</Button>
			}
		/>
	)
}

export default function ChatPromptDemo() {
	const [streamingValue, setStreamingValue] = useState('')

	const [streaming, setStreaming] = useState(false)

	return (
		<Stack gap="xl">
			<Example title="Default">
				<DefaultDemo />
			</Example>

			<Example
				title="With actions"
				code={code`
					import { ChatPrompt } from 'ui/chat-prompt'
					import { Button } from 'ui/button'
					import { Icon } from 'ui/icon'
					import { CircleDashed, Paperclip } from 'lucide-react'

					<ChatPrompt
						value={value}
						onValueChange={setValue}
						onSubmit={() => setValue('')}
						actions={
							<>
								<Button variant="plain" size="sm" prefix={<Icon icon={<CircleDashed />} />}>
									Data Analyst
								</Button>
								<Button variant="plain" size="sm" prefix={<Icon icon={<Paperclip />} />} />
							</>
						}
					/>
				`}
			>
				<WithActionsDemo />
			</Example>

			<Example
				title="Streaming"
				code={code`
					import { ChatPrompt } from 'ui/chat-prompt'

					const [value, setValue] = useState('')
					
					const [streaming, setStreaming] = useState(false)

					<ChatPrompt
						value={value}
						onValueChange={setValue}
						onSubmit={() => setStreaming(true)}
						onStop={() => setStreaming(false)}
						streaming={streaming}
					/>
				`}
			>
				<ChatPrompt
					value={streamingValue}
					onValueChange={setStreamingValue}
					onSubmit={() => {
						setStreamingValue('')

						setStreaming(true)
					}}
					onStop={() => setStreaming(false)}
					streaming={streaming}
				/>
			</Example>
		</Stack>
	)
}
