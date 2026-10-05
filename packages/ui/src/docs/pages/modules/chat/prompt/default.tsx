import { useState } from 'react'
import { ChatPrompt } from 'ui/chat'

export default function Default() {
	const [value, setValue] = useState('')

	return <ChatPrompt value={value} onValueChange={setValue} onSubmit={() => setValue('')} />
}
