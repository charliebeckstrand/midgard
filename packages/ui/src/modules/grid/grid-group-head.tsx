'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type ReactNode, useId } from 'react'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { TableHeader, TableRow } from '../../components/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn } from '../../core/cn'
import { Glyph } from '../../primitives/glyph'
import { useIntl } from '../../primitives/intl/use-intl'
import { k as gridK } from '../../recipes/kata/grid'
import { k } from '../../recipes/kata/grid-group'
import { k as tableK } from '../../recipes/kata/table'
import { useGridHead } from './context'
import { columnLabel } from './engine/grid-column/label'
import type { GridGroupHeader } from './engine/grid-group/resolve'
import { gridMessages } from './engine/grid-messages'
import { pinnedCellAttribute, pinnedClassName, pinnedOffsetStyle } from './engine/grid-pin/styles'
import type { GridColumnPinning } from './engine/grid-table/pinning-view'
import type { GridColumnGroup, GridGroupSpan } from './grid-group-types'

/** Props for {@link GridGroupHead}. @internal */
type GridGroupHeadProps = {
	header: GridGroupHeader
	/** Frozen-column controls, so a band's plain filler over a pinned column sticks to its edge. */
	pinning: GridColumnPinning | null
	/** `1` when the grid carries global row indices (the band is header row 1); `undefined` otherwise. */
	ariaRowIndex: number | undefined
	/** Whether each cell carries an `aria-colindex` (grid semantics on). */
	gridSemantics: boolean
}

/**
 * The column-group band row: one `<th>` per {@link GridGroupSpan}, rendered
 * above the column-header row. A `group` span draws its colored {@link Badge}
 * (icon + title, an optional description tooltip, and a collapse toggle when
 * {@link GridColumnGroup.collapsible}). A `plain` span is an empty spacer that
 * sticks to a pinned column's edge, so the band tracks the frozen columns. The
 * spacer is a `<td>`, because a header with no text names nothing (axe
 * `empty-table-header`).
 * Under a sticky header the band sticks at the top edge, and the column row
 * sticks below it (see `gridK.sticky.stack`).
 *
 * @internal
 */
export function GridGroupHead({
	header,
	pinning,
	ariaRowIndex,
	gridSemantics,
}: GridGroupHeadProps) {
	const { stickyHeader } = useGridHead()

	// Running 1-based column index for grid semantics: a spanning band cell takes
	// the index of its leftmost column, then the counter advances by the span.
	// A loop, not a counter in the map callback: the React Compiler rejects a
	// reassignment inside a callback.
	const startIndices: number[] = []

	let ariaColIndex = 1

	for (const span of header.spans) {
		startIndices.push(ariaColIndex)

		ariaColIndex += span.colSpan
	}

	return (
		<TableRow aria-rowindex={ariaRowIndex}>
			{header.spans.map((span, index) => {
				const cellColIndex = gridSemantics ? startIndices[index] : undefined

				return (
					<GridGroupHeadCell
						key={span.leadColumnId}
						span={span}
						header={header}
						pinning={pinning}
						stickyHeader={stickyHeader}
						ariaColIndex={cellColIndex}
					/>
				)
			})}
		</TableRow>
	)
}

/** Props for {@link GridGroupHeadCell}. @internal */
type GridGroupHeadCellProps = {
	span: GridGroupSpan
	header: GridGroupHeader
	pinning: GridColumnPinning | null
	stickyHeader: boolean
	ariaColIndex: number | undefined
}

