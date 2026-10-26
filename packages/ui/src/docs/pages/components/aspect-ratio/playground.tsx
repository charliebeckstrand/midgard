import { AspectRatio, type AspectRatioProps } from 'ui/aspect-ratio'
import { Card } from 'ui/card'
import { Code } from 'ui/code'

export default function AspectRatioPlayground(props: AspectRatioProps) {
	return (
		<Card className="p-0">
			<AspectRatio {...props} className="flex items-center justify-center">
				<Code>{props.ratio ?? '1/1'}</Code>
			</AspectRatio>
		</Card>
	)
}
