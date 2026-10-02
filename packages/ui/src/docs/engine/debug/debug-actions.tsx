import { lazy, Suspense } from 'react'
import { debugTools } from './registry'
import { useDebugTools } from './store'

// Each tool is a separate chunk, so the entry chunk does not carry it.
const tools = debugTools.map((tool) => ({ id: tool.id, Component: lazy(tool.load) }))

/** The header parts of the debug tools that are on, in the order of {@link debugTools}. */
export function DebugActions() {
	const enabled = useDebugTools()

	return tools
		.filter((tool) => enabled.includes(tool.id))
		.map(({ id, Component }) => (
			<Suspense key={id} fallback={null}>
				<Component />
			</Suspense>
		))
}
