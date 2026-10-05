import { useState } from 'react'
import { ChatPrompt } from 'ui/chat'

export default function Streaming() {
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
