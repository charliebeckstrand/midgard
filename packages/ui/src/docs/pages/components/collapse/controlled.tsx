import { useState } from 'react'
import { Button } from 'ui/button'
import { Code } from 'ui/code'
import { Collapse, CollapsePanel } from 'ui/collapse'
import { Text } from 'ui/text'

export default function Controlled() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button aria-expanded={open} onClick={() => setOpen(!open)}>
				{open ? 'Hide panel' : 'Show panel'}
			</Button>
			<Collapse open={open} onOpenChange={setOpen}>
				<CollapsePanel>
					<Text tone="muted">
						Pass <Code>open</Code> and <Code>onOpenChange</Code> to drive Collapse from parent
						state. Any external button can toggle the panel.
					</Text>
				</CollapsePanel>
			</Collapse>
		</>
	)
}
