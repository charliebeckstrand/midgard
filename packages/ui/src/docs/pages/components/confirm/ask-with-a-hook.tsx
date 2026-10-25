import { useState } from 'react'
import { Button } from 'ui/button'
import { useConfirm } from 'ui/confirm'
import { Text } from 'ui/text'
import { words } from '../../../data/words.ts'

const results = words('delete-result', { none: 'None', deleted: 'Deleted', kept: 'Kept' })

/** Waits for a time, in place of a request to a server. */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default function AskWithAHook() {
	const confirm = useConfirm()

	const [result, setResult] = useState<keyof typeof results>('none')

	return (
		<>
			<Button
				color="red"
				onClick={async () => {
					const confirmed = await confirm({
						title: 'Delete the report?',
						description: 'The report and its charts are deleted. You cannot undo this.',
						confirm: { label: 'Delete', color: 'red' },
						action: () => wait(1000),
					})

					setResult(confirmed ? 'deleted' : 'kept')
				}}
			>
				Delete report
			</Button>
			<Text>Last result: {results[result]}</Text>
		</>
	)
}
