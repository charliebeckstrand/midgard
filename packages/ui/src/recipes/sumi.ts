/**
 * Sumi (墨) — The marks.
 *
 * The ink, the pigment — what the eye reads.
 *
 * Tier: 1
 * Concern: color
 */

// ── Motoi (基) ──────────────────────────────────────────
const motoi = {
	textError: 'text-red-600',
	textIcon: 'text-inherit',
}

// ── Hiru (昼) ───────────────────────────────────────────
const hiru = {
	text: 'text-zinc-950',
	textMuted: 'text-zinc-500',
	textDisabled: [
		'has-disabled:text-zinc-500',
		'has-disabled:**:data-[slot=label]:text-zinc-500',
	] as const,
	textHover: 'hover:not-disabled:text-zinc-950',
}

// ── Yoru (夜) ───────────────────────────────────────────
const yoru = {
	text: 'dark:text-white',
	textMuted: 'dark:text-zinc-400',
	textDisabled: [
		'dark:has-disabled:text-zinc-400',
		'dark:has-disabled:**:data-[slot=label]:text-zinc-400',
	] as const,
	textHover: 'dark:hover:not-disabled:text-white',
}

// ── Export ───────────────────────────────────────────────
export const sumi = {
	textError: motoi.textError,
	textIcon: motoi.textIcon,
	text: [hiru.text, yoru.text],
	textMuted: [hiru.textMuted, yoru.textMuted],
	textDisabled: [hiru.textDisabled, yoru.textDisabled],
	textHover: [hiru.textHover, yoru.textHover],
} as const
