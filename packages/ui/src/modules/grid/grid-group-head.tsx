'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { TableHeader, TableRow } from '../../components/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn } from '../../core'
import { k as gridK } from '../../recipes/kata/grid'
import { k } from '../../recipes/kata/grid-group'
import { useGrid } from './context'
import type { GridColumnGroup, GridGroupSpan } from './grid-group-types'
import { pinnedClassName, pinnedOffsetStyle } from './grid-pinning'
import type { GridGroupHeader } from './use-grid-group'
import type { GridColumnPinning } from './use-grid-table'

/** A group's display label: its `title` when set, else its `id` stringified. @internal */
function groupLabel(group: GridColumnGroup): string {
	return typeof group.title === 'string' ? group.title : String(group.id)
}

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
 * {@link GridColumnGroup.collapsible}); a `plain` span is an empty spacer that
 * sticks to a pinned column's edge so the band tracks the frozen columns.
 *
 * @internal
 */
export function GridGroupHead({
	header,
	pinning,
	ariaRowIndex,
	gridSemantics,
}: GridGroupHeadProps) {
	const { stickyHeader } = useGrid()

	// Running 1-based column index for grid semantics: a spanning band cell takes
	// the index of its leftmost column, then the counter advances by the span.
	let colIndex = 1

	return (
		<TableRow aria-rowindex={ariaRowIndex}>
			{header.spans.map((span) => {
				const cellColIndex = gridSemantics ? colIndex : undefined

				colIndex += span.colSpan

				return (
					<GridGroupHeadCell
						key={span.leadColumnId}
						span={span}
						header={header}
						pinning={pinning}
						stickyHeader={stickyHeader}
						colIndex={cellColIndex}
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
	colIndex: number | undefined
}

/** One band cell: a group band, or an empty spacer that sticks to a pinned edge. @internal */
function GridGroupHeadCell({
	span,
	header,
	pinning,
	stickyHeader,
	colIndex,
}: GridGroupHeadCellProps) {
	// A plain filler over a pinned column sticks to its edge like the column below,
	// so the band doesn't scroll away from a frozen column; a group band never
	// covers a pinned column (see `buildGroupSpans`), so it needs no sticky offset.
	const pinned = span.kind === 'plain'

	return (
		<TableHeader
			scope={span.kind === 'group' ? 'colgroup' : 'col'}
			colSpan={span.colSpan}
			aria-colindex={colIndex}
			className={cn(
				k.cell,
				stickyHeader && gridK.sticky.head,
				pinned && pinnedClassName(pinning, span.leadColumnId, { header: true }),
			)}
			style={pinned ? pinnedOffsetStyle(pinning, span.leadColumnId) : undefined}
		>
			{span.kind === 'group' && (
				<GridGroupBand
					group={span.group}
					collapsed={header.collapsed.has(span.group.id)}
					onToggleCollapse={header.onToggleCollapse}
				/>
			)}
		</TableHeader>
	)
}

/** Props for {@link GridGroupBand}. @internal */
type GridGroupBandProps = {
	group: GridColumnGroup
	collapsed: boolean
	onToggleCollapse: (id: string | number) => void
}

/** The colored band content: icon + title Badge, a trailing fold chevron (collapsible), and a `+N` count when collapsed. @internal */
function GridGroupBand({ group, collapsed, onToggleCollapse }: GridGroupBandProps) {
	const label = groupLabel(group)

	// Members the band hides while collapsed — every column but the anchor.
	const hiddenCount = Math.max(0, group.columns.length - 1)

	const badge: ReactNode = (
		<Badge
			color={group.color}
			variant="soft"
			prefix={group.icon ? <Icon icon={group.icon} /> : undefined}
		>
			{group.title ?? String(group.id)}
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
	if (!group.collapsible) return <span className={cn(k.band)}>{badgeWithTooltip}</span>

	// Collapsible: the Badge leads (so it lines up with the column), then a bare
	// icon Button folds the group — the chevron alone lives in the button, so it
	// brightens on hover. The `+N` count trails the toggle when collapsed.
	return (
		<span className={cn(k.band)}>
			{badgeWithTooltip}

			<Button
				variant="bare"
				type="button"
				aria-expanded={!collapsed}
				aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
				onClick={() => onToggleCollapse(group.id)}
			>
				<Icon icon={collapsed ? <ChevronRight /> : <ChevronDown />} />
			</Button>

			{collapsed && hiddenCount > 0 && <span className={cn(k.count)}>+{hiddenCount}</span>}
		</span>
	)
}
