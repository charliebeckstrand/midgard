'use client'

import type { CSSProperties, ReactNode } from 'react'
import { createContext } from '../../core'

/**
 * Radius primitive — `border-radius` derived from element height by a single
 * ratio, so every size step renders at the same `radius / height` proportion
 * pixel-for-pixel.
 *
 * Recipes carry the per-size geometry. Each size variant adds a class shaped
 * like `rounded-[calc(--spacing(N)*var(--ui-radius-ratio,0.22))]`, where `N`
 * is the size's effective height in Tailwind spacing units (so `--spacing(N)`
 * resolves to the same length the layout pads to). CSS does the math at
 * render time — no per-tier Tailwind class, no rounding to the nearest
 * `rounded-md / lg / xl`.
 *
 * `<Radius ratio>` overrides the proportion for a subtree by writing
 * `--ui-radius-ratio` onto a `display:contents` wrapper; every descendant
 * recipe's `calc()` picks it up via CSS cascade. The numeric value is also
 * mirrored through React context for callers that build their own inline
 * radius via {@link useRadiusRatio}.
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
