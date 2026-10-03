import { Card } from '../../../components/card'
import { ResizableGroup, ResizableHandle, ResizablePanel } from '../../../components/resizable'
import { Axes, Example } from '../../engine'

const Pane = () => <Card className="h-full" />

export function Demo() {
	return (
		<>
			<Axes
				of="ResizableGroup"
				render={(props) => (
					<div className="h-48 w-80 max-w-full">
						<ResizableGroup {...props}>
							<ResizablePanel defaultSize={50} minSize={20}>
								<Pane />
							</ResizablePanel>
							<ResizableHandle />
							<ResizablePanel defaultSize={50} minSize={20}>
								<Pane />
							</ResizablePanel>
						</ResizableGroup>
					</div>
				)}
			/>

			<Example title="Three panels">
				<div className="h-48 w-full">
					<ResizableGroup>
						<ResizablePanel defaultSize={25} minSize={15}>
							<Pane />
						</ResizablePanel>
						<ResizableHandle />
						<ResizablePanel defaultSize={50} minSize={20}>
							<Pane />
						</ResizablePanel>
						<ResizableHandle />
						<ResizablePanel defaultSize={25} minSize={15}>
							<Pane />
						</ResizablePanel>
					</ResizableGroup>
				</div>
			</Example>
		</>
	)
}
