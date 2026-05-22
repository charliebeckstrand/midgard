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
 * - `density` controls padding + gap (the breathing-room dimension)
 * - `size`    controls text + icon  (the visual-heft dimension)
 *
 * The axes inherit independently. `<Density density="sm">` shrinks spacing
 * without touching font size; `<Density size="lg">` bumps text and icon
 * without re-padding. Cascade is per-axis innermost-wins.
 *
 * Internal names are intentionally positional (`sm | md | lg`) so the public
 * API can carry friendlier labels (e.g. `compact / cozy / comfortable`)
 * without a refactor — translation lives at the prop surface, not the token.
 */
export type DensityToken = {
	density: Step
	size: Step
}

/**
 * Caller surface for `<Density>`. Set any axis explicitly; omit to inherit
 * from the surrounding context. The `scale` shorthand replaces the inherited
 * baseline with a preset (both axes), then explicit per-axis overrides still
 * win.
 */
export type DensityInput = Partial<DensityToken> & { scale?: Step }

/** Diagonal preset table — `scale="md"` resolves to `{ density: 'md', size: 'md' }`. */
export const densityPresets: Record<Step, DensityToken> = {
	sm: { density: 'sm', size: 'sm' },
	md: { density: 'md', size: 'md' },
	lg: { density: 'lg', size: 'lg' },
}

const STEP_DOWN: Record<Step, Step> = { sm: 'sm', md: 'sm', lg: 'md' }

/**
 * Step one rung down, clamping at the smallest value. Used by surfaces that
 * embed a slot rendering one step smaller than the host — `<Input>` affixes,
 * `<SelectTrigger>` chevron. Single function for both axes; they share the
 * `Step` scale.
 */
export function stepDown(s: Step): Step {
	return STEP_DOWN[s]
}

const [DensityValueProvider, useDensityNullable] = createContext<DensityToken | null>('Density', {
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
 * components whose own size type spans `Ma` (`Button`, `Icon`, `Spinner`,
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
export function useSizeWide<T extends Ma = Ma>(explicit?: T): T {
	const affix = useAffix()
	const density = useDensity()

	return (explicit ?? affix ?? density.size) as T
}

export type DensityProps = DensityInput & { children: ReactNode }

/**
 * Broadcasts a density token to descendants. Each axis cascades independently
 * — `<Density size="lg">` overrides `size` while inheriting `density` from
 * the surrounding context.
 */
export function Density({ children, scale, density: densityProp, size: sizeProp }: DensityProps) {
	const parent = useDensity()

	const token = useMemo<DensityToken>(() => {
		const base = scale ? densityPresets[scale] : parent

		return {
			density: densityProp ?? base.density,
			size: sizeProp ?? base.size,
		}
	}, [scale, densityProp, sizeProp, parent])

	return <DensityValueProvider value={token}>{children}</DensityValueProvider>
}

/**
 * Sugar for a component's `size` prop. Wraps content in `<Density scale>`
 * when `scale` is provided so descendants inherit; otherwise renders children
 * directly — no extra provider when there's no override.
 */
export function DensityScope({ scale, children }: { scale?: Step; children: ReactNode }) {
	return scale ? <Density scale={scale}>{children}</Density> : children
}
