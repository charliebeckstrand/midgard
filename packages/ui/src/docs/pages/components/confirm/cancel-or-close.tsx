import { useState } from 'react'
import { Button } from 'ui/button'
import { Confirm } from 'ui/confirm'
import { Text } from 'ui/text'
import { PointerHint } from '../../../kit/pointer-hint.tsx'
import { dialogResults } from './results.ts'

type Result = keyof typeof dialogResults

export default function CancelOrClose() {
	const [open, setOpen] = useState(false)

	const [result, setResult] = useState<Result>('none')

	return (
		<>
			<Button
				onClick={() => {
					setResult('none')
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
					if (!next) setResult((prev) => (prev === 'canceled' ? prev : 'closed'))
				}}
				onCancel={() => setResult('canceled')}
				onConfirm={() => {
					setResult('confirmed')
					setOpen(false)
				}}
				title="Archive the project?"
				description={
					<PointerHint
						mouseText="Press Escape or click the backdrop to close the dialog without an answer."
						touchText="Tap the backdrop to close the dialog without an answer."
					/>
				}
				confirm={{ label: 'Archive' }}
			/>
			<Text>Last result: {dialogResults[result]}</Text>
		</>
	)
}
