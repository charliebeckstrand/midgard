/**
 * Sawari (触り) — Touch response.
 *
 * Hover, press, and selection feedback.
 *
 * Tier: 2 · Concern: interaction
 */

import { garasu } from './garasu'
import { ki } from './ki'
import { kyousei } from './kyousei'
import { maru } from './maru'
import { sumi } from './sumi'
import { take } from './take'
import { yasumi } from './yasumi'

// ── Motoi (基) ──────────────────────────────────────────
const motoi = {
	item: [
		'sm:py-1.5 py-2.5',
		'text-base/6',
		'outline-hidden',
		'cursor-default',
		kyousei.text,
		kyousei.focus,
		yasumi.disabled,
	],
	nav: [take.iconSlot.md, '*:data-[slot=avatar]:-m-0.5 *:data-[slot=avatar]:size-7'],
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
const item = [sumi.text, maru.rounded, motoi.item, hiru.item, yoru.item, garasu.item]
const nav = [motoi.nav, hiru.nav, yoru.nav]

// ── Export ───────────────────────────────────────────────
export const sawari = {
	item,
	nav,
	navItem: [...nav, ki.inset],
	cursor: 'cursor-default',
}
