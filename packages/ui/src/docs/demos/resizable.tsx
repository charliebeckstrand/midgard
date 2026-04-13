'use client'

import { ResizableGroup, ResizableHandle, ResizablePanel } from '../../components/resizable'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

function Pane({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-full items-center justify-center rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
			<p className="text-sm text-zinc-500">{children}</p>
		</div>
	)
}

export default function ResizableDemo() {
	return (
		<div className="space-y-8">
			<Example title="Horizontal">
				<div className="h-48">
					<ResizableGroup>
						<ResizablePanel defaultSize={70} minSize={20}>
							<Pane>Left (70%)</Pane>
						</ResizablePanel>
						<ResizableHandle />
						<ResizablePanel defaultSize={30} minSize={20}>
							<Pane>Right (30%)</Pane>
						</ResizablePanel>
					</ResizableGroup>
				</div>
			</Example>

			<Example title="Vertical">
				<div className="h-64">
					<ResizableGroup direction="vertical">
						<ResizablePanel defaultSize={60} minSize={20}>
							<Pane>Top (60%)</Pane>
						</ResizablePanel>
						<ResizableHandle />
						<ResizablePanel defaultSize={40} minSize={20}>
							<Pane>Bottom (40%)</Pane>
						</ResizablePanel>
					</ResizableGroup>
				</div>
			</Example>

			<Example title="Three panels">
				<div className="h-48">
					<ResizableGroup>
						<ResizablePanel defaultSize={25} minSize={15}>
							<Pane>Sidebar</Pane>
						</ResizablePanel>
						<ResizableHandle />
						<ResizablePanel defaultSize={50} minSize={20}>
							<Pane>Main</Pane>
						</ResizablePanel>
						<ResizableHandle />
						<ResizablePanel defaultSize={25} minSize={15}>
							<Pane>Details</Pane>
						</ResizablePanel>
					</ResizableGroup>
				</div>
			</Example>
		</div>
	)
}
