'use client'

import { cn } from '../../core'
import type { PanelResize } from '../../hooks/use-panel-resize'
import { k } from '../../recipes/kata/drawer'

/** Props for {@link DrawerHandle}. @internal */
export type DrawerHandleProps = {
	/** The gesture bindings, from {@link useDrawerResize} on the panel's owner. */
	handleProps: PanelResize['handleProps']
	/** The share of the screen the panel covers, which is what the value reports. */
	covers: number
	className?: string
}

/**
 * The grab bar at the top of a resizable drawer.
 *
 * A window splitter — `role="separator"` with a tab stop — which is what a resize
 * control is. It answers the arrow keys as well as the drag, because a panel
 * whose height only a pointer can set is one a keyboard reader cannot open up.
 * `aria-valuenow` reads as the share of the screen the panel covers, so the value
 * means the same thing a reader can see.
 *
 * It draws and reports; the gesture belongs to the component that owns the panel
 * — see {@link usePanelResize} for why.
 *
 * @internal
 */
export function DrawerHandle({ handleProps, covers, className }: DrawerHandleProps) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: an <hr> is void and cannot hold the bar this draws, and the focusable window-splitter pattern this implements is a div by convention
		<div
			data-slot="drawer-handle"
			role="separator"
			aria-label="Resize panel"
			aria-orientation="horizontal"
			aria-valuenow={covers}
			aria-valuemin={0}
			aria-valuemax={100}
			tabIndex={0}
			{...handleProps}
			className={cn(k.handle.area, className)}
		>
			<div className={cn(k.handle.bar)} />
		</div>
	)
}
