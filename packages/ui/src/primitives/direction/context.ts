'use client'

import { createContext } from '../../core'

/** A text direction: left to right, or right to left. */
export type TextDirection = 'ltr' | 'rtl'

/**
 * The direction context: the direction of the nearest direction scope, or
 * `null` outside each scope. It carries the same value as the `dir` attribute
 * of that scope. A `dir` on the root element is the direction of the app, and
 * the context does not hold it. {@link Direction} provides it.
 *
 * `useDirectionScope` reads the direction of the nearest scope, or `null`
 * outside each scope. A portal reads it and writes it as `dir` on its host. A
 * surface in the portal thus lays out in the direction of the place that
 * opened it.
 */
export const [DirectionContext, useDirectionScope] = createContext<TextDirection | null>(
	'Direction',
	{ default: null },
)
