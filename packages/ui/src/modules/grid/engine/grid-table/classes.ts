import { cn } from '../../../../core'
import type { DensityLevel } from '../../../../providers/density'
import { k } from '../../../../recipes/kata/grid'

/**
 * Effective density under {@link GridDataProps.condensed}: the tight preset
 * forces the compact step for every density-derived metric (cell padding,
 * resize-handle width, virtualized row-height, autosize measurement); a plain
 * grid keeps its resolved level. Kept out of {@link GridData} so its branch
 * doesn't weigh on the component's complexity budget. @internal
 */
export function resolveDensity(condensed: boolean, resolved: DensityLevel): DensityLevel {
	return condensed ? 'compact' : resolved
}

/**
 * Table className with the {@link GridDataProps.condensed} down-projections —
 * cell font, header/body icons, and consumer badges — layered onto the resolved
 * layout class, or that class untouched. All cast from the `<table>` onto its
 * descendants, so cells and headers read no context (see `kata/grid`
 * `condensed`). @internal
 */
export function condensedTableClass(condensed: boolean, base: string): string {
	return condensed ? cn(base, k.condensed.font, k.condensed.icon, k.condensed.badge) : base
}

/**
 * The `outline` variant's cell borders (see `k.outline`), or `''` when not
 * outlined. The grid draws its own outline in `border-collapse: separate` mode —
 * every rule riding its own cell — instead of forwarding `outline` to `<Table>`,
 * whose collapse-mode borders weld to the table grid and scroll out from under the
 * sticky header and frozen columns (a seam above the header, a shifting frozen
 * rule). Kept a helper so the branch lives here, off {@link GridData}'s complexity
 * budget. @internal
 */
export function outlineTableClass(outline: boolean | undefined): string {
	return outline ? cn(k.outline.table, k.outline.cell, k.outline.top, k.outline.left) : ''
}

/**
 * The effective `striped` parity under the `outline` variant: an outlined grid
 * pairs its per-cell rules with odd-row zebra, so a bare `striped` (the `true`
 * boolean, which `<Table>` would read as even) resolves to `'odd'` when
 * outlined. An explicit `'odd'` / `'even'` is a deliberate override and passes
 * through untouched, as does `striped` on a plain (un-outlined) grid. Kept a
 * helper so the branch lives here, off {@link GridData}'s complexity budget.
 * @internal
 */
export function stripedForOutline(
	striped: boolean | 'odd' | 'even' | undefined,
	outline: boolean | undefined,
): boolean | 'odd' | 'even' | undefined {
	return outline && striped === true ? 'odd' : striped
}

/**
 * Wrapper class for the grid's outer `data-slot="grid"` element: the base
 * chrome, plus — under `maxHeight="fill"` — the stretch that hands the
 * consumer's box to the flexing scroll region (see `k.fill`). Kept off
 * {@link GridData}'s complexity budget. @internal
 */
export function gridWrapperClass(fill: boolean): string {
	return fill ? cn(k.wrapper, k.fill.wrapper) : cn(k.wrapper)
}

/**
 * The data-body settle wash while a server-side sort is in flight — the pulse
 * over the reduced-motion dim, projected onto the data `<tbody>` (see
 * `k.body.settling`) — or `undefined` once the sort settles (or when it's
 * client-side, where `settling` never sets). Kept off {@link GridData}'s
 * complexity budget. @internal
 */
export function settleBodyClass(settling: boolean): readonly string[] | undefined {
	return settling ? k.body.settling : undefined
}
