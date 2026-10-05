'use client'

import { Fragment, type MouseEvent, type ReactNode } from 'react'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'
import { cn } from 'ui/core'
import { Flex } from 'ui/structure/flex'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'

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
	/** What shares the trail's line, after the last crumb. The crumbs give way before it does. */
	children?: ReactNode
}

/** What a step above the title shows in place of its label once the row is narrow. */
const MARK = '…'

/**
 * One crumb. The title keeps its label and clips at the row's end. A step above
 * it shows its label, or, below the row's width rule, the mark that stands for
 * it.
 *
 * A collapsed label goes to `sr-only` rather than away, so the crumb still
 * announces where it goes; the mark is what is drawn, and says nothing. The
 * tooltip hangs on the mark alone, so it opens only where the mark is drawn: a
 * crumb the reader can already read would say the same thing twice.
 */
function TrailCrumb({ step, current }: { step: PlaceTrailStep; current: boolean }) {
	const picks = step.onPick !== undefined

	return (
		<BreadcrumbLink
			current={current}
			href={picks ? '#' : undefined}
			// `font-semibold` is held here so it beats the current crumb's
			// `font-normal`, and the trail reads as one title.
			className={cn('font-semibold', current && 'block min-w-0 truncate')}
			onClick={
				picks
					? (event: MouseEvent) => {
							event.preventDefault()

							step.onPick?.()
						}
					: undefined
			}
		>
			{current ? (
				step.label
			) : (
				<>
					<span className="@max-lg:sr-only">{step.label}</span>

					<Tooltip>
						<TooltipTrigger>
							{/* `select-none` so a reader who selects the trail and copies it
							    takes the labels with them, not an ellipsis per crumb. */}
							<span aria-hidden="true" className="hidden select-none @max-lg:inline">
								{MARK}
							</span>
						</TooltipTrigger>

						<TooltipContent>{step.label}</TooltipContent>
					</Tooltip>
				</>
			)}
		</BreadcrumbLink>
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
 * The last step is where the reader is, so it keeps its text and clips only at
 * the row's end. The steps above it are context: once the row is narrower than
 * `32rem`, each gives way whole to a mark, which the reader knows is a step and
 * can still pick. Half a proper noun costs the room of a word and carries none
 * of it.
 *
 * The rule is a container query on the trail's own row rather than a measure,
 * so the server's markup is already the settled trail and nothing corrects it
 * after the first paint. Give the trail a box that holds the row's full width
 * (`flex-1`), because the query reads that box. Anything that sits on the line
 * after the trail goes in as `children`, inside the same row.
 */
export function PlaceTrail({ steps, className, children }: PlaceTrailProps) {
	return (
		<Flex gap="md" align="center" className="@container min-w-0">
			{/* `min-w-0` is what lets the trail give way to what follows it, rather
			    than push it out of the row. */}
			<Breadcrumb className="min-w-0">
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

								{/* Only the title gives width back under pressure. `min-w-0` is
								    what lets it be narrower than its text at all. */}
								<BreadcrumbItem className={current ? 'min-w-0' : 'shrink-0'}>
									<TrailCrumb step={step} current={current} />
								</BreadcrumbItem>
							</Fragment>
						)
					})}
				</BreadcrumbList>
			</Breadcrumb>

			{children}
		</Flex>
	)
}
