'use client'

import type { CSSProperties, ReactNode } from 'react'
import { createContext } from '../../core'

/**
 * Radius primitive — `border-radius` derived from element height by a single
 * ratio, so every size step renders at the same `radius / height` proportion
 * pixel-for-pixel.
 *
 * Recipes carry the per-size geometry. Each size variant adds the
 * `radius-N` utility (defined in `theme.css`) where `N` is the size's
 * effective height in Tailwind spacing units. The utility expands to
 * `border-radius: calc(--spacing(N) * var(--ui-radius-ratio))`, so CSS does
 * the math at render time — no per-tier Tailwind class, no rounding to the
 * nearest `rounded-md / lg / xl`.
 *
 * The `--ui-radius-ratio` default (0.22) lives in the `@theme` block;
 * `<Radius ratio>` writes the variable onto a `display:contents` wrapper to
 * override it for a subtree, and every descendant recipe picks it up via the
 * CSS variable cascade. The numeric value is also mirrored through React
 * context for callers that build their own inline radius via
 * {@link useRadiusRatio}.
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
 * wrapper so descendant Tailwind `rounded-[calc(...*var(--ui-radius-ratio))]`
 * classes resolve through it via the CSS variable cascade. Nest to override
 * deeper subtrees.
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
