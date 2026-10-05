import { useState } from 'react'
import { ChatPrompt } from 'ui/chat'

export default function WithAttachments() {
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
			onAttach={(picked) => setFiles((previous) => [...previous, ...picked])}
			accept=".pdf,.csv,.txt"
			attachments={files}
			onRemoveAttachment={(index) =>
				setFiles((previous) => previous.filter((_, position) => position !== index))
			}
		/>
	)
}
