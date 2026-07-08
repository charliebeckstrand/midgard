'use client'

import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid'

/** Zero cell padding for the detail `<td>`; hoisted so every mounted detail row shares one object. @internal */
const NO_PADDING = { padding: 0 }

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
 * The disclosure chevron in an {@link GridColumn.expander} cell: toggles the
 * row's detail panel, carrying `aria-expanded` and `aria-controls` naming the
 * panel so assistive tech ties the two — the master-detail analog of the group
 * header's disclosure button. A row the binding marks non-expandable renders
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
			variant="bare"
			onClick={() => toggle(rowKey)}
			aria-expanded={expanded}
			aria-controls={detailPanelId(rowKey)}
			aria-label={`${expanded ? 'Collapse' : 'Expand'} details for ${name}`}
		>
			{/* `data-open` rides the chevron element itself: `Icon` clones it and
			    preserves props it doesn't set, and a lucide glyph forwards `data-*`
			    onto its `<svg>` — so the rotate cue and the recipe's rotate class land
			    on the same svg with no wrapper. `Icon` also stamps `data-slot="icon"`,
			    so the Button reads the control as icon-only and holds its square floor. */}
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
}

/**
 * A master-detail panel row: a full-width `<tr>` whose single cell nests the
 * detail content in the same one-row CSS-grid reveal the group leaves ride
 * (`1fr` ↔ `0fr`), so the panel grows and shrinks to its content height over a
 * transition — reliable in a `<table>`, where a JS height tween on a `<td>` is
 * not. It stays mounted whatever the expansion; a closed panel is `inert` and
 * hidden from assistive tech, and its `id` ties back to the expander's
 * `aria-controls`.
 *
 * @internal
 */
export function GridDetailRow({ rowKey, colSpan, expanded, children }: GridDetailRowProps) {
	return (
		<tr
			data-detail-row={String(rowKey)}
			aria-hidden={expanded ? undefined : true}
			inert={!expanded}
		>
			<td colSpan={colSpan} style={NO_PADDING}>
				<div className={cn(k.detail.reveal.track)} data-open={dataAttr(expanded)}>
					<div className={cn(k.detail.reveal.clip)}>
						<section id={detailPanelId(rowKey)} className={cn(k.detail.panel)}>
							{children}
						</section>
					</div>
				</div>
			</td>
		</tr>
	)
}
