/**
 * Sawari (触り) — Touch response.
 *
 * Interaction feedback — hover, press, selection, and disabled (dormant) state.
 *
 * Tier: 2 · Concern: interaction
 */

import { garasu } from './garasu'
import { iro } from './iro'
import { ji } from './ji'
import { maru } from './maru'
import { sen } from './sen'
import { take } from './take'
import { ugoki } from './ugoki'

// ── Disabled state (was the standalone `yasumi` recipe) ──
const disabled = [
	'disabled:opacity-50 disabled:cursor-not-allowed',
	'data-disabled:opacity-50 data-disabled:cursor-not-allowed',
	'group-disabled:opacity-50',
	ugoki.css.opacity,
	ugoki.css.duration,
]

// ── Motoi (基) ──────────────────────────────────────────
const motoi = {
	item: [
		'sm:py-1.5 py-2.5',
		'outline-hidden',
		ji.size.md,
		sen.forced.text,
		sen.forced.focus,
		disabled,
	],
	nav: [take.icon.md],
}

// ── Hiru (昼) ───────────────────────────────────────────
const hiru = {
	item: [
		'not-disabled:not-data-disabled:hover:bg-zinc-950/5',
		'not-disabled:not-data-disabled:focus:bg-zinc-950/5',
	],
	nav: ['group-hover:bg-zinc-950/5'],
}

// ── Yoru (夜) ───────────────────────────────────────────
const yoru = {
	item: [
		'dark:not-disabled:not-data-disabled:hover:bg-white/5',
		'dark:not-disabled:not-data-disabled:focus:bg-white/5',
	],
	nav: ['dark:text-white', 'dark:group-hover:bg-white/5'],
}

// ── Composed (internal) ─────────────────────────────────
const item = [iro.text.default, maru.rounded.lg, motoi.item, hiru.item, yoru.item, garasu.item]

// ── Export ───────────────────────────────────────────────
export const sawari = {
	item,
	nav: [motoi.nav, hiru.nav, yoru.nav, sen.focus.inset],
	/** Disabled / dormant state. Was previously the standalone `yasumi` recipe. */
	disabled,
}
