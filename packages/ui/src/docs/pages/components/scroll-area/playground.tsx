import { Badge } from 'ui/badge'
import { ScrollArea, type ScrollAreaProps } from 'ui/scroll-area'

const cells = Array.from({ length: 48 }, (_, index) => `Item ${index + 1}`)

export default function ScrollAreaPlayground(props: ScrollAreaProps) {
	return (
		<ScrollArea extent="sm" {...props}>
			<div className="grid w-max grid-cols-8 gap-2">
				{cells.map((cell) => (
					<Badge key={cell}>{cell}</Badge>
				))}
			</div>
		</ScrollArea>
	)
}
