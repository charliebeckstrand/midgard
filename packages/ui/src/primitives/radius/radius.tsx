'use client'

import type { CSSProperties, ReactNode } from 'react'
import { createContext } from '../../core'

/**
 * Radius primitive — `border-radius` derived from element height by a single
 * ratio, so every size step renders at the same `radius / height` proportion
 * pixel-for-pixel.
 *
 * Recipes carry the per-size geometry. Each size variant adds a `radius-N`
 * utility (defined in `theme.css`) where `N` is the height in Tailwind
 * spacing units. The utility expands to
 * `border-radius: calc(--spacing(N) * var(--ui-radius-ratio))` — no per-tier
 * Tailwind class, no rounding to the nearest `rounded-md / lg / xl`.
 *
 * `--ui-radius-ratio` defaults to `0.22` in the `@theme` block. `<Radius
 * ratio>` rewrites it on a `display:contents` wrapper, and descendant recipes
 * pick the new value up through the CSS variable cascade. The number is also
 * mirrored through React context — read it via {@link useRadiusRatio} when
 * building an inline radius outside the utility.
 */
export const DEFAULT_RADIUS_RATIO = 0.22

const [RadiusValueProvider, useRadiusRatioNullable] = createContext<number | null>('Radius', {
	default: null,
})

/** Read the active ratio. Falls back to {@link DEFAULT_RADIUS_RATIO}. */
export function useRadiusRatio(): number {
	return useRadiusRatioNullable() ?? DEFAULT_RADIUS_RATIO
}

export { useRadiusRatioNullable }

export type RadiusProps = { ratio: number; children: ReactNode }

/**
 * Broadcasts a radius ratio. Sets `--ui-radius-ratio` on a `display:contents`
 * wrapper so descendant `radius-N` utilities pick it up through the CSS
 * variable cascade. Nest to override deeper subtrees.
 */
export function Radius({ ratio, children }: RadiusProps) {
	return (
		<RadiusValueProvider value={ratio}>
			<div className="contents" style={{ '--ui-radius-ratio': ratio } as CSSProperties}>
				{children}
			</div>
		</RadiusValueProvider>
	)
}
