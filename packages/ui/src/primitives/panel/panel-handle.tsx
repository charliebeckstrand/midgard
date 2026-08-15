'use client'

import type { PanelResize } from '../../hooks/use-panel-resize'

/** Props for {@link PanelHandle}. @internal */
export type PanelHandleProps = {
	/** The `data-slot` the panel's own family is named by. */
	slot: string
	/**
	 * The line the separator draws, which is not the axis it moves on: the grip on
	 * the inner edge of a right-hand sheet stands vertically and resizes the width.
	 */
	orientation: 'horizontal' | 'vertical'
	/** The gesture bindings, from {@link usePanelResize} on the panel's owner. */
	handleProps: PanelResize['handleProps']
	/** The share of the screen the panel covers, which is what the value reports. */
	covers: number
	/** The grab area's styling, which is the panel's own kata to say. */
	className?: string
	/** The bar inside it, likewise. */
	bar?: string
}

/**
 * The grab bar of a resizable panel.
 *
 * A window splitter — `role="separator"` with a tab stop — which is what a
 * resize control is. It answers the arrow keys as well as the drag, because a
 * panel only a pointer can size is one a keyboard reader cannot open up.
 * `aria-valuenow` reads as the share of the screen the panel covers, so the
 * value means the same thing a reader can see.
 *
 * Shared by the drawer and the sheet, which differ in where the grip sits and
 * what it looks like and in nothing else. The contract above is the part that
 * must not drift between them, so it is stated once.
 *
 * It draws and reports; the gesture belongs to the component that owns the
 * panel — see {@link usePanelResize} for why.
 *
 * @internal
 */
export function PanelHandle({
	slot,
	orientation,
	handleProps,
	covers,
	className,
	bar,
}: PanelHandleProps) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: an <hr> is void and cannot hold the bar this draws, and the focusable window-splitter pattern this implements is a div by convention
		<div
			data-slot={slot}
			role="separator"
			aria-label="Resize panel"
			aria-orientation={orientation}
			aria-valuenow={covers}
			aria-valuemin={0}
			aria-valuemax={100}
			tabIndex={0}
			{...handleProps}
			className={className}
		>
			<div className={bar} />
		</div>
	)
}
