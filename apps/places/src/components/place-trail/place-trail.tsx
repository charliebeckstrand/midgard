'use client'

import { Fragment, type MouseEvent, type ReactNode } from 'react'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'

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

/**
 * A breadcrumb trail that gives way from the left.
 *
 * It collapses rather than wraps. A trail is one line of orientation over a map
 * that owns the screen, and a wrapped one grows the header downward — taking the
 * thing it describes to say where the reader is, and moving every control beside
 * it in the process. The fit is the one of a collapsing `Breadcrumb`: the steps
 * above the title give way whole to a mark, leftmost first, and the title clips
 * last.
 *
 * Give the trail a box that holds the row's full width (`flex-1`), because the
 * fit measures that box. Anything that sits on the line after the trail goes in
 * as `children`, inside the same row.
 */
export function PlaceTrail({ steps, className, children }: PlaceTrailProps) {
	return (
		<Breadcrumb collapse>
			<BreadcrumbList className={className}>
				{steps.map((step, at) => {
					const picks = step.onPick !== undefined

					return (
						<Fragment key={step.label}>
							{at > 0 ? <BreadcrumbSeparator /> : null}

							<BreadcrumbItem>
								<BreadcrumbLink
									current={at === steps.length - 1}
									href={picks ? '#' : undefined}
									// `font-semibold` beats the current crumb's `font-normal`, so the
									// trail reads as one title.
									className="font-semibold"
									onClick={
										picks
											? (event: MouseEvent) => {
													event.preventDefault()

													step.onPick?.()
												}
											: undefined
									}
								>
									{step.label}
								</BreadcrumbLink>
							</BreadcrumbItem>
						</Fragment>
					)
				})}
			</BreadcrumbList>

			{children}
		</Breadcrumb>
	)
}
