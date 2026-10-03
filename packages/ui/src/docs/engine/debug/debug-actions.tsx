import { Suspense, use } from 'react'
import { debugTools, loadDebugTool } from './registry'
import { useDebugTools } from './store'

/** The header parts of the debug tools that are on, in the order of {@link debugTools}. */
export function DebugActions() {
	const enabled = useDebugTools()

	// Each tool is a separate chunk, so the entry chunk does not carry it. The
	// entry loads the tools that are on before it mounts (`preloadDebugTools`),
	// so their parts paint with the header. A tool that the reader turns on
	// later suspends until its chunk loads.
	return debugTools
		.filter((tool) => enabled.includes(tool.id))
		.map(({ id }) => (
			<Suspense key={id} fallback={null}>
				<DebugToolPart id={id} />
			</Suspense>
		))
}

function DebugToolPart({ id }: { id: string }) {
	const Component = use(loadDebugTool(id))

	return Component ? <Component /> : null
}
