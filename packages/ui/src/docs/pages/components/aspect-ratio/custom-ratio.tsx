import { AspectRatio } from 'ui/aspect-ratio'
import { Card } from 'ui/card'
import { Code } from 'ui/code'

export default function CustomRatio() {
	return (
		<Card className="p-0">
			<AspectRatio ratio={1.618} className="flex items-center justify-center">
				<Code>1.618</Code>
			</AspectRatio>
		</Card>
	)
}
