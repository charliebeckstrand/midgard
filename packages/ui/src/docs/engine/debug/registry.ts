import type { ComponentType } from 'react'

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
		id: 'tap-log',
		label: 'Tap log',
		load: () => import('./tap-log').then(({ TapLog }) => ({ default: TapLog })),
	},
]
