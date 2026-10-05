import { CircleDashed } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import { ChatPrompt } from 'ui/chat'
import { Icon } from 'ui/icon'

export default function WithActions() {
	const [value, setValue] = useState('')

	return (
		<ChatPrompt
			value={value}
			onValueChange={setValue}
			onSubmit={() => setValue('')}
			actions={
				<Button variant="plain">
					<Icon icon={<CircleDashed />} />
					Data Analyst
				</Button>
			}
		/>
	)
}
