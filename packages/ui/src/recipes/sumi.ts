/**
 * Sumi (墨) — Ink.
 *
 * Text colour — what the eye reads.
 *
 * Tier: 1 · Concern: color
 */

// ── Motoi (基) ──────────────────────────────────────────
export const motoi = {
	textError: 'text-red-600',
	textIcon: 'text-inherit',
}

// ── Hiru (昼) ───────────────────────────────────────────
export const hiru = {
	text: 'text-zinc-950',
	textMuted: 'text-zinc-500',
	textDisabled: [
		'has-disabled:text-zinc-500',
		'has-disabled:**:data-[slot=label]:text-zinc-500',
	] as const,
	textHover: 'hover:not-disabled:text-zinc-950',
	textFocus: 'focus-visible:not-disabled:text-zinc-950',
	tab: ['data-current:text-zinc-950', 'not-data-current:not-disabled:hover:text-zinc-700'],
}

// ── Yoru (夜) ───────────────────────────────────────────
export const yoru = {
	text: 'dark:text-white',
	textMuted: 'dark:text-zinc-400',
	textDisabled: [
		'dark:has-disabled:text-zinc-400',
		'dark:has-disabled:**:data-[slot=label]:text-zinc-400',
	] as const,
	textHover: 'dark:hover:not-disabled:text-white',
	textFocus: 'dark:focus-visible:not-disabled:text-white',
	tab: ['dark:data-current:text-white', 'dark:not-data-current:not-disabled:hover:text-zinc-200'],
}

// ── Export ───────────────────────────────────────────────
export const sumi = {
	textError: motoi.textError,
	textIcon: motoi.textIcon,
	text: [hiru.text, yoru.text],
	textMuted: [hiru.textMuted, yoru.textMuted],
	textDisabled: [hiru.textDisabled, yoru.textDisabled],
	textHover: [hiru.textHover, yoru.textHover],
	textFocus: [hiru.textFocus, yoru.textFocus],
	/** Current-tab text colour with hover on non-current siblings. */
	tab: [hiru.textMuted, yoru.textMuted, hiru.tab, yoru.tab],
	/** Text inside a focused option — used for description slots. */
	focusText: 'group-focus/option:text-white',
} as const
