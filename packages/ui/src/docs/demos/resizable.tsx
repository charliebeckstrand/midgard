'use client'

import { Area } from '../../components/area'
import { ResizableGroup, ResizableHandle, ResizablePanel } from '../../components/resizable'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

const Pane = () => <Area border="solid" />

export default function ResizableDemo() {
	return (
		<div className="space-y-8">
			<Example title="Horizontal">
				<div className="h-48">
					<ResizableGroup>
						<ResizablePanel defaultSize={50} minSize={20}>
							<Pane />
						</ResizablePanel>
						<ResizableHandle />
						<ResizablePanel defaultSize={50} minSize={20}>
							<Pane />
						</ResizablePanel>
					</ResizableGroup>
				</div>
			</Example>

			<Example title="Vertical">
				<div className="h-64">
					<ResizableGroup direction="vertical">
						<ResizablePanel defaultSize={60} minSize={20}>
							<Pane />
						</ResizablePanel>
						<ResizableHandle />
						<ResizablePanel defaultSize={40} minSize={20}>
							<Pane />
						</ResizablePanel>
					</ResizableGroup>
				</div>
			</Example>

			<Example title="Three panels">
				<div className="h-48">
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
		</div>
	)
}
