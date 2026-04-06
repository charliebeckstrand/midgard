/**
 * Shared color foundations for soft and solid variants.
 *
 * Buttons, badges, and chips all use the same base colors —
 * only the hover mechanism differs (not-disabled:hover vs group-hover).
 * This file centralizes the color definitions so each component
 * composes from one source of truth.
 */

import { defineColors } from './define-colors'

// ── Text (ink) ──────────────────────────────────────────

export const text = defineColors({
	zinc: { light: 'text-zinc-700', dark: 'dark:text-zinc-300' },
	white: { light: 'text-zinc-950', dark: 'dark:text-white' },
	dark: { light: 'text-zinc-700', dark: 'dark:text-zinc-300' },
	red: { light: 'text-red-700', dark: 'dark:text-red-400' },
	amber: { light: 'text-amber-700', dark: 'dark:text-amber-400' },
	green: { light: 'text-green-700', dark: 'dark:text-green-400' },
	blue: { light: 'text-blue-700', dark: 'dark:text-blue-400' },
})

// ── Soft ─────────────────────────────────────────────────

const softBg = defineColors({
	zinc: { light: 'bg-zinc-600/10', dark: 'dark:bg-white/10' },
	white: { light: 'bg-white', dark: 'dark:bg-white/10' },
	dark: { light: 'bg-zinc-950/10', dark: 'dark:bg-white/10' },
	red: { light: 'bg-red-600/15', dark: 'dark:bg-red-500/15' },
	amber: { light: 'bg-amber-500/15', dark: 'dark:bg-amber-500/15' },
	green: { light: 'bg-green-600/15', dark: 'dark:bg-green-500/15' },
	blue: { light: 'bg-blue-600/15', dark: 'dark:bg-blue-500/15' },
})

export const soft = merge(softBg, text)

export const softHover: HoverMap<keyof typeof soft> = {
	zinc: { light: 'bg-zinc-600/20', dark: 'bg-white/15' },
	white: { light: 'bg-zinc-50', dark: 'bg-white/15' },
	dark: { light: 'bg-zinc-950/15', dark: 'bg-white/15' },
	red: { light: 'bg-red-600/25', dark: 'bg-red-500/25' },
	amber: { light: 'bg-amber-500/20', dark: 'bg-amber-500/25' },
	green: { light: 'bg-green-600/25', dark: 'bg-green-500/25' },
	blue: { light: 'bg-blue-600/25', dark: 'bg-blue-500/25' },
}

// ── Solid ────────────────────────────────────────────────

const solidBg = defineColors({
	zinc: { light: 'bg-zinc-700', dark: 'dark:bg-zinc-600' },
	white: { light: 'bg-white', dark: 'dark:bg-zinc-200' },
	dark: { light: 'bg-zinc-950', dark: 'dark:bg-white' },
	red: { light: 'bg-red-600', dark: 'dark:bg-red-500' },
	amber: { light: 'bg-amber-500' },
	green: { light: 'bg-green-600', dark: 'dark:bg-green-500' },
	blue: { light: 'bg-blue-600', dark: 'dark:bg-blue-500' },
})

const solidText = defineColors({
	zinc: { light: 'text-white' },
	white: { light: 'text-zinc-950', dark: 'dark:text-zinc-950' },
	dark: { light: 'text-white', dark: 'dark:text-zinc-950' },
	red: { light: 'text-white' },
	amber: { light: 'text-amber-950' },
	green: { light: 'text-white' },
	blue: { light: 'text-white' },
})

export const solid = merge(solidBg, solidText)

export const solidHover: HoverMap<keyof typeof solid> = {
	zinc: { light: 'bg-zinc-800', dark: 'bg-zinc-500' },
	white: { light: 'bg-zinc-100', dark: 'bg-zinc-300' },
	dark: { light: 'bg-zinc-800', dark: 'bg-zinc-200' },
	red: { light: 'bg-red-700', dark: 'bg-red-600' },
	amber: { light: 'bg-amber-600' },
	green: { light: 'bg-green-700', dark: 'bg-green-600' },
	blue: { light: 'bg-blue-700', dark: 'bg-blue-600' },
}

// ── Helpers ─────────────────────────────────────────────

type HoverEntry = { light: string; dark?: string }
type HoverMap<K extends string> = Record<K, HoverEntry>

/** Merge two color maps with the same keys into one. */
export function merge<K extends string>(
	a: Record<K, string[]>,
	b: Record<K, string[]>,
): Record<K, string[]> {
	return Object.fromEntries((Object.keys(a) as K[]).map((k) => [k, [...a[k], ...b[k]]])) as Record<
		K,
		string[]
	>
}

/** Pick a subset of keys from a color map. */
export function pick<K extends string, S extends K>(
	map: Record<K, string[]>,
	keys: readonly S[],
): Record<S, string[]> {
	return Object.fromEntries(keys.map((k) => [k, map[k]])) as Record<S, string[]>
}

/**
 * Compose base colors with hover backgrounds using a given interaction prefix.
 *
 * @example
 * ```ts
 * // Badge: hover triggered by parent group
 * withHover(soft, softHover, 'group-hover:')
 *
 * // Button: hover on element itself, respects disabled
 * withHover(soft, softHover, 'not-disabled:hover:')
 * ```
 */
export function withHover<K extends string>(
	base: Record<K, string[]>,
	hover: HoverMap<K>,
	prefix: string,
): Record<K, string[]> {
	return Object.fromEntries(
		(Object.keys(base) as K[]).map((k) => {
			const h = hover[k]
			const hoverClasses = h.dark
				? [`${prefix}${h.light}`, `dark:${prefix}${h.dark}`]
				: [`${prefix}${h.light}`]
			return [k, [...base[k], ...hoverClasses]]
		}),
	) as Record<K, string[]>
}
