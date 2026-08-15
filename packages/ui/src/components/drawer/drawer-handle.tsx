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
	className?: string
}

/**
 * The grab bar at the top of a resizable drawer: a {@link PanelHandle} on the
 * panel's own edge, lying across it.
 *
 * @internal
 */
export function DrawerHandle({ handleProps, covers, className }: DrawerHandleProps) {
	return (
		<PanelHandle
			slot="drawer-handle"
			orientation="horizontal"
			handleProps={handleProps}
			covers={covers}
			className={cn(k.handle.area, className)}
			bar={cn(k.handle.bar)}
		/>
	)
}
