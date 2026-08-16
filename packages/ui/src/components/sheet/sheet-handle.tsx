'use client'

import { cn } from '../../core'
import { type PanelResize, panelAxis } from '../../hooks/use-panel-resize'
import { PanelHandle } from '../../primitives/panel/panel-handle'
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
 * The grab bar on the inner edge of a resizable sheet: a {@link PanelHandle}
 * standing on the edge that faces the screen.
 *
 * A sheet docked to a side is grabbed by a separator standing the other way
 * from the drawer's, so the grip stands with it — see the archetype's grip for
 * why the orientation is the separator's line and not the axis it moves.
 *
 * @internal
 */
export function SheetHandle({ handleProps, covers, side, className }: SheetHandleProps) {
	// A panel resized across its width is grabbed by a separator standing upright.
	const orientation = panelAxis(side) === 'width' ? 'vertical' : 'horizontal'

	return (
		<PanelHandle
			slot="sheet-handle"
			orientation={orientation}
			handleProps={handleProps}
			covers={covers}
			className={cn(k.handle.area, k.handle.side[side], className)}
			bar={cn(k.handle.bar[orientation])}
		/>
	)
}
