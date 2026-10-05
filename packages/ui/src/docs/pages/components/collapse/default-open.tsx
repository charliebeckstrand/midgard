import { Collapse, CollapsePanel, CollapseTrigger } from 'ui/collapse'
import { Text } from 'ui/text'

export default function DefaultOpen() {
	return (
		<Collapse defaultOpen>
			<CollapseTrigger>Toggle details</CollapseTrigger>
			<CollapsePanel>
				<Text tone="muted">
					This content is visible by default because the collapse starts open.
				</Text>
			</CollapsePanel>
		</Collapse>
	)
}
