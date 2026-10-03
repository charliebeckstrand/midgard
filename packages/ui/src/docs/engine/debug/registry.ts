import { MousePointer } from 'lucide-react'
import type { ComponentType } from 'react'
import { type TrackedPromise, tracked } from '../registry'
import { readDebugTools } from './store'

/** The props of the sheet of a tool. The header button of the tool opens it. */
export type DebugSheetProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
}

/**
 * One tool of the Debug section of the settings. The tool is off until the
 * reader turns it on, and its code loads only then.
 */
export type DebugTool = {
	/** The key of the tool in the stored list of the tools that are on. */
	id: string
	/** The name on the switch, and the accessible name of the header button. */
	label: string
	/** The icon of the header button. */
	icon: ComponentType
	/**
	 * The class that shows the header button while the root element lists the
	 * tool in `data-debug`. It is a literal, so that Tailwind finds it.
	 */
	shown: string
	/**
	 * Loads the sheet of the tool. It mounts while the tool is on and unmounts
	 * when the tool goes off, so the tool starts and stops its own work in it.
	 */
	load: () => Promise<{ default: ComponentType<DebugSheetProps> }>
}

/** The debug tools. To add a tool, add its module to this folder and its row here. */
export const debugTools: readonly DebugTool[] = [
	{
		id: 'event-log',
		label: 'Event log',
		icon: MousePointer,
		shown: '[:root[data-debug~=event-log]_&]:contents',
		load: () => import('./event-log').then(({ EventLogSheet }) => ({ default: EventLogSheet })),
	},
]

const cache = new Map<string, TrackedPromise<ComponentType<DebugSheetProps> | null>>()

/**
 * Return a cached promise for the sheet of the tool `id`. It does not reject:
 * a chunk that fails to load gives `null`, and the header button then opens
 * nothing.
 */
export function loadDebugTool(id: string): Promise<ComponentType<DebugSheetProps> | null> {
	return tracked(cache, id, () => {
		const tool = debugTools.find((other) => other.id === id)

		if (!tool) return Promise.resolve(null)

		return tool.load().then(
			({ default: Component }) => Component,
			() => null,
		)
	})
}

/**
 * Start the loads of the tools that are on. The client entry calls it before
 * it hydrates, and does not wait for it, so that a tool such as the event log
 * starts its work while the page hydrates.
 */
export function preloadDebugTools(): Promise<unknown> {
	return Promise.all(readDebugTools().map(loadDebugTool))
}
