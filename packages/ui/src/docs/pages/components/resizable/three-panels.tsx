import { Card } from 'ui/card'
import { ResizableGroup, ResizableHandle, ResizablePanel } from 'ui/resizable'

export default function ThreePanels() {
	return (
		<ResizableGroup className="h-48">
			<ResizablePanel defaultSize={25} minSize={15}>
				<Card className="h-full" />
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize={50} minSize={20}>
				<Card className="h-full" />
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize={25} minSize={15}>
				<Card className="h-full" />
			</ResizablePanel>
		</ResizableGroup>
	)
}
