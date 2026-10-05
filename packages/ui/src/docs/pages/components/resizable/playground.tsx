import { Card } from 'ui/card'
import {
	ResizableGroup,
	type ResizableGroupProps,
	ResizableHandle,
	ResizablePanel,
} from 'ui/resizable'

export default function ResizablePlayground(props: ResizableGroupProps) {
	return (
		<ResizableGroup className="h-48" {...props}>
			<ResizablePanel defaultSize={50} minSize={20}>
				<Card className="h-full" />
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize={50} minSize={20}>
				<Card className="h-full" />
			</ResizablePanel>
		</ResizableGroup>
	)
}
