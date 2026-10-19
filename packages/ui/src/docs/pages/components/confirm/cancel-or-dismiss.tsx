import { useState } from 'react'
import { Button } from 'ui/button'
import { Confirm } from 'ui/confirm'
import { Text } from 'ui/text'
import { PointerHint } from '../../../kit/pointer-hint.tsx'

type Result = 'None' | 'Confirmed' | 'Canceled' | 'Closed'

export default function CancelOrDismiss() {
	const [open, setOpen] = useState(false)

	const [result, setResult] = useState<Result>('None')

	return (
		<>
			<Button
				onClick={() => {
					setResult('None')
					setOpen(true)
				}}
			>
				Archive project
			</Button>
			<Confirm
				open={open}
				onOpenChange={(next) => {
					setOpen(next)
					// The Cancel button also closes the dialog. Keep its result.
					if (!next) setResult((prev) => (prev === 'Canceled' ? prev : 'Closed'))
				}}
				onCancel={() => setResult('Canceled')}
				onConfirm={() => {
					setResult('Confirmed')
					setOpen(false)
				}}
				title="Archive the project?"
				description={
					<PointerHint
						mouse="Press Escape or click the backdrop to close the dialog without an answer."
						touch="Tap the backdrop to close the dialog without an answer."
					/>
				}
				confirm={{ label: 'Archive' }}
			/>
			<Text>Last result: {result}</Text>
		</>
	)
}
