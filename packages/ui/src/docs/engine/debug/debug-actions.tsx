import { Suspense, use, useState } from 'react'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import { type DebugTool, debugTools, loadDebugTool } from './registry'
import { useDebugTools } from './store'

/** The header buttons of the debug tools that are on, in the order of {@link debugTools}. */
export function DebugActions() {
	return debugTools.map((tool) => <DebugToolAction key={tool.id} tool={tool} />)
}

function DebugToolAction({ tool }: { tool: DebugTool }) {
	const enabled = useDebugTools().includes(tool.id)

	const [open, setOpen] = useState(false)

	const { id, label, icon: ToolIcon, shown } = tool

	// The button of each tool is in the prerendered page, and CSS shows it while
	// the root element lists the tool (`DebugScript`). Thus the button paints
	// with the header, and the page does not wait for the code of the tool. The
	// sheet is a separate chunk. The client entry starts its load
	// (`preloadDebugTools`), and the sheet mounts after hydration.
	return (
		<span className={`hidden ${shown}`}>
			<Button
				variant="bare"
				data-slot={`${id}-trigger`}
				aria-label={label}
				onClick={() => setOpen(true)}
			>
				<Icon icon={<ToolIcon />} />
			</Button>
			{enabled && (
				<Suspense fallback={null}>
					<DebugToolSheet id={id} open={open} onOpenChange={setOpen} />
				</Suspense>
			)}
		</span>
	)
}

function DebugToolSheet({
	id,
	...props
}: {
	id: string
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const Sheet = use(loadDebugTool(id))

	return Sheet ? <Sheet {...props} /> : null
}
