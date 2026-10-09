import { Badge } from 'ui/badge'
import { Columns } from 'ui/columns'
import { ScrollArea, type ScrollAreaProps } from 'ui/scroll-area'

const cells = Array.from({ length: 48 }, (_, index) => `Item ${index + 1}`)

export default function ScrollAreaPlayground(props: ScrollAreaProps) {
	return (
		<ScrollArea extent="sm" {...props}>
			<Columns gap="sm" className="w-max grid-cols-8">
				{cells.map((cell) => (
					<Badge key={cell}>{cell}</Badge>
				))}
			</Columns>
		</ScrollArea>
	)
}
