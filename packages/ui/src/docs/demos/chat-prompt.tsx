'use client'

import { CircleDashed } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { ChatPrompt } from '../../components/chat-prompt'
import { Icon } from '../../components/icon'
import { Stack } from '../../components/stack'
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

export default function ChatPromptDemo() {
	return (
		<Stack gap="xl">
			<Example title="Default">
				<DefaultExample />
			</Example>

			<Example title="With actions">
				<WithActionsExample />
			</Example>

			<Example title="Streaming">
				<StreamingExample />
			</Example>
		</Stack>
	)
}
