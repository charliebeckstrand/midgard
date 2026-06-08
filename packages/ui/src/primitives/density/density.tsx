'use client'

import { type ReactNode, useMemo } from 'react'
import { createContext } from '../../core'
import type { Ma, Step } from '../../recipes'
import { useAffix } from '../affix'

/**
 * Density token — broadcast by `<Density>`, read by every size-aware component
 * through {@link useDensity}.
 *
 * Two axes, both keyed on {@link Step}:
 *
 * - `space` controls padding + gap  (the breathing-room dimension)
 * - `size`  controls text + icon    (the visual-heft dimension)
 *
 * The axes inherit independently. `<Density space="sm">` shrinks spacing
 * without touching font size; `<Density size="lg">` bumps text and icon
 * without re-padding. Cascade is per-axis innermost-wins.
 *
 * `size` is deliberately the same word every component uses for its own
 * `size` prop — the ambient axis is the default a `<Button>` / `<Input>`
 * picks up, so one vocabulary runs from provider to leaf.
 *
 * Internal names are intentionally positional (`sm | md | lg`) so the public
 * API can carry friendlier labels (e.g. `compact / cozy / comfortable`)
 * without a refactor — translation lives at the prop surface, not the token.
 */
type DensityToken = {
	space: Step
	size: Step
}

/**
 * Caller surface for `<Density>`. Set either axis explicitly; omit to inherit
 * from the surrounding context. The `scale` shorthand sets both axes to one
 * preset (use it instead of passing `space` and `size` the same value), then
 * explicit per-axis overrides still win.
 */
type DensityInput = Partial<DensityToken> & { scale?: Step }

/** Diagonal preset table — `scale="md"` resolves to `{ space: 'md', size: 'md' }`. */
export const densityPresets: Record<Step, DensityToken> = {
	sm: { space: 'sm', size: 'sm' },
	md: { space: 'md', size: 'md' },
	lg: { space: 'lg', size: 'lg' },
}

const [DensityTokenContext, useDensityNullable] = createContext<DensityToken | null>('Density', {
	default: null,
})

/**
 * Read the active density. Returns the diagonal `md` preset when no provider
 * is in the tree.
 *
 * Use {@link useDensityNullable} when you need to distinguish "no ancestor"
 * from `md` — layout primitives (Box, Flex, Stack, Grid) whose `p` / `gap`
 * treat `undefined` as "no style applied" want the nullable read so they
 * don't accidentally inherit the default.
 */
export function useDensity(): DensityToken {
	const density = useDensityNullable()

	return density ?? densityPresets.md
}

export { useDensityNullable }

/**
 * Resolve a wider-scale size through the Affix → Density cascade. Used by
 * components whose own size type spans `Ma` (`Button`, `Icon`, `LoadingSpinner`,
 * `ProgressGauge`) — they need to inherit sub-`Step` values when nested
 * inside a control affix slot, and the regular `useDensity` can't carry
 * those.
 *
 * Resolution order: `explicit ?? Affix ?? Density.size`.
 *
 * Generic on the caller's size type. Most callers' types are narrower than
 * `Ma` (Icon tops out at `lg`; Button's recipe currently lacks `xl`); the
 * cast trusts the caller to handle out-of-range values via recipe
 * `defaultVariants` or graceful fallback.
 */
export function useSize<T extends Ma = Ma>(explicit?: T): T {
	const affix = useAffix()
	const density = useDensity()

	return (explicit ?? affix ?? density.size) as T
}

export type DensityProps = DensityInput & { children: ReactNode }

/**
 * Broadcasts a density token to descendants. Each axis cascades independently
 * — `<Density size="lg">` overrides `size` while inheriting `space` from
 * the surrounding context.
 */
export function Density({ children, scale, space: spaceProp, size: sizeProp }: DensityProps) {
	const parent = useDensity()

	const token = useMemo<DensityToken>(() => {
		const base = scale ? densityPresets[scale] : parent

		return {
			space: spaceProp ?? base.space,
			size: sizeProp ?? base.size,
		}
	}, [scale, spaceProp, sizeProp, parent])

	return <DensityTokenContext value={token}>{children}</DensityTokenContext>
}

/**
 * Sugar for a component's `size` prop. Wraps content in `<Density scale>`
 * when `scale` is provided so descendants inherit; otherwise renders children
 * directly — no extra provider when there's no override.
 */
export function DensityScope({ scale, children }: { scale?: Step; children: ReactNode }) {
	return scale ? <Density scale={scale}>{children}</Density> : children
}
