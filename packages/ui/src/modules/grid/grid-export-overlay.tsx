'use client'

import { LoadingSpinner } from '../../components/loading'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'

/**
 * The grid's "Exporting" overlay: a scrim with a spinner-led label while an
 * async export resolves its rows, on a {@link GridDataProps.exportRows}
 * round-trip. The first Excel export also shows it while the serializer loads.
 * A synchronous export downloads on the click and never reaches this.
 *
 * Its reason for existing is the export that runs from a *right-click menu*. The
 * toolbar's "Export" trigger spins its own button, but the header and cell menus
 * close on the click. A menu-fired export therefore had no indicator at all. The
 * toolbar dropdown is also opt-in, so plenty of grids have no trigger to spin. One
 * overlay covers every surface, driven by the same pending count the trigger
 * reads (see {@link useGridExport}).
 *
 * It blocks the pointer, not the keyboard. The scrim covers the whole grid
 * wrapper, toolbar included, so a click cannot reach the search, the filters,
 * or the sort that decide what lands in the file. The overlay does not make
 * the grid inert and does not trap focus. A key press therefore still reaches
 * a focused control under it. The lockout is bounded — a failed export
 * settles its promise too, so the overlay always lifts.
 *
 * The spinner's own `<output>` is the live region that announces the wait. The
 * visible text beside it is therefore `aria-hidden`: sighted users read it once,
 * assistive tech hears it once.
 *
 * @internal
 */
export function GridExportOverlay({ active }: { active: boolean }) {
	if (!active) return null

	return (
		<div data-slot="grid-export-overlay" className={cn(k.exporting.scrim)}>
			<div className={cn(k.exporting.label)}>
				<LoadingSpinner size="sm" label="Exporting" />

				<span aria-hidden="true">Exporting</span>
			</div>
		</div>
	)
}
