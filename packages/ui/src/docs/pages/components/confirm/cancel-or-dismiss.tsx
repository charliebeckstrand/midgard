import { useState } from 'react'
import { Button } from 'ui/button'
import { Confirm } from 'ui/confirm'
import { Text } from 'ui/text'

type Outcome = 'None' | 'Confirmed' | 'Canceled' | 'Dismissed'

export default function CancelOrDismiss() {
	const [open, setOpen] = useState(false)

	const [outcome, setOutcome] = useState<Outcome>('None')

	return (
		<>
			<Button
				onClick={() => {
					setOutcome('None')
					setOpen(true)
				}}
			>
				Archive project
			</Button>
			<Confirm
				open={open}
				onOpenChange={(next) => {
					setOpen(next)
					// The Cancel button also closes the dialog. Keep its outcome.
					if (!next) setOutcome((current) => (current === 'Canceled' ? current : 'Dismissed'))
				}}
				onCancel={() => setOutcome('Canceled')}
				onConfirm={() => {
					setOutcome('Confirmed')
					setOpen(false)
				}}
				title="Archive project?"
				description="Press Escape or the backdrop to dismiss the dialog without an answer."
				confirm={{ label: 'Archive' }}
			/>
			<Text>Outcome: {outcome}</Text>
		</>
	)
}
