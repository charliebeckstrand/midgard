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
					Returns are free within 30 days of delivery. Print the prepaid label from your order page.
				</Text>
			</CollapsePanel>
		</Collapse>
	)
}
