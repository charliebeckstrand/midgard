'use client'

import type { CSSProperties, ReactNode } from 'react'

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
 * pick the new value up through the CSS variable cascade.
 */
export type RadiusProps = { ratio: number; children: ReactNode }

export function Radius({ ratio, children }: RadiusProps) {
	return (
		<div className="contents" style={{ '--ui-radius-ratio': ratio } as CSSProperties}>
			{children}
		</div>
	)
}
