'use client'

import { Card } from '../../components/card'
import { ResizableGroup, ResizableHandle, ResizablePanel } from '../../components/resizable'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

const Pane = () => <Card className="h-full" />

export default function ResizableDemo() {
	return (
		<Stack gap={8}>
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
		</Stack>
	)
}
