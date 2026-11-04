'use client'

import { useComposedRefs } from 'motion/react'
import { type RefCallback, useEffect, useRef } from 'react'
import { useDensityStep } from '../../primitives/density/use-density-step'
import { useIntl } from '../../primitives/intl/use-intl'
import { resolveStep } from './engine/grid-data/classes'
import { assertProps } from './engine/grid-data/guards'
import { resolveCursorRequest } from './grid-data-resolvers'
import type { GridDataProps, GridEditSource } from './grid-data-types'
import type { GridCursorInput } from './use-grid-cursor'
import { useGridDataActivation } from './use-grid-data-activation'
import { useGridDataColumns } from './use-grid-data-columns'
import { useGridIndexRefs } from './use-grid-index'
import type { GridScrollRowIntoView } from './use-grid-navigation'
import { useGridRowHeight } from './use-grid-row-height'

/**
 * Dev-only guard against a `maxHeight` that can never bind. The grid's wrapper
 * is auto-height, so a *percentage* resolves to no constraint. The scroll
 * container then silently unbinds, virtualization degrades to rendering every
 * row, and infinite scroll loses its window. Warns once per value; the `'fill'`
 * keyword is the supported way to take a CSS-sized parent's box. Kept a hook so
 * the branch stays off {@link GridData}'s complexity budget. @internal
 */
function useMaxHeightGuard(maxHeight: string | undefined): void {
	useEffect(() => {
		if (process.env.NODE_ENV === 'production') return

		if (!maxHeight?.trim().endsWith('%')) return

		console.warn(
			`<Grid maxHeight="${maxHeight}">: a percentage can't bind. The grid's wrapper is auto-height, so the scroll container gets no bounded height and virtualization degrades to rendering every row. Use a fixed CSS length, or \`maxHeight="fill"\` inside a CSS-sized parent.`,
		)
	}, [maxHeight])
}

