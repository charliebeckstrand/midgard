'use client'

import { type ReactNode, useMemo } from 'react'
import { createContext } from '../core'
import type { Step } from '../recipes/ryu/sun'
import { ConcentricProvider, useConcentric } from './concentric'

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
export const DENSITY_PRESETS: Record<Step, DensityToken> = {
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

const [DensityProviderRaw, useDensityNullable] = createContext<DensityToken | null>('Density', {
	default: null,
})

function isStep(s: string): s is Step {
	return s === 'sm' || s === 'md' || s === 'lg'
}

/**
 * Read the active density. Returns the diagonal `md` preset when no provider
 * is in the tree.
 *
 * Bridge for the Concentric → Density migration: when a {@link Density}
 * ancestor exists, returns its token directly; when only a legacy
 * `<ConcentricProvider>` is present, projects `size` onto a diagonal token so
 * migrated consumers still see the surrounding cascade. Wider Concentric
 * values (`xs`, `xl`) fall back to the `md` preset. The bridge is removed
 * once every component has migrated; see `MIGRATION.md`.
 */
export function useDensity(): DensityToken {
	const density = useDensityNullable()
	const concentric = useConcentric()
	const concentricSize = concentric?.size

	return useMemo<DensityToken>(() => {
		if (density) return density
		if (concentricSize !== undefined && isStep(concentricSize)) {
			return { density: concentricSize, size: concentricSize }
		}
		return DENSITY_PRESETS.md
	}, [density, concentricSize])
}

export type DensityProps = DensityInput & { children: ReactNode }

/**
 * Broadcasts a density token to descendants. Each axis cascades independently
 * — `<Density size="lg">` overrides `size` while inheriting `density` from
 * the surrounding context.
 *
 * Writes a legacy {@link ConcentricProvider} alongside the new context so
 * unmigrated consumers still reading `useResolvedSize` continue to see the
 * cascade during the migration window. The dual write is removed once every
 * component has migrated.
 */
export function Density({ children, scale, density: densityProp, size: sizeProp }: DensityProps) {
	const parentDensity = useDensityNullable()
	const concentric = useConcentric()
	const concentricSize = concentric?.size

	const parent = useMemo<DensityToken>(() => {
		if (parentDensity) return parentDensity
		if (concentricSize !== undefined && isStep(concentricSize)) {
			return { density: concentricSize, size: concentricSize }
		}
		return DENSITY_PRESETS.md
	}, [parentDensity, concentricSize])

	const token = useMemo<DensityToken>(() => {
		const base = scale ? DENSITY_PRESETS[scale] : parent
		return {
			density: densityProp ?? base.density,
			size: sizeProp ?? base.size,
		}
	}, [scale, densityProp, sizeProp, parent])

	return (
		<DensityProviderRaw value={token}>
			<ConcentricProvider value={{ size: token.size }}>{children}</ConcentricProvider>
		</DensityProviderRaw>
	)
}

/**
 * Sugar for a component's `size` prop. Wraps content in `<Density scale>`
 * when `scale` is provided so descendants inherit; otherwise renders children
 * directly — no extra provider when there's no override.
 */
export function DensityScope({ scale, children }: { scale?: Step; children: ReactNode }) {
	return scale ? <Density scale={scale}>{children}</Density> : children
}
