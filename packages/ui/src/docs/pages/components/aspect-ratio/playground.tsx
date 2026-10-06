import { AspectRatio, type AspectRatioProps } from 'ui/aspect-ratio'
import { Card } from 'ui/card'

export default function AspectRatioPlayground(props: AspectRatioProps) {
	return (
		<Card className="p-0">
			<AspectRatio {...props} className="flex items-center justify-center">
				Content
			</AspectRatio>
		</Card>
	)
}
