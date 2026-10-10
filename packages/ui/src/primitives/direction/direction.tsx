'use client'

import type { ReactNode } from 'react'
import { createContext } from '../../core'

/** A text direction: left to right, or right to left. */
export type TextDirection = 'ltr' | 'rtl'

/**
 * The direction context: the direction of the nearest direction scope, or
 * `null` outside each scope. It carries the same value as the `dir` attribute
 * of that scope. A `dir` on the root element is the direction of the app, and
 * the context does not hold it.
 */
const [DirectionContext, useDirectionScope] = createContext<TextDirection | null>('Direction', {
	default: null,
})

/**
 * Reads the direction of the nearest direction scope, or `null` outside each
 * scope. A portal reads it and writes it as `dir` on its host, so a surface in
 * the portal lays out in the direction of the place that opened it.
 */
export { useDirectionScope }

/** Props for {@link Direction}: the `dir` of the scope and its `children`. */
export type DirectionProps = {
	/**
	 * The direction of the scope. Omit it to render the children with no scope.
	 * @defaultValue `'ltr'`, or the direction of the enclosing scope.
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
