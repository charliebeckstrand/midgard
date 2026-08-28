'use client'

import { Fragment, type MouseEvent, useRef } from 'react'
import { cn } from '../../core'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { Breadcrumb } from './breadcrumb'
import { BreadcrumbItem } from './breadcrumb-item'
import { BreadcrumbLink, type BreadcrumbLinkProps } from './breadcrumb-link'
import { BreadcrumbList } from './breadcrumb-list'
import { BreadcrumbSeparator } from './breadcrumb-separator'
import { useBreadcrumbFit } from './use-breadcrumb-fit'

/** One step of a {@link BreadcrumbTrail}: what it says, and where picking it goes. */
export type BreadcrumbStep = {
	label: string
	/** Destination, for a step that navigates. Renders a plain anchor. */
	href?: string
	/** Element to render the crumb as, for composing an app router link (`render={<Link href="/" />}`). */
	render?: BreadcrumbLinkProps['render']
	/** Fires when the step is picked, for a trail that drives state rather than a route. */
	onPick?: () => void
}

/** Props for {@link BreadcrumbTrail}. */
export type BreadcrumbTrailProps = {
	/** The trail, outermost first. The last step is where the reader is. */
	steps: readonly BreadcrumbStep[]
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
 * The reveal is mounted only where there is something to reveal, rather than
 * mounted everywhere and disabled: a tooltip that cannot open still carries the
 * floating machinery that would place it, on a trail that re-renders with the
 * page under it. A crumb the reader can already read says the same thing twice
 * anyway.
 *
 * @internal
 */
function TrailCrumb({
	step,
	current,
	collapsed,
	clipped,
}: {
	step: BreadcrumbStep
	current: boolean
	collapsed: boolean
	/** Whether the row cut the label short — only the current crumb ever is. */
	clipped: boolean
}) {
	const navigates = step.href !== undefined || step.render !== undefined

	const picks = step.onPick !== undefined

	// The one rule the tooltip and the cursor share: the reader cannot read this.
	const hidden = collapsed || clipped

	// A step that only drives state still needs something to click, so it borrows
	// the anchor and refuses its default below.
	const destination = step.href ?? (picks ? '#' : undefined)

	// A crumb that goes somewhere keeps its pointer; one that only holds text the
	// reader cannot fully see says so instead.
	const className = cn(CRUMB, !navigates && !picks && hidden && 'cursor-help')

	const onClick = picks
		? (event: MouseEvent) => {
				// A step that drives state rather than a route carries no destination,
				// so the anchor's own default must not fire.
				if (step.href === undefined) event.preventDefault()

				step.onPick?.()
			}
		: undefined

	// The clipping rides inner spans rather than the crumb itself: the crumb is
	// polymorphic — an anchor with a destination, a span without — and the fit
	// wants one element to read either way. They carry no padding, which is what
	// keeps that reading honest. The label stays in the tree when collapsed, so
	// the crumb still announces where it goes; the mark is what is drawn, and
	// says nothing.
	const text = (
		<>
			<span data-trail-label className={cn(TEXT, collapsed && 'w-0')}>
				{step.label}
			</span>

			{/* `select-none` because the mark is laid out in both states: closed to
			    nothing it draws no pixels, but a reader who selects the trail and copies
			    it would otherwise take an ellipsis per crumb with them. */}
			<span
				data-trail-mark
				aria-hidden="true"
				className={cn(TEXT, 'select-none', !collapsed && 'w-0')}
			>
				{MARK}
			</span>
		</>
	)

	// The two arms are written apart because the polymorphic surface is a union:
	// `render` is the call site's router link, and it only means anything beside a
	// destination for it to resolve.
	const crumb =
		destination === undefined ? (
			<BreadcrumbLink current={current} className={className} onClick={onClick}>
				{text}
			</BreadcrumbLink>
		) : (
			<BreadcrumbLink
				current={current}
				href={destination}
				render={step.render}
				className={className}
				onClick={onClick}
			>
				{text}
			</BreadcrumbLink>
		)

	if (!hidden) return crumb

	return (
		<Tooltip>
			<TooltipTrigger>{crumb}</TooltipTrigger>

			<TooltipContent>{step.label}</TooltipContent>
		</Tooltip>
	)
}

/**
 * A breadcrumb trail that gives way from the left.
 *
 * It collapses rather than wraps. A trail is one line of orientation across the
 * top of a page, and a wrapped one grows the header downward — taking room from
 * the thing it describes to say where the reader is, and moving every control
 * beside it in the process.
 *
 * Which crumb gives way is the point. The last step is where the reader is, so
 * it holds its full text as long as the row can hold it; the steps above it are
 * context, and the further out a step is the sooner it goes. A step that goes
 * gives way whole, to a `…`: half a proper noun costs the room of a word and
 * carries none of it, where a mark is a step the reader knows is there and can
 * still pick. Only once every step above it has gone does the title itself clip.
 * Either way the full text is on hover, and the label stays in the accessibility
 * tree whatever is drawn.
 *
 * How many go is measured rather than styled. The measure reads the box this
 * renders, so give it one that holds the row's full width (`flex-1 min-w-0`)
 * rather than one that shrinks to its content: a box that tracked the trail
 * would narrow as the trail collapsed, and the crumbs could never come back.
 *
 * @remarks
 * Client component (`'use client'`) — it measures. A step navigates with `href`
 * (a plain anchor) or `render` (`render={<Link href="/" />}` for an app router
 * link), or drives state with `onPick`. The last step is the current page and
 * usually carries none of them.
 */
export function BreadcrumbTrail({ steps, className }: BreadcrumbTrailProps) {
	const row = useRef<HTMLDivElement>(null)

	const { collapsed, clipped } = useBreadcrumbFit(row, steps.map((step) => step.label).join('\n'))

	return (
		<div ref={row} data-slot="breadcrumb-trail">
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
									<TrailCrumb
										step={step}
										current={current}
										collapsed={at < collapsed}
										clipped={current && clipped}
									/>
								</BreadcrumbItem>
							</Fragment>
						)
					})}
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	)
}
