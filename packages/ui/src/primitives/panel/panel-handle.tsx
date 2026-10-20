'use client'

import type { PanelResize } from '../../hooks/use-panel-resize'
import type { Orientation } from '../../types'
import { defineMessages } from '../intl/intl-messages'
import { useIntl } from '../intl/use-intl'
import { Splitter } from '../splitter/splitter'

const messages = defineMessages({
	resize: {
		id: 'ui.panel.resize',
		defaultMessage: 'Resize panel',
		description:
			'The name of the grab bar that changes the size of a drawer or a sheet, by a drag or by the arrow keys.',
	},
})

/** Props for {@link PanelHandle}. @internal */
export type PanelHandleProps = {
	/** The `data-slot` the panel's own family is named by. */
	slot: string
	/**
	 * The line the separator draws, which is not the axis it moves on. The grip on
	 * the inner edge of a right-hand sheet stands vertically and resizes the width.
	 */
	orientation: Orientation
	/** The gesture bindings, from {@link usePanelResize} on the panel's owner. */
	handleProps: PanelResize['handleProps']
	/** The share of the screen the panel covers, which is what the value reports. */
	covers: number
	/** The id of the panel that the handle sizes. The separator names it in `aria-controls`. */
	controls: string
	/** The grab area's styling and the bar it draws, which is the panel's own kata to say. */
	className?: string
}

/**
 * The grab bar of a resizable panel.
 *
 * A {@link Splitter}, which is what a resize control is. It answers the
 * arrow keys as well as the drag. A panel only a pointer can size is one a
 * keyboard reader cannot open up.
 * `aria-valuenow` reads as the share of the screen the panel covers, so the
 * value means the same thing a reader can see. `aria-controls` names the panel,
 * which is the primary pane of the APG window splitter.
 *
 * Shared by the drawer and the sheet, which differ in where the grip sits and
 * what it looks like and in nothing else. The contract above is the part that
 * must not drift between them, so it is stated once.
 *
 * It draws and reports; the gesture belongs to the component that owns the
 * panel (see {@link usePanelResize} for why).
 *
 * @internal
 */
export function PanelHandle({
	slot,
	orientation,
	handleProps,
	covers,
	controls,
	className,
}: PanelHandleProps) {
	const intl = useIntl()

	return (
		<Splitter
			data-slot={slot}
			label={intl.formatMessage(messages.resize)}
			orientation={orientation}
			controls={controls}
			value={covers}
			min={0}
			max={100}
			{...handleProps}
			className={className}
		/>
	)
}
