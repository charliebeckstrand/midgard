'use client'

// The `m` elements of the library. A component imports them as
// `import * as m from '.../reduced-motion-elements'` and renders them under a
// `ReducedMotion` root.
//
// The list holds only the tags that the library renders. A namespace import of
// `motion/react-m` puts each of its 164 elements in the bundle, because the
// bundler keeps the whole namespace object. To animate a new tag, add it here.

import { useIsPresent } from 'motion/react'
import { div as MotionDiv, li as MotionLi, span as MotionSpan } from 'motion/react-m'
import { type ComponentProps, createElement, type ReactElement } from 'react'

export { circle, create, g, path, rect, text } from 'motion/react-m'

// The HTML tags are `inert` while they exit.
//
// `AnimatePresence` keeps an exiting child in the DOM until its exit animation
// ends, with the props of its last render. A roving container outside the child
// can then move focus to a row in it. The row unmounts at the end of the exit,
// and focus falls to the body. `inert` stops focus, a pointer, and the Tab key,
// and `useA11yRoving` skips each item under an `inert` ancestor.
//
// A Motion element reads the presence of the nearest `AnimatePresence` child
// above it, so each `m` element in an exiting subtree is `inert`. Outside an
// `AnimatePresence`, `useIsPresent` is `true`. It does not hold the removal,
// unlike `usePresence`. An open again during the exit clears the value. The
// `inert` prop of the caller stays.
//
// The SVG tags stay the plain Motion elements: a chart renders many of them,
// and an SVG mark holds no row that roving reaches.

function Div({ inert, ...props }: ComponentProps<typeof MotionDiv>): ReactElement {
	const exiting = !useIsPresent()

	return createElement(MotionDiv, { ...props, inert: inert || exiting })
}

function Li({ inert, ...props }: ComponentProps<typeof MotionLi>): ReactElement {
	const exiting = !useIsPresent()

	return createElement(MotionLi, { ...props, inert: inert || exiting })
}

function Span({ inert, ...props }: ComponentProps<typeof MotionSpan>): ReactElement {
	const exiting = !useIsPresent()

	return createElement(MotionSpan, { ...props, inert: inert || exiting })
}

export { Div as div, Li as li, Span as span }
