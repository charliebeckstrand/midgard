'use client'

import type { ReactNode } from 'react'
import { DirectionContext, type TextDirection } from './context'

/** Props for {@link Direction}: the `dir` of the scope and its `children`. */
export type DirectionProps = {
	/**
	 * The direction of the scope. Omit it to render the children with no scope.
	 *
	 * @defaultValue No scope: the children keep the direction of the enclosing
	 * scope, or of the root element outside each scope.
	 */
	dir?: TextDirection
	children: ReactNode
}

/**
 * Opens a direction scope in context. A `Portal` below it writes `dir` on its
 * host, so a surface that the region opens keeps the direction. With no `dir`,
 * it renders its children alone.
 *
 * @remarks
 * The context half of a scope, as `Density` is for density. It writes no
 * element. `LocaleProvider` writes the `dir` attribute and opens this context
 * in one place. A raw `dir` attribute on an element is a DOM setting only, and
 * a portal cannot see it.
 */
export function Direction({ dir, children }: DirectionProps) {
	return dir ? <DirectionContext value={dir}>{children}</DirectionContext> : children
}
