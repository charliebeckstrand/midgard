'use client'

import { type ComponentProps, createElement } from 'react'
import { LandmarkContext } from './context'
import { useLandmark } from './use-landmark'

/** Props for {@link Landmark}: the attributes of the element, and its kind. */
export type LandmarkProps = ComponentProps<'section'> & {
	/** The landmark of the page: the main landmark, or a region (a named `<section>`). */
	as: 'main' | 'section'
}

/**
 * A landmark of a page that changes inside the main landmark of another
 * layout. Each layout renders its landmarks of the page through it.
 *
 * @remarks
 * A document has one main landmark, and HTML does not let a `<main>` hold
 * another `<main>`. A layout can sit in the main slot of another layout, such
 * as the preview of an app on a page of docs. The inner layout is then content
 * of the outer main landmark:
 *
 * - `as="main"` renders a `<main>`, or a `<div>` inside another main.
 * - `as="section"` renders a `<section>`. Inside a main, it has no name, so it
 *   is not a region, and the page does not have two regions with one name.
 *
 * Each other attribute and the `ref` reach the element in each case.
 */
export function Landmark({ as, ...props }: LandmarkProps) {
	const nested = useLandmark() === 'main'

	if (as === 'section') {
		return nested ? (
			<section {...props} aria-label={undefined} aria-labelledby={undefined} />
		) : (
			<section {...props} />
		)
	}

	// JSX checks the `ref` of `<main>` against the `ref` of a `<div>`, so the
	// element comes from `createElement`.
	return (
		<LandmarkContext value="main">{createElement(nested ? 'div' : 'main', props)}</LandmarkContext>
	)
}
