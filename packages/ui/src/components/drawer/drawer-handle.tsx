'use client'

import { cn } from '../../core'
import type { PanelResize } from '../../hooks/use-panel-resize'
import { PanelHandle } from '../../primitives/panel/panel-handle'
import { k } from '../../recipes/kata/drawer'

/** Props for {@link DrawerHandle}. @internal */
export type DrawerHandleProps = {
	/** The gesture bindings, from {@link usePanelResize} on the panel's owner. */
	handleProps: PanelResize['handleProps']
	/** The share of the screen the panel covers, which is what the value reports. */
	covers: number
	/** The id of the drawer panel, which the separator names in `aria-controls`. */
	controls: string
	className?: string
}

/**
 * The grab bar at the top of a drawer, lying across the panel's own edge. It is a
 * {@link PanelHandle}: a window splitter that takes focus and the arrow keys. Only
 * a drawer that resizes renders it.
 *
 * @internal
 */
export function DrawerHandle({ handleProps, covers, controls, className }: DrawerHandleProps) {
	return (
		<PanelHandle
			slot="drawer-handle"
			orientation="horizontal"
			handleProps={handleProps}
			covers={covers}
			controls={controls}
			className={cn(k.handle.area, className)}
			bar={cn(k.handle.bar)}
		/>
	)
}
