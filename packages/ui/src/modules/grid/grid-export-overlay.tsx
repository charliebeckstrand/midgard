'use client'

import { LoadingSpinner } from '../../components/loading'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'

/**
 * The grid's "Exporting" overlay: a scrim with a spinner-led label while an
 * async export resolves its rows, on a {@link GridDataProps.exportRows}
 * round-trip. A synchronous export downloads on the click and never reaches
 * this.
 *
 * Its reason for existing is the export that runs from a *right-click menu*. The
 * toolbar's "Export" trigger spins its own button, but the header and cell menus
 * close on the click. A menu-fired export therefore had no indicator at all. The
 * toolbar dropdown is also opt-in, so plenty of grids have no trigger to spin. One
 * overlay covers every surface, driven by the same pending count the trigger
 * reads (see {@link useGridExport}).
 *
 * Deliberately interactive-blocking rather than a decorative wash. It covers the
 * whole grid wrapper, toolbar included. The search, filters, and sort that decide
 * what lands in the file therefore can't be changed while it is written. The
 * lockout is bounded — a failed export settles its promise too, so the overlay
 * always lifts.
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