/**
 * The first phase of {@link GridData}, ahead of the cursor: the invariants of
 * the props, the density, the refs of the grid, the columns with their pin
 * state, row grouping and the gates it sets, the index refs, and the
 * activation of the click handlers. It ends with the input of the cursor
 * phase, which the read-only cursor and the editing cursor take alike.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridDataSetup<T>(props: GridDataProps<T>) {
	const {
		columns,
		rows,
		getKey,
		preferences,
		columnOrder: columnOrderConfigProp,
		pinning: pinningConfig,
		columnManager: columnManagerConfigProp,
		columnGroups: groupsConfig,
		groupBy: groupByConfig,
		expandable: expandableConfig,
		pagination: paginationConfig,
		columnSizing: columnSizingConfigProp,
		navigable = false,
		range = false,
		onActiveCellChange,
		onCollapsedChange,
		editable,
		onRowClick,
		onCellClick,
		onRowDoubleClick,
		onCellDoubleClick,
		rowLabel,
		header,
		maxHeight,
		virtualize,
		infiniteScroll: infiniteScrollConfig,
		tableProps,
		size,
		condensed = false,
	} = props

	// Up-front invariants for the mutually-dependent props (virtualize/maxHeight,
	// infiniteScroll/virtualize, infiniteScroll-vs-pagination); see `assertProps`.
	assertProps({
		virtualize,
		maxHeight,
		infiniteScroll: infiniteScrollConfig,
		pagination: paginationConfig,
	})

	// A percentage `maxHeight` never binds; fail loud in dev (see `useMaxHeightGuard`).
	useMaxHeightGuard(maxHeight)

	// The painted step: an explicit `size`, or `sm` under `condensed`, which is a
	// tight preset for every density-derived metric. It becomes the scope of the
	// table. Without it, the table writes no scope, and the cells, the resize
	// metrics, and the reveal padding take the step of the nearest scope in CSS.
	// So the server markup is right at the first paint.
	const density = resolveStep(condensed, size)

	// Read here, above the scope of the table, so it is the density *surrounding*
	// the grid: what an overlay the grid spawns renders at (see
	// `GridOverlayDensity`).
	const overlayDensity = useDensityStep()

	// The step as a JS value, for the work after mount that needs a number: the
	// virtualizer's row estimate and the autosizer's refit key. With no scope of
	// its own, the table takes the step around the grid.
	const step = density ?? overlayDensity

	// Sticky header pins the header row while the body scrolls (forcing a scroll
	// wrapper); resolved from the `header` config's `position`.
	const stickyHeader = header?.position === 'sticky'

	// The grid's root. The autosizer measures it to fit resizable columns to the
	// available width, and a pin narration reads its direction.
	const wrapperRef = useRef<HTMLDivElement>(null)

	// Published by the virtualized body while mounted (null otherwise), so the cursor
	// can scroll an off-window row into the rendered window before pointing
	// `aria-activedescendant` at it.
	const scrollRowIntoViewRef = useRef<GridScrollRowIntoView | null>(null)

	// The grid's scroll container (sticky/virtualized), attached through the scroll
	// region; the cursor measures it for the viewport-relative PageUp/Down step.
	const scrollRef = useRef<HTMLDivElement>(null)

	// The grid `<table>`, the roving container for row/cell keyboard navigation
	// (see `useGridRoving`), attached through `resolveTableProps`.
	const tableRef = useRef<HTMLTableElement>(null)

	// Phase 1: the columns, the pin state, row grouping, and the gates it sets.
	const {
		columnOrderConfig,
		columnSizingConfig,
		columnManagerConfig,
		estimateSize,
		overscan,
		pinnedColumns,
		pinColumn,
		rowGrouping,
		groupingMode,
		detail,
		gated,
		infiniteScroll,
		group,
		columnState,
		handleHiddenChange,
	} = useGridDataColumns<T>({
		columns,
		rowCount: rows.length,
		preferences,
		columnOrder: columnOrderConfigProp,
		pinning: pinningConfig,
		columnManager: columnManagerConfigProp,
		columnSizing: columnSizingConfigProp,
		columnGroups: groupsConfig,
		onCollapsedChange,
		groupBy: groupByConfig,
		expandable: expandableConfig,
		// A click handler turns the cursor on, so Enter or Space fires it.
		navigable: resolveCursorRequest(navigable, {
			onRowClick,
			onCellClick,
			onRowDoubleClick,
			onCellDoubleClick,
		}),
		editable,
		virtualize,
		infiniteScroll: infiniteScrollConfig,
		pagination: paginationConfig,
		wrapperRef,
	})

	// A windowed grid without an `estimateSize` takes its estimate from a
	// measured row (see `useGridRowHeight`). A body that grouping keeps
	// unwindowed reads no estimate, so it measures nothing.
	const { rowHeight, measureRef } = useGridRowHeight(
		gated.virtualize && estimateSize === undefined,
		step,
	)

	// The consumer's `tableProps.ref`, the grid's own ref, and the row measure,
	// on one node. The cursor reads the grid's ref to reseat focus on its own
	// tab stop.
	const tableElementRef: RefCallback<HTMLTableElement> = useComposedRefs(
		tableRef,
		measureRef,
		tableProps?.ref,
	)

	const {
		grouping,
		setGrouping,
		groupRow,
		expanded: groupExpanded,
		setExpanded: setGroupExpanded,
		manualExpanded,
		toggleGroup,
		renderHeader: groupRenderHeader,
	} = rowGrouping

	const { groupingActive, manualGroupingActive } = groupingMode

	const {
		columnOrder,
		setColumnOrder,
		hiddenColumns,
		columnVisibility,
		reorderColumns,
		managerItems,
	} = columnState

	// The inputs of phase 2, the keyboard cursor and its editing layer. The
	// cursor reads the index state that the view phase resolves, through these
	// refs.
	const intl = useIntl()

	const editSource: GridEditSource<T> = { rows, columns, getKey, rowLabel, intl }

	const indexRefs = useGridIndexRefs(editSource)

	const activation = useGridDataActivation<T>({
		refs: indexRefs,
		source: editSource,
		onRowClick,
		onCellClick,
		onRowDoubleClick,
		onCellDoubleClick,
	})

	const cursorInput: GridCursorInput<T> = {
		// Manual grouping stands the cursor and editing down (see `gated`).
		navigable: gated.navigable,
		range,
		editable: gated.editable,
		columns: pinnedColumns,
		onRowActivate: activation.onRowActivate,
		onCellActivate: activation.onCellActivate,
		onActiveCellChange,
		selectableRef: indexRefs.selectableRef,
		toggleActiveRow: activation.toggleActiveRow,
		scrollRowIntoViewRef,
		scrollContainerRef: scrollRef,
		tableRef,
		refs: indexRefs,
		editSource,
	}

	return {
		density,
		overlayDensity,
		step,
		stickyHeader,
		wrapperRef,
		scrollRowIntoViewRef,
		scrollRef,
		tableRef,
		columnOrderConfig,
		columnSizingConfig,
		columnManagerConfig,
		estimateSize,
		overscan,
		pinColumn,
		groupingMode,
		detail,
		gated,
		infiniteScroll,
		group,
		columnState,
		handleHiddenChange,
		rowHeight,
		tableElementRef,
		grouping,
		setGrouping,
		groupRow,
		groupExpanded,
		setGroupExpanded,
		manualExpanded,
		toggleGroup,
		groupRenderHeader,
		groupingActive,
		manualGroupingActive,
		columnOrder,
		setColumnOrder,
		hiddenColumns,
		columnVisibility,
		reorderColumns,
		managerItems,
		indexRefs,
		activation,
		cursorInput,
	}
}

/** What {@link useGridDataSetup} gives the later phases of {@link GridData}. @internal */
export type GridDataSetup<T> = ReturnType<typeof useGridDataSetup<T>>
