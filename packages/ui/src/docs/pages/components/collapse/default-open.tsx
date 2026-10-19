import { Collapse, CollapsePanel, CollapseTrigger } from 'ui/collapse'
import { Text } from 'ui/text'

export default function DefaultOpen() {
	return (
		<Collapse defaultOpen>
			<CollapseTrigger>Shipping details</CollapseTrigger>
			<CollapsePanel>
				<Text tone="muted">Standard shipping takes three to five business days.</Text>
			</CollapsePanel>
		</Collapse>
	)
}
