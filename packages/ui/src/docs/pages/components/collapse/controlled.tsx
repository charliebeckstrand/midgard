import { useState } from 'react'
import { Button } from 'ui/button'
import { Collapse, CollapsePanel } from 'ui/collapse'
import { Text } from 'ui/text'

export default function Controlled() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button aria-expanded={open} onClick={() => setOpen(!open)}>
				{open ? 'Hide details' : 'Show details'}
			</Button>
			<Collapse open={open} onOpenChange={setOpen}>
				<CollapsePanel>
					<Text tone="muted">
						Express shipping arrives in one business day. Order before 2:00 PM to ship the same day.
					</Text>
				</CollapsePanel>
			</Collapse>
		</>
	)
}
