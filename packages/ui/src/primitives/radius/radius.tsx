'use client'

import { type ReactNode, useMemo } from 'react'
import { createContext } from '../../core'
import type { Ma } from '../../recipes'

/**
 * Radius token — broadcast by `<Radius>`, read by every size-aware component
 * through {@link useRadius}.
 *
 * Maps each interactive size step (`xs..xl`) to a Tailwind `rounded-*` level.
 * Components resolve their size first (via Density / Affix / explicit prop),
 * then call `useRadius(size)` to pick the level out of the active token.
 *
 * The default scale targets a roughly constant radius-to-height ratio across
 * sizes — a static `rounded-lg` looks proportionally too round at small
 * heights and too sharp at large ones.
 */
export type RadiusKey = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'

export type RadiusToken = Record<Ma, RadiusKey>

/** Diagonal preset — `xs/sm` shrink to `md`, `md` keeps `lg`, `lg/xl` bump to `xl`. */
export const defaultRadiusScale: RadiusToken = {
	xs: 'md',
	sm: 'md',
	md: 'lg',
	lg: 'xl',
	xl: 'xl',
}

/** Tailwind `rounded-*` class per radius key. Listed literally so the JIT scanner sees them. */
export const radiusClassMap: Record<RadiusKey, string> = {
	none: 'rounded-none',
	sm: 'rounded-sm',
	md: 'rounded-md',
	lg: 'rounded-lg',
	xl: 'rounded-xl',
	'2xl': 'rounded-2xl',
	full: 'rounded-full',
}

const [RadiusValueProvider, useRadiusTokenNullable] = createContext<RadiusToken | null>('Radius', {
	default: null,
})

/**
 * Read the active radius token. Falls back to {@link defaultRadiusScale} when
 * no provider is in the tree.
 */
export function useRadiusToken(): RadiusToken {
	return useRadiusTokenNullable() ?? defaultRadiusScale
}

export { useRadiusTokenNullable }

/**
 * Resolve a `rounded-*` class for the given size step via the active token.
 * The caller passes its already-resolved size (after `useSizeWide` / density
 * cascade); this hook is purely a token → class lookup.
 */
export function useRadius(size: Ma): string {
	return radiusClassMap[useRadiusToken()[size]]
}

/** Caller surface for `<Radius>`. Set any axis explicitly; omit to inherit. */
export type RadiusInput = Partial<RadiusToken>

export type RadiusProps = RadiusInput & { children: ReactNode }

/**
 * Broadcasts a radius token to descendants. Each axis cascades independently
 * — `<Radius lg="2xl">` overrides the `lg` step while inheriting the rest
 * from the surrounding context.
 */
export function Radius({ children, xs, sm, md, lg, xl }: RadiusProps) {
	const parent = useRadiusToken()

	const token = useMemo<RadiusToken>(
		() => ({
			xs: xs ?? parent.xs,
			sm: sm ?? parent.sm,
			md: md ?? parent.md,
			lg: lg ?? parent.lg,
			xl: xl ?? parent.xl,
		}),
		[xs, sm, md, lg, xl, parent],
	)

	return <RadiusValueProvider value={token}>{children}</RadiusValueProvider>
}
