'use client'

import { CircleDashed } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { ChatPrompt } from '../../components/chat-prompt'
import { Icon } from '../../components/icon'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Chat' }

function DefaultDemo() {
	const [value, setValue] = useState('')

	return (
		<Sizer>
			<ChatPrompt value={value} onValueChange={setValue} onSubmit={() => setValue('')} />
		</Sizer>
	)
}

function WithActionsDemo() {
	const [value, setValue] = useState('')

	return (
		<Sizer>
			<ChatPrompt
				value={value}
				onValueChange={setValue}
				onSubmit={() => setValue('')}
				actions={
					<Button variant="plain" size="sm">
						<Icon icon={<CircleDashed />} />
						<span className="ml-1">Data Analyst</span>
					</Button>
				}
			/>
		</Sizer>
	)
}

export default function ChatPromptDemo() {
	const [streamingValue, setStreamingValue] = useState('')

	const [streaming, setStreaming] = useState(false)

	return (
		<Stack gap={6}>
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
								<Button variant="plain" size="sm">
									<Icon icon={<CircleDashed />} />
									<span className="ml-1">Data Analyst</span>
								</Button>
								<Button variant="plain" size="sm">
									<Icon icon={<Paperclip />} />
								</Button>
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
				<Sizer>
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
				</Sizer>
			</Example>
		</Stack>
	)
}
