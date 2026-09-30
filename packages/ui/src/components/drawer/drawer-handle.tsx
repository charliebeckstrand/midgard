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
	/**
	 * Whether the grip resizes the panel. A grip that does not is only a thing to
	 * pull, so it is not a splitter.
	 */
	resizable: boolean
	className?: string
}

/**
 * The grab bar at the top of a drawer, lying across the panel's own edge.
 *
 * On a drawer that resizes, it is a {@link PanelHandle}: a window splitter that
 * takes focus and the arrow keys. On a drawer grown to its content, it is only a
 * thing to pull down. It then takes no focus, and assistive technology does not
 * see it. A splitter there would name a control that sets nothing, and the
 * drawer closes on `Escape` and on its backdrop already.
 *
 * @internal
 */
export function DrawerHandle({ handleProps, covers, resizable, className }: DrawerHandleProps) {
	if (!resizable) {
		return (
			<div
				data-slot="drawer-handle"
				aria-hidden="true"
				onPointerDown={handleProps.onPointerDown}
				data-dragging={handleProps['data-dragging']}
				className={cn(k.handle.area, className)}
			>
				<div className={cn(k.handle.bar)} />
			</div>
		)
	}

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
