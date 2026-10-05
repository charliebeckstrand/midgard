import { AspectRatio } from 'ui/aspect-ratio'
import { Card } from 'ui/card'

export default function CustomRatio() {
	return (
		<Card className="p-0">
			<AspectRatio ratio={1.618} className="flex items-center justify-center">
				1.618
			</AspectRatio>
		</Card>
	)
}
