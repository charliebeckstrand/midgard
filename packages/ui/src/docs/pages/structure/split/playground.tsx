import { Card } from 'ui/card'
import { Split, type SplitProps } from 'ui/split'

export default function SplitPlayground(props: SplitProps) {
	return (
		<Split {...props}>
			<Card>Left</Card>
			<Card>Right</Card>
		</Split>
	)
}
