import { useState } from 'react'
import { Button } from 'ui/button'
import { useConfirm } from 'ui/confirm'
import { Text } from 'ui/text'

/** Waits for a time, in place of a request to a server. */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default function AskWithAHook() {
	const confirm = useConfirm()

	const [outcome, setOutcome] = useState('None')

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

					setOutcome(confirmed ? 'Deleted' : 'Kept')
				}}
			>
				Delete report
			</Button>
			<Text>Outcome: {outcome}</Text>
		</>
	)
}
