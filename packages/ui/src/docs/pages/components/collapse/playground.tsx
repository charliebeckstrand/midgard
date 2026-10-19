import { Collapse, CollapsePanel, type CollapseProps, CollapseTrigger } from 'ui/collapse'
import { Text } from 'ui/text'

export default function CollapsePlayground(props: CollapseProps) {
	return (
		<Collapse {...props}>
			<CollapseTrigger>Show details</CollapseTrigger>
			<CollapsePanel>
				<Text tone="muted">
					Your order ships in one business day. You get a tracking link by email.
				</Text>
			</CollapsePanel>
		</Collapse>
	)
}
