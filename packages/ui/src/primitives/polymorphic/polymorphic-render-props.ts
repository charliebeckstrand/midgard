import type { CSSProperties, SyntheticEvent } from 'react'
import { cn, composeEventHandlers } from '../../core'

type Props = Record<string, unknown>

type Handler = (event: SyntheticEvent) => void

const HANDLER_KEY = /^on[A-Z]/

/**
 * Merge the props of a `render` element with the props that
 * `PolymorphicStatic` resolves for it. The rules:
 *
 *   - `className` joins through `cn`, with the resolved class last.
 *   - An event handler on both sides runs the `render` handler first, then
 *     the resolved handler. Both always run.
 *   - `style` merges, and the resolved keys win.
 *   - For each other key, a resolved value wins. An `undefined` resolved value
 *     keeps the value of the `render` element.
 *
 * The props exclude `ref`, which the caller resolves in JSX. This module
 * carries no `'use client'` directive and calls no hook, so `PolymorphicStatic`
 * stays server-safe.
 *
 * @param renderProps - The props of the `render` element.
 * @param resolved - The props that `PolymorphicStatic` resolves.
 * @returns The merged props.
 * @internal
 */
export function mergeRenderProps(renderProps: Props, resolved: Props): Props {
	const merged: Props = { ...renderProps }

	for (const [key, value] of Object.entries(resolved)) {
		if (value === undefined) continue

		const inner = renderProps[key]

		if (inner === undefined) {
			merged[key] = value
		} else if (key === 'className') {
			merged[key] = cn(inner as string, value as string)
		} else if (key === 'style') {
			merged[key] = { ...(inner as CSSProperties), ...(value as CSSProperties) }
		} else if (
			HANDLER_KEY.test(key) &&
			typeof inner === 'function' &&
			typeof value === 'function'
		) {
			merged[key] = composeEventHandlers(inner as Handler, value as Handler, {
				checkForDefaultPrevented: false,
			})
		} else {
			merged[key] = value
		}
	}

	return merged
}
