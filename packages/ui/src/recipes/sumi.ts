/**
 * Sumi (墨) — Ink.
 *
 * Text colour — what the eye reads.
 *
 * Tier: 1 · Concern: color
 */

import { mode } from './mode'

// ── Export ───────────────────────────────────────────────
export const sumi = {
	textError: 'text-red-600',
	textIcon: 'text-inherit',
	text: mode('text-zinc-950', 'dark:text-white'),
	textMuted: mode('text-zinc-500', 'dark:text-zinc-400'),
	textDisabled: mode(
		['has-disabled:text-zinc-500', 'has-disabled:**:data-[slot=label]:text-zinc-500'],
		['dark:has-disabled:text-zinc-400', 'dark:has-disabled:**:data-[slot=label]:text-zinc-400'],
	),
	textHover: mode('hover:not-disabled:text-zinc-950', 'dark:hover:not-disabled:text-white'),
	textFocus: mode(
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
	focusText: 'group-focus/option:text-white',
} as const
