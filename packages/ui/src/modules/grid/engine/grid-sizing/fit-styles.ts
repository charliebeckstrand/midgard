import type { CSSProperties } from 'react'
import { cn } from '../../../../core/cn'
import { k } from '../../../../recipes/kata/grid'
import { isDataColumn } from '../../../../utilities/is-data-column'
import type { GridColumn } from '../../types'
import { DEFAULT_CONTENT_MAX, DEFAULT_MIN_COLUMN_SIZE } from '../grid-constants'
import { isFrozen } from '../grid-pin/overrides'
import { columnMinWidth } from './measure'
import { fitKeptWidth } from './sizer'

/**
 * The automatic-layout chrome of a cell: the classes of `k.fit`, and the custom
 * properties that they read. The classes act only while the `<table>` carries
 * `data-grid-fit-layout` (see `useGridColumnSizing`), so a cell carries them in
 * each layout.
 *
 * @internal
 */
export type FitCellChrome = {
	className: string | undefined
	style: CSSProperties | undefined
}

/**
 * The style of the `<table>` in the automatic layout: the default floor of a
 * column (`--grid-min`) and the default cap of its content (`--grid-cap`). The
 * cells inherit the two properties, and a cell that writes its own value
 * overrides them. Thus `k.fit` states no length of its own.
 *
 * @internal
 */
export const FIT_TABLE_STYLE = {
	'--grid-min': `${DEFAULT_MIN_COLUMN_SIZE}px`,
	'--grid-cap': `${DEFAULT_CONTENT_MAX}px`,
} as CSSProperties

/** The chrome of a cell that the fit rules do not reach: a non-data column. @internal */
const NO_FIT: FitCellChrome = { className: undefined, style: undefined }

/**
 * The automatic-layout chrome of the header cell of a column. These are the
 * rules for the width of a data column in that layout:
 *
 * - A column that keeps a `width` seed holds it. It is at least that wide, also
 *   in a table that overflows, and its content does not widen it.
 * - Each other column is at least its `minWidth`, else `DEFAULT_MIN_COLUMN_SIZE`,
 *   and at least its `least` width, the content that the grid holds (see
 *   `createColumnSizer`).
 * - A frozen column, and a column with a `maxWidth`, take no spare width.
 * - A column with a `maxWidth` is at most that wide. Its floor stops there, so
 *   the border box of the column, cell chrome included, is in the `maxWidth`.
 *
 * A non-data column holds its declared width, or takes the width of its content
 * through its own `w-px` class.
 *
 * @internal
 */
export function fitHeaderProps<T>(col: GridColumn<T>, least: number | undefined): FitCellChrome {
	if (!isDataColumn(col)) return NO_FIT

	const kept = fitKeptWidth(col)

	if (kept != null) {
		return { className: cn(k.fit.kept.head, k.fit.floor), style: floorStyle(kept) }
	}

	const wanted = least == null ? col.minWidth : Math.max(columnMinWidth(col), least)

	const floor = wanted == null || col.maxWidth == null ? wanted : Math.min(wanted, col.maxWidth)

	return {
		className: cn(k.fit.floor, (isFrozen(col) || col.maxWidth != null) && k.fit.tight),
		style: floor == null ? undefined : floorStyle(floor),
	}
}

/** The custom property of `k.fit.floor`: the least width (px) of a column. @internal */
function floorStyle(width: number): CSSProperties {
	return { '--grid-min': `${width}px` } as CSSProperties
}

/**
 * The automatic-layout chrome of a body cell of a column. The content of a column that
 * keeps a `width` seed does not widen it. The content span of each other column
 * asks for its `maxWidth` at most, else `DEFAULT_CONTENT_MAX` (see `k.fit.cap`).
 *
 * @internal
 */
export function fitCellProps<T>(col: GridColumn<T>): FitCellChrome {
	if (!isDataColumn(col)) return NO_FIT

	if (fitKeptWidth(col) != null) return { className: cn(k.fit.kept.cell), style: undefined }

	if (col.maxWidth == null) return NO_FIT

	return { className: undefined, style: { '--grid-cap': `${col.maxWidth}px` } as CSSProperties }
}
