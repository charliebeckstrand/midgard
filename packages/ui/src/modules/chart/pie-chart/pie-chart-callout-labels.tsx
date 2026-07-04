'use client'

import { motion } from 'motion/react'
import type { CSSProperties } from 'react'
import { cn } from '../../../core'
import { ReducedMotion } from '../../../primitives/reduced-motion'
import { useGlass } from '../../../providers/glass/context'
import { k } from '../../../recipes/kata/chart'
import { k as tip } from '../../../recipes/kata/tooltip'
import { CALLOUT_FADE_DELAY, CALLOUT_STAGGER } from '../chart-constants'
import type { PieCalloutCard } from './use-pie-chart-callouts'

/** Props for {@link PieChartCalloutLabels}. @internal */
export type PieChartCalloutLabelsProps = {
	cards: PieCalloutCard[]
	/** The width every card renders at, capping its wrap. */
	maxWidth: number
	/** Play the staggered mount reveal; static cards appear placed. */
	animate: boolean
	/** The legend-emphasised slice; other cards dim with their slices. */
	emphasis: number | null
}

/** A card's flush placement: pinned to the plot edge its side names, at its declumped top. @internal */
function cardStyle(card: PieCalloutCard, maxWidth: number): CSSProperties {
	return {
		position: 'absolute',
		top: card.top,
		maxWidth,
		...(card.side === 1 ? { right: 0 } : { left: 0 }),
	}
}

/**
 * The callout cards: one floating Panel wearing the shared tooltip / popover
 * chrome per slice, flush to the plot edge, its cross-axis centered on the
 * sector it names — no leader, association is spatial. The translucent fill
 * (or the transparent glass under a `<GlassProvider>`) is what keeps the muted
 * ink legible over whatever slice hues sit behind the arc, the reason a card
 * beats bare SVG text here.
 *
 * The name clamps at two lines; the share is its own non-truncating element,
 * beside a short name and wrapping under a long one, so a clamped name can
 * never eat the datum. Under `animate` each card fades and scales in on the
 * tooltip motion tokens, staggered clockwise so the pie reads as making room;
 * `ReducedMotion` strips the scale and keeps the fade. The overlay is
 * `aria-hidden` like the SVG it annotates — the data table stays the AT
 * surface.
 *
 * @internal
 */
export function PieChartCalloutLabels({
	cards,
	maxWidth,
	animate,
	emphasis,
}: PieChartCalloutLabelsProps) {
	const glass = useGlass()

	const surface = cn(tip.content({ size: 'sm' }), tip.surface[glass ? 'glass' : 'default'])

	const overlay = (
		<div
			data-slot="chart-callouts"
			aria-hidden="true"
			className="pointer-events-none absolute inset-0"
		>
			{cards.map((card) => {
				const dim = emphasis !== null && emphasis !== card.index

				const className = cn(
					surface,
					'flex flex-wrap items-baseline gap-x-1.5 transition-opacity',
					dim && 'opacity-25',
				)

				const body = (
					<>
						<span className={cn('line-clamp-2 min-w-0 break-words', k.callout)}>{card.name}</span>

						<span className={cn('shrink-0 whitespace-nowrap tabular-nums', k.callout)}>
							{card.share}
						</span>
					</>
				)

				// A sector-mode or dropped card stays mounted for measurement, but
				// invisible and out of the reveal.
				if (card.hidden) {
					return (
						<div
							key={card.index}
							ref={card.ref}
							data-slot="chart-callout"
							data-hidden="true"
							className={cn(className, 'opacity-0')}
							style={cardStyle(card, maxWidth)}
						>
							{body}
						</div>
					)
				}

				return animate ? (
					<motion.div
						key={card.index}
						ref={card.ref}
						data-slot="chart-callout"
						className={className}
						style={cardStyle(card, maxWidth)}
						initial={tip.motion.initial}
						animate={tip.motion.animate}
						transition={{
							...tip.motion.transition,
							delay: CALLOUT_FADE_DELAY + card.order * CALLOUT_STAGGER,
						}}
					>
						{body}
					</motion.div>
				) : (
					<div
						key={card.index}
						ref={card.ref}
						data-slot="chart-callout"
						className={className}
						style={cardStyle(card, maxWidth)}
					>
						{body}
					</div>
				)
			})}
		</div>
	)

	return animate ? <ReducedMotion>{overlay}</ReducedMotion> : overlay
}
