/**
 * Iro (色) — Colour.
 *
 * Semantic colour tokens, keyed by role. Text colour lives under `iro.text`;
 * background colour lives under `iro.bg`. Border- and ring-colour composites
 * (which also carry width / variant) live in `sen`; palette-level variant ×
 * colour matrices live in `nuri`.
 *
 * Tier: 1 · Concern: color
 */

import { mode } from '../../core/recipe/mode'

// ── Text ────────────────────────────────────────────────
const text = {
	default: mode('text-zinc-950', 'dark:text-white'),
	muted: mode('text-zinc-500', 'dark:text-zinc-400'),
	error: 'text-red-600',
	icon: 'text-inherit',
	disabled: mode(
		['has-disabled:text-zinc-500', 'has-disabled:**:data-[slot=label]:text-zinc-500'],
		['dark:has-disabled:text-zinc-400', 'dark:has-disabled:**:data-[slot=label]:text-zinc-400'],
	),
	hover: mode('hover:not-disabled:text-zinc-950', 'dark:hover:not-disabled:text-white'),
	focus: mode(
		'focus-visible:not-disabled:text-zinc-950',
		'dark:focus-visible:not-disabled:text-white',
	),
	/** Current-tab text colour with hover on non-current siblings. */
	tab: mode(
		[
			'text-zinc-500',
			'data-current:text-zinc-950',
			'not-data-current:not-disabled:hover:text-zinc-700',
		],
		[
			'dark:text-zinc-400',
			'dark:data-current:text-white',
			'dark:not-data-current:not-disabled:hover:text-zinc-200',
		],
	),
	/** Text inside a focused option — used for description slots. */
	focusGroup: 'group-focus/option:text-white',
}

// ── Background ──────────────────────────────────────────
const bg = {
	surface: mode('bg-white', 'dark:bg-zinc-900'),
	panel: mode('bg-white', 'dark:bg-zinc-900'),
	popover: mode('bg-white/90', 'dark:bg-zinc-800/75'),
	tint: mode('bg-zinc-950/5', 'dark:bg-white/10'),
	tintBefore: mode('before:bg-zinc-950/5', 'dark:before:bg-white/10'),
	skeleton: mode('bg-zinc-200', 'dark:bg-zinc-700'),
	backdrop: {
		md: mode('bg-white/50', 'dark:bg-zinc-950/50'),
		lg: mode('bg-white/75', 'dark:bg-zinc-950/75'),
	},
}

export const iro = { text, bg } as const
