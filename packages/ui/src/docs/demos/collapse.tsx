'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Collapse, CollapsePanel, CollapseTrigger } from '../../components/collapse'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

export default function CollapseDemo() {
	const [open, setOpen] = useState(false)

	return (
		<Stack gap="xl">
			<Example title="Default">
				<Collapse trigger="Toggle details">
					<Text variant="muted">
						When the trigger is a string, Collapse renders it as muted text that highlights on
						hover. The panel animates open with a smooth height transition.
					</Text>
				</Collapse>
			</Example>

			<Example title="Default open">
				<Collapse defaultOpen trigger="Toggle details">
					<Text variant="muted">
						This content is visible by default because the collapse starts open.
					</Text>
				</Collapse>
			</Example>

			<Example title="Compound API">
				<Collapse>
					<CollapseTrigger>{({ open }) => (open ? 'Hide code' : 'Show code')}</CollapseTrigger>
					<CollapsePanel>
						<Text variant="muted">
							Use the compound API when you need a render-prop trigger that reacts to the open
							state.
						</Text>
					</CollapsePanel>
				</Collapse>
			</Example>

			<Example title="Controlled">
				<Stack gap="sm">
					<Button onClick={() => setOpen((o) => !o)}>{open ? 'Hide panel' : 'Show panel'}</Button>
					<Collapse open={open} onOpenChange={setOpen}>
						<CollapsePanel>
							<Text variant="muted">
								Pass <code>open</code> and <code>onOpenChange</code> to drive Collapse from parent
								state. Any external button can toggle the panel.
							</Text>
						</CollapsePanel>
					</Collapse>
				</Stack>
			</Example>
		</Stack>
	)
}
