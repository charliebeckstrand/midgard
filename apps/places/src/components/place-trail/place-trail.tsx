'use client'

import { Fragment, type MouseEvent, useRef } from 'react'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'
import { cn } from 'ui/core'
import { useIsTruncated } from 'ui/hooks'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import { useTrailFit } from './use-trail-fit'

/** One step of a trail: what it says, and what picking it does. */
export type PlaceTrailStep = {
	label: string
	/** Fires when the step is picked. Absent for a step that leads nowhere. */
	onPick?: () => void
}

/** Props for {@link PlaceTrail}. */
export type PlaceTrailProps = {
	/** The trail, outermost first. The last step is where the reader is. */
	steps: readonly PlaceTrailStep[]
	/** The type scale the trail reads at, which is the caller's — a page title is not a panel's. */
	className?: string
}

/** What a crumb shows in place of its label once the row cannot hold it. */
const MARK = '…'

/**
 * The crumb's own box: a row of label and mark, one of which is closed to
 * nothing. `font-semibold` is held here so it beats the current crumb's
 * `font-normal`.
 */
const CRUMB = 'flex min-w-0 max-w-full font-semibold'

/**
 * Either text of a crumb. Both are laid out in every state and closed with
 * `w-0` rather than dropped, which is what lets the fit read a collapsed
 * label's full width and a shown label's mark. `min-w-0` is what lets a flex
 * child narrower than its text exist at all: the default `auto` minimum would
 * hold every crumb at its full width, so the row would grow past the frame
 * instead of any crumb giving way.
 */
const TEXT = 'block min-w-0 truncate'

/**
 * One crumb: its label, or the mark that stands for it, with the full text on
 * hover whenever the reader cannot see all of it.
 *
 * Its own component because the overflow measure is a hook, and a trail renders
 * as many of these as it has steps. The tooltip is armed by what is showing
 * rather than always on: a crumb the reader can already read says the same
 * thing twice, and a closed tooltip renders no surface at all.
 */
function TrailCrumb({
	step,
	current,
	collapsed,
}: {
	step: PlaceTrailStep
	current: boolean
	collapsed: boolean
}) {
	const ref = useRef<HTMLSpanElement>(null)

	const truncated = useIsTruncated(ref, step.label)

	const picks = step.onPick !== undefined

	return (
		<Tooltip enabled={collapsed || truncated}>
			<TooltipTrigger>
				<BreadcrumbLink
					current={current}
					href={picks ? '#' : undefined}
					// A crumb that goes somewhere keeps its pointer; one that only holds
					// text the reader cannot fully see says so instead.
					className={cn(CRUMB, !picks && (collapsed || truncated) && 'cursor-help')}
					onClick={
						picks
							? (event: MouseEvent) => {
									event.preventDefault()

									step.onPick?.()
								}
							: undefined
					}
				>
					{/* The clipping rides inner spans rather than the crumb itself: the crumb
					    is polymorphic — an anchor with a destination, a span without — so a ref
					    on it is typed for whichever branch, and the measure wants one element
					    either way. They carry no padding, which is also what keeps the overflow
					    read honest. The label stays in the tree when collapsed, so the crumb
					    still announces where it goes; the mark is what is drawn, and says
					    nothing. */}
					<span ref={ref} data-trail-label className={cn(TEXT, collapsed && 'w-0')}>
						{step.label}
					</span>

					<span data-trail-mark aria-hidden="true" className={cn(TEXT, !collapsed && 'w-0')}>
						{MARK}
					</span>
				</BreadcrumbLink>
			</TooltipTrigger>

			<TooltipContent>{step.label}</TooltipContent>
		</Tooltip>
	)
}

/**
 * A breadcrumb trail that gives way from the left.
 *
 * It collapses rather than wraps. A trail is one line of orientation over a map
 * that owns the screen, and a wrapped one grows the header downward — taking the
 * thing it describes to say where the reader is, and moving every control beside
 * it in the process.
 *
 * Which crumb gives way is the point. The last step is where the reader is, so it
 * holds its full text as long as the row can hold it; the steps above it are
 * context, and the further out a step is the sooner it goes. A step that goes
 * gives way whole, to a mark: half a proper noun costs the room of a word and
 * carries none of it, where a mark is a step the reader knows is there and can
 * still pick. Only once every step above it has gone does the title itself clip.
 *
 * How many go is measured, not styled — see {@link useTrailFit}. The measure
 * reads the box this renders, so give it one that holds the row's full width
 * (`flex-1`) rather than one that shrinks to its content: a box that tracks the
 * trail would narrow as the trail collapses, and the crumbs could never come
 * back.
 */
export function PlaceTrail({ steps, className }: PlaceTrailProps) {
	const row = useRef<HTMLDivElement>(null)

	const collapsed = useTrailFit(row, steps.map((step) => step.label).join('\n'))

	return (
		<div ref={row}>
			<Breadcrumb>
				<BreadcrumbList className={cn('flex-nowrap', className)}>
					{steps.map((step, at) => {
						const current = at === steps.length - 1

						return (
							<Fragment key={step.label}>
								{/* The separator is a sibling of the items and never a child of one:
								    both render an `li`, and an `li` inside an `li` is not a list the
								    parser will build. It never gives way, so a crumb that has gone to
								    its mark still reads as a step in a trail. */}
								{at > 0 ? <BreadcrumbSeparator className="shrink-0" /> : null}

								{/* Only the title gives width back under pressure. Every step above
								    it is whole or a mark, so it is one or the other's width exactly. */}
								<BreadcrumbItem className={current ? 'min-w-0' : 'shrink-0'}>
									<TrailCrumb step={step} current={current} collapsed={at < collapsed} />
								</BreadcrumbItem>
							</Fragment>
						)
					})}
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	)
}
