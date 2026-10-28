import type { CSSProperties } from 'react'
import { cn } from '../../../../core'
import { k } from '../../../../recipes/kata/grid'
import { isDataColumn } from '../../../../utilities'
import type { GridColumn } from '../../types'
import { isFrozen } from '../grid-pin/overrides'
import { fitKeptWidth } from './sizer'

/**
 * The fit-layout chrome of a cell: the classes of `k.fit`, and the custom
 * properties that they read. The classes act only while the `<table>` carries
 * `data-grid-fit-layout` (see `readFitLayout`), so a cell carries them in each layout.
 *
 * @internal
 */
export type FitCellChrome = {
	className: string | undefined
	style: CSSProperties | undefined
}

/** The chrome of a cell that the fit rules do not reach: a non-data column. @internal */
const NO_FIT: FitCellChrome = { className: undefined, style: undefined }

/**
 * The fit-layout chrome of the header cell of a column. These are the rules for
 * the width of a data column in the fit layout:
 *
 * - A column that keeps a `width` seed holds it. It is at least that wide, also
 *   in a table that overflows, and its content does not widen it.
 * - Each other column is at least its `minWidth`, else 40px.
 * - A frozen column, and a column with a `maxWidth`, take no spare width.
 *
 * A non-data column holds its declared width, or takes the width of its content
 * through its own `w-px` class.
 *
 * @internal
 */
export function fitHeaderProps<T>(col: GridColumn<T>): FitCellChrome {
	if (!isDataColumn(col)) return NO_FIT

	const kept = fitKeptWidth(col)

	if (kept != null) {
		return { className: cn(k.fit.kept.head, k.fit.floor), style: floorStyle(kept) }
	}

	return {
		className: cn(k.fit.floor, (isFrozen(col) || col.maxWidth != null) && k.fit.tight),
		style: col.minWidth == null ? undefined : floorStyle(col.minWidth),
	}
}

/** The custom property of `k.fit.floor`: the least width (px) of a column. @internal */
function floorStyle(width: number): CSSProperties {
	return { '--grid-min': `${width}px` } as CSSProperties
}

/**
 * The fit-layout chrome of a body cell of a column. The content of a column that
 * keeps a `width` seed does not widen it. The content span of each other column
 * asks for its `maxWidth` at most, else 480px (see `k.fit.cap`).
 *
 * @internal
 */
export function fitCellProps<T>(col: GridColumn<T>): FitCellChrome {
	if (!isDataColumn(col)) return NO_FIT

	if (fitKeptWidth(col) != null) return { className: cn(k.fit.kept.cell), style: undefined }

	if (col.maxWidth == null) return NO_FIT

	return { className: undefined, style: { '--grid-cap': `${col.maxWidth}px` } as CSSProperties }
}
