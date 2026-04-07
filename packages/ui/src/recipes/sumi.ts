/**
 * Sumi (墨) — The marks.
 *
 * The ink, the pigment — what the eye reads.
 *
 * Tier: 1
 * Concern: color
 */

// ── Hiru (昼) ───────────────────────────────────────────
const hiru = {
	text: 'text-zinc-950',
	textMuted: 'text-zinc-500',
	textHover: 'hover:text-zinc-950',
	textError: 'text-red-600',
	textIcon: '*:data-[slot=icon]:text-zinc-500',
}

// ── Yoru (夜) ───────────────────────────────────────────
const yoru = {
	text: 'dark:text-white',
	textMuted: 'dark:text-zinc-400',
	textHover: 'dark:hover:text-white',
	textError: 'dark:text-red-500',
	textIcon: 'dark:*:data-[slot=icon]:text-zinc-400',
}

// ── Export ───────────────────────────────────────────────
export const sumi = {
	text: [hiru.text, yoru.text],
	textMuted: [hiru.textMuted, yoru.textMuted],
	textHover: [hiru.textHover, yoru.textHover],
	textError: [hiru.textError, yoru.textError],
	textIcon: [hiru.textIcon, yoru.textIcon],
} as const
