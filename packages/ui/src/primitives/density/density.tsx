'use client'

import { type ReactNode, useMemo } from 'react'
import { createContext } from '../../core'
import type { Ma, Step } from '../../recipes'
import { useAffix } from '../affix'

/**
 * Density token: broadcast by `<Density>`, read by every size-aware component
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
 * `size` matches the `size` prop every component exposes; the ambient axis
 * is the default a `<Button>` / `<Input>` picks up.
 *
 * Internal names are positional (`sm | md | lg`); friendlier public labels
 * (e.g. `compact / cozy / comfortable`) translate at the prop surface, not
 * the token.
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

/** Diagonal preset table: `scale="md"` resolves to `{ space: 'md', size: 'md' }`. */
export const densityPresets = {
	sm: { space: 'sm', size: 'sm' },
	md: { space: 'md', size: 'md' },
	lg: { space: 'lg', size: 'lg' },
} satisfies Record<Step, DensityToken>

/**
 * Backing context for the dual-axis density token; written by {@link Density},
 * read through {@link useDensity} / {@link useDensityNullable}. `null` outside
 * any provider.
 *
 * @internal
 */
const [DensityTokenContext, useDensityNullable] = createContext<DensityToken | null>('Density', {
	default: null,
})

/**
 * Read the active density. Returns the diagonal `md` preset when no provider
 * is in the tree.
 *
 * Use {@link useDensityNullable} to distinguish "no ancestor" from `md`;
 * layout primitives (Box, Flex, Stack, Grid) whose `p` / `gap` treat
 * `undefined` as "no style applied" need the nullable read.
 */
export function useDensity(): DensityToken {
	const density = useDensityNullable()

	return density ?? densityPresets.md
}

export { useDensityNullable }

/**
 * Resolves a leaf component's size through the full size-axis cascade:
 * `explicit ?? Affix ?? Density.size`. The Affix step lets an enclosing
 * control slot (an `<Input>` prefix, a `<SelectTrigger>` chevron) pull the
 * component one notch tighter than the ambient Density, a step that stays
 * invisible at the call site unless the resolver names it, hence
 * `useResolvedSize` over a bare `size` read.
 *
 * For `Ma`-scale leaf components (`Button`, `Icon`, `Badge`,
 * `LoadingSpinner`, `Progress*`) that can carry sub-`Step` (`'xs'`) or `'xl'`
 * sizes. Control *hosts* resolve their dual-axis token through
 * {@link useControlSize} instead: they write a stepped-down Affix for their
 * slots but never read it for their own `Step`-floored size.
 *
 * Generic on the caller's size type; the cast trusts the caller to handle
 * out-of-range values via recipe `defaultVariants` or graceful fallback.
 */
export function useResolvedSize<T extends Ma = Ma>(explicit?: T): T {
	const affix = useAffix()
	const density = useDensity()

	return (explicit ?? affix ?? density.size) as T
}

/**
 * Resolves a control host's dual-axis density token from its `size` prop. An
 * explicit `size` pins both axes to that step (the diagonal preset); omitted,
 * each axis inherits independently from the ambient Density cascade, so a
 * split `<Density space="lg" size="sm">` stays split.
 *
 * Deliberately skips the Affix step {@link useResolvedSize} applies: a host
 * *writes* a stepped-down Affix into its own slots (see `affixStepDown`) but
 * resolves its own size from explicit-or-Density only. The `control` recipe's
 * `size` / `density` variants are `Step`-floored: there is no `'xs'` / `'xl'`
 * slot to receive an Affix value.
 *
 * Used by the control hosts that drive the `control` recipe: `Input`,
 * `Combobox`, `Textarea`, `Listbox`.
 */
export function useControlSize(explicit?: Step): DensityToken {
	const inherited = useDensity()

	return explicit ? densityPresets[explicit] : inherited
}

export type DensityProps = DensityInput & { children: ReactNode }

/**
 * Broadcasts a density token to descendants. Each axis cascades
 * independently; `<Density size="lg">` overrides `size` while inheriting
 * `space` from the surrounding context.
 *
 * @remarks
 * Client-tier context: only client descendants read it. A static host may open
 * a scope without reading one (an explicitly sized Card wraps its children in
 * `<Density>`), but static children still ignore it (REFERENCE §2).
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
 * Sugar for a component's `size` prop. Wraps children in `<Density scale>`
 * when `scale` is provided; otherwise renders children directly.
 */
export function DensityScope({ scale, children }: { scale?: Step; children: ReactNode }) {
	return scale ? <Density scale={scale}>{children}</Density> : children
}
