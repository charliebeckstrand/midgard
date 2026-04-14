/** Shared colour foundations — solid, soft, and outline — composed by buttons, badges, and chips. */

import { defineColors } from './define-colors'

// ── Base colour palette ──────────────────────────────────

export const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

export type Color = (typeof colors)[number]

// ── Text (ink) ──────────────────────────────────────────

export const text = defineColors({
	zinc: { light: 'text-zinc-700', dark: 'dark:text-zinc-300' },
	red: { light: 'text-red-700', dark: 'dark:text-red-400' },
	amber: { light: 'text-amber-700', dark: 'dark:text-amber-400' },
	green: { light: 'text-green-700', dark: 'dark:text-green-400' },
	blue: { light: 'text-blue-700', dark: 'dark:text-blue-400' },
})

// ── Solid ────────────────────────────────────────────────

const solidBg = defineColors({
	zinc: 'bg-zinc-600',
	red: 'bg-red-600',
	amber: 'bg-amber-500',
	green: 'bg-green-600',
	blue: 'bg-blue-600',
})

const solidText = defineColors({
	zinc: 'text-white',
	red: 'text-white',
	amber: 'text-amber-950',
	green: 'text-white',
	blue: 'text-white',
})

export const solid = merge(solidBg, solidText)

export const solidHover = defineColors({
	zinc: 'not-disabled:hover:bg-zinc-700',
	red: 'not-disabled:hover:bg-red-700',
	amber: 'not-disabled:hover:bg-amber-600',
	green: 'not-disabled:hover:bg-green-700',
	blue: 'not-disabled:hover:bg-blue-700',
})

// ── Soft ─────────────────────────────────────────────────

const softBg = defineColors({
	zinc: 'bg-zinc-600/10',
	red: 'bg-red-600/10',
	amber: 'bg-amber-500/10',
	green: 'bg-green-600/10',
	blue: 'bg-blue-600/10',
})

export const soft = merge(softBg, text)

export const softHover = defineColors({
	zinc: {
		light: 'not-disabled:hover:bg-zinc-600/30',
		dark: 'dark:not-disabled:hover:bg-zinc-500/30',
	},
	red: { light: 'not-disabled:hover:bg-red-600/30', dark: 'dark:not-disabled:hover:bg-red-500/30' },
	amber: {
		light: 'not-disabled:hover:bg-amber-500/30',
		dark: 'dark:not-disabled:hover:bg-amber-500/30',
	},
	green: {
		light: 'not-disabled:hover:bg-green-600/30',
		dark: 'dark:not-disabled:hover:bg-green-500/30',
	},
	blue: {
		light: 'not-disabled:hover:bg-blue-600/30',
		dark: 'dark:not-disabled:hover:bg-blue-500/30',
	},
})

// ── Plain hover ──────────────────────────────────────────

export const plainHover = defineColors({
	zinc: {
		light: 'not-disabled:hover:bg-zinc-600/15',
		dark: 'dark:not-disabled:hover:bg-zinc-500/15',
	},
	red: { light: 'not-disabled:hover:bg-red-600/15', dark: 'dark:not-disabled:hover:bg-red-500/15' },
	amber: {
		light: 'not-disabled:hover:bg-amber-500/15',
		dark: 'dark:not-disabled:hover:bg-amber-500/15',
	},
	green: {
		light: 'not-disabled:hover:bg-green-600/15',
		dark: 'dark:not-disabled:hover:bg-green-500/15',
	},
	blue: {
		light: 'not-disabled:hover:bg-blue-600/15',
		dark: 'dark:not-disabled:hover:bg-blue-500/15',
	},
})

// ── Outline ─────────────────────────────────────────────

export const outlineBorder = defineColors({
	zinc: { light: 'border-zinc-800', dark: 'dark:border-zinc-600' },
	red: { light: 'border-red-600', dark: 'dark:border-red-700' },
	amber: { light: 'border-amber-500', dark: 'dark:border-amber-700' },
	green: { light: 'border-green-600', dark: 'dark:border-green-700' },
	blue: { light: 'border-blue-600', dark: 'dark:border-blue-700' },
})

export const outline = merge(outlineBorder, text)

// ── Helpers ─────────────────────────────────────────────

/** Merges two colour maps with matching keys. */
export function merge<K extends string>(
	a: Record<K, string[]>,
	b: Record<K, string[]>,
): Record<K, string[]> {
	return Object.fromEntries((Object.keys(a) as K[]).map((k) => [k, [...a[k], ...b[k]]])) as Record<
		K,
		string[]
	>
}
