import { type ReactNode, useState } from 'react'
import { Button } from '../../../components/button'

/**
 * Stateful trigger harness for controlled overlays that ship no built-in
 * trigger (`open`/`onOpenChange` only). Provides a real button and wires the
 * live open state and setter into `render`, so a gate can drive the full
 * open → dismiss → restore cycle through real interactions.
 */
export function Disclosure({
	label,
	render,
}: {
	label: string
	render: (open: boolean, onOpenChange: (open: boolean) => void) => ReactNode
}) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				{label}
			</Button>
			{render(open, setOpen)}
		</>
	)
}
