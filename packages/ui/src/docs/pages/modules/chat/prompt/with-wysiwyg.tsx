import { useState } from 'react'
import { ChatPrompt } from 'ui/chat'

export default function WithWysiwyg() {
	const [value, setValue] = useState('')

	// The field shows the formatting in place of the Markdown syntax, and the
	// value stays Markdown. `wysiwyg` alone shows each action of the toolbar.
	return (
		<ChatPrompt
			value={value}
			onValueChange={setValue}
			onSubmit={() => setValue('')}
			wysiwyg={{ actions: ['bold', 'italic', 'bulletList', 'link', 'code', 'codeBlock'] }}
		/>
	)
}
