'use client'

import { ChevronRight } from 'lucide-react'
import type { ReactNode, Ref } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { cn, dataAttr } from '../../core'
import { Hold } from '../../primitives/mount'
import { k } from '../../recipes/kata/grid'
import { NO_PADDING } from './engine/grid-constants'
import { useGridRevealHold } from './use-grid-reveal-hold'

/** The DOM id of a row's detail panel, so the expander's `aria-controls` names it. @internal */
export function detailPanelId(rowKey: string | number): string {
	return `grid-detail-${rowKey}`
}

/** Props for {@link GridExpandToggle}. @internal */
type GridExpandToggleProps = {
	expanded: boolean
	/** Whether this row can expand; a non-expandable row renders no toggle. */
	expandable: boolean
	rowKey: string | number
	/** Human-readable row name for the toggle's label; falls back to the key. */
	rowLabel?: string
	toggle: (key: string | number) => void
}

/**
 * The disclosure chevron in an {@link GridColumn.expander} cell. It toggles the
 * row's detail panel, and carries `aria-expanded` and `aria-controls` naming the
 * panel, so assistive tech ties the two. It is the master-detail analog of the
 * group header's disclosure button. A row the binding marks non-expandable renders
 * nothing, so the column stays a quiet rail for it.
 *
 * @internal
 */
export function GridExpandToggle({
	expanded,
	expandable,
	rowKey,
	rowLabel,
	toggle,
}: GridExpandToggleProps) {
	if (!expandable) return null

	// `||`, not `??`: a blank label falls back to the key rather than leaving a
	// dangling "Expand details for ".
	const name = rowLabel || `row ${rowKey}`

	return (
		<Button
			type="button"
			variant="bare"
			onClick={() => toggle(rowKey)}
			aria-expanded={expanded}
			aria-controls={detailPanelId(rowKey)}
			aria-label={`${expanded ? 'Collapse' : 'Expand'} details for ${name}`}
		>
			{/* `data-open` rides the chevron element itself. An `Icon` clones it and
			    preserves props it doesn't set, and a lucide glyph forwards `data-*`
			    onto its `<svg>`. The rotate cue and the recipe's rotate class therefore
			    land on the same svg with no wrapper. The `Icon` also stamps
			    `data-slot="icon"`, so the Button reads the control as icon-only and
			    holds its square floor. */}
			<Icon
				icon={<ChevronRight data-open={dataAttr(expanded)} />}
				className={cn(k.detail.chevron)}
			/>
		</Button>
	)
}

/** Props for {@link GridDetailRow}. @internal */
type GridDetailRowProps = {
	rowKey: string | number
	/** Columns the panel spans — the full visible column count. */
	colSpan: number
	/** Whether the panel is open, driving its height reveal and AT visibility. */
	expanded: boolean
	/** The detail content for the row. */
	children: ReactNode
	/**
	 * Whether an open panel mounts at the closed track and then opens over the
	 * transition. A windowed body mounts a panel only when it opens, so it sets
	 * this for a panel that opens in view. A mounted panel ignores it.
	 * @defaultValue false
	 */
	enter?: boolean
	/** The measure ref of a windowed body, which reads the row height. */
	measureRef?: Ref<HTMLTableRowElement>
	/** The row's index in the item list of a windowed body, written as `data-index`. */
	dataIndex?: number
	/** The 1-based `aria-rowindex` under grid semantics; omitted on a plain table. */
	ariaRowIndex?: number
}

/**
 * A master-detail panel row: a full-width `<tr>` whose single cell nests the
 * detail content. The nest is the same one-row CSS-grid reveal the group leaves
 * ride (`1fr` ↔ `0fr`). The panel therefore grows and shrinks to its content
 * height over a transition. That is reliable in a `<table>`, where a JS height
 * tween on a `<td>` is not. It stays mounted whatever the expansion; a closed panel is `inert` and
 * hidden from assistive tech, and its `id` ties back to the expander's
 * `aria-controls`. Once the reveal has shrunk it rests in
 * `<Activity mode="hidden">`, keeping its state but leaving the visible commit.
 * The track opens on the reveal's own flag rather than on `expanded`. That flag
 * carries a panel out of that rest over the transition, and not in a snap.
 *
 * @internal
 */
export function GridDetailRow({
	rowKey,
	colSpan,
	expanded,
	children,
	enter = false,
	measureRef,
	dataIndex,
	ariaRowIndex,
}: GridDetailRowProps) {
	// A detail panel holds whatever the caller put in it — a nested grid, a chart
	// — so a closed one is the most expensive row the flat body keeps live.
	const reveal = useGridRevealHold(expanded, enter)

	return (
		<Hold hold={reveal.hold} name="grid-detail-row">
			<tr
				ref={measureRef}
				data-index={dataIndex}
				aria-rowindex={ariaRowIndex}
				data-detail-row={String(rowKey)}
				aria-hidden={expanded ? undefined : true}
				inert={!expanded}
				onTransitionEnd={reveal.onTransitionEnd}
			>
				<td colSpan={colSpan} style={NO_PADDING}>
					<div className={cn(k.detail.reveal.track)} data-open={dataAttr(reveal.open)}>
						<div className={cn(k.detail.reveal.clip)}>
							<section id={detailPanelId(rowKey)} className={cn(k.detail.panel)}>
								{children}
							</section>
						</div>
					</div>
				</td>
			</tr>
		</Hold>
	)
}
