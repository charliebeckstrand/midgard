'use client'

import { useEffect, useEffectEvent } from 'react'
import { LoadingSpinner } from '../../components/loading'
import { announce } from '../../core/announcer'
import { cn } from '../../core/cn'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/grid'
import { gridMessages } from './engine/grid-messages'

/**
 * The grid's "Exporting" overlay: a scrim with a spinner-led label while an
 * async export resolves its rows, on a {@link GridDataProps.exportRows}
 * round-trip. An Excel export also shows it while it loads the serializer and
 * writes the workbook. A synchronous export downloads on the click and never
 * reaches this.
 *
 * Its reason for existing is the export that runs from a *right-click menu*. The
 * toolbar's "Export" trigger spins its own button, but the header and cell menus
 * close on the click. A menu-fired export therefore had no indicator at all. The
 * toolbar dropdown is also opt-in, so plenty of grids have no trigger to spin. One
 * overlay covers every surface, driven by the same pending count the trigger
 * reads (see {@link useGridExport}).
 *
 * It blocks the pointer, not the keyboard. The scrim covers the whole grid
 * wrapper, toolbar included. A click therefore cannot reach the search, the
 * filters, or the sort that decide what lands in the file. The overlay does not make
 * the grid inert and does not trap focus. A key press therefore still reaches
 * a focused control under it. The lockout is bounded: a failed export
 * settles its promise too, so the overlay always lifts.
 *
 * The shared announcer speaks the wait as the overlay shows (WCAG 4.1.3). A
 * live region that mounts with its text is often not spoken, so the spinner's
 * own `<output>` cannot do it, and it is `aria-hidden`. The visible text stays
 * in the accessibility tree as plain text.
 *
 * @internal
 */
export function GridExportOverlay({ active }: { active: boolean }) {
	const intl = useIntl()

	const label = intl.formatMessage(gridMessages.exporting)

	const announceWait = useEffectEvent(() => announce(label))

	useEffect(() => {
		if (active) announceWait()
	}, [active])

	if (!active) return null

	return (
		<div data-slot="grid-export-overlay" className={cn(k.exporting.scrim)}>
			<div className={cn(k.exporting.label)}>
				<LoadingSpinner size="sm" aria-hidden="true" />

				<span>{label}</span>
			</div>
		</div>
	)
}
