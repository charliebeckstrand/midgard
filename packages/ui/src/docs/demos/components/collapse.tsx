import { useState } from 'react'
import { Button } from '../../../components/button'
import {
	Collapse,
	CollapsePanel,
	CollapseTrigger,
	useCollapseContext,
} from '../../../components/collapse'
import { Stack } from '../../../components/stack'
import { Text } from '../../../components/text'
import { Example } from '../../engine'

function TriggerLabel() {
	const { open } = useCollapseContext()

	return open ? 'Hide details' : 'Show details'
}

function CompoundCollapseExample() {
	return (
		<Collapse>
			<CollapseTrigger>
				<TriggerLabel />
			</CollapseTrigger>
			<CollapsePanel>
				<Text severity="muted">
					The compound API exposes the open state through <code>useCollapseContext</code>, so a
					child of the trigger can change its text or style based on whether the panel is open.
				</Text>
			</CollapsePanel>
		</Collapse>
	)
}

function ControlledCollapseExample() {
	const [open, setOpen] = useState(false)

	return (
		<Stack gap="sm">
			<Button onClick={() => setOpen((o) => !o)}>{open ? 'Hide panel' : 'Show panel'}</Button>
			<Collapse open={open} onOpenChange={setOpen}>
				<CollapsePanel>
					<Text severity="muted">
						Pass <code>open</code> and <code>onOpenChange</code> to drive Collapse from parent
						state. Any external button can toggle the panel.
					</Text>
				</CollapsePanel>
			</Collapse>
		</Stack>
	)
}

export function Demo() {
	return (
		<>
			<Example title="Default">
				<Collapse>
					<CollapseTrigger>Toggle details</CollapseTrigger>
					<CollapsePanel>
						<Text severity="muted">
							A string in `CollapseTrigger` renders as muted text that highlights on hover. The
							panel animates open with a smooth height transition.
						</Text>
					</CollapsePanel>
				</Collapse>
			</Example>

			<Example title="Default open">
				<Collapse defaultOpen>
					<CollapseTrigger>Toggle details</CollapseTrigger>
					<CollapsePanel>
						<Text severity="muted">
							This content is visible by default because the collapse starts open.
						</Text>
					</CollapsePanel>
				</Collapse>
			</Example>

			<Example title="Compound API">
				<CompoundCollapseExample />
			</Example>

			<Example title="Controlled">
				<ControlledCollapseExample />
			</Example>
		</>
	)
}
