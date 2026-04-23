/**
 * Sawari (触り) — Touch response.
 *
 * Hover, press, and selection feedback.
 *
 * Tier: 2 · Concern: interaction
 */

import { garasu } from './garasu'
import { iro } from './iro'
import { ji } from './ji'
import { ki } from './ki'
import { kyousei } from './kyousei'
import { maru } from './maru'
import { take } from './take'
import { yasumi } from './yasumi'

// ── Motoi (基) ──────────────────────────────────────────
const motoi = {
	item: [
		'sm:py-1.5 py-2.5',
		'outline-hidden',
		ji.size.md,
		kyousei.text,
		kyousei.focus,
		yasumi.disabled,
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
	nav: [motoi.nav, hiru.nav, yoru.nav, ki.inset],
}
