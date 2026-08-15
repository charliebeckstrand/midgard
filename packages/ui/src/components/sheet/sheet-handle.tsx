'use client'

import { cn } from '../../core'
import type { PanelResize } from '../../hooks/use-panel-resize'
import type { SheetPanelVariants } from '../../recipes/kata/sheet'
import { k } from '../../recipes/kata/sheet'

/** Props for {@link SheetHandle}. @internal */
export type SheetHandleProps = {
	/** The gesture bindings, from {@link usePanelResize} on the panel's owner. */
	handleProps: PanelResize['handleProps']
	/** The share of the screen the panel covers, which is what the value reports. */
	covers: number
	/** Which edge the panel is docked to, which decides the edge the grip rides. */
	side: NonNullable<SheetPanelVariants['side']>
	className?: string
}

/**
 * The grab bar on the inner edge of a resizable sheet.
 *
 * A window splitter — `role="separator"` with a tab stop — which is what a
 * resize control is. It answers the arrow keys as well as the drag, because a
 * panel whose width only a pointer can set is one a keyboard reader cannot open
 * up. `aria-valuenow` reads as the share of the screen the panel covers, so the
 * value means the same thing a reader can see.
 *
 * `aria-orientation` names the separator's own line and not the axis it moves
 * on: a grip standing on the left edge of a right-hand sheet is a vertical
 * separator that resizes horizontally, which is the reverse of the drawer's.
 *
 * It draws and reports; the gesture belongs to the component that owns the panel
 * — see {@link usePanelResize} for why.
 *
 * @internal
 */
export function SheetHandle({ handleProps, covers, side, className }: SheetHandleProps) {
	const vertical = side === 'left' || side === 'right'

	return (
		// biome-ignore lint/a11y/useSemanticElements: an <hr> is void and cannot hold the bar this draws, and the focusable window-splitter pattern this implements is a div by convention
		<div
			data-slot="sheet-handle"
			role="separator"
			aria-label="Resize panel"
			aria-orientation={vertical ? 'vertical' : 'horizontal'}
			aria-valuenow={covers}
			aria-valuemin={0}
			aria-valuemax={100}
			tabIndex={0}
			{...handleProps}
			className={cn(k.handle.area, k.handle.side[side], className)}
		>
			<div className={cn(vertical ? k.handle.bar : ['h-1.5 w-10 rounded-full', 'bg-current/20'])} />
		</div>
	)
}