/** One band cell: a group band, or an empty spacer that sticks to a pinned edge. @internal */
function GridGroupHeadCell({
	span,
	header,
	pinning,
	stickyHeader,
	ariaColIndex,
}: GridGroupHeadCellProps) {
	// The description of a group reaches the keyboard and a screen reader as
	// hidden text that the band describes itself by. The tooltip over the badge
	// is for a pointer, and a badge takes no focus.
	const descriptionId = useId()

	// The title of the group alone names the band. Without it, the band takes
	// its name from all of its content: the collapse toggle, the hidden count,
	// and the description.
	const titleId = useId()

	const className = cn(k().base, stickyHeader && gridK.sticky.head)

	// A plain filler over a pinned column sticks to its edge like the column below,
	// so the band doesn't scroll away from a frozen column; a group band never
	// covers a pinned column (see `buildGroupSpans`), so it needs no sticky offset.
	if (span.kind === 'plain') {
		return (
			<td
				colSpan={span.colSpan}
				aria-colindex={ariaColIndex}
				className={cn(
					tableK().header,
					className,
					pinnedClassName(pinning, span.leadColumnId, { header: true }),
				)}
				style={pinnedOffsetStyle(pinning, span.leadColumnId)}
				data-grid-pin={pinnedCellAttribute(pinning, span.leadColumnId)}
			/>
		)
	}

	const description = span.group.description

	return (
		// `scope="col"` with a `colSpan` names exactly the columns that the band
		// spans. A `colgroup` scope reads a `<colgroup>`, which holds every column
		// of a resizable grid.
		<TableHeader
			scope="col"
			colSpan={span.colSpan}
			aria-colindex={ariaColIndex}
			// A group band carries its id so a right-click on its badge resolves to the
			// column-group context menu (Clear color / Manage columns).
			data-group-band=""
			data-group-id={span.group.id}
			aria-labelledby={titleId}
			aria-describedby={description ? descriptionId : undefined}
			className={className}
		>
			<div className={k().content}>
				<GridGroupBand
					titleId={titleId}
					group={span.group}
					collapsed={header.collapsed.has(span.group.id)}
					hiddenCount={countHidden(span.group, header.collapsedHidden)}
					onToggleCollapse={header.onToggleCollapse}
				/>

				{/* A group draws a 2px rule under its Badge, spanning the cell's content
					    width: inset by the header padding, so it aligns with the column titles
					    and splits from the neighboring group. Colored in the group's hue, or a
					    neutral gray when it has none (matching a colorless row group's rail),
					    so clearing a color leaves the underline in place rather than dropping
					    it. */}
				<div
					data-slot="grid-group-rule"
					className={k({ color: span.group.color }).rule}
					aria-hidden="true"
				/>

				{/* `hidden` keeps the description out of the name of the band, and
					    `aria-describedby` still reads it, so it reads one time. */}
				{description && (
					<span id={descriptionId} hidden>
						{description}
					</span>
				)}
			</div>
		</TableHeader>
	)
}

/** Props for {@link GridGroupBand}. @internal */
type GridGroupBandProps = {
	/** The id of the title span. The band cell takes its name from it. */
	titleId: string
	group: GridColumnGroup
	collapsed: boolean
	/** The number of members that the collapse hides. */
	hiddenCount: number
	onToggleCollapse: (id: string | number) => void
}

/**
 * The number of the members of `group` that its collapse hides. A member that
 * the reader hid, or that is pinned away from the band, does not count.
 * @internal
 */
function countHidden(group: GridColumnGroup, collapsedHidden: ReadonlySet<string | number>) {
	return group.columns.filter((id) => collapsedHidden.has(id)).length
}

/** The colored band content: icon + title Badge, a trailing fold chevron (collapsible), and a `+N` count when collapsed. @internal */
function GridGroupBand({
	titleId,
	group,
	collapsed,
	hiddenCount,
	onToggleCollapse,
}: GridGroupBandProps) {
	const intl = useIntl()

	const label = columnLabel(group)

	const badge: ReactNode = (
		<Badge
			color={group.color}
			variant="soft"
			prefix={group.icon ? <Icon icon={group.icon} /> : undefined}
		>
			<span id={titleId}>{group.title ?? String(group.id)}</span>
		</Badge>
	)

	// A description reveals as a tooltip over the Badge, whether or not it folds.
	const badgeWithTooltip: ReactNode = group.description ? (
		<Tooltip>
			<TooltipTrigger>{badge}</TooltipTrigger>

			<TooltipContent>{group.description}</TooltipContent>
		</Tooltip>
	) : (
		badge
	)

	// Non-collapsible: the Badge alone, flush with its column's left edge.
	if (!group.collapsible) return <span className={k().band.row}>{badgeWithTooltip}</span>

	// Collapsible: the Badge leads (so it lines up with the column), then a bare
	// icon Button folds the group (the chevron alone lives in the button, so it
	// brightens on hover). The `+N` count trails the toggle when collapsed.
	return (
		<span className={k().band.row}>
			{badgeWithTooltip}

			<Button
				variant="bare"
				type="button"
				aria-expanded={!collapsed}
				// A stable name: `aria-expanded` gives the state, so a name with a verb
				// would say the state a second time.
				aria-label={intl.formatMessage(gridMessages.groupColumns, { group: label })}
				onClick={() => onToggleCollapse(group.id)}
			>
				{/* A column group folds horizontally: a caret to the inline start while
				    collapsed, and to the inline end once expanded (where its columns show).
				    The caret mirrors in a right-to-left grid. */}
				<Icon
					icon={collapsed ? <Glyph icon={ChevronLeft} /> : <Glyph icon={ChevronRight} />}
					className={k().band.caret}
				/>
			</Button>

			{collapsed && hiddenCount > 0 && (
				<span className={k().count}>+{intl.formatNumber(hiddenCount)}</span>
			)}
		</span>
	)
}
