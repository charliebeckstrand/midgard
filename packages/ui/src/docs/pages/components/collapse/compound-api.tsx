import { Code } from 'ui/code'
import { Collapse, CollapsePanel, CollapseTrigger, useCollapseContext } from 'ui/collapse'
import { Text } from 'ui/text'

function TriggerLabel() {
	const { open } = useCollapseContext()

	return open ? 'Hide details' : 'Show details'
}

export default function CompoundApi() {
	return (
		<Collapse>
			<CollapseTrigger>
				<TriggerLabel />
			</CollapseTrigger>
			<CollapsePanel>
				<Text tone="muted">
					The compound API exposes the open state through <Code>useCollapseContext</Code>, so a
					child of the trigger can change its text or style based on whether the panel is open.
				</Text>
			</CollapsePanel>
		</Collapse>
	)
}
