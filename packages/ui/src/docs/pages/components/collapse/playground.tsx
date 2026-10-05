import { Code } from 'ui/code'
import { Collapse, CollapsePanel, type CollapseProps, CollapseTrigger } from 'ui/collapse'
import { Text } from 'ui/text'

export default function CollapsePlayground(props: CollapseProps) {
	return (
		<Collapse {...props}>
			<CollapseTrigger>Show details</CollapseTrigger>
			<CollapsePanel>
				<Text tone="muted">
					A string in <Code>CollapseTrigger</Code> renders as muted text that highlights on hover.
				</Text>
			</CollapsePanel>
		</Collapse>
	)
}
