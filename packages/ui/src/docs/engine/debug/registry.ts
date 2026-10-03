import type { ComponentType } from 'react'
import { type TrackedPromise, tracked } from '../registry'
import { readDebugTools } from './store'

/**
 * One tool of the Debug section of the settings. The tool is off until the
 * reader turns it on, and its code loads only then.
 */
export type DebugTool = {
	/** The key of the tool in the stored list of the tools that are on. */
	id: string
	/** The name on the switch. */
	label: string
	/**
	 * Loads the part of the tool that goes in the header, such as a button that
	 * opens a sheet. It mounts while the tool is on and unmounts when the tool
	 * goes off, so the tool starts and stops its own work in that part.
	 */
	load: () => Promise<{ default: ComponentType }>
}

/** The debug tools. To add a tool, add its module to this folder and its row here. */
export const debugTools: readonly DebugTool[] = [
	{
		id: 'event-log',
		label: 'Event log',
		load: () => import('./event-log').then(({ EventLog }) => ({ default: EventLog })),
	},
]

const cache = new Map<string, TrackedPromise<ComponentType | null>>()

/**
 * Return a cached promise for the header part of the tool `id`. It does not
 * reject: a chunk that fails to load gives `null`, and the header then shows
 * no part for the tool.
 */
export function loadDebugTool(id: string): Promise<ComponentType | null> {
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
 * Start the loads of the tools that are on. The entry awaits the promise
 * before it mounts, so that the header paints with the parts of the tools.
 */
export function preloadDebugTools(): Promise<unknown> {
	return Promise.all(readDebugTools().map(loadDebugTool))
}
